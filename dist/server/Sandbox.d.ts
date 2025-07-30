import { SandboxConfig } from "./config";
export declare const DEFAULT_NEAR_SANDBOX_VERSION = "2.6.5";
interface StartParams {
    config?: SandboxConfig;
    version?: string;
}
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
export declare class Sandbox {
    readonly rpcUrl: string;
    readonly homeDir: string;
    readonly rpcPortLockPath: string;
    readonly netPortLockPath: string;
    private childProcess;
    private constructor();
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
    static start(params: StartParams): Promise<Sandbox>;
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
    tearDown(cleanup?: boolean): Promise<void>;
    private static initConfigsWithVersion;
    private static waitUntilReady;
}
export {};
