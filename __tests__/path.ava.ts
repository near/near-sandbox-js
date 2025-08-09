import test from "ava";
import { join } from "path";
import { DEFAULT_NEAR_SANDBOX_VERSION, Sandbox } from "../src/server/Sandbox";
import { TypedError } from "../src/errors";

const TEST_BIN_DIR = join(__dirname, "..", "test_files");
const TEST_BIN_PATH = join(TEST_BIN_DIR, `near-sandbox-${DEFAULT_NEAR_SANDBOX_VERSION}`, "near-sandbox");

test.before("can use local file", async (t) => {
  process.env['DIR_TO_DOWNLOAD_BINARY'] = TEST_BIN_DIR;
  const sandbox = await Sandbox.start({});
  try {
    const response = await fetch(`${sandbox.rpcUrl}/status`);
    t.is(response.status, 200);
  } catch (error) {
    if (error instanceof Error) {
      t.fail(`${error.message}\n${error.stack}`);
    } else {
      t.fail(String(error));
    }
  } finally {
    await t.notThrowsAsync(async () => await sandbox.tearDown());
  }
});

test("fails to start sandbox if local binary path does not exist", async (t) => {
  process.env['NEAR_SANDBOX_BIN_PATH'] = "Not-existing-path";

  await t.throwsAsync(
    () => Sandbox.start({}),
    {
      instanceOf: TypedError,
      message: /NEAR_SANDBOX_BIN_PATH does not exist\./,
    }
  );
  process.env['NEAR_SANDBOX_BIN_PATH'] = TEST_BIN_PATH;
  const sandbox = await Sandbox.start({});
  try {
    const response = await fetch(`${sandbox.rpcUrl}/status`);
    t.is(response.status, 200);
  } catch (error) {
    if (error instanceof Error) {
      t.fail(`${error.message}\n${error.stack}`);
    } else {
      t.fail(String(error));
    }
  } finally {
    await t.notThrowsAsync(async () => await sandbox.tearDown());
  }
});
