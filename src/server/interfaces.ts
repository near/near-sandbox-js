export interface SandboxConfig {
  rpcPort?: number;
  netPort?: number;
  maxPayloadSize?: number;
  maxOpenFiles?: number;
  additionalConfig?: string;
  additionalGenesis?: string;
  additionalAccounts?: GenesisAccount[];
}

export interface GenesisAccount {
  accountId: string;
  publicKey: string;
  privateKey?: string;
  balance: bigint; 
}