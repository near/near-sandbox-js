var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/sandbox/config.ts
import { NEAR } from "@near-js/tokens";
import { join } from "path";
import { apply } from "json-merge-patch";
import * as fs from "fs/promises";

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
var DEFAULT_BALANCE = NEAR.toUnits(1e4);
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
    await fs.writeFile(join(homeDir, "node_key.json"), JSON.stringify(config.nodeKey, null, 2), "utf-8");
  }
  if (config == null ? void 0 : config.validatorKey) {
    await fs.writeFile(join(homeDir, "validator_key.json"), JSON.stringify(config.validatorKey, null, 2), "utf-8");
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
    newJsonConfig = apply(newJsonConfig, config == null ? void 0 : config.additionalConfig);
  }
  await overwriteSandboxConfigJson(homeDir, newJsonConfig);
}
async function overwriteGenesis(homeDir, config) {
  var _a;
  const genesisPath = join(homeDir, "genesis.json");
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
    apply(genesisObj, config == null ? void 0 : config.additionalGenesis);
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
    const filePath = join(homeDir, fileName);
    const keyContent = JSON.stringify(keyJson, null, 2);
    await fs.writeFile(filePath, keyContent, "utf-8");
  }
}
async function overwriteSandboxConfigJson(homeDir, jsonConfig) {
  const sandboxPath = join(homeDir, "config.json");
  const sandboxRaw = await fs.readFile(sandboxPath, "utf-8");
  const sandboxObj = JSON.parse(sandboxRaw);
  apply(sandboxObj, jsonConfig);
  await fs.writeFile(sandboxPath, JSON.stringify(sandboxObj), "utf-8");
}

// src/binary/binaryUtils.ts
import { stat } from "fs/promises";
import * as os from "os";
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
    const f = await stat(filePath);
    return f.isFile();
  } catch {
    return false;
  }
}

// src/binary/binaryExecution.ts
import { spawn as spawn2 } from "child_process";

// src/binary/binary.ts
import { join as join2 } from "path";
import { promisify } from "util";
import * as stream from "stream";
import * as tar from "tar";
import got from "got";
import { existsSync } from "fs";
import { lock } from "proper-lockfile";
import * as fs2 from "fs/promises";
import { spawn } from "child_process";
import { dir } from "tmp-promise";
var pipeline2 = promisify(stream.pipeline);
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
  const dirToDownload = await dir();
  try {
    await pipeline2(
      got.stream(url),
      new stream.PassThrough(),
      tar.x({ strip: 1, C: dirToDownload.path })
    );
    const pathToDownloadedFile = join2(dirToDownload.path, "near-sandbox");
    const destinationFilePath = join2(
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
  const binPath2 = join2(await getDownloadPath(version), "near-sandbox");
  return binPath2;
}
async function getDownloadPath(version) {
  var _a;
  const baseDir = (_a = process.env["DIR_TO_DOWNLOAD_BINARY"]) != null ? _a : join2(__dirname, "..", "..", "bin");
  const dirToDownloadBin = join2(baseDir, `near-sandbox-${version}`);
  await fs2.mkdir(dirToDownloadBin, { recursive: true });
  return dirToDownloadBin;
}
async function binPath(version) {
  const pathFromEnv = process.env["NEAR_SANDBOX_BIN_PATH"];
  if (pathFromEnv) {
    if (!existsSync(pathFromEnv)) {
      throw new TypedError(
        `NEAR_SANDBOX_BIN_PATH does not exist.`,
        "BinaryNotFound" /* BinaryNotFound */,
        new Error(`${pathFromEnv} does not exist`)
      );
    }
    return pathFromEnv;
  }
  const binPath2 = getDownloadPath(version).then((dir3) => join2(dir3, "near-sandbox"));
  return binPath2;
}
async function checkForVersion(version) {
  const fromEnv = process.env["NEAR_SANDBOX_BIN_PATH"];
  if (fromEnv) {
    return fromEnv;
  }
  const downloadPath = await getDownloadPath(version);
  const binPath2 = join2(downloadPath, "near-sandbox");
  if (await fileExists(binPath2)) {
    return binPath2;
  }
  return void 0;
}
async function installable(binPath2) {
  if (existsSync(binPath2)) {
    return null;
  }
  const lockPath = `${binPath2}.lock`;
  let release;
  try {
    if (!existsSync(lockPath)) {
      await fs2.writeFile(lockPath, "");
    }
    release = await lock(lockPath, {
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
  if (existsSync(binPath2)) {
    await release();
    return null;
  }
  return release;
}
async function pingBin(binPath2) {
  return new Promise((resolve, reject) => {
    const proc = spawn(binPath2, ["--version"]);
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
import { join as join3 } from "path";
async function initConfigsWithVersion(version, dirPath) {
  const bin = await ensureBinWithVersion(version);
  const result = spawn2(bin, ["--home", dirPath, "init", "--fast"], { stdio: [null, null, "pipe"] });
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
    const filePath = join3(dirPath, filename);
    if (await fileExists(filePath)) continue;
    throw new Error(`Expected file "${filename}" was not created in ${dirPath}`);
  }
}
async function spawnWithArgsAndVersion(version, args, stdio = ["ignore", "ignore", "pipe"]) {
  var _a;
  const binPath2 = await ensureBinWithVersion(version);
  const isDebug = process.env["NEAR_ENABLE_SANDBOX_LOG"] === "1";
  const child = spawn2(binPath2, args, {
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
import { existsSync as existsSync2 } from "fs";
import * as fs3 from "fs/promises";
import * as net from "net";
import { join as join4 } from "path";
import { tmpdir } from "os";
import { lock as lock2 } from "proper-lockfile";
import { readFile as readFile2 } from "fs/promises";
import { dir as dir2 } from "tmp-promise";
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
    await lock2(lockFilePath);
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
      await lock2(lockFilePath);
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
  const lockFilePath = join4(tmpdir(), `near-sandbox-port-${port}.lock`);
  if (!existsSync2(lockFilePath)) {
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
    readFile2(join4(pathToState, "output/genesis.json"), "utf-8").then(JSON.parse),
    readFile2(join4(pathToState, "output/config.json"), "utf-8").then(JSON.parse),
    readFile2(join4(pathToState, "output/node_key.json"), "utf-8").then(JSON.parse),
    readFile2(join4(pathToState, "output/validator_key.json"), "utf-8").then(JSON.parse),
    readFile2(join4(pathToState, "output/records.json"), "utf-8").then(JSON.parse)
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
  return dir2({ unsafeCleanup: true, name });
}

// src/sandbox/Sandbox.ts
import { unlock } from "proper-lockfile";
import { rm } from "fs/promises";
import got2 from "got";
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
      unlock(this.rpcPortLockPath),
      unlock(this.netPortLockPath)
    ]);
  }
  /**
   * Calls `stop()` to terminate the sandbox and then cleans up the home directory.
   */
  async tearDown() {
    await this.stop();
    await rm(this.homeDir, { recursive: true, force: true }).catch((error) => {
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
        const response = await got2(`${rpcUrl}/status`, { throwHttpErrors: false });
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
export {
  DEFAULT_ACCOUNT_ID,
  DEFAULT_BALANCE,
  DEFAULT_NEAR_SANDBOX_VERSION2 as DEFAULT_NEAR_SANDBOX_VERSION,
  DEFAULT_PRIVATE_KEY,
  DEFAULT_PUBLIC_KEY,
  GenesisAccount,
  Sandbox
};
