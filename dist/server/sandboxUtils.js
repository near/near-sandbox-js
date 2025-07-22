"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acquireOrLockPort = exports.rpcSocket = void 0;
const fs_1 = require("fs");
const fs = require("fs/promises");
const net = require("net");
const path_1 = require("path");
const os_1 = require("os");
const proper_lockfile_1 = require("proper-lockfile");
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
    // If the port is not available, throw an error
    if (checkedPort !== port) {
        throw new Error(`Port ${port} is not available`);
    }
    const lockFilePath = (0, path_1.join)((0, os_1.tmpdir)(), `near-sandbox-port-${port}.lock`);
    if (!(0, fs_1.existsSync)(lockFilePath)) {
        await fs.writeFile(lockFilePath, '');
    }
    try {
        await (0, proper_lockfile_1.lock)(lockFilePath);
        // Only return if lock was successful
        return { port, lockFilePath };
    }
    catch {
        throw new Error(`Failed to lock port ${port}. It may already be in use.`);
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
    throw new Error(`Failed to acquire an unused port after ${MAX_ATTEMPTS} attempts:\n` +
        errors.map((msg, i) => `Attempt ${i + 1}: ${msg}`).join("\n"));
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
                reject(new Error('Could not determine assigned port.'));
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
