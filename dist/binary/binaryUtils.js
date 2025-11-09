"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileExists = exports.AWSUrl = void 0;
const promises_1 = require("fs/promises");
const os = require("os");
const DEFAULT_NEAR_SANDBOX_VERSION = "2.9.0";
function getPlatform() {
    const type = os.type();
    const arch = os.arch();
    // Darwind x86_64 is not supported for quite some time :(
    if (type === "Linux" && arch === "x64") {
        return [type, "x86_64"];
    }
    else if (type === "Darwin" && arch === "arm64") {
        return [type, "arm64"];
    }
    throw new Error("Only linux-x86 and darwin-arm are supported");
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
