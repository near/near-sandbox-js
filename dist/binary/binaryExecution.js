"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spawnWithArgsAndVersion = exports.initConfigsToTmpWithVersion = void 0;
const binaryUtils_1 = require("./binaryUtils");
const child_process_1 = require("child_process");
const binary_1 = require("./binary");
const path_1 = require("path");
const errors_1 = require("../errors");
// initializes a sandbox with provided version and tmp directory
async function initConfigsToTmpWithVersion(version, tmpDir) {
    const bin = await (0, binary_1.ensureBinWithVersion)(version);
    const result = (0, child_process_1.spawn)(bin, ["--home", tmpDir.path, "init", "--fast"], { stdio: [null, null, "pipe"] });
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
async function spawnWithArgsAndVersion(version, args, stdio = ['ignore', 'ignore', 'pipe']) {
    var _a;
    const binPath = await (0, binary_1.ensureBinWithVersion)(version);
    const isDebug = process.env['NEAR_ENABLE_SANDBOX_LOG'] === "1";
    const child = (0, child_process_1.spawn)(binPath, args, {
        stdio: isDebug ? "inherit" : stdio
    });
    if (!isDebug) {
        (_a = child.stderr) === null || _a === void 0 ? void 0 : _a.on("error", (chunk) => {
            console.error(`Sandbox stderr: ${chunk.toString()}`);
        });
    }
    child.on("error", (err) => {
        throw new errors_1.TypedError(`Failed to spawn sandbox process: ${err}`, "UntypedError", err instanceof Error ? err : new Error(String(err)));
    });
    return child;
}
exports.spawnWithArgsAndVersion = spawnWithArgsAndVersion;
