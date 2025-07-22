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
    static createDefault(accountId?: string): GenesisAccount;
    static random(accountId?: string, balance?: string | number): GenesisAccount;
    private static _generateRandomAccountId;
}
export interface SandboxConfig {
    rpcPort?: number;
    netPort?: number;
    maxPayloadSize?: number;
    maxOpenFiles?: number;
    additionalConfig?: Record<string, any>;
    additionalGenesis?: Record<string, any>;
    additionalAccounts?: GenesisAccount[];
}
export declare function setSandboxGenesis(homeDir: string, // Path to the genesis.json directory
config?: SandboxConfig): Promise<void>;
export declare function setSandboxConfig(homeDir: string, config?: SandboxConfig): Promise<void>;
