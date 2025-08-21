import { NEAR } from "@near-js/tokens";
import { join } from "path";
import { apply } from "json-merge-patch"
import * as fs from "fs/promises";
import { SandboxErrors, TypedError } from "../errors";

/*
  * Network specific configurations used to modify behavior inside a chain.
  * This is so far only useable with sandbox networks since it would require
  * direct access to a node to change the config. Each network like mainnet
  * and testnet already have pre-configured settings; meanwhile sandbox can
  * have additional settings on top of them to facilitate custom behavior
  * such as sending large requests to the sandbox network.
  */

export const DEFAULT_ACCOUNT_ID = 'sandbox';
export const DEFAULT_PUBLIC_KEY = 'ed25519:5BGSaf6YjVm7565VzWQHNxoyEjwr3jUpRJSGjREvU9dB';
export const DEFAULT_PRIVATE_KEY = 'ed25519:3tgdk2wPraJzT4nsTuf86UX41xgPNk3MHnq8epARMdBNs29AFEztAuaQ7iHddDfXG9F2RzV1XNQYgJyAyoW51UBB';
export const DEFAULT_BALANCE = NEAR.toUnits(10000);

/*
  * Represents a genesis account in the NEAR sandbox.
  * Means it will saved as starting account in the genesis.json file.
  * accountId - The unique identifier for the account, it`s can be top-level account or sub-account.(e.g. "alice.near", "alice")
  * publicKey - The public part of the privateKey that will control the account.
  * privateKey - The private key used to sign transactions for the account.
  * balance - The initial balance of the account in yoctoNEAR.
  */
export class GenesisAccount {
  accountId: string;
  publicKey: string;
  privateKey: string;
  balance: bigint;

  constructor(accountId: string, publicKey: string, privateKey: string, balance: bigint) {
    this.accountId = accountId;
    this.publicKey = publicKey;
    this.privateKey = privateKey;
    this.balance = balance;
  }

  /**
   * Creates a default genesis account with predefined values.
   * This is useful for testing and development purposes.
   *
   * @param accountId Optional custom account ID, defaults to DEFAULT_ACCOUNT_ID.
   * @returns A GenesisAccount instance with default values.
   */
  static createDefault(accountId?: string): GenesisAccount {
    return new GenesisAccount(
      accountId ?? DEFAULT_ACCOUNT_ID,
      DEFAULT_PUBLIC_KEY,
      DEFAULT_PRIVATE_KEY,
      DEFAULT_BALANCE
    );
  }
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
export interface SandboxConfig {
  rpcPort?: number;
  netPort?: number;
  additionalConfig?: Record<string, any>;
  additionalGenesis?: Record<string, any>;
  additionalAccounts?: GenesisAccount[];
  nodeKey?: Record<string, any>;
  validatorKey?: Record<string, any>;
}

export async function overrideConfigs(homeDir: string, config?: SandboxConfig): Promise<void> {
  await setSandboxGenesis(homeDir, config);

  await setSandboxConfig(homeDir, config);
  if (config?.nodeKey) {
    await fs.writeFile(join(homeDir, "node_key.json"), JSON.stringify(config.nodeKey, null, 2), 'utf-8');
  }
  if (config?.validatorKey) {
    await fs.writeFile(join(homeDir, 'validator_key.json'), JSON.stringify(config.validatorKey, null, 2), 'utf-8');
  }
}
export async function setSandboxGenesis(
  homeDir: string,
  config?: SandboxConfig
): Promise<void> {
  // This function modifies the genesis.json file in the specified homeDir
  await overwriteGenesis(homeDir, config);

  const additionalAccountsWithDefault: GenesisAccount[] = [
    GenesisAccount.createDefault(),
    ...(config?.additionalAccounts ?? [])
  ];
  // This function create an {accountId}.json file in the homeDir for each account
  await saveAccountsKeys(homeDir, additionalAccountsWithDefault);
}

export async function setSandboxConfig(homeDir: string, config?: SandboxConfig): Promise<void> {
  // get NEAR_SANDBOX_MAX_PAYLOAD_SIZE and NEAR_SANDBOX_MAX_OPEN_FILES from config or environment variables
  // If not provided, use default values
  const maxPayloadSize =
    config?.additionalGenesis?.["maxPayloadSize"] ??
    1024 * 1024 * 1024;

  const maxOpenFiles =
    config?.additionalGenesis?.["maxOpenFiles"] ?? 3000;

  // create a json with these values
  let newJsonConfig: Record<string, any> = {
    rpc: {
      limits_config: {
        json_payload_max_size: maxPayloadSize,
      },
    },
    store: {
      max_open_files: maxOpenFiles,
    },
  };

  // if there is additionalConfig, merge it with the json
  if (config?.additionalConfig) {
    newJsonConfig = apply(newJsonConfig, config?.additionalConfig);
  }

  // overwrite the sandbox.json file in the homeDir
  await overwriteSandboxConfigJson(homeDir, newJsonConfig);
}

async function overwriteGenesis(
  homeDir: string,
  config?: SandboxConfig
): Promise<void> {
  const genesisPath = join(homeDir, 'genesis.json');
  const genesisRaw = await fs.readFile(genesisPath, 'utf-8');
  const genesisObj = JSON.parse(genesisRaw);

  let totalSupply = BigInt(genesisObj['total_supply']);
  if (totalSupply === null || totalSupply === undefined) {
    throw new TypedError("Total supply not found in default genesis.json", SandboxErrors.InvalidConfig);
  }

  const accountsToAdd: GenesisAccount[] = [
    GenesisAccount.createDefault(),
    ...(config?.additionalAccounts ?? [])
  ];

  for (const account of accountsToAdd) {
    totalSupply += account.balance;
  }
  genesisObj['total_supply'] = totalSupply.toString();

  if (!Array.isArray(genesisObj['records'])) {
    throw new TypedError("Expected 'records' to be an array in default genesis.json", SandboxErrors.InvalidConfig);
  }

  for (const acc of accountsToAdd) {
    genesisObj['records'].push({
      Account: {
        account_id: acc.accountId,
        account: {
          amount: acc.balance.toString(),
          locked: "0",
          code_hash: "11111111111111111111111111111111",
          storage_usage: 182
        }
      }
    });

    genesisObj['records'].push({
      AccessKey: {
        account_id: acc.accountId,
        public_key: acc.publicKey,
        access_key: {
          nonce: 0,
          permission: "FullAccess"
        }
      }
    });
  }

  if (config?.additionalGenesis) {
    apply(genesisObj, config?.additionalGenesis);
  }
  await fs.writeFile(genesisPath, JSON.stringify(genesisObj), 'utf-8');
}

async function saveAccountsKeys(homeDir: string, additionalAccountsWithDefault: GenesisAccount[]) {
  for (const account of additionalAccountsWithDefault) {
    const keyJson = {
      account_id: account.accountId,
      public_key: account.publicKey,
      private_key: account.privateKey
    };

    const fileName = `${account.accountId}.json`;
    const filePath = join(homeDir, fileName);
    const keyContent = JSON.stringify(keyJson, null, 2);

    await fs.writeFile(filePath, keyContent, 'utf-8');
  }
}

async function overwriteSandboxConfigJson(homeDir: string, jsonConfig: Record<string, any>) {
  const sandboxPath = join(homeDir, 'config.json');
  const sandboxRaw = await fs.readFile(sandboxPath, 'utf-8');
  const sandboxObj = JSON.parse(sandboxRaw);

  apply(sandboxObj, jsonConfig);
  await fs.writeFile(sandboxPath, JSON.stringify(sandboxObj), 'utf-8');
}

