"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sandbox = exports.DEFAULT_NEAR_SANDBOX_VERSION = void 0;
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
 *
 * @property rpcUrl - The URL of the running sandbox's RPC endpoint.(e.g. "http://127.0.0.1:{port}")
 * @property homeDir - The path to the temporary home directory used by the sandbox.
 * This directory contains all the sandbox state, configuration and accounts keys.
 * @property rpcPortLockPath - Path to the lock file that prevents other processes from using the same RPC port until this sandbox is started.
 * @property netPortLockPath - Path to the lock file for the network port.
 */
class Sandbox {
    constructor(rpcUrl, homeDir, childProcess, rpcPortLock, netPortLock) {
        Object.defineProperty(this, "rpcUrl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "homeDir", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "rpcPortLockPath", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "netPortLockPath", {
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
        await (0, config_1.overrideConfigs)(tmpDir.path, config);
        // create options and args to spawn the process
        const args = ["--home", tmpDir.path, "run", "--rpc-addr", rpcAddr, "--network-addr", netAddr];
        // spawn sandbox with the specified version and arguments, get ChildProcess
        const childProcess = await (0, binaryExecution_1.spawnWithArgsAndVersion)(version, args);
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
    async dump() {
        return (0, sandboxUtils_1.dumpStateFromPath)(this.homeDir);
    }
    /**
     * Destroys the running sandbox environment by:
     * - Killing the child process, waiting for it to exit
     * - Unlocking the previously locked ports
     */
    async stop() {
        this.childProcess.kill();
        await Promise.race([
            new Promise(resolve => this.childProcess.once('exit', resolve))
        ]);
        await Promise.allSettled([
            (0, proper_lockfile_1.unlock)(this.rpcPortLockPath),
            (0, proper_lockfile_1.unlock)(this.netPortLockPath)
        ]);
    }
    /**
     * Calls `stop()` to terminate the sandbox and then cleans up the home directory.
     */
    async tearDown() {
        await this.stop();
        await (0, promises_1.rm)(this.homeDir, { recursive: true, force: true }).catch(error => {
            throw new errors_1.TypedError(`Sandbox teardown encountered errors`, errors_1.SandboxErrors.TearDownFailed, error instanceof Error ? error : new Error(String(error)));
        });
    }
    static async initConfigsWithVersion(version) {
        const tmpDir = await (0, sandboxUtils_1.createTmpDir)();
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
