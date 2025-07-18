import test from 'ava';
import { existsSync } from "fs";
import { Sandbox } from '../src/server/Sandbox';
import { SandboxConfig } from '../src/server/interfaces';

test('Sandbox.start() returns a valid instance with default config and version', async (t) => {
    const sandbox = await Sandbox.start();
    console.log(`Starting sandbox with default config and version${sandbox}`);
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
        additionalGenesis: JSON.stringify({ epoch_length: 100 }),
        additionalAccounts: [{
            accountId: 'test.near',
            publicKey: 'ed25519:ABCDEFGH1234567890',
            privateKey: 'ed25519:ZYXWVUT9876543210',
            balance: BigInt(1000000000000000000000000),
        }],
    };
    const sandbox = await Sandbox.start(customConfig, '2.6.0');

    t.truthy(sandbox);

    await sandbox.tearDown();
});

test('Sandbox.tearDown() cleans up resources', async t => {
  const sandbox = await Sandbox.start();

  const dirExistsBefore =  existsSync(sandbox.homeDir);
  t.true(dirExistsBefore);

  await sandbox.tearDown();

  const dirExistsAfter =  existsSync(sandbox.homeDir);

  t.false(dirExistsAfter);
});
