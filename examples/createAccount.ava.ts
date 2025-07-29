import test from 'ava';
import { Sandbox } from '../src/server/Sandbox';
import { KeyPair } from '@near-js/crypto';
import { JsonRpcProvider, Provider } from '@near-js/providers';
import { Account } from '@near-js/accounts';
import { KeyPairSigner } from '@near-js/signers';
import { DEFAULT_ACCOUNT_ID, DEFAULT_BALANCE, DEFAULT_PRIVATE_KEY } from '../src/server/config';
import { NEAR } from '@near-js/tokens';

test('create a new account and send tokens', async t => {
  const sandbox = await Sandbox.start({ config: { rpcPort: 3032 } });
  const provider = new JsonRpcProvider({ url: sandbox.rpcUrl }) as Provider;
  const keyPair = KeyPair.fromString(DEFAULT_PRIVATE_KEY);
  t.is(sandbox.rpcUrl, 'http://127.0.0.1:3032');

  const account = new Account(
    DEFAULT_ACCOUNT_ID,
    provider,
    new KeyPairSigner(keyPair)
  );
  const accountInfo = await account.getState();
  t.is(accountInfo.balance.total, DEFAULT_BALANCE);

  const newKeyPair = KeyPair.fromRandom("ED25519");
  await account.createAccount(`dontcare.${DEFAULT_ACCOUNT_ID}`, newKeyPair.getPublicKey());

  const newAccount = new Account(
    "dontcare." + DEFAULT_ACCOUNT_ID,
    new JsonRpcProvider({ url: sandbox.rpcUrl }) as Provider,
    new KeyPairSigner(newKeyPair)
  );
  await account.transfer({ receiverId: newAccount.accountId, amount: NEAR.toUnits(100) });

  t.is((await newAccount.getState()).balance.total, NEAR.toUnits(100));

  await sandbox.tearDown();
});
