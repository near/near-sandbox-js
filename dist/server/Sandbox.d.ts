/// <reference types="node" />
import { DirectoryResult } from "tmp-promise";
import { SandboxConfig } from "./config";
import { ChildProcess } from "child_process";
export declare const DEFAULT_NEAR_SANDBOX_VERSION = "2.6.5";
interface StartParams {
    config?: SandboxConfig;
    version?: string;
}
export declare class Sandbox {
    private _rpcUrl;
    private _homeDir;
    private _rpcPortLockPath;
    private _netPortLockPath;
    private childProcess;
    constructor(rpcUrl: string, homeDir: DirectoryResult, childProcess: ChildProcess, rpcPortLock: string, netPortLock: string);
    get rpcUrl(): string;
    get homeDir(): string;
    get rpcPortLockPath(): string;
    get netPortLockPath(): string;
    static start(params: StartParams): Promise<Sandbox>;
    tearDown(cleanup?: boolean): Promise<void>;
    private static initHomeDirWithVersion;
    private static waitUntilReady;
}
export {};
