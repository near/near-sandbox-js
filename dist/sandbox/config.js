"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSandboxConfig = exports.setSandboxGenesis = exports.overrideConfigs = exports.GenesisAccount = exports.DEFAULT_BALANCE = exports.DEFAULT_PRIVATE_KEY = exports.DEFAULT_PUBLIC_KEY = exports.DEFAULT_ACCOUNT_ID = void 0;
const tokens_1 = require("@near-js/tokens");
const crypto_1 = require("@near-js/crypto");
const path_1 = require("path");
const json_merge_patch_1 = require("json-merge-patch");
const fs = require("fs/promises");
const errors_1 = require("../errors");
/*
  * Network specific configurations used to modify behavior inside a chain.
  * This is so far only useable with sandbox networks since it would require
  * direct access to a node to change the config. Each network like mainnet
  * and testnet already have pre-configured settings; meanwhile sandbox can
  * have additional settings on top of them to facilitate custom behavior
  * such as sending large requests to the sandbox network.
  */
exports.DEFAULT_ACCOUNT_ID = 'sandbox';
exports.DEFAULT_PUBLIC_KEY = 'ed25519:5BGSaf6YjVm7565VzWQHNxoyEjwr3jUpRJSGjREvU9dB';
exports.DEFAULT_PRIVATE_KEY = 'ed25519:3tgdk2wPraJzT4nsTuf86UX41xgPNk3MHnq8epARMdBNs29AFEztAuaQ7iHddDfXG9F2RzV1XNQYgJyAyoW51UBB';
exports.DEFAULT_BALANCE = tokens_1.NEAR.toUnits(10000);
/*
  * Represents a genesis account in the NEAR sandbox.
  * Means it will saved as starting account in the genesis.json file.
  * accountId - The unique identifier for the account, it`s can be top-level account or sub-account.(e.g. "alice.near", "alice")
  * publicKey - The public part of the privateKey that will control the account.
  * privateKey - The private key used to sign transactions for the account.
  * balance - The initial balance of the account in yoctoNEAR.
  */
class GenesisAccount {
    constructor(accountId, publicKey, privateKey, balance) {
        Object.defineProperty(this, "accountId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "publicKey", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "privateKey", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "balance", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
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
    static createDefault(accountId) {
        return new GenesisAccount(accountId !== null && accountId !== void 0 ? accountId : exports.DEFAULT_ACCOUNT_ID, exports.DEFAULT_PUBLIC_KEY, exports.DEFAULT_PRIVATE_KEY, exports.DEFAULT_BALANCE);
    }
    /**
     * Creates a random genesis account with a unique account ID.
     * The account ID is generated based on the current time and a random number.
     * WARNING: Prefer using `createDefault` or defining 'GenesisAccount' from the scratch
     *
     * @param accountId Optional custom account ID, if not provided a random one will be generated.
     * @param balance Optional initial balance for the account, defaults to DEFAULT_BALANCE.
     * @returns A GenesisAccount instance with a random account ID and specified balance.
     */
    static createRandom(accountId, balance) {
        const finalAccountId = accountId !== null && accountId !== void 0 ? accountId : this._generateRandomAccountId();
        const finalBalance = balance !== undefined && balance !== null
            ? tokens_1.NEAR.toUnits(balance)
            : exports.DEFAULT_BALANCE;
        const keyPair = crypto_1.KeyPair.fromRandom('ed25519');
        const publicKey = keyPair.getPublicKey().toString();
        const privateKey = keyPair.toString();
        return new GenesisAccount(finalAccountId, publicKey, privateKey, finalBalance);
    }
    static _generateRandomAccountId() {
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
exports.GenesisAccount = GenesisAccount;
async function overrideConfigs(homeDir, config) {
    await setSandboxGenesis(homeDir, config);
    await setSandboxConfig(homeDir, config);
    if (config === null || config === void 0 ? void 0 : config.nodeKey) {
        await fs.writeFile((0, path_1.join)(homeDir, "node_key.json"), JSON.stringify(config.nodeKey, null, 2), 'utf-8');
    }
    if (config === null || config === void 0 ? void 0 : config.validatorKey) {
        await fs.writeFile((0, path_1.join)(homeDir, 'validator_key.json'), JSON.stringify(config.validatorKey, null, 2), 'utf-8');
    }
}
exports.overrideConfigs = overrideConfigs;
async function setSandboxGenesis(homeDir, config) {
    var _a;
    // This function modifies the genesis.json file in the specified homeDir
    await overwriteGenesis(homeDir, config);
    const additionalAccountsWithDefault = [
        GenesisAccount.createDefault(),
        ...((_a = config === null || config === void 0 ? void 0 : config.additionalAccounts) !== null && _a !== void 0 ? _a : [])
    ];
    // This function create an {accountId}.json file in the homeDir for each account
    await saveAccountsKeys(homeDir, additionalAccountsWithDefault);
}
exports.setSandboxGenesis = setSandboxGenesis;
async function setSandboxConfig(homeDir, config) {
    var _a, _b, _c, _d;
    // get NEAR_SANDBOX_MAX_PAYLOAD_SIZE and NEAR_SANDBOX_MAX_OPEN_FILES from config or environment variables
    // If not provided, use default values
    const maxPayloadSize = (_b = (_a = config === null || config === void 0 ? void 0 : config.maxPayloadSize) !== null && _a !== void 0 ? _a : parseEnv("NEAR_SANDBOX_MAX_PAYLOAD_SIZE", (s) => {
        const num = parseInt(s);
        if (isNaN(num)) {
            throw new errors_1.TypedError(`Invalid NEAR_SANDBOX_MAX_PAYLOAD_SIZE type`, errors_1.SandboxErrors.InvalidConfig);
        }
        return num;
    })) !== null && _b !== void 0 ? _b : 1024 * 1024 * 1024;
    const maxOpenFiles = (_d = (_c = config === null || config === void 0 ? void 0 : config.maxOpenFiles) !== null && _c !== void 0 ? _c : parseEnv("NEAR_SANDBOX_MAX_OPEN_FILES", (s) => {
        const num = parseInt(s);
        if (isNaN(num)) {
            throw new errors_1.TypedError(`Invalid NEAR_SANDBOX_MAX_OPEN_FILES type`, errors_1.SandboxErrors.InvalidConfig);
        }
        return num;
    })) !== null && _d !== void 0 ? _d : 3000;
    // create a json with these values
    let newJsonConfig = {
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
    if (config === null || config === void 0 ? void 0 : config.additionalConfig) {
        newJsonConfig = (0, json_merge_patch_1.apply)(newJsonConfig, config === null || config === void 0 ? void 0 : config.additionalConfig);
    }
    // overwrite the sandbox.json file in the homeDir
    await overwriteSandboxConfigJson(homeDir, newJsonConfig);
}
exports.setSandboxConfig = setSandboxConfig;
async function overwriteGenesis(homeDir, config) {
    var _a;
    const genesisPath = (0, path_1.join)(homeDir, 'genesis.json');
    const genesisRaw = await fs.readFile(genesisPath, 'utf-8');
    const genesisObj = JSON.parse(genesisRaw);
    let totalSupply = BigInt(genesisObj['total_supply']);
    if (totalSupply === null || totalSupply === undefined) {
        throw new errors_1.TypedError("Total supply not found in default genesis.json", errors_1.SandboxErrors.InvalidConfig);
    }
    const accountsToAdd = [
        GenesisAccount.createDefault(),
        ...((_a = config === null || config === void 0 ? void 0 : config.additionalAccounts) !== null && _a !== void 0 ? _a : [])
    ];
    for (const account of accountsToAdd) {
        totalSupply += account.balance;
    }
    genesisObj['total_supply'] = totalSupply.toString();
    if (!Array.isArray(genesisObj['records'])) {
        throw new errors_1.TypedError("Expected 'records' to be an array in default genesis.json", errors_1.SandboxErrors.InvalidConfig);
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
    if (config === null || config === void 0 ? void 0 : config.additionalGenesis) {
        (0, json_merge_patch_1.apply)(genesisObj, config === null || config === void 0 ? void 0 : config.additionalGenesis);
    }
    await fs.writeFile(genesisPath, JSON.stringify(genesisObj), 'utf-8');
}
async function saveAccountsKeys(homeDir, additionalAccountsWithDefault) {
    for (const account of additionalAccountsWithDefault) {
        const keyJson = {
            account_id: account.accountId,
            public_key: account.publicKey,
            private_key: account.privateKey
        };
        const fileName = `${account.accountId}.json`;
        const filePath = (0, path_1.join)(homeDir, fileName);
        const keyContent = JSON.stringify(keyJson, null, 2);
        await fs.writeFile(filePath, keyContent, 'utf-8');
    }
}
function parseEnv(key, parser) {
    const raw = process.env[key];
    if (raw === undefined || raw.trim() === '')
        return undefined;
    return parser(raw.trim());
}
async function overwriteSandboxConfigJson(homeDir, jsonConfig) {
    const sandboxPath = (0, path_1.join)(homeDir, 'config.json');
    const sandboxRaw = await fs.readFile(sandboxPath, 'utf-8');
    const sandboxObj = JSON.parse(sandboxRaw);
    (0, json_merge_patch_1.apply)(sandboxObj, jsonConfig);
    await fs.writeFile(sandboxPath, JSON.stringify(sandboxObj), 'utf-8');
}
