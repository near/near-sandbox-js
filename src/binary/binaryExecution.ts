import { DirectoryResult } from "tmp-promise";
import { fileExists, inherit } from "./binaryUtils";
import { ChildProcess, spawn, SpawnOptions } from "child_process";
import { ensureBinWithVersion } from "./binary";
import { join } from "path";

// initializes a sandbox with provided version and home directory
export async function initHomeDirWithVersion(version: string, homeDir: DirectoryResult): Promise<void> {
    const bin = await ensureBinWithVersion(version);

    const result = spawn(bin, ["--home", homeDir.path, "init", "--fast"], { stdio: [null, inherit, inherit] });
    await new Promise<void>((resolve, reject) => {
        result.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`sandbox init exited with code ${code}`));
        });

        result.on("error", (error) => {
            reject(error);
        });
    });
    const expectedFiles = ["config.json", "genesis.json"];

    for (const filename of expectedFiles) {
        const filePath = join(homeDir.path, filename);
        if (await fileExists(filePath)) continue;
        throw new Error(`Expected file "${filename}" was not created in ${homeDir.path}`);
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
