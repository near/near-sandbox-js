import test from 'ava';
import * as net from 'net';
import { existsSync } from "fs";
import { writeFile } from 'fs/promises';
import { Sandbox } from '../src/sandbox/Sandbox';
import { GenesisAccount, SandboxConfig } from '../src/sandbox/config';
import { tmpdir } from 'os';
import { join } from 'path';
import { lock } from 'proper-lockfile';
import got from 'got';

test('Sandbox.start() returns a valid instance with default config and version', async (t) => {
    const sandbox = await Sandbox.start({});
    t.truthy(sandbox);
    t.true(typeof sandbox.rpcUrl === 'string');
    t.true(typeof sandbox.homeDir === 'string');
    t.true(existsSync(join(sandbox.homeDir, "config.json")));
    t.true(existsSync(join(sandbox.homeDir, "genesis.json")));
    t.true(existsSync(join(sandbox.homeDir, "sandbox.json")));
    t.true(existsSync(sandbox.rpcPortLockPath));
    await sandbox.tearDown();
});

test('Sandbox.start() accepts custom config and version', async (t) => {
    const rpcPort = 3030;
    const customConfig: SandboxConfig = {
        rpcPort: rpcPort,
        additionalGenesis: {
            epoch_length: 100, maxOpenFiles: 100
        },
        additionalAccounts: [
            GenesisAccount.createRandom("alice.near", "1000"),
        ],
    };
    const sandbox = await Sandbox.start({ config: customConfig, version: '2.6.5' });

    t.truthy(sandbox);
    t.is(sandbox.rpcUrl, `http://127.0.0.1:${rpcPort}`);

    await sandbox.tearDown();
});

test('Sandbox throws if provided version is unsupported', async (t) => {
    const unsupportedVersion = '14.0.0';
    await t.throwsAsync(
        () => Sandbox.start({ version: unsupportedVersion }),
        {
            instanceOf: Error,
            message: /Failed to download binary. Check Url and version/,
        }
    );
});

test('Sandbox.tearDown() cleans up resources and unlocks ports', async t => {
    const server = net.createServer();
    const rpcPort = 3040;
    const sandbox = await Sandbox.start({ config: { rpcPort } });

    const dirExistsBefore = existsSync(sandbox.homeDir);
    t.true(dirExistsBefore);
    await t.throwsAsync(() => {
        return new Promise<void>((resolve, reject) => {
            server.once('error', (err) => {
                server.close();
                reject(err);
            });
            server.listen(rpcPort, () => {
                server.close(() => resolve());
            });
        });
    }, { message: /EADDRINUSE/ });

    await sandbox.tearDown();
    await t.notThrowsAsync(() => {
        return new Promise<void>((resolve, reject) => {
            server.once('error', reject);
            server.listen(rpcPort, () => {
                server.close(() => resolve());
            });
        });
    });
    const dirExistsAfter = existsSync(sandbox.homeDir);

    t.false(dirExistsAfter);
});

test('Sandbox.rpcUrl is not reachable after stoppage', async t => {
    const sandbox = await Sandbox.start({});
    const rpcUrl = sandbox.rpcUrl;

    await sandbox.stop();
    await t.throwsAsync(
        () => got(rpcUrl + '/status', { throwHttpErrors: false }),
        {
            message: /ECONNREFUSED/,
        }
    );
});
test('Sandbox throws if provided rpcPort is already in use', async (t) => {
    const rpcPort = 3050;

    const server = net.createServer().listen(rpcPort);

    try {
        await t.throwsAsync(
            () => Sandbox.start({ config: { rpcPort } }),
            {
                message: /EADDRINUSE/,
            }
        );
    } finally {
        server.close();
    }
});

test('Another process can`t bind sandbox`s rpcPort', async (t) => {
    const rpcPort = 3060;
    const sandbox = await Sandbox.start({ config: { rpcPort } });
    const lockFilePath = join(tmpdir(), `near-sandbox-port-${rpcPort}.lock`);

    try {
        await writeFile(lockFilePath, '');
        await t.throwsAsync(
            async () => { await lock(lockFilePath, { retries: 0 }); },
            {
                instanceOf: Error,
                message: /Lock file is already being held/,
            }
        );
    } finally {
        await sandbox.tearDown();
    }
});
