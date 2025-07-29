"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sandbox = exports.DEFAULT_NEAR_SANDBOX_VERSION = void 0;
const tmp_promise_1 = require("tmp-promise");
const binaryExecution_1 = require("../binary/binaryExecution");
const config_1 = require("./config");
const sandboxUtils_1 = require("./sandboxUtils");
const proper_lockfile_1 = require("proper-lockfile");
const promises_1 = require("fs/promises");
const errors_1 = require("../errors");
const got_1 = require("got");
exports.DEFAULT_NEAR_SANDBOX_VERSION = "2.6.5";
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
        Object.defineProperty(this, "_rpcPortLockPath", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_netPortLockPath", {
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
        this._rpcPortLockPath = rpcPortLock;
        this._netPortLockPath = netPortLock;
        this.childProcess = childProcess;
    }
    /**
     * The URL of the running sandbox's RPC endpoint.
     */
    get rpcUrl() {
        return this._rpcUrl;
    }
    /**
     * The path to the temporary home directory used by the sandbox.
     * This directory contains all the sandbox state, configuration and accounts keys.
     */
    get homeDir() {
        return this._homeDir.path;
    }
    /**
     * The lock file path for the RPC port.
     * This is used to ensure that the port is not used by another process.
     */
    get rpcPortLockPath() {
        return this._rpcPortLockPath;
    }
    /**
     * The lock file path for the network port.
     * This is used to ensure that the port is not used by another process.
     */
    get netPortLockPath() {
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
    static async start(params) {
        const config = params.config || {};
        const version = params.version || exports.DEFAULT_NEAR_SANDBOX_VERSION;
        // Ensure Binary downloaded with specified version
        // Initialize tmp directory with the specified version
        // get tmp directory with default configs
        const tmpDir = await this.initConfigsWithVersion(version);
        // get ports
        const { port: rpcPort, lockFilePath: rpcPortLock } = await (0, sandboxUtils_1.acquireOrLockPort)(config === null || config === void 0 ? void 0 : config.rpcPort);
        const { port: netPort, lockFilePath: netPortLock } = await (0, sandboxUtils_1.acquireOrLockPort)(config === null || config === void 0 ? void 0 : config.netPort);
        const rpcAddr = (0, sandboxUtils_1.rpcSocket)(rpcPort);
        const netAddr = (0, sandboxUtils_1.rpcSocket)(netPort);
        // set sandbox configs
        await (0, config_1.setSandboxGenesis)(tmpDir.path, config);
        await (0, config_1.setSandboxConfig)(tmpDir.path, config);
        // create options and args to spawn the process
        const options = ["--home", tmpDir.path, "run", "--rpc-addr", rpcAddr, "--network-addr", netAddr];
        // Run sandbox with the specified version and arguments, get ChildProcess
        const childProcess = await (0, binaryExecution_1.runWithArgsAndVersion)(version, options);
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
    async tearDown(cleanup = false) {
        const errors = [];
        const success = this.childProcess.kill();
        if (!success) {
            errors.push(new Error("Failed to kill the child process"));
        }
        const unlockResults = await Promise.allSettled([
            (0, proper_lockfile_1.unlock)(this.rpcPortLockPath),
            (0, proper_lockfile_1.unlock)(this.netPortLockPath)
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
            await (0, promises_1.rm)(this.homeDir, { recursive: true, force: true }).catch(error => {
                errors.push(new Error(`Failed to remove sandbox home directory: ${error}`));
            });
        }
        if (errors.length > 0) {
            const combined = errors.map(e => `- ${e.message}`).join("\n");
            throw new errors_1.TypedError(`Sandbox teardown encountered errors`, errors_1.SandboxErrors.TearDownFailed, new Error(combined));
        }
    }
    static async initConfigsWithVersion(version) {
        const tmpDir = await (0, tmp_promise_1.dir)({ unsafeCleanup: true });
        await (0, binaryExecution_1.initConfigsToTmpWithVersion)(version, tmpDir);
        return tmpDir;
    }
    static async waitUntilReady(rpcUrl) {
        const timeoutSecs = parseInt(process.env["NEAR_RPC_TIMEOUT_SECS"] || '10');
        const attempts = timeoutSecs * 2;
        let lastError = null;
        for (let i = 0; i < attempts; i++) {
            try {
                const response = await (0, got_1.default)(`${rpcUrl}/status`, { throwHttpErrors: false });
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    return;
                }
            }
            catch (error) {
                lastError = error;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        throw new errors_1.TypedError("Sandbox failed to become ready within the timeout period.", errors_1.SandboxErrors.RunFailed, lastError instanceof Error ? lastError : new Error(String(lastError)));
    }
}
exports.Sandbox = Sandbox;
