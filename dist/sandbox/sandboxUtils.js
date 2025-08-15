"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTmpDir = exports.dumpStateFromPath = exports.acquireOrLockPort = exports.rpcSocket = void 0;
const fs_1 = require("fs");
const fs = require("fs/promises");
const net = require("net");
const path_1 = require("path");
const os_1 = require("os");
const proper_lockfile_1 = require("proper-lockfile");
const errors_1 = require("../errors");
const binaryExecution_1 = require("../binary/binaryExecution");
const promises_1 = require("fs/promises");
const tmp_promise_1 = require("tmp-promise");
const DEFAULT_RPC_HOST = '127.0.0.1';
function rpcSocket(port) {
    return `${DEFAULT_RPC_HOST}:${port}`;
}
exports.rpcSocket = rpcSocket;
async function acquireOrLockPort(port) {
    return port
        ? tryAcquireSpecificPort(port)
        : acquireUnusedPort();
}
exports.acquireOrLockPort = acquireOrLockPort;
async function tryAcquireSpecificPort(port) {
    const checkedPort = await resolveAvailablePort({ port, host: DEFAULT_RPC_HOST });
    if (checkedPort !== port) {
        throw new errors_1.TypedError(`Port ${port} is not available`, errors_1.TcpAndLockErrors.PortNotAvailable);
    }
    const lockFilePath = await createLockFileForPort(port);
    try {
        await (0, proper_lockfile_1.lock)(lockFilePath);
        return { port, lockFilePath };
    }
    catch {
        throw new errors_1.TypedError(`Failed to lock port ${port}. It may already be in use.`, errors_1.TcpAndLockErrors.LockFailed);
    }
}
async function acquireUnusedPort() {
    const errors = [];
    const MAX_ATTEMPTS = 10;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        try {
            const port = await resolveAvailablePort({ port: 0, host: DEFAULT_RPC_HOST });
            const lockFilePath = await createLockFileForPort(port);
            await (0, proper_lockfile_1.lock)(lockFilePath);
            return { port, lockFilePath };
        }
        catch (error) {
            errors.push(error instanceof Error ? error.message : String(error));
        }
    }
    throw new errors_1.TypedError(`Failed to acquire an unused port after ${MAX_ATTEMPTS} attempts`, errors_1.TcpAndLockErrors.PortAcquisitionFailed, new Error(errors.map((msg, i) => `Attempt ${i + 1}: ${msg}`).join("\n")));
}
// options takes the port and host, if port is 0 os will find an available port
async function resolveAvailablePort(options) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on('error', (err) => reject(err));
        server.listen(options, () => {
            const addr = server.address();
            if (typeof addr === 'object' && addr !== null && typeof addr.port === 'number') {
                const { port } = addr;
                server.close(() => resolve(port));
            }
            else {
                server.close();
                reject(new errors_1.TypedError('Could not determine assigned port.', errors_1.TcpAndLockErrors.PortAcquisitionFailed));
            }
        });
    });
}
async function createLockFileForPort(port) {
    const lockFilePath = (0, path_1.join)((0, os_1.tmpdir)(), `near-sandbox-port-${port}.lock`);
    if (!(0, fs_1.existsSync)(lockFilePath)) {
        await fs.writeFile(lockFilePath, '');
    }
    return lockFilePath;
}
async function dumpStateFromPath(pathToState) {
    await new Promise(async (resolve, reject) => {
        const proc = await (0, binaryExecution_1.spawnWithArgsAndVersion)("2.6.5", ["--home", pathToState, "view-state", "dump-state", "--stream"]);
        proc.on("error", reject);
        proc.on("exit", (code) => {
            if (code === 0) {
                resolve();
            }
            else {
                reject(new Error(`Process exited with code ${code}`));
            }
        });
    });
    const [genesis, config, nodeKey, validatorKey, records] = await Promise.all([
        (0, promises_1.readFile)((0, path_1.join)(pathToState, "output/genesis.json"), "utf-8").then(JSON.parse),
        (0, promises_1.readFile)((0, path_1.join)(pathToState, "output/config.json"), "utf-8").then(JSON.parse),
        (0, promises_1.readFile)((0, path_1.join)(pathToState, "output/node_key.json"), "utf-8").then(JSON.parse),
        (0, promises_1.readFile)((0, path_1.join)(pathToState, "output/validator_key.json"), "utf-8").then(JSON.parse),
        (0, promises_1.readFile)((0, path_1.join)(pathToState, "output/records.json"), "utf-8").then(JSON.parse)
    ]);
    if (!Array.isArray(genesis.records))
        genesis.records = [];
    genesis.records.push(...records);
    return {
        config,
        genesis,
        nodeKey,
        validatorKey
    };
}
exports.dumpStateFromPath = dumpStateFromPath;
async function createTmpDir() {
    const now = new Date();
    const timestamp = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;
    const random = Math.random().toString(36).substring(2, 8);
    const name = `near-sandbox-${timestamp}-${random}`;
    return (0, tmp_promise_1.dir)({ unsafeCleanup: true, name });
}
exports.createTmpDir = createTmpDir;
