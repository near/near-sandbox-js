import test from "ava";
import { Sandbox } from "../src/server/Sandbox";
import { SandboxConfig } from "../src/server/config";
import { KeyPair } from "@near-js/crypto";
import { NEAR } from "@near-js/tokens";
import { JsonRpcProvider } from "@near-js/providers";

test('provide custom config with additional account', async t => {
    const newKeyPair = KeyPair.fromRandom("ED25519");
    const config: SandboxConfig = {
        rpcPort: 3031,
        additionalGenesis: { epoch_length: 100 },
        additionalAccounts: [
            {
                accountId: "alice.near",
                publicKey: newKeyPair.getPublicKey().toString(),
                privateKey: newKeyPair.toString(),
                balance: NEAR.toUnits(1000000)
            },
        ],
    };
    const sandbox = await Sandbox.start({ config });
    const provider = new JsonRpcProvider({ url: sandbox.rpcUrl });
    const accountInfo = await provider.viewAccount("alice.near");

    t.is(accountInfo.amount, NEAR.toUnits(1000000));
    await sandbox.tearDown();
});