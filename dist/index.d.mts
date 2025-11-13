declare const DEFAULT_ACCOUNT_ID = "sandbox";
declare const DEFAULT_PUBLIC_KEY = "ed25519:5BGSaf6YjVm7565VzWQHNxoyEjwr3jUpRJSGjREvU9dB";
declare const DEFAULT_PRIVATE_KEY = "ed25519:3tgdk2wPraJzT4nsTuf86UX41xgPNk3MHnq8epARMdBNs29AFEztAuaQ7iHddDfXG9F2RzV1XNQYgJyAyoW51UBB";
declare const DEFAULT_BALANCE: bigint;
declare class GenesisAccount {
    accountId: string;
    publicKey: string;
    privateKey: string;
    balance: bigint;
    constructor(accountId: string, publicKey: string, privateKey: string, balance: bigint);
    /**
     * Creates a default genesis account with predefined values.
     * This is useful for testing and development purposes.
     *
     * @param accountId Optional custom account ID, defaults to DEFAULT_ACCOUNT_ID.
     * @returns A GenesisAccount instance with default values.
     */
    static createDefault(accountId?: string): GenesisAccount;
}
/**
 * Configuration options for the NEAR sandbox environment.
 * This interface allows customization of the sandbox's behavior.
 * @property rpcPort - Port that RPC will be bound to. Will be picked randomly if not set.
 * @property netPort - Port that the network will be bound to. Will be picked randomly if not set.
 * @property additionalConfig - Additional JSON configuration to merge with the default config. Ensure that the additional properties are correct.
 * @property additionalGenesis - Additional genesis parameters to modify the genesis.json.
 * @property additionalAccounts - Additional accounts to be passed in the sandbox genesis. By default, it will create a default account with 10,000 NEAR.
 * @property nodeKey - Node key to be used by the sandbox node. If not provided, a default key will be used. Should match up with node key in genesis.json.
 * @property validatorKey - Validator key to be used by the validator. Should match up with validator key in genesis.json.
 */
interface SandboxConfig {
    rpcPort?: number;
    netPort?: number;
    additionalConfig?: Record<string, any>;
    additionalGenesis?: Record<string, any>;
    additionalAccounts?: GenesisAccount[];
    nodeKey?: Record<string, any>;
    validatorKey?: Record<string, any>;
}

declare const DEFAULT_NEAR_SANDBOX_VERSION = "2.9.0";
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
declare class Sandbox {
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
     * Dumps the current state of the sandbox environment.
     * Parses next files from dumped dir: the genesis, records(that will merge to genesis), config, node_key, and validator_key.
     *
     * Returned files such as `genesis`, `nodeKey`, and `validatorKey` are intended to be used
     * when running the sandbox with a specific state. These files contain the necessary configuration and keys
     * to restore or replicate the sandbox environment.
     * @returns An object containing the genesis, config, node key, and validator key as json files.
     */
    dump(): Promise<{
        config: Record<string, unknown>;
        genesis: Record<string, unknown>;
        nodeKey: Record<string, unknown>;
        validatorKey: Record<string, unknown>;
    }>;
    /**
     * Destroys the running sandbox environment by:
     * - Killing the child process, waiting for it to exit
     * - Unlocking the previously locked ports
     */
    stop(): Promise<void>;
    /**
     * Calls `stop()` to terminate the sandbox and then cleans up the home directory.
     */
    tearDown(): Promise<void>;
    private static initConfigsWithVersion;
    private static waitUntilReady;
}

export { DEFAULT_ACCOUNT_ID, DEFAULT_BALANCE, DEFAULT_NEAR_SANDBOX_VERSION, DEFAULT_PRIVATE_KEY, DEFAULT_PUBLIC_KEY, GenesisAccount, Sandbox, type SandboxConfig };
