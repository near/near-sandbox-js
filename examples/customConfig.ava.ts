/**
 * Optimized Sandbox Test - Enhanced for CI/CD and Parallel Execution
 * Implements dynamic port management and robust error handling.
 */
import test from "ava";
import { Sandbox } from "../src/sandbox/Sandbox";
import { SandboxConfig } from "../src/sandbox/config";
import { KeyPair } from "@near-js/crypto";
import { NEAR } from "@near-js/tokens";
import { JsonRpcProvider } from "@near-js/providers";

test('provide custom config with additional account and dynamic settings', async t => {
    // Generate fresh keypair for the test account
    const newKeyPair = KeyPair.fromRandom("ED25519");
    const testAccountId = "alice.near";
    const initialBalance = NEAR.toUnits(1000000);

    const config: SandboxConfig = {
        // Optimization: Port 0 or dynamic assignment prevents CI collisions
        rpcPort: 0, 
        additionalGenesis: { 
            epoch_length: 100 
        },
        additionalAccounts: [
            {
                accountId: testAccountId,
                publicKey: newKeyPair.getPublicKey().toString(),
                privateKey: newKeyPair.toString(),
                balance: initialBalance
            },
        ],
    };

    // Initialize sandbox with error boundary
    let sandbox: Sandbox;
    try {
        sandbox = await Sandbox.start({ config });
    } catch (e) {
        return t.fail(`Failed to initialize Sandbox: ${e}`);
    }

    try {
        const provider = new JsonRpcProvider({ url: sandbox.rpcUrl });

        // Robust account verification
        const accountInfo = await provider.viewAccount(testAccountId);

        // Verification: Compare as strings to avoid precision issues with large balances
        t.is(
            accountInfo.amount, 
            initialBalance, 
            "The account balance in genesis must match the configured amount"
        );

        console.log(`[Sandbox] Successfully verified account ${testAccountId} at ${sandbox.rpcUrl}`);
    } catch (error) {
        // Detailed error reporting for blockchain failures
        const errorMsg = error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
        t.fail(`Test failed during blockchain interaction: ${errorMsg}`);
    } finally {
        // Critical: Ensure sandbox is killed even if assertions fail
        if (sandbox!) {
            await sandbox.tearDown();
        }
    }
});
