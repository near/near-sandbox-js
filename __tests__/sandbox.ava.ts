import test from 'ava';
import { fileExists } from '../src/utils';

test('Sandbox.start() returns a valid instance with default config', async (t) => {
    const sandbox = await Sandbox.start();

    t.truthy(sandbox);
    t.truthy(sandbox.rpcUrl);
    t.truthy(sandbox.homeDir);
    t.true(typeof sandbox.rpcUrl === 'string');
    t.true(typeof sandbox.homeDir === 'string');

    await sandbox.tearDown();
});

test('Sandbox.start() accepts custom config', async (t) => {
    const customConfig: SandboxConfig = {
        version: '2.0.0',
        rpcPort: 3030,
        additionalGenesis: JSON.stringify({ epoch_length: 100 }),
        additionalAccounts: [{
            accountId: 'test.near',
            publicKey: 'ed25519:ABCDEFGH1234567890',
            privateKey: 'ed25519:ZYXWVUT9876543210',
            balance: BigInt(1000000000000000000000000),
        }],
    };
    const sandbox = await Sandbox.start(customConfig);

    t.truthy(sandbox);

    await sandbox.tearDown();
});

test('Sandbox.tearDown() cleans up resources', async t => {
  const sandbox = await Sandbox.start();

  const dirExistsBefore = await fileExists(sandbox.homeDir);
  t.true(dirExistsBefore);

  await sandbox.tearDown();

  const dirExistsAfter = await fileExists(sandbox.homeDir);

  t.false(dirExistsAfter);
});
