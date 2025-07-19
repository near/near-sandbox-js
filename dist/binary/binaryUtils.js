"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rm = exports.inherit = exports.fileExists = exports.AWSUrl = void 0;
// import { Binary } from "./Binary";
// import { join } from "path";
const promises_1 = require("fs/promises");
const os = require("os");
const DEFAULT_NEAR_SANDBOX_VERSION = "2.6.5";
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
    throw new Error(`Unsupported platform: ${type} ${arch}`);
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
exports.inherit = "inherit";
async function rm(path) {
    try {
        await (0, promises_1.rm)(path);
    }
    catch (e) { }
}
exports.rm = rm;
// export function getBinary(name: string = "near-sandbox", version?: string): Promise<Binary> {
//   if (!process.env["NEAR_SANDBOX_BIN_PATH"]) {
//     process.env["NEAR_SANDBOX_BINARY_PATH"] = join(
//       os.homedir(),
//       ".near",
//       "sandbox"
//     );
//   }
//   // Will use version after publishing to AWS
//   // const version = require("./package.json").version;
//   const fromEnv = process.env["SANDBOX_ARTIFACT_URL"];
//   const urls = [AWSUrl(version)];
//   if (fromEnv) {
//     urls.unshift(fromEnv);
//   }
//   return Binary.create(name, urls);
// }
