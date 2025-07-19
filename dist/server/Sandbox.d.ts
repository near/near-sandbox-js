/// <reference types="node" />
import { DirectoryResult } from "tmp-promise";
import { SandboxConfig } from "./interfaces";
import { ChildProcess } from "child_process";
export declare class Sandbox {
    private _rpcUrl;
    private _homeDir;
    private rpcPortLock;
    private netPortLock;
    private childProcess;
    constructor(rpcUrl: string, homeDir: DirectoryResult, childProcess: ChildProcess, rpcPortLock: string, netPortLock: string);
    get rpcUrl(): string;
    get homeDir(): string;
    static start(config?: SandboxConfig, version?: string): Promise<Sandbox>;
    tearDown(): Promise<void>;
    private static initHomeDirWithVersion;
}
