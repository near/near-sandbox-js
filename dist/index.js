"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  DEFAULT_ACCOUNT_ID: () => DEFAULT_ACCOUNT_ID,
  DEFAULT_BALANCE: () => DEFAULT_BALANCE,
  DEFAULT_NEAR_SANDBOX_VERSION: () => DEFAULT_NEAR_SANDBOX_VERSION2,
  DEFAULT_PRIVATE_KEY: () => DEFAULT_PRIVATE_KEY,
  DEFAULT_PUBLIC_KEY: () => DEFAULT_PUBLIC_KEY,
  GenesisAccount: () => GenesisAccount,
  Sandbox: () => Sandbox
});
module.exports = __toCommonJS(index_exports);

// src/sandbox/config.ts
var import_tokens = require("@near-js/tokens");
var import_path = require("path");
var import_json_merge_patch = require("json-merge-patch");
var fs = __toESM(require("fs/promises"));

// src/errors.ts
var TypedError = class extends Error {
  constructor(message, type2, cause) {
    super(message);
    __publicField(this, "type");
    __publicField(this, "cause");
    this.type = type2 || "UntypedError";
    this.cause = cause;
  }
};

// src/sandbox/config.ts
var DEFAULT_ACCOUNT_ID = "sandbox";
var DEFAULT_PUBLIC_KEY = "ed25519:5BGSaf6YjVm7565VzWQHNxoyEjwr3jUpRJSGjREvU9dB";
var DEFAULT_PRIVATE_KEY = "ed25519:3tgdk2wPraJzT4nsTuf86UX41xgPNk3MHnq8epARMdBNs29AFEztAuaQ7iHddDfXG9F2RzV1XNQYgJyAyoW51UBB";
var DEFAULT_BALANCE = import_tokens.NEAR.toUnits(1e4);
var GenesisAccount = class _GenesisAccount {
  constructor(accountId, publicKey, privateKey, balance) {
    __publicField(this, "accountId");
    __publicField(this, "publicKey");
    __publicField(this, "privateKey");
    __publicField(this, "balance");
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
    return new _GenesisAccount(
      accountId != null ? accountId : DEFAULT_ACCOUNT_ID,
      DEFAULT_PUBLIC_KEY,
      DEFAULT_PRIVATE_KEY,
      DEFAULT_BALANCE
    );
  }
};
async function overrideConfigs(homeDir, config) {
  await setSandboxGenesis(homeDir, config);
  await setSandboxConfig(homeDir, config);
  if (config == null ? void 0 : config.nodeKey) {
    await fs.writeFile((0, import_path.join)(homeDir, "node_key.json"), JSON.stringify(config.nodeKey, null, 2), "utf-8");
  }
  if (config == null ? void 0 : config.validatorKey) {
    await fs.writeFile((0, import_path.join)(homeDir, "validator_key.json"), JSON.stringify(config.validatorKey, null, 2), "utf-8");
  }
}
async function setSandboxGenesis(homeDir, config) {
  var _a;
  await overwriteGenesis(homeDir, config);
  const additionalAccountsWithDefault = [
    GenesisAccount.createDefault(),
    ...(_a = config == null ? void 0 : config.additionalAccounts) != null ? _a : []
  ];
  await saveAccountsKeys(homeDir, additionalAccountsWithDefault);
}
async function setSandboxConfig(homeDir, config) {
  var _a, _b, _c, _d;
  const maxPayloadSize = (_b = (_a = config == null ? void 0 : config.additionalGenesis) == null ? void 0 : _a["maxPayloadSize"]) != null ? _b : 1024 * 1024 * 1024;
  const maxOpenFiles = (_d = (_c = config == null ? void 0 : config.additionalGenesis) == null ? void 0 : _c["maxOpenFiles"]) != null ? _d : 3e3;
  let newJsonConfig = {
    rpc: {
      limits_config: {
        json_payload_max_size: maxPayloadSize
      }
    },
    store: {
      max_open_files: maxOpenFiles
    }
  };
  if (config == null ? void 0 : config.additionalConfig) {
    newJsonConfig = (0, import_json_merge_patch.apply)(newJsonConfig, config == null ? void 0 : config.additionalConfig);
  }
  await overwriteSandboxConfigJson(homeDir, newJsonConfig);
}
async function overwriteGenesis(homeDir, config) {
  var _a;
  const genesisPath = (0, import_path.join)(homeDir, "genesis.json");
  const genesisRaw = await fs.readFile(genesisPath, "utf-8");
  const genesisObj = JSON.parse(genesisRaw);
  let totalSupply = BigInt(genesisObj["total_supply"]);
  if (totalSupply === null || totalSupply === void 0) {
    throw new TypedError("Total supply not found in default genesis.json", "InvalidConfig" /* InvalidConfig */);
  }
  const accountsToAdd = [
    GenesisAccount.createDefault(),
    ...(_a = config == null ? void 0 : config.additionalAccounts) != null ? _a : []
  ];
  for (const account of accountsToAdd) {
    totalSupply += account.balance;
  }
  genesisObj["total_supply"] = totalSupply.toString();
  if (!Array.isArray(genesisObj["records"])) {
    throw new TypedError("Expected 'records' to be an array in default genesis.json", "InvalidConfig" /* InvalidConfig */);
  }
  for (const acc of accountsToAdd) {
    genesisObj["records"].push({
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
    genesisObj["records"].push({
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
  if (config == null ? void 0 : config.additionalGenesis) {
    (0, import_json_merge_patch.apply)(genesisObj, config == null ? void 0 : config.additionalGenesis);
  }
  await fs.writeFile(genesisPath, JSON.stringify(genesisObj), "utf-8");
}
async function saveAccountsKeys(homeDir, additionalAccountsWithDefault) {
  for (const account of additionalAccountsWithDefault) {
    const keyJson = {
      account_id: account.accountId,
      public_key: account.publicKey,
      private_key: account.privateKey
    };
    const fileName = `${account.accountId}.json`;
    const filePath = (0, import_path.join)(homeDir, fileName);
    const keyContent = JSON.stringify(keyJson, null, 2);
    await fs.writeFile(filePath, keyContent, "utf-8");
  }
}
async function overwriteSandboxConfigJson(homeDir, jsonConfig) {
  const sandboxPath = (0, import_path.join)(homeDir, "config.json");
  const sandboxRaw = await fs.readFile(sandboxPath, "utf-8");
  const sandboxObj = JSON.parse(sandboxRaw);
  (0, import_json_merge_patch.apply)(sandboxObj, jsonConfig);
  await fs.writeFile(sandboxPath, JSON.stringify(sandboxObj), "utf-8");
}

// src/binary/binaryUtils.ts
var import_promises = require("fs/promises");
var os = __toESM(require("os"));
var DEFAULT_NEAR_SANDBOX_VERSION = "2.6.5";
function getPlatform() {
  const type2 = os.type();
  const arch2 = os.arch();
  if (type2 === "Linux" && arch2 === "x64") {
    return [type2, "x86_64"];
  } else if (type2 === "Darwin" && arch2 === "arm64") {
    return [type2, "arm64"];
  }
  throw new Error("Only linux-x86 and darwin-arm are supported");
}
function AWSUrl(version = DEFAULT_NEAR_SANDBOX_VERSION) {
  const [platform, arch2] = getPlatform();
  return `https://s3-us-west-1.amazonaws.com/build.nearprotocol.com/nearcore/${platform}-${arch2}/${version}/near-sandbox.tar.gz`;
}
async function fileExists(filePath) {
  try {
    const f = await (0, import_promises.stat)(filePath);
    return f.isFile();
  } catch {
    return false;
  }
}

// src/binary/binaryExecution.ts
var import_child_process2 = require("child_process");

// src/binary/binary.ts
var import_path2 = require("path");
var import_util = require("util");
var stream = __toESM(require("stream"));
var tar = __toESM(require("tar"));
var import_got = __toESM(require("got"));
var import_fs = require("fs");
var import_proper_lockfile = require("proper-lockfile");
var fs2 = __toESM(require("fs/promises"));
var import_child_process = require("child_process");
var import_tmp_promise = require("tmp-promise");
var pipeline2 = (0, import_util.promisify)(stream.pipeline);
async function downloadBin(version) {
  const existingFile = await checkForVersion(version);
  if (existingFile) {
    return existingFile;
  }
  let url;
  const fromEnv = process.env["SANDBOX_ARTIFACT_URL"];
  if (fromEnv) {
    url = fromEnv;
  } else {
    url = AWSUrl(version);
  }
  const dirToDownload = await (0, import_tmp_promise.dir)();
  try {
    await pipeline2(
      import_got.default.stream(url),
      new stream.PassThrough(),
      tar.x({ strip: 1, C: dirToDownload.path })
    );
    const pathToDownloadedFile = (0, import_path2.join)(dirToDownload.path, "near-sandbox");
    const destinationFilePath = (0, import_path2.join)(
      await getDownloadPath(version),
      "near-sandbox"
    );
    await fs2.rename(pathToDownloadedFile, destinationFilePath);
  } catch (error) {
    throw new TypedError(
      `Failed to download binary. Check Url and version`,
      "DownloadFailed" /* DownloadFailed */,
      error instanceof Error ? error : new Error(String(error))
    );
  }
  const binPath2 = (0, import_path2.join)(await getDownloadPath(version), "near-sandbox");
  return binPath2;
}
async function getDownloadPath(version) {
  var _a;
  const baseDir = (_a = process.env["DIR_TO_DOWNLOAD_BINARY"]) != null ? _a : (0, import_path2.join)(__dirname, "..", "..", "bin");
  const dirToDownloadBin = (0, import_path2.join)(baseDir, `near-sandbox-${version}`);
  await fs2.mkdir(dirToDownloadBin, { recursive: true });
  return dirToDownloadBin;
}
async function binPath(version) {
  const pathFromEnv = process.env["NEAR_SANDBOX_BIN_PATH"];
  if (pathFromEnv) {
    if (!(0, import_fs.existsSync)(pathFromEnv)) {
      throw new TypedError(
        `NEAR_SANDBOX_BIN_PATH does not exist.`,
        "BinaryNotFound" /* BinaryNotFound */,
        new Error(`${pathFromEnv} does not exist`)
      );
    }
    return pathFromEnv;
  }
  const binPath2 = getDownloadPath(version).then((dir3) => (0, import_path2.join)(dir3, "near-sandbox"));
  return binPath2;
}
async function checkForVersion(version) {
  const fromEnv = process.env["NEAR_SANDBOX_BIN_PATH"];
  if (fromEnv) {
    return fromEnv;
  }
  const downloadPath = await getDownloadPath(version);
  const binPath2 = (0, import_path2.join)(downloadPath, "near-sandbox");
  if (await fileExists(binPath2)) {
    return binPath2;
  }
  return void 0;
}
async function installable(binPath2) {
  if ((0, import_fs.existsSync)(binPath2)) {
    return null;
  }
  const lockPath = `${binPath2}.lock`;
  let release;
  try {
    if (!(0, import_fs.existsSync)(lockPath)) {
      await fs2.writeFile(lockPath, "");
    }
    release = await (0, import_proper_lockfile.lock)(lockPath, {
      retries: {
        retries: 100,
        factor: 3,
        minTimeout: 200,
        maxTimeout: 2 * 1e3,
        randomize: true
      }
    });
  } catch (error) {
    throw new TypedError(
      `Failed to acquire lock for downloading the binary.`,
      "LockFailed" /* LockFailed */,
      error instanceof Error ? error : new Error(String(error))
    );
  }
  if ((0, import_fs.existsSync)(binPath2)) {
    await release();
    return null;
  }
  return release;
}
async function pingBin(binPath2) {
  return new Promise((resolve, reject) => {
    const proc = (0, import_child_process.spawn)(binPath2, ["--version"]);
    let errorOutput = "";
    proc.stderr.on("data", (chunk) => errorOutput += chunk.toString());
    proc.on("error", (err) => {
      reject(err);
    });
    proc.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
      } else if (signal) {
        reject(new Error(`Binary was terminated by signal: ${signal}`));
      } else {
        reject(new Error(`Binary exited with code ${code}. Stderr: ${errorOutput}`));
      }
    });
  });
}
async function ensureBinWithVersion(version) {
  let _binPath = await binPath(version);
  const release = await installable(_binPath);
  if (release) {
    _binPath = await downloadBin(version);
    process.env["NEAR_SANDBOX_BIN_PATH"] = _binPath;
    await release();
  }
  try {
    await pingBin(_binPath);
  } catch (error) {
    throw new TypedError(
      `Binary doesn't respond, probably is corrupted. Try re-downloading`,
      "RunningFailed" /* RunningFailed */,
      error instanceof Error ? error : new Error(String(error))
    );
  }
  return _binPath;
}

// src/binary/binaryExecution.ts
var import_path3 = require("path");
async function initConfigsWithVersion(version, dirPath) {
  const bin = await ensureBinWithVersion(version);
  const result = (0, import_child_process2.spawn)(bin, ["--home", dirPath, "init", "--fast"], { stdio: [null, null, "pipe"] });
  await new Promise((resolve, reject) => {
    result.on("close", (code) => {
      if (code === 0) resolve();
      else reject();
    });
    result.on("error", (error) => {
      reject(error);
    });
  });
  const expectedFiles = ["config.json", "genesis.json"];
  for (const filename of expectedFiles) {
    const filePath = (0, import_path3.join)(dirPath, filename);
    if (await fileExists(filePath)) continue;
    throw new Error(`Expected file "${filename}" was not created in ${dirPath}`);
  }
}
async function spawnWithArgsAndVersion(version, args, stdio = ["ignore", "ignore", "pipe"]) {
  var _a;
  const binPath2 = await ensureBinWithVersion(version);
  const isDebug = process.env["NEAR_ENABLE_SANDBOX_LOG"] === "1";
  const child = (0, import_child_process2.spawn)(binPath2, args, {
    stdio: isDebug ? "inherit" : stdio
  });
  if (!isDebug) {
    (_a = child.stderr) == null ? void 0 : _a.on("error", (chunk) => {
      console.error(`Sandbox stderr: ${chunk.toString()}`);
    });
  }
  child.on("error", (err) => {
    throw new TypedError(
      `Failed to spawn sandbox process: ${err}`,
      "UntypedError",
      err instanceof Error ? err : new Error(String(err))
    );
  });
  return child;
}

// src/sandbox/sandboxUtils.ts
var import_fs2 = require("fs");
var fs3 = __toESM(require("fs/promises"));
var net = __toESM(require("net"));
var import_path4 = require("path");
var import_os = require("os");
var import_proper_lockfile2 = require("proper-lockfile");
var import_promises2 = require("fs/promises");
var import_tmp_promise2 = require("tmp-promise");
var DEFAULT_RPC_HOST = "127.0.0.1";
function rpcSocket(port) {
  return `${DEFAULT_RPC_HOST}:${port}`;
}
async function acquireOrLockPort(port) {
  return port ? tryAcquireSpecificPort(port) : acquireUnusedPort();
}
async function tryAcquireSpecificPort(port) {
  const checkedPort = await resolveAvailablePort({ port, host: DEFAULT_RPC_HOST });
  if (checkedPort !== port) {
    throw new TypedError(`Port ${port} is not available`, "PortNotAvailable" /* PortNotAvailable */);
  }
  const lockFilePath = await createLockFileForPort(port);
  try {
    await (0, import_proper_lockfile2.lock)(lockFilePath);
    return { port, lockFilePath };
  } catch {
    throw new TypedError(`Failed to lock port ${port}. It may already be in use.`, "LockFailed" /* LockFailed */);
  }
}
async function acquireUnusedPort() {
  const errors = [];
  const MAX_ATTEMPTS = 10;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      const port = await resolveAvailablePort({ port: 0, host: DEFAULT_RPC_HOST });
      const lockFilePath = await createLockFileForPort(port);
      await (0, import_proper_lockfile2.lock)(lockFilePath);
      return { port, lockFilePath };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new TypedError(
    `Failed to acquire an unused port after ${MAX_ATTEMPTS} attempts`,
    "PortAcquisitionFailed" /* PortAcquisitionFailed */,
    new Error(errors.map((msg, i) => `Attempt ${i + 1}: ${msg}`).join("\n"))
  );
}
async function resolveAvailablePort(options) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", (err) => reject(err));
    server.listen(options, () => {
      const addr = server.address();
      if (typeof addr === "object" && addr !== null && typeof addr.port === "number") {
        const { port } = addr;
        server.close(() => resolve(port));
      } else {
        server.close();
        reject(new TypedError("Could not determine assigned port.", "PortAcquisitionFailed" /* PortAcquisitionFailed */));
      }
    });
  });
}
async function createLockFileForPort(port) {
  const lockFilePath = (0, import_path4.join)((0, import_os.tmpdir)(), `near-sandbox-port-${port}.lock`);
  if (!(0, import_fs2.existsSync)(lockFilePath)) {
    await fs3.writeFile(lockFilePath, "");
  }
  return lockFilePath;
}
async function dumpStateFromPath(pathToState) {
  await new Promise(async (resolve, reject) => {
    const proc = await spawnWithArgsAndVersion("2.6.5", ["--home", pathToState, "view-state", "dump-state", "--stream"]);
    proc.on("error", reject);
    proc.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
  const [genesis, config, nodeKey, validatorKey, records] = await Promise.all([
    (0, import_promises2.readFile)((0, import_path4.join)(pathToState, "output/genesis.json"), "utf-8").then(JSON.parse),
    (0, import_promises2.readFile)((0, import_path4.join)(pathToState, "output/config.json"), "utf-8").then(JSON.parse),
    (0, import_promises2.readFile)((0, import_path4.join)(pathToState, "output/node_key.json"), "utf-8").then(JSON.parse),
    (0, import_promises2.readFile)((0, import_path4.join)(pathToState, "output/validator_key.json"), "utf-8").then(JSON.parse),
    (0, import_promises2.readFile)((0, import_path4.join)(pathToState, "output/records.json"), "utf-8").then(JSON.parse)
  ]);
  if (!Array.isArray(genesis.records)) genesis.records = [];
  genesis.records.push(...records);
  return {
    config,
    genesis,
    nodeKey,
    validatorKey
  };
}
async function createTmpDir() {
  const now = /* @__PURE__ */ new Date();
  const timestamp = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;
  const random = Math.random().toString(36).substring(2, 8);
  const name = `near-sandbox-${timestamp}-${random}`;
  return (0, import_tmp_promise2.dir)({ unsafeCleanup: true, name });
}

// src/sandbox/Sandbox.ts
var import_proper_lockfile3 = require("proper-lockfile");
var import_promises3 = require("fs/promises");
var import_got2 = __toESM(require("got"));
var DEFAULT_NEAR_SANDBOX_VERSION2 = "2.6.5";
var Sandbox = class _Sandbox {
  constructor(rpcUrl, homeDir, childProcess, rpcPortLock, netPortLock) {
    __publicField(this, "rpcUrl");
    __publicField(this, "homeDir");
    __publicField(this, "rpcPortLockPath");
    __publicField(this, "netPortLockPath");
    __publicField(this, "childProcess");
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
    const version = params.version || DEFAULT_NEAR_SANDBOX_VERSION2;
    const tmpDir = await this.initConfigsWithVersion(version);
    const { port: rpcPort, lockFilePath: rpcPortLock } = await acquireOrLockPort(config == null ? void 0 : config.rpcPort);
    const { port: netPort, lockFilePath: netPortLock } = await acquireOrLockPort(config == null ? void 0 : config.netPort);
    const rpcAddr = rpcSocket(rpcPort);
    const netAddr = rpcSocket(netPort);
    await overrideConfigs(tmpDir.path, config);
    const args = ["--home", tmpDir.path, "run", "--rpc-addr", rpcAddr, "--network-addr", netAddr];
    const childProcess = await spawnWithArgsAndVersion(version, args);
    const rpcUrl = `http://${rpcAddr}`;
    await this.waitUntilReady(rpcUrl);
    return new _Sandbox(rpcUrl, tmpDir.path, childProcess, rpcPortLock, netPortLock);
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
    return dumpStateFromPath(this.homeDir);
  }
  /**
   * Destroys the running sandbox environment by:
   * - Killing the child process, waiting for it to exit
   * - Unlocking the previously locked ports
   */
  async stop() {
    this.childProcess.kill();
    await new Promise((resolve) => this.childProcess.once("exit", resolve));
    await Promise.allSettled([
      (0, import_proper_lockfile3.unlock)(this.rpcPortLockPath),
      (0, import_proper_lockfile3.unlock)(this.netPortLockPath)
    ]);
  }
  /**
   * Calls `stop()` to terminate the sandbox and then cleans up the home directory.
   */
  async tearDown() {
    await this.stop();
    await (0, import_promises3.rm)(this.homeDir, { recursive: true, force: true }).catch((error) => {
      throw new TypedError(
        `Sandbox teardown encountered errors`,
        "TearDownFailed" /* TearDownFailed */,
        error instanceof Error ? error : new Error(String(error))
      );
    });
  }
  static async initConfigsWithVersion(version) {
    const tmpDir = await createTmpDir();
    await initConfigsWithVersion(version, tmpDir.path);
    return tmpDir;
  }
  static async waitUntilReady(rpcUrl) {
    const timeoutSecs = parseInt(process.env["NEAR_RPC_TIMEOUT_SECS"] || "10");
    const attempts = timeoutSecs * 2;
    let lastError = null;
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await (0, import_got2.default)(`${rpcUrl}/status`, { throwHttpErrors: false });
        if (response.statusCode >= 200 && response.statusCode < 300) {
          return;
        }
      } catch (error) {
        lastError = error;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new TypedError(
      "Sandbox failed to become ready within the timeout period.",
      "RunFailed" /* RunFailed */,
      lastError instanceof Error ? lastError : new Error(String(lastError))
    );
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_ACCOUNT_ID,
  DEFAULT_BALANCE,
  DEFAULT_NEAR_SANDBOX_VERSION,
  DEFAULT_PRIVATE_KEY,
  DEFAULT_PUBLIC_KEY,
  GenesisAccount,
  Sandbox
});
