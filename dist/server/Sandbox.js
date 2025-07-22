"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sandbox = exports.DEFAULT_NEAR_SANDBOX_VERSION = void 0;
const tmp_promise_1 = require("tmp-promise");
const binaryExecution_1 = require("../binary/binaryExecution");
const config_1 = require("./config");
const sandboxUtils_1 = require("./sandboxUtils");
const proper_lockfile_1 = require("proper-lockfile");
const promises_1 = require("fs/promises");
exports.DEFAULT_NEAR_SANDBOX_VERSION = "2.6.5";
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
    static async start(config, version = exports.DEFAULT_NEAR_SANDBOX_VERSION) {
        // Initialize home directory with the specified version get home directory
        const homeDir = await this.initHomeDirWithVersion(version);
        // get ports
        const { port: rpcPort, lockFilePath: rpcPortLock } = await (0, sandboxUtils_1.acquireOrLockPort)(config === null || config === void 0 ? void 0 : config.rpcPort);
        const { port: netPort, lockFilePath: netPortLock } = await (0, sandboxUtils_1.acquireOrLockPort)(config === null || config === void 0 ? void 0 : config.netPort);
        const rpcAddr = (0, sandboxUtils_1.rpcSocket)(rpcPort);
        const netAddr = (0, sandboxUtils_1.rpcSocket)(netPort);
        // set sandbox configs
        await (0, config_1.setSandboxGenesis)(homeDir.path, config);
        await (0, config_1.setSandboxConfig)(homeDir.path, config);
        // create options and args to spawn the process
        const options = ["--home", homeDir.path, "run", "--rpc-addr", rpcAddr, "--network-addr", netAddr];
        // Run sandbox with the specified version and options get ChildProcess
        const childProcess = await (0, binaryExecution_1.runWithArgsAndVersion)(version, options);
        const rpcUrl = `http://${rpcAddr}`;
        // Add delay to ensure the process is ready
        await this.waitUntilReady(rpcUrl);
        // return new Sandbox instance
        return new Sandbox(rpcUrl, homeDir, childProcess, rpcPortLock, netPortLock);
    }
    async tearDown(cleanup = false) {
        try {
            await Promise.all([
                (0, proper_lockfile_1.unlock)(this.rpcPortLock),
                (0, proper_lockfile_1.unlock)(this.netPortLock)
            ]);
        }
        catch (error) {
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
            await (0, promises_1.rm)(this.homeDir, { recursive: true, force: true }).catch(error => {
                throw new Error(`Failed to remove sandbox home directory: ${error}`);
            });
        }
    }
    static async initHomeDirWithVersion(version) {
        const homeDir = await (0, tmp_promise_1.dir)({ unsafeCleanup: true });
        await (0, binaryExecution_1.initHomeDirWithVersion)(version, homeDir);
        return homeDir;
    }
    static async waitUntilReady(rpcUrl) {
        const timeoutSecs = parseInt(process.env["NEAR_RPC_TIMEOUT_SECS"] || '10');
        const attempts = timeoutSecs * 2;
        for (let i = 0; i < attempts; i++) {
            try {
                const response = await fetch(`${rpcUrl}/status`);
                if (response.ok) {
                    return;
                }
            }
            catch { }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        throw new Error('Timeout: RPC endpoint did not become ready in time.');
    }
}
exports.Sandbox = Sandbox;
