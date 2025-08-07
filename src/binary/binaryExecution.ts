import { DirectoryResult } from "tmp-promise";
import { fileExists, inherit } from "./binaryUtils";
import { ChildProcess, spawn, SpawnOptions } from "child_process";
import { ensureBinWithVersion } from "./binary";
import { join } from "path";

// initializes a sandbox with provided version and tmp directory
export async function initConfigsToTmpWithVersion(version: string, tmpDir: DirectoryResult): Promise<void> {
    const bin = await ensureBinWithVersion(version);

    const result = spawn(bin, ["--home", tmpDir.path, "init", "--fast"], { stdio: [null, null, inherit] });
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

export async function runWithArgsAndVersion(
    version: string,
    args: string[],
    options: SpawnOptions = { stdio: [null, null, 'inherit'] }
): Promise<ChildProcess> {
    const binPath = await ensureBinWithVersion(version);
    return spawn(
        binPath,
        args,
        options
    );
}
