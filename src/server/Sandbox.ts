import { dir, DirectoryResult } from "tmp-promise";
import { initHomeDirWithVersion, runWithOptionsAndVersion } from "../binary/binaryExecution";
import { SandboxConfig } from "./interfaces";
import { ChildProcess } from "child_process";


const DEFAULT_NEAR_SANDBOX_VERSION = "2.6.5";


export class Sandbox {
    private _rpcUrl: string;
    private _homeDir: DirectoryResult;
    private childProcess: ChildProcess;

    constructor(rpcUrl: string, homeDir: DirectoryResult, childProcess: ChildProcess) {
        this._rpcUrl = rpcUrl;
        this._homeDir = homeDir;
        this.childProcess = childProcess;
    }

    get rpcUrl(): string {
        return this._rpcUrl;
    }

    get homeDir(): string {
        return this._homeDir.path;
    }

    static async start(config?: SandboxConfig, version: string = DEFAULT_NEAR_SANDBOX_VERSION): Promise<Sandbox> {
        // Initialize home directory with the specified version get home directory
        const homeDir = await this.initHomeDirWithVersion(version);


        // get ports
        
        
        // set sandbox configs
        console.log(config)
        
        
        
        // create options and args to spawn the process
        const options = ["--home", homeDir.path, "run"];
        
        
        // Run sandbox with the specified version and options get ChildProcess
        const childProcess = await runWithOptionsAndVersion(version, options);
        
        
        // check rpcUrl
        // return new Sandbox instance
        return new Sandbox("http://localhost:3030", homeDir, childProcess);
    }

    async tearDown(): Promise<void> {
        if (this.childProcess) {
            this.childProcess.kill();
        }
        // Clean up the home directory
        await this._homeDir.cleanup();
    }

    private static async initHomeDirWithVersion(version: string): Promise<DirectoryResult> {
        const homeDir = await dir({ unsafeCleanup: true });
        // call initHomeDirWithVersion
        await initHomeDirWithVersion(version, homeDir);
        // return the home directory
        return homeDir;
    }
}