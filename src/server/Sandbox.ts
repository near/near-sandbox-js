import { dir, DirectoryResult } from "tmp-promise";
import { initHomeDirWithVersion, runWithArgsAndVersion } from "../binary/binaryExecution";
import { SandboxConfig, setSandboxConfig, setSandboxGenesis } from "./config";
import { ChildProcess } from "child_process";
import { acquireOrLockPort, rpcSocket } from "./sandboxUtils";
import { unlock } from "proper-lockfile";
import { rm } from "fs/promises";

export const DEFAULT_NEAR_SANDBOX_VERSION = "2.6.5";

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

    static async start(config?: SandboxConfig, version: string = DEFAULT_NEAR_SANDBOX_VERSION): Promise<Sandbox> {
        // Initialize home directory with the specified version get home directory
        const homeDir = await this.initHomeDirWithVersion(version);
        // get ports
        const { port: rpcPort, lockFilePath: rpcPortLock } = await acquireOrLockPort(config?.rpcPort);
        const { port: netPort, lockFilePath: netPortLock } = await acquireOrLockPort(config?.netPort);

        const rpcAddr = rpcSocket(rpcPort);
        const netAddr = rpcSocket(netPort);
        // set sandbox configs
        await setSandboxGenesis(homeDir.path, config);
        await setSandboxConfig(homeDir.path, config);
        // create options and args to spawn the process
        const options = ["--home", homeDir.path, "run", "--rpc-addr", rpcAddr, "--network-addr", netAddr];
        // Run sandbox with the specified version and arguments, get ChildProcess
        const childProcess = await runWithArgsAndVersion(version, options);

        const rpcUrl = `http://${rpcAddr}`;

        // Add delay to ensure the process is ready
        await this.waitUntilReady(rpcUrl);

        // return new Sandbox instance
        return new Sandbox(rpcUrl, homeDir, childProcess, rpcPortLock, netPortLock);
    }

    async tearDown(cleanup: boolean = false): Promise<void> {
        try {
            await Promise.all([
                unlock(this.rpcPortLockPath),
                unlock(this.netPortLockPath)
            ]);
        } catch (error) {
            throw new Error("Failed to unlock ports: " + error);
        }
        const success = this.childProcess.kill();

        if (!success) {
            throw new Error("Failed to kill the child process");
        }

        if (cleanup) {
            await Promise.race([
                new Promise(resolve => this.childProcess.once('exit', resolve))
            ]);
            await rm(this.homeDir, { recursive: true, force: true }).catch(error => {
                throw new Error(`Failed to remove sandbox home directory: ${error}`);
            });

        }
    }

    private static async initHomeDirWithVersion(version: string): Promise<DirectoryResult> {
        const homeDir = await dir({ unsafeCleanup: true });
        await initHomeDirWithVersion(version, homeDir);
        return homeDir;
    }

    private static async waitUntilReady(rpcUrl: string) {
        const timeoutSecs = parseInt(process.env["NEAR_RPC_TIMEOUT_SECS"] || '10');
        const attempts = timeoutSecs * 2;
        for (let i = 0; i < attempts; i++) {
            try {
                const response = await fetch(`${rpcUrl}/status`);
                if (response.ok) {
                    return;
                }
            } catch { }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        throw new Error('Timeout: RPC endpoint did not become ready in time.');
    }
}