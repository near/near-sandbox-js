import test from 'ava';
import * as net from 'net';
import { existsSync } from "fs";
import { writeFile } from 'fs/promises';
import { Sandbox } from '../src/server/Sandbox';
import { GenesisAccount, SandboxConfig } from '../src/server/config';
import { tmpdir } from 'os';
import { join } from 'path';
import { lock } from 'proper-lockfile';

test('Sandbox.start() returns a valid instance with default config and version', async (t) => {
    const sandbox = await Sandbox.start();
    t.truthy(sandbox);
    t.truthy(sandbox.rpcUrl);
    t.truthy(sandbox.homeDir);
    t.true(typeof sandbox.rpcUrl === 'string');
    t.true(typeof sandbox.homeDir === 'string');

    await sandbox.tearDown();
});

test('Sandbox.start() accepts custom config and version', async (t) => {
    const customConfig: SandboxConfig = {
        rpcPort: 3030,
        additionalGenesis: { epoch_length: 100 },
        additionalAccounts: [
            GenesisAccount.random("alice.near", "1000"),
        ],
        maxOpenFiles: 100
    };
    const sandbox = await Sandbox.start(customConfig, '2.6.5');

    t.truthy(sandbox);

    await sandbox.tearDown();
});

//TODO: manage error handling for unsupported versions
test('Sandbox throws if provided version is unsupported', async (t) => {
    const unsupportedVersion = '4.0.0';
    if (unsupportedVersion === '4.0.0') {
        t.log('Unsupported version');
    }
});

test('Sandbox.tearDown() cleans up resources', async t => {
    const sandbox = await Sandbox.start();

    const dirExistsBefore = existsSync(sandbox.homeDir);
    t.true(dirExistsBefore);

    await sandbox.tearDown(true);

    const dirExistsAfter = existsSync(sandbox.homeDir);

    t.false(dirExistsAfter);
});


test('Sandbox uses provided rpcPort and returns correct rpcUrl', async (t) => {
    const rpcPort = 3040;
    const sandbox = await Sandbox.start({ rpcPort });

    t.is(sandbox.rpcUrl, `http://127.0.0.1:${rpcPort}`);

    await sandbox.tearDown();
});

test('Sandbox throws if provided rpcPort is already in use', async (t) => {
    const rpcPort = 3050;

    const server = net.createServer().listen(rpcPort);

    try {
        await t.throwsAsync(
            () => Sandbox.start({ rpcPort }),
            {
                message: /EADDRINUSE/,
            }
        );
    } finally {
        server.close();
    }
});

test('Sandbox fails to start if rpcPort lock is held by another process', async (t) => {
    const rpcPort = 3060;
    const lockFilePath = join(tmpdir(), `near-sandbox-port-${rpcPort}.lock`);

    await writeFile(lockFilePath, '');
    const release = await lock(lockFilePath, { retries: 0 });

    try {
        await t.throwsAsync(() =>
            Sandbox.start({ rpcPort })
            , {
                message: /Failed to lock port/,
            });
    } finally {
        await release(); // unlock
    }
});
