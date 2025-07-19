"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWithOptionsAndVersion = exports.initHomeDirWithVersion = void 0;
const binaryUtils_1 = require("./binaryUtils");
const child_process_1 = require("child_process");
const binary_1 = require("./binary");
const path_1 = require("path");
// initializes a sandbox with provided version and home directory
async function initHomeDirWithVersion(version, homeDir) {
    const bin = await (0, binary_1.ensureBinWithVersion)(version);
    const result = (0, child_process_1.spawn)(bin, ["--home", homeDir.path, "init", "--fast"], { stdio: [null, binaryUtils_1.inherit, binaryUtils_1.inherit] });
    await new Promise((resolve, reject) => {
        result.on("close", (code) => {
            if (code === 0)
                resolve();
            else
                reject(new Error(`sandbox init exited with code ${code}`));
        });
        result.on("error", (error) => {
            reject(error);
        });
    });
    const expectedFiles = ["config.json", "genesis.json"];
    for (const filename of expectedFiles) {
        const filePath = (0, path_1.join)(homeDir.path, filename);
        if (await (0, binaryUtils_1.fileExists)(filePath))
            continue;
        throw new Error(`Expected file "${filename}" was not created in ${homeDir.path}`);
    }
}
exports.initHomeDirWithVersion = initHomeDirWithVersion;
async function runWithOptionsAndVersion(version, options) {
    const binPath = await (0, binary_1.ensureBinWithVersion)(version);
    return (0, child_process_1.spawn)(binPath, options, { stdio: [null, binaryUtils_1.inherit, binaryUtils_1.inherit] });
}
exports.runWithOptionsAndVersion = runWithOptionsAndVersion;
// export async function runAndExit(
//     cliArgs?: string[],
//     options = { stdio: [null, inherit, inherit] }
// ): Promise<void> {
//     process.exit(await this.run(cliArgs, options));
// }
