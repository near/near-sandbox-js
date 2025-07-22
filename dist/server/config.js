"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSandboxConfig = exports.setSandboxGenesis = exports.GenesisAccount = exports.DEFAULT_BALANCE = exports.DEFAULT_PRIVATE_KEY = exports.DEFAULT_PUBLIC_KEY = exports.DEFAULT_ACCOUNT_ID = void 0;
const tokens_1 = require("@near-js/tokens");
const crypto_1 = require("@near-js/crypto");
const path_1 = require("path");
const json_merge_patch_1 = require("json-merge-patch");
const fs = require("fs/promises");
exports.DEFAULT_ACCOUNT_ID = 'sandbox';
exports.DEFAULT_PUBLIC_KEY = 'ed25519:5BGSaf6YjVm7565VzWQHNxoyEjwr3jUpRJSGjREvU9dB';
exports.DEFAULT_PRIVATE_KEY = 'ed25519:3tgdk2wPraJzT4nsTuf86UX41xgPNk3MHnq8epARMdBNs29AFEztAuaQ7iHddDfXG9F2RzV1XNQYgJyAyoW51UBB';
exports.DEFAULT_BALANCE = tokens_1.NEAR.toUnits(10000);
class GenesisAccount {
    constructor(accountId, publicKey, privateKey, balance) {
        Object.defineProperty(this, "accountId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        }); //Document this and reference to official NEAR documentation
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
        }); //NEAR balance in yoctoNEAR
        this.accountId = accountId;
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.balance = balance;
    }
    static createDefault(accountId) {
        return new GenesisAccount(accountId !== null && accountId !== void 0 ? accountId : exports.DEFAULT_ACCOUNT_ID, exports.DEFAULT_PUBLIC_KEY, exports.DEFAULT_PRIVATE_KEY, exports.DEFAULT_BALANCE);
    }
    // balance in near
    static random(accountId, balance) {
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
async function setSandboxGenesis(homeDir, // Path to the genesis.json directory
config) {
    var _a;
    // This function  modify the genesis.json file in the specified homeDir
    await overwriteGenesis(homeDir, config);
    const additionalAccountsWithDefault = [
        GenesisAccount.createDefault(),
        ...((_a = config === null || config === void 0 ? void 0 : config.additionalAccounts) !== null && _a !== void 0 ? _a : [])
    ];
    // This function create an {accountId}.json file in the homeDir
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
            throw new Error(`Invalid NEAR_SANDBOX_MAX_PAYLOAD_SIZE type: ${s}`);
        }
        return num;
    })) !== null && _b !== void 0 ? _b : 1024 * 1024 * 1024;
    const maxOpenFiles = (_d = (_c = config === null || config === void 0 ? void 0 : config.maxOpenFiles) !== null && _c !== void 0 ? _c : parseEnv("NEAR_SANDBOX_MAX_OPEN_FILES", (s) => {
        const num = parseInt(s);
        if (isNaN(num)) {
            throw new Error(`Invalid NEAR_SANDBOX_MAX_OPEN_FILES type: ${s}`);
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
        throw new Error("Total supply not found in genesis.json");
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
        throw new Error("Expected 'records' to be an array in genesis.json");
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
        try {
            await fs.writeFile(filePath, keyContent, 'utf-8');
        }
        catch (err) {
            throw new Error(`Failed to write key file for ${account.accountId}: ${err.message}`);
        }
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
