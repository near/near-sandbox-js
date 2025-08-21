"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureBinWithVersion = exports.installable = exports.checkForVersion = exports.binPath = exports.downloadBin = void 0;
const binaryUtils_1 = require("./binaryUtils");
const path_1 = require("path");
const util_1 = require("util");
const stream = require("stream");
const tar = require("tar");
const got_1 = require("got");
const fs_1 = require("fs");
const proper_lockfile_1 = require("proper-lockfile");
const fs = require("fs/promises");
const child_process_1 = require("child_process");
const errors_1 = require("../errors");
const tmp_promise_1 = require("tmp-promise");
const pipeline = (0, util_1.promisify)(stream.pipeline);
async function downloadBin(version) {
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
    const dirToDownload = await (0, tmp_promise_1.dir)();
    try {
        await pipeline(got_1.default.stream(url), new stream.PassThrough(), tar.x({ strip: 1, C: dirToDownload.path }));
        const pathToDownloadedFile = (0, path_1.join)(dirToDownload.path, "near-sandbox");
        const destinationFilePath = (0, path_1.join)(await getDownloadPath(version), "near-sandbox");
        await fs.rename(pathToDownloadedFile, destinationFilePath);
    }
    catch (error) {
        throw new errors_1.TypedError(`Failed to download binary. Check Url and version`, errors_1.BinaryErrors.DownloadFailed, error instanceof Error ? error : new Error(String(error)));
    }
    const binPath = (0, path_1.join)(await getDownloadPath(version), "near-sandbox");
    return binPath;
}
exports.downloadBin = downloadBin;
// Returns a path to the directory where the binary will be downloaded
// If the arg DIR_TO_DOWNLOAD_BINARY is not undefined directory will be created in the specified path
// otherwise it will be created in the bin directory of the project
async function getDownloadPath(version) {
    var _a;
    const baseDir = (_a = process.env["DIR_TO_DOWNLOAD_BINARY"]) !== null && _a !== void 0 ? _a : (0, path_1.join)(__dirname, "..", "..", "bin");
    const dirToDownloadBin = (0, path_1.join)(baseDir, `near-sandbox-${version}`);
    await fs.mkdir(dirToDownloadBin, { recursive: true });
    return dirToDownloadBin;
}
async function binPath(version) {
    const pathFromEnv = process.env["NEAR_SANDBOX_BIN_PATH"];
    if (pathFromEnv) {
        if (!((0, fs_1.existsSync)(pathFromEnv))) {
            throw new errors_1.TypedError(`NEAR_SANDBOX_BIN_PATH does not exist.`, errors_1.BinaryErrors.BinaryNotFound, new Error(`${pathFromEnv} does not exist`));
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
    if (await (0, binaryUtils_1.fileExists)(binPath)) {
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
        throw new errors_1.TypedError(`Failed to acquire lock for downloading the binary.`, errors_1.TcpAndLockErrors.LockFailed, error instanceof Error ? error : new Error(String(error)));
    }
    if ((0, fs_1.existsSync)(binPath)) {
        await release();
        return null;
    }
    return release;
}
exports.installable = installable;
async function pingBin(binPath) {
    return new Promise((resolve, reject) => {
        const proc = (0, child_process_1.spawn)(binPath, ["--version"]);
        let errorOutput = "";
        proc.stderr.on("data", chunk => errorOutput += chunk.toString());
        proc.on("error", err => {
            reject(err);
        });
        proc.on("exit", (code, signal) => {
            if (code === 0) {
                resolve();
            }
            else if (signal) {
                reject(new Error(`Binary was terminated by signal: ${signal}`));
            }
            else {
                reject(new Error(`Binary exited with code ${code}. Stderr: ${errorOutput}`));
            }
        });
    });
}
async function ensureBinWithVersion(version) {
    let _binPath = await binPath(version);
    const release = await installable(_binPath);
    if (release) {
        _binPath = await downloadBin(version);
        process.env["NEAR_SANDBOX_BIN_PATH"] = _binPath;
        await release();
    }
    try {
        await pingBin(_binPath);
    }
    catch (error) {
        throw new errors_1.TypedError(`Binary doesn't respond, probably is corrupted. Try re-downloading`, errors_1.BinaryErrors.RunningFailed, error instanceof Error ? error : new Error(String(error)));
    }
    return _binPath;
}
exports.ensureBinWithVersion = ensureBinWithVersion;
