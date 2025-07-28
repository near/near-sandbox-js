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

export class Sandbox {
    private _rpcUrl: string;
    private _homeDir: DirectoryResult;
    private _rpcPortLockPath: string;
    private _netPortLockPath: string;
    private childProcess: ChildProcess;

    constructor(rpcUrl: string, homeDir: DirectoryResult, childProcess: ChildProcess, rpcPortLock: string, netPortLock: string) {
        this._rpcUrl = rpcUrl;
        this._homeDir = homeDir;
        this._rpcPortLockPath = rpcPortLock;
        this._netPortLockPath = netPortLock;
        this.childProcess = childProcess;
    }

    get rpcUrl(): string {
        return this._rpcUrl;
    }

    get homeDir(): string {
        return this._homeDir.path;
    }

    get rpcPortLockPath(): string {
        return this._rpcPortLockPath;
    }

    get netPortLockPath(): string {
        return this._netPortLockPath;
    }
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
