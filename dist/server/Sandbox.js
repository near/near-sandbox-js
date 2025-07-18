"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sandbox = void 0;
const tmp_promise_1 = require("tmp-promise");
const binaryExecution_1 = require("../binary/binaryExecution");
const DEFAULT_NEAR_SANDBOX_VERSION = "2.6.5";
class Sandbox {
    constructor(rpcUrl, homeDir, childProcess) {
        Object.defineProperty(this, "_rpcUrl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_homeDir", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "childProcess", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._rpcUrl = rpcUrl;
        this._homeDir = homeDir;
        this.childProcess = childProcess;
    }
    get rpcUrl() {
        return this._rpcUrl;
    }
    get homeDir() {
        return this._homeDir.path;
    }
    static async start(config, version = DEFAULT_NEAR_SANDBOX_VERSION) {
        // Initialize home directory with the specified version get home directory
        const homeDir = await this.initHomeDirWithVersion(version);
        // get ports
        // set sandbox configs
        console.log(config);
        // create options and args to spawn the process
        const options = ["--home", homeDir.path, "run"];
        // Run sandbox with the specified version and options get ChildProcess
        const childProcess = await (0, binaryExecution_1.runWithOptionsAndVersion)(version, options);
        // check rpcUrl
        // return new Sandbox instance
        return new Sandbox("http://localhost:3030", homeDir, childProcess);
    }
    async tearDown() {
        if (this.childProcess) {
            this.childProcess.kill();
        }
        // Clean up the home directory
        await this._homeDir.cleanup();
    }
    static async initHomeDirWithVersion(version) {
        const homeDir = await (0, tmp_promise_1.dir)({ unsafeCleanup: true });
        // call initHomeDirWithVersion
        await (0, binaryExecution_1.initHomeDirWithVersion)(version, homeDir);
        // return the home directory
        return homeDir;
    }
}
exports.Sandbox = Sandbox;
