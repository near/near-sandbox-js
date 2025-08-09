import { existsSync } from "fs";
import * as fs from "fs/promises";
import * as net from "net";
import { join } from "path";
import { tmpdir } from "os";
import { lock } from 'proper-lockfile';
import { TcpAndLockErrors, TypedError } from "../errors";
import { spawnWithArgsAndVersion } from "../binary/binaryExecution";
import { readFile } from "fs/promises";

const DEFAULT_RPC_HOST = '127.0.0.1';

export function rpcSocket(port: number): string {
    return `${DEFAULT_RPC_HOST}:${port}`;
}

export async function acquireOrLockPort(port?: number): Promise<{ port: number; lockFilePath: string }> {
    return port
        ? tryAcquireSpecificPort(port)
        : acquireUnusedPort();
}

async function tryAcquireSpecificPort(port: number): Promise<{ port: number; lockFilePath: string }> {
    const checkedPort = await resolveAvailablePort({ port, host: DEFAULT_RPC_HOST });

    if (checkedPort !== port) {
        throw new TypedError(`Port ${port} is not available`, TcpAndLockErrors.PortNotAvailable);
    }

    const lockFilePath = await createLockFileForPort(port);

    try {
        await lock(lockFilePath);
        return { port, lockFilePath };
    } catch {
        throw new TypedError(`Failed to lock port ${port}. It may already be in use.`, TcpAndLockErrors.LockFailed);
    }
}

async function acquireUnusedPort(): Promise<{ port: number; lockFilePath: string }> {
    const errors: string[] = [];
    const MAX_ATTEMPTS = 10;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        try {
            const port = await resolveAvailablePort({ port: 0, host: DEFAULT_RPC_HOST });
            const lockFilePath = await createLockFileForPort(port);
            await lock(lockFilePath);
            return { port, lockFilePath };
        } catch (error) {
            errors.push(error instanceof Error ? error.message : String(error));
        }
    }
    throw new TypedError(
        `Failed to acquire an unused port after ${MAX_ATTEMPTS} attempts`,
        TcpAndLockErrors.PortAcquisitionFailed,
        new Error(errors.map((msg, i) => `Attempt ${i + 1}: ${msg}`).join("\n"))
    );
}

// options takes the port and host, if port is 0 os will find an available port
async function resolveAvailablePort(options: net.ListenOptions): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on('error', (err) => reject(err));

        server.listen(options, () => {
            const addr = server.address();

            if (typeof addr === 'object' && addr !== null && typeof addr.port === 'number') {
                const { port } = addr;
                server.close(() => resolve(port));
            } else {
                server.close();
                reject(new TypedError('Could not determine assigned port.', TcpAndLockErrors.PortAcquisitionFailed));
            }
        });
    });
}

async function createLockFileForPort(port: number): Promise<string> {
    const lockFilePath = join(tmpdir(), `near-sandbox-port-${port}.lock`);

    if (!existsSync(lockFilePath)) {
        await fs.writeFile(lockFilePath, '');
    }

    return lockFilePath;
}

export async function dumpStateFromPath(pathToState: string): Promise<{
    config: Record<string, unknown>;
    genesis: Record<string, unknown>;
    nodeKey: Record<string, unknown>;
    validatorKey: Record<string, unknown>;
}> {
    await new Promise<void>(async (resolve, reject) => {
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
        readFile(join(pathToState, "output/genesis.json"), "utf-8").then(JSON.parse),
        readFile(join(pathToState, "output/config.json"), "utf-8").then(JSON.parse),
        readFile(join(pathToState, "output/node_key.json"), "utf-8").then(JSON.parse),
        readFile(join(pathToState, "output/validator_key.json"), "utf-8").then(JSON.parse),
        readFile(join(pathToState, "output/records.json"), "utf-8").then(JSON.parse)
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
