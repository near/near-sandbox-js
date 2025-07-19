"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sandbox = void 0;
const tmp_promise_1 = require("tmp-promise");
const binaryExecution_1 = require("../binary/binaryExecution");
const sandboxUtils_1 = require("./sandboxUtils");
const proper_lockfile_1 = require("proper-lockfile");
const DEFAULT_NEAR_SANDBOX_VERSION = "2.6.5";
class Sandbox {
    constructor(rpcUrl, homeDir, childProcess, rpcPortLock, netPortLock) {
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
        Object.defineProperty(this, "rpcPortLock", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "netPortLock", {
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
        this.rpcPortLock = rpcPortLock;
        this.netPortLock = netPortLock;
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
        const { port: rpcPort, lockFilePath: rpcPortLock } = await (0, sandboxUtils_1.acquireOrLockPort)(config === null || config === void 0 ? void 0 : config.rpcPort);
        const { port: netPort, lockFilePath: netPortLock } = await (0, sandboxUtils_1.acquireOrLockPort)(config === null || config === void 0 ? void 0 : config.netPort);
        const rpcAddr = (0, sandboxUtils_1.rpcSocket)(rpcPort);
        const netAddr = (0, sandboxUtils_1.rpcSocket)(netPort);
        // set sandbox configs
        console.log(config);
        // create options and args to spawn the process
        const options = ["--home", homeDir.path, "run", "--rpc-addr", rpcAddr, "--net-addr", netAddr];
        // Run sandbox with the specified version and options get ChildProcess
        const childProcess = await (0, binaryExecution_1.runWithOptionsAndVersion)(version, options);
        // check rpcUrl
        // return new Sandbox instance
        return new Sandbox(rpcAddr, homeDir, childProcess, rpcPortLock, netPortLock);
    }
    async tearDown() {
        try {
            await (0, proper_lockfile_1.unlock)(this.rpcPortLock);
            await (0, proper_lockfile_1.unlock)(this.netPortLock);
        }
        catch (error) {
            throw new Error("Failed to unlock ports: " + error);
        }
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
