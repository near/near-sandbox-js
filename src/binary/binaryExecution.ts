import { DirectoryResult } from "tmp-promise";
import { fileExists } from "./binaryUtils";
import { ChildProcess, spawn, StdioOptions } from "child_process";
import { ensureBinWithVersion } from "./binary";
import { join } from "path";
import { TypedError } from "../errors";

// initializes a sandbox with provided version and tmp directory
export async function initConfigsToTmpWithVersion(version: string, tmpDir: DirectoryResult): Promise<void> {
    const bin = await ensureBinWithVersion(version);

    const result = spawn(bin, ["--home", tmpDir.path, "init", "--fast"], { stdio: [null, null, "pipe"] });
    await new Promise<void>((resolve, reject) => {
        result.on("close", (code) => {
            if (code === 0) resolve();
            else reject();
        });

        result.on("error", (error) => {
            reject(error);
        });
    });
    const expectedFiles = ["config.json", "genesis.json"];

    for (const filename of expectedFiles) {
        const filePath = join(tmpDir.path, filename);
        if (await fileExists(filePath)) continue;
        throw new Error(`Expected file "${filename}" was not created in ${tmpDir.path}`);
    }
}

export async function spawnWithArgsAndVersion(
    version: string,
    args: string[],
    stdio: StdioOptions = ['ignore', 'ignore', 'pipe']
): Promise<ChildProcess> {
    const binPath = await ensureBinWithVersion(version);

    const isDebug = process.env['NEAR_ENABLE_SANDBOX_LOG'] === "1";
    const child = spawn(binPath, args, {
        stdio: isDebug ? "inherit" : stdio
    });


    if (!isDebug) {
        child.stderr?.on("error", (chunk) => {
            console.error(`Sandbox stderr: ${chunk.toString()}`);
        });
    }
    child.on("error", (err) => {
        throw new TypedError(
            `Failed to spawn sandbox process: ${err}`,
            "UntypedError",
            err instanceof Error ? err : new Error(String(err))
        );
    });
    return child;
}
