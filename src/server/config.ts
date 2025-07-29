import { NEAR } from "@near-js/tokens";
import { KeyPair } from "@near-js/crypto";
import { join } from "path";
import { apply } from "json-merge-patch"
import * as fs from "fs/promises";
import { SandboxErrors, TypedError } from "../errors";

export const DEFAULT_ACCOUNT_ID = 'sandbox';
export const DEFAULT_PUBLIC_KEY = 'ed25519:5BGSaf6YjVm7565VzWQHNxoyEjwr3jUpRJSGjREvU9dB';
export const DEFAULT_PRIVATE_KEY = 'ed25519:3tgdk2wPraJzT4nsTuf86UX41xgPNk3MHnq8epARMdBNs29AFEztAuaQ7iHddDfXG9F2RzV1XNQYgJyAyoW51UBB';
export const DEFAULT_BALANCE = NEAR.toUnits(10000);


export class GenesisAccount {
  accountId: string; //Document this and reference to official NEAR documentation
  publicKey: string;
  privateKey: string;
  balance: bigint; //balance in yoctoNEAR

  constructor(accountId: string, publicKey: string, privateKey: string, balance: bigint) {
    this.accountId = accountId;
    this.publicKey = publicKey;
    this.privateKey = privateKey;
    this.balance = balance;
  }

  static createDefault(accountId?: string): GenesisAccount {
    return new GenesisAccount(
      accountId ?? DEFAULT_ACCOUNT_ID,
      DEFAULT_PUBLIC_KEY,
      DEFAULT_PRIVATE_KEY,
      DEFAULT_BALANCE
    );
  }

  // balance in near
  static createRandom(accountId?: string, balance?: string | number): GenesisAccount {
    const finalAccountId = accountId ?? this._generateRandomAccountId();
    const finalBalance =
      balance !== undefined && balance !== null
        ? NEAR.toUnits(balance)
        : DEFAULT_BALANCE;
    const keyPair = KeyPair.fromRandom('ed25519');
    const publicKey = keyPair.getPublicKey().toString();
    const privateKey = keyPair.toString();

    return new GenesisAccount(
      finalAccountId,
      publicKey,
      privateKey,
      finalBalance
    );
  }

  private static _generateRandomAccountId(): string {
    const now = new Date();
    const timeStr = [
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    ]
      .map(unit => unit.toString().padStart(2, '0'))
      .join('');

    const randomNum = Math.floor(Math.random() * 0xFFFFFFFF);
    return `dev-acc-${timeStr}-${randomNum}.sandbox`;
  }

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
    config?.maxPayloadSize ??
    parseEnv<number>("NEAR_SANDBOX_MAX_PAYLOAD_SIZE", (s) => {
      const num = parseInt(s);
      if (isNaN(num)) {
        throw new TypedError(`Invalid NEAR_SANDBOX_MAX_PAYLOAD_SIZE type`, SandboxErrors.InvalidConfig);
      }
      return num;
    }) ??
    1024 * 1024 * 1024;

  const maxOpenFiles =
    config?.maxOpenFiles ??
    parseEnv<number>("NEAR_SANDBOX_MAX_OPEN_FILES", (s) => {
      const num = parseInt(s);
      if (isNaN(num)) {
        throw new TypedError(`Invalid NEAR_SANDBOX_MAX_OPEN_FILES type`, SandboxErrors.InvalidConfig);
      }
      return num;
    }) ??
    3000;

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

function parseEnv<T>(key: string, parser: (value: string) => T | undefined): T | undefined {
  const raw = process.env[key];
  if (raw === undefined || raw.trim() === '') return undefined;
  return parser(raw.trim());

}
async function overwriteSandboxConfigJson(homeDir: string, jsonConfig: Record<string, any>) {
  const sandboxPath = join(homeDir, 'config.json');
  const sandboxRaw = await fs.readFile(sandboxPath, 'utf-8');
  const sandboxObj = JSON.parse(sandboxRaw);

  apply(sandboxObj, jsonConfig);
  await fs.writeFile(sandboxPath, JSON.stringify(sandboxObj), 'utf-8');
}

