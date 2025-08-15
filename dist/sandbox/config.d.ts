export declare const DEFAULT_ACCOUNT_ID = "sandbox";
export declare const DEFAULT_PUBLIC_KEY = "ed25519:5BGSaf6YjVm7565VzWQHNxoyEjwr3jUpRJSGjREvU9dB";
export declare const DEFAULT_PRIVATE_KEY = "ed25519:3tgdk2wPraJzT4nsTuf86UX41xgPNk3MHnq8epARMdBNs29AFEztAuaQ7iHddDfXG9F2RzV1XNQYgJyAyoW51UBB";
export declare const DEFAULT_BALANCE: bigint;
export declare class GenesisAccount {
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
    /**
     * Creates a random genesis account with a unique account ID.
     * The account ID is generated based on the current time and a random number.
     * WARNING: Prefer using `createDefault` or defining 'GenesisAccount' from the scratch
     *
     * @param accountId Optional custom account ID, if not provided a random one will be generated.
     * @param balance Optional initial balance for the account, defaults to DEFAULT_BALANCE.
     * @returns A GenesisAccount instance with a random account ID and specified balance.
     */
    static createRandom(accountId?: string, balance?: string | number): GenesisAccount;
    private static _generateRandomAccountId;
}
/**
 * Configuration options for the NEAR sandbox environment.
 * This interface allows customization of the sandbox's behavior.
 * @property rpcPort - Port that RPC will be bound to. Will be picked randomly if not set.
 * @property netPort - Port that the network will be bound to. Will be picked randomly if not set.
 * @property maxPayloadSize - Maximum payload size for JSON RPC requests in bytes (default: 1GB).
 * @property maxOpenFiles - Maximum number of open files (default: 3000).
 * @property additionalConfig - Additional JSON configuration to merge with the default config. Ensure that the additional properties are correct.
 * @property additionalGenesis - Additional genesis parameters to modify the genesis.json.
 * @property additionalAccounts - Additional accounts to be passed in the sandbox genesis.
 */
export interface SandboxConfig {
    rpcPort?: number;
    netPort?: number;
    additionalConfig?: Record<string, any>;
    additionalGenesis?: Record<string, any>;
    additionalAccounts?: GenesisAccount[];
    nodeKey?: Record<string, any>;
    validatorKey?: Record<string, any>;
}
export declare function overrideConfigs(homeDir: string, config?: SandboxConfig): Promise<void>;
export declare function setSandboxGenesis(homeDir: string, config?: SandboxConfig): Promise<void>;
export declare function setSandboxConfig(homeDir: string, config?: SandboxConfig): Promise<void>;
