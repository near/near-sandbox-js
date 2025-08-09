import { dir, DirectoryResult } from "tmp-promise";
import { initConfigsToTmpWithVersion, spawnWithArgsAndVersion } from "../binary/binaryExecution";
import { overrideConfigs, SandboxConfig } from "./config";
import { ChildProcess } from "child_process";
import { acquireOrLockPort, dumpStateFromPath, rpcSocket } from "./sandboxUtils";
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
 *
 * @property rpcUrl - The URL of the running sandbox's RPC endpoint.(e.g. "http://127.0.0.1:{port}")
 * @property homeDir - The path to the temporary home directory used by the sandbox.
 * This directory contains all the sandbox state, configuration and accounts keys.
 * @property rpcPortLockPath - Path to the lock file that prevents other processes from using the same RPC port until this sandbox is started.
 * @property netPortLockPath - Path to the lock file for the network port.
 */
export class Sandbox {
    public readonly rpcUrl: string;
    public readonly homeDir: string;
    public readonly rpcPortLockPath: string;
    public readonly netPortLockPath: string;
    private childProcess: ChildProcess;

    private constructor(rpcUrl: string, homeDir: string, childProcess: ChildProcess, rpcPortLock: string, netPortLock: string) {
        this.rpcUrl = rpcUrl;
        this.homeDir = homeDir;
        this.rpcPortLockPath = rpcPortLock;
        this.netPortLockPath = netPortLock;
        this.childProcess = childProcess;
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
        await overrideConfigs(tmpDir.path, config);
        // create options and args to spawn the process
        const options = ["--home", tmpDir.path, "run", "--rpc-addr", rpcAddr, "--network-addr", netAddr];
        // spawn sandbox with the specified version and arguments, get ChildProcess
        const childProcess = await spawnWithArgsAndVersion(version, options);

        const rpcUrl = `http://${rpcAddr}`;

        // Ping rpcUrl to ensure the process is ready
        await this.waitUntilReady(rpcUrl);

        return new Sandbox(rpcUrl, tmpDir.path, childProcess, rpcPortLock, netPortLock);
    }

    /**
     * Dumps the current state of the sandbox environment.
     * Parses next files from dumped dir: the genesis, records(that will merge to genesis), config, node_key, and validator_key.
     *
     * Returned files such as `genesis`, `nodeKey`, and `validatorKey` are intended to be used
     * when running the sandbox with a specific state. These files contain the necessary configuration and keys
     * to restore or replicate the sandbox environment.
     * @returns An object containing the genesis, config, node key, and validator key as json files.
     */
    async dump(): Promise<{
        config: Record<string, unknown>;
        genesis: Record<string, unknown>;
        nodeKey: Record<string, unknown>;
        validatorKey: Record<string, unknown>;
    }> {
        return dumpStateFromPath(this.homeDir);
    }

    /**
     * Destroys the running sandbox environment by:
     * - Killing the child process, waiting for it to exit
     * - Unlocking the previously locked ports
     */
    async stop(): Promise<void> {
        this.childProcess.kill();
        await Promise.race([
            new Promise(resolve => this.childProcess.once('exit', resolve))
        ]);
        await Promise.allSettled([
            unlock(this.rpcPortLockPath),
            unlock(this.netPortLockPath)
        ]);

    }
    /**
     * Calls `stop()` to terminate the sandbox and then cleans up the home directory.
     */
    async tearDown(): Promise<void> {
        await this.stop();
        await rm(this.homeDir, { recursive: true, force: true }).catch(error => {

            throw new TypedError(`Sandbox teardown encountered errors`,
                SandboxErrors.TearDownFailed,
                error instanceof Error ? error : new Error(String(error)));
        });
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
