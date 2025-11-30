"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileExists = exports.AWSUrl = void 0;
const promises_1 = require("fs/promises");
const os = require("os");
const DEFAULT_NEAR_SANDBOX_VERSION = "2.6.5";
function getPlatform() {
    const type = os.type();
    const arch = os.arch();
    if (type === "Linux" && arch === "x64") {
        return ["Linux", "x86_64"];
    }
    if (type === "Linux" && arch === "arm64") {
        return ["Linux", "aarch64"];
    }
    // Darwind x86_64 is not supported for quite some time :(
    if (type === "Darwin" && arch === "x64") {
        throw new Error("Darwin x86_64 is not supported");
    }
    if (type === "Darwin" && arch === "arm64") {
        return ["Darwin", "arm64"];
    }
    throw new Error(`Unsupported platform: ${type}-${arch}`);
}
function AWSUrl(version = DEFAULT_NEAR_SANDBOX_VERSION) {
    const [platform, arch] = getPlatform();
    return `https://s3-us-west-1.amazonaws.com/build.nearprotocol.com/nearcore/${platform}-${arch}/${version}/near-sandbox.tar.gz`;
}
exports.AWSUrl = AWSUrl;
async function fileExists(filePath) {
    try {
        const f = await (0, promises_1.stat)(filePath);
        return f.isFile();
    }
    catch {
        return false;
    }
}
exports.fileExists = fileExists;
