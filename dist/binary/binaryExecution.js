"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWithArgsAndVersion = exports.initConfigsToTmpWithVersion = void 0;
const binaryUtils_1 = require("./binaryUtils");
const child_process_1 = require("child_process");
const binary_1 = require("./binary");
const path_1 = require("path");
// initializes a sandbox with provided version and home directory
async function initConfigsToTmpWithVersion(version, tmpDir) {
    const bin = await (0, binary_1.ensureBinWithVersion)(version);
    const result = (0, child_process_1.spawn)(bin, ["--home", tmpDir.path, "init", "--fast"], { stdio: [null, null, binaryUtils_1.inherit] });
    await new Promise((resolve, reject) => {
        result.on("close", (code) => {
            if (code === 0)
                resolve();
            else
                reject();
        });
        result.on("error", (error) => {
            reject(error);
        });
    });
    const expectedFiles = ["config.json", "genesis.json"];
    for (const filename of expectedFiles) {
        const filePath = (0, path_1.join)(tmpDir.path, filename);
        if (await (0, binaryUtils_1.fileExists)(filePath))
            continue;
        throw new Error(`Expected file "${filename}" was not created in ${tmpDir.path}`);
    }
}
exports.initConfigsToTmpWithVersion = initConfigsToTmpWithVersion;
async function runWithArgsAndVersion(version, args, options = { stdio: [null, null, 'inherit'] }) {
    const binPath = await (0, binary_1.ensureBinWithVersion)(version);
    return (0, child_process_1.spawn)(binPath, args, options);
}
exports.runWithArgsAndVersion = runWithArgsAndVersion;
