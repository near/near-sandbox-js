import { existsSync } from "fs";
import * as fs from "fs/promises";
import * as net from "net";
import { join } from "path";
import { tmpdir } from "os";
import { lock } from 'proper-lockfile';


const DEFAULT_RPC_HOST = '127.0.0.1';

export function rpcSocket(port: number): string {
    return `http://${DEFAULT_RPC_HOST}:${port}`;
}

export async function acquireOrLockPort(port?: number): Promise<{ port: number; lockFilePath: string }> {
    return port
        ? tryAcquireSpecificPort(port)
        : acquireUnusedPort();
}

async function tryAcquireSpecificPort(port: number): Promise<{ port: number; lockFilePath: string }> {
    const checkedPort = await resolveAvailablePort({ port, host: DEFAULT_RPC_HOST });

    // If the port is not available, throw an error
    if (checkedPort !== port) {
        throw new Error(`Port ${port} is not available`);
    }

    const lockFilePath = join(tmpdir(), `near-sandbox-port-${port}.lock`);

    if (!existsSync(lockFilePath)) {
        await fs.writeFile(lockFilePath, '');
    }

    try {
        await lock(lockFilePath, { retries: 0 });
        // Only return if lock was successful
        return { port, lockFilePath };
    } catch {
        throw new Error(`Failed to lock port ${port}. It may already be in use.`);
    }
}

async function acquireUnusedPort(): Promise<{ port: number; lockFilePath: string }> {
    const errors: string[] = [];
    const MAX_ATTEMPTS = 10;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        try {
            const port = await resolveAvailablePort({ port: 0, host: DEFAULT_RPC_HOST });
            const lockFilePath = await createLockFileForPort(port);
            await lock(lockFilePath, { retries: 0 });
            return { port, lockFilePath };
        } catch (error) {
            errors.push(error instanceof Error ? error.message : String(error));
        }
    }
    throw new Error(
        `Failed to acquire an unused port after ${MAX_ATTEMPTS} attempts:\n` +
        errors.map((msg, i) => `Attempt ${i + 1}: ${msg}`).join("\n")
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
                reject(new Error('Could not determine assigned port.'));
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
