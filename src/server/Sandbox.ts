import { dir, DirectoryResult } from "tmp-promise";
import { initConfigsToTmpWithVersion, runWithArgsAndVersion } from "../binary/binaryExecution";
import { SandboxConfig, setSandboxConfig, setSandboxGenesis } from "./config";
import { ChildProcess } from "child_process";
import { acquireOrLockPort, rpcSocket } from "./sandboxUtils";
import { unlock } from "proper-lockfile";
import { rm } from "fs/promises";
import { SandboxErrors, TypedError } from "../errors";
import got from "got";

export const DEFAULT_NEAR_SANDBOX_VERSION = "2.6.5";

interface StartParams {
    config?: SandboxConfig;
    version?: string;
}
/**
 * `Sandbox` provides an isolated, ephemeral NEAR blockchain environment for local testing.
 *
 * Internally, it wraps the execution of the `near-sandbox` binary with configuration options,
 * port locking, and lifecycle management. It ensures proper startup and teardown for reliable testing.
 *
 * @example
 * ```ts
 * import { Sandbox } from './sandbox';
 *
 * const sandbox = await Sandbox.start({
 *   config: {
 *     rpcPort: 3030,
 *     additionalGenesis: { epoch_length: 250 },
 *   }
 * });
 *
 * console.log('Sandbox running at', sandbox.rpcUrl);
 * // Use the sandbox...
 * await sandbox.tearDown(true); // Cleans up temp dir and releases ports
 * ```
 */
export class Sandbox {
    private _rpcUrl: string;
    private _homeDir: DirectoryResult;
    private _rpcPortLockPath: string;
    private _netPortLockPath: string;
    private childProcess: ChildProcess;

    private constructor(rpcUrl: string, homeDir: DirectoryResult, childProcess: ChildProcess, rpcPortLock: string, netPortLock: string) {
        this._rpcUrl = rpcUrl;
        this._homeDir = homeDir;
        this._rpcPortLockPath = rpcPortLock;
        this._netPortLockPath = netPortLock;
        this.childProcess = childProcess;
    }
    /**
     * The URL of the running sandbox's RPC endpoint.
     */
    get rpcUrl(): string {
        return this._rpcUrl;
    }
    /**
     * The path to the temporary home directory used by the sandbox.
     * This directory contains all the sandbox state, configuration and accounts keys.
     */
    get homeDir(): string {
        return this._homeDir.path;
    }
    /**
     * The lock file path for the RPC port.
     * This is used to ensure that the port is not used by another process.
     */
    get rpcPortLockPath(): string {
        return this._rpcPortLockPath;
    }
    /**
     * The lock file path for the network port.
     * This is used to ensure that the port is not used by another process.
     */
    get netPortLockPath(): string {
        return this._netPortLockPath;
    }
    /**
    * Launch a sandbox environment.
    *
    * Downloads the appropriate binary version (if not cached), locks two available ports (RPC & network),
    * generates a temporary home directory, and spawns the `neard-sandbox` binary with runtime args.
    *
    * @param params Configuration options:
    *   - `config` - Optional sandbox configuration like RPC port, additional genesis data, accounts etc.
    *   - `version` - Optional NEAR sandbox binary version.
    *
    * @returns A ready-to-use `Sandbox` instance with `.rpcUrl` and `.homeDir` available.
    *
    * @throws {TypedError} if the sandbox fails to start, ports cannot be locked, or config setup fails.
    */
    static async start(params: StartParams): Promise<Sandbox> {
        const config: SandboxConfig = params.config || {};
        const version: string = params.version || DEFAULT_NEAR_SANDBOX_VERSION;
        // Ensure Binary downloaded with specified version
        // Initialize tmp directory with the specified version
        // get tmp directory with default configs
        const tmpDir = await this.initConfigsWithVersion(version);
        // get ports
        const { port: rpcPort, lockFilePath: rpcPortLock } = await acquireOrLockPort(config?.rpcPort);
        const { port: netPort, lockFilePath: netPortLock } = await acquireOrLockPort(config?.netPort);

        const rpcAddr = rpcSocket(rpcPort);
        const netAddr = rpcSocket(netPort);
        // set sandbox configs
        await setSandboxGenesis(tmpDir.path, config);
        await setSandboxConfig(tmpDir.path, config);
        // create options and args to spawn the process
        const options = ["--home", tmpDir.path, "run", "--rpc-addr", rpcAddr, "--network-addr", netAddr];
        // Run sandbox with the specified version and arguments, get ChildProcess
        const childProcess = await runWithArgsAndVersion(version, options);

        const rpcUrl = `http://${rpcAddr}`;

        // Add delay to ensure the process is ready
        await this.waitUntilReady(rpcUrl);

        // return new Sandbox instance
        return new Sandbox(rpcUrl, tmpDir, childProcess, rpcPortLock, netPortLock);
    }
    /**
     * Destroys the running sandbox environment by:
     * - Killing the child process
     * - Unlocking the previously locked ports
     * - Optionally cleaning up the home directory
     *
     * @param cleanup If true, deletes the sandbox’s temp home directory.
     *
     * @throws {TypedError} if cleanup or shutdown fails partially or completely.
     */
    async tearDown(cleanup: boolean = false): Promise<void> {
        const errors: Error[] = [];
        const success = this.childProcess.kill();

        if (!success) {
            errors.push(new Error("Failed to kill the child process"));
        }

        const unlockResults = await Promise.allSettled([
            unlock(this.rpcPortLockPath),
            unlock(this.netPortLockPath)
        ]);
        unlockResults.forEach(result => {
            if (result.status === 'rejected') {
                errors.push(new Error("Failed to unlock port: " + result.reason));
            }
        });

        if (cleanup) {
            await Promise.race([
                new Promise(resolve => this.childProcess.once('exit', resolve))
            ]);
            await rm(this.homeDir, { recursive: true, force: true }).catch(error => {
                errors.push(new Error(`Failed to remove sandbox home directory: ${error}`));
            });
        }
        if (errors.length > 0) {
            const combined = errors.map(e => `- ${e.message}`).join("\n");
            throw new TypedError(`Sandbox teardown encountered errors`,
                SandboxErrors.TearDownFailed,
                new Error(combined));
        }
    }

    private static async initConfigsWithVersion(version: string): Promise<DirectoryResult> {
        const tmpDir = await dir({ unsafeCleanup: true });
        await initConfigsToTmpWithVersion(version, tmpDir);
        return tmpDir;
    }

    private static async waitUntilReady(rpcUrl: string) {
        const timeoutSecs = parseInt(process.env["NEAR_RPC_TIMEOUT_SECS"] || '10');
        const attempts = timeoutSecs * 2;
        let lastError: unknown = null;
        for (let i = 0; i < attempts; i++) {
            try {
                const response = await got(`${rpcUrl}/status`, { throwHttpErrors: false });
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    return;
                }
            } catch (error) {
                lastError = error;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        throw new TypedError("Sandbox failed to become ready within the timeout period.",
            SandboxErrors.RunFailed,
            lastError instanceof Error ? lastError : new Error(String(lastError))
        );
    }
}
