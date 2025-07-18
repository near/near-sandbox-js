"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureBinWithVersion = exports.installable = exports.checkForVersion = exports.binPath = exports.dowloadBin = void 0;
const binaryUtils_1 = require("./binaryUtils");
const path_1 = require("path");
const os = require("os");
const promises_1 = require("fs/promises");
const utils_1 = require("../utils");
const util_1 = require("util");
const stream = require("stream");
const tar = require("tar");
const got_1 = require("got");
const fs_1 = require("fs");
const proper_lockfile_1 = require("proper-lockfile");
const fs = require("fs/promises");
const pipeline = (0, util_1.promisify)(stream.pipeline);
// downloads the binary from AWS and extracts it to the specified directory
async function dowloadBin(version) {
    const existingFile = await checkForVersion(version);
    if (existingFile) {
        return existingFile;
    }
    let url;
    const fromEnv = process.env["SANDBOX_ARTIFACT_URL"];
    if (fromEnv) {
        url = fromEnv;
    }
    else {
        url = (0, binaryUtils_1.AWSUrl)(version);
    }
    if (!url) {
        throw new Error("No URL provided got empty array");
    }
    await pipeline(got_1.default.stream(url), new stream.PassThrough(), tar.x({ strip: 1, C: await getDownloadPath(version) }));
    const binPath = (0, path_1.join)(await getDownloadPath(version), "near-sandbox");
    return binPath;
}
exports.dowloadBin = dowloadBin;
// Returns a path to the binary in the form of: `{home}/.near/near-sandbox-{version}` || `{$OUT_DIR}/.near/near-sandbox-{version}`
async function getDownloadPath(version) {
    var _a;
    const out = (_a = process.env["OUT_DIR"]) !== null && _a !== void 0 ? _a : (0, path_1.join)(os.homedir(), ".near", `near-sandbox-${version}`);
    await (0, promises_1.mkdir)(out, { recursive: true });
    return out;
}
async function binPath(version) {
    const pathFromEnv = process.env["NEAR_SANDBOX_BIN_PATH"];
    if (pathFromEnv) {
        if (!((0, fs_1.existsSync)(pathFromEnv))) {
            throw new Error(`NEAR_SANDBOX_BIN_PATH ${pathFromEnv} does not exist.`);
        }
        return pathFromEnv;
    }
    const binPath = getDownloadPath(version).then((dir) => (0, path_1.join)(dir, "near-sandbox"));
    return binPath;
}
exports.binPath = binPath;
async function checkForVersion(version) {
    const fromEnv = process.env["NEAR_SANDBOX_BIN_PATH"];
    if (fromEnv) {
        return fromEnv;
    }
    const downloadPath = await getDownloadPath(version);
    const binPath = (0, path_1.join)(downloadPath, "near-sandbox");
    if (await (0, utils_1.fileExists)(binPath)) {
        return binPath;
    }
    return undefined;
}
exports.checkForVersion = checkForVersion;
async function installable(binPath) {
    if ((0, fs_1.existsSync)(binPath)) {
        return null;
    }
    const lockPath = `${binPath}.lock`;
    let release;
    try {
        if (!(0, fs_1.existsSync)(lockPath)) {
            await fs.writeFile(lockPath, '');
        }
        release = await (0, proper_lockfile_1.lock)(lockPath, {
            retries: {
                retries: 100,
                factor: 3,
                minTimeout: 200,
                maxTimeout: 2 * 1000,
                randomize: true,
            },
        });
    }
    catch (error) {
        throw new Error(`Failed to acquire lock for ${lockPath}: ${error}`);
    }
    if ((0, fs_1.existsSync)(binPath)) {
        await release();
        return null;
    }
    return release;
}
exports.installable = installable;
async function ensureBinWithVersion(version) {
    let _binPath = await binPath(version);
    const release = await installable(_binPath);
    if (release) {
        _binPath = await dowloadBin(version);
        process.env["NEAR_SANDBOX_BIN_PATH"] = _binPath;
        await release();
    }
    return _binPath;
}
exports.ensureBinWithVersion = ensureBinWithVersion;
