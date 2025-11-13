import anyTest, { type TestFn } from 'ava';
import { JsonRpcProvider } from "@near-js/providers";
import { Account } from "@near-js/accounts";
import { KeyPairSigner } from "@near-js/signers";
import { KeyPair } from "@near-js/crypto";
import { Sandbox } from '../src/sandbox/Sandbox';
import { DEFAULT_ACCOUNT_ID, DEFAULT_PRIVATE_KEY } from '../src/sandbox/config';
import { readFileSync } from 'fs';

const test = anyTest as TestFn<{
    sandbox: Sandbox;
    account: Account;
    genesis: Record<string, unknown>;
    nodeKey: Record<string, unknown>;
    validatorKey: Record<string, unknown>;
}>;

// This before hook sets up the initial state and dumps it.
// It will run once for the entire test file.
test.before(async (t) => {
    const sandbox = await Sandbox.start({});
    try {
        const provider = new JsonRpcProvider({ url: sandbox.rpcUrl });
        const rootAccount = new Account(
            DEFAULT_ACCOUNT_ID,
            provider,
            new KeyPairSigner(KeyPair.fromString(DEFAULT_PRIVATE_KEY))
        );
        const data = readFileSync("node_modules/near-hello/dist/main.wasm");

        const newSecretKey = KeyPair.fromRandom("ED25519");
        await rootAccount.createAccount("alice.sandbox", newSecretKey.getPublicKey(), BigInt(10e24));

        const newAccount = new Account(
            "alice.sandbox",
            provider,
            new KeyPairSigner(newSecretKey)
        );

        const result = await newAccount.deployContract(new Uint8Array(data));
        // In newer versions of near-sandbox (2.9.0+), the status may be "FINAL" instead of "EXECUTED_OPTIMISTIC"
        t.true(result.final_execution_status === "EXECUTED_OPTIMISTIC" || result.final_execution_status === "FINAL");
        await new Promise(resolve => setTimeout(resolve, 2000)); // wait for the contract to be deployed

        const response = (await provider.viewContractCode(newAccount.accountId)).code;
        t.deepEqual(response, new Uint8Array(data));
        await newAccount.callFunction({
            contractId: newAccount.accountId,
            methodName: "setValue",
            args: { value: "HARDCODED_VALUE" },
            gas: BigInt(3000000000000),
            waitUntil: "FINAL", 
        });
        const state = await provider.callFunction("alice.sandbox", "getValue", {});
        if (typeof state === "undefined") {
            throw new Error("Expected state to be a string");
        }
        t.is("HARDCODED_VALUE", state.toString());

        // Dump the final state for use in subsequent tests
        const { genesis, nodeKey, validatorKey } = await sandbox.dump();
        t.context.genesis = genesis;
        t.context.nodeKey = nodeKey;
        t.context.validatorKey = validatorKey;
    } catch (error) {
        console.error("Error during test setup:", error);
        throw error;
    } finally {
        // The sandbox used for setup is no longer needed; tear it down.
        await sandbox.tearDown();
    }

});

// This beforeEach hook starts a new sandbox instance from the dumped state
// before each test.
test.beforeEach(async (t) => {
    const sandbox = await Sandbox.start({
        config: {
            additionalGenesis: t.context.genesis,
            nodeKey: t.context.nodeKey,
            validatorKey: t.context.validatorKey,
        },
    });
    t.context.sandbox = sandbox;
    t.context.account = new Account(
        DEFAULT_ACCOUNT_ID,
        new JsonRpcProvider({ url: sandbox.rpcUrl }),
        new KeyPairSigner(KeyPair.fromString(DEFAULT_PRIVATE_KEY))
    );
});

// This afterEach hook ensures the sandbox is always torn down
// after each test, regardless of whether it passed or failed.
test.afterEach.always(async (t) => {
    if (t.context.sandbox) {
        await t.context.sandbox.tearDown();
    }
});

test('contract returns expected value', async (t) => {
    const provider = new JsonRpcProvider({ url: t.context.sandbox.rpcUrl });

const state = await provider.callFunction("alice.sandbox", "getValue", {});
    if (typeof state === "undefined") {
        throw new Error("Expected state to be a string");
    }
    t.is("HARDCODED_VALUE", state.toString());
});

test('set contract method and returns expected value', async (t) => {
    await t.context.account.callFunction({
        contractId: "alice.sandbox",
        methodName: "setValue",
        args: { value: "New value in a new test" },
        gas: BigInt(3000000000000),
        waitUntil: "FINAL",
    });
    const provider = new JsonRpcProvider({ url: t.context.sandbox.rpcUrl });
    const state = await provider.callFunction("alice.sandbox", "getValue", {});
    if (typeof state === "undefined") {
        throw new Error("Expected state to be a string");
    }
    t.is("New value in a new test", state.toString());
});

test('fails if want to create account with existing name', async (t) => {
    await t.throwsAsync(
        t.context.account.createAccount(
            "alice.sandbox",
            KeyPair.fromRandom("ED25519").getPublicKey(),
            BigInt(10e24)
        ),
        {
            message: /Can't create a new account alice.sandbox, because it already exists/,
        }
    );
});