import { AWSUrl, fileExists } from "./binaryUtils";
import { join } from "path";
import * as os from "os";
import { promisify } from "util";
import * as stream from "stream";
import * as tar from "tar";
import got from "got";
import { existsSync } from "fs";
import {lock} from "proper-lockfile";
import * as fs from "fs/promises";

const pipeline = promisify(stream.pipeline);

// downloads the binary from AWS and extracts it to the specified directory
export async function dowloadBin(version: string): Promise<string> {
    const existingFile = await checkForVersion(version);
    if (existingFile) {
        return existingFile;
    } 
    let url: string;
    const fromEnv = process.env["SANDBOX_ARTIFACT_URL"];
    if (fromEnv) {
        url = fromEnv;
    } else {
        url = AWSUrl(version);
    }
    if (!url) {
        throw new Error("No URL provided got empty array");
    }

    await pipeline(
        got.stream(url),
        new stream.PassThrough(),
        tar.x({ strip: 1, C: await getDownloadPath(version) })
    );

    const binPath = join(await getDownloadPath(version), "near-sandbox");
    return binPath;
}

// Returns a path to the binary in the form of: `{home}/.near/near-sandbox-{version}` || `{$OUT_DIR}/.near/near-sandbox-{version}`
async function getDownloadPath(version: string): Promise<string> {
    const out = process.env["OUT_DIR"] ?? join(os.homedir(), ".near", `near-sandbox-${version}`);
    await fs.mkdir(out, { recursive: true });
    return out;
}

export async function binPath(version: string): Promise<string> {
    const pathFromEnv = process.env["NEAR_SANDBOX_BIN_PATH"];

    if (pathFromEnv) {
        if (!(existsSync(pathFromEnv))) {
            throw new Error(`NEAR_SANDBOX_BIN_PATH ${pathFromEnv} does not exist.`);
        }
        return pathFromEnv;
    }

    const binPath = getDownloadPath(version).then((dir) => join(dir, "near-sandbox"));
    return binPath;
}

export async function checkForVersion(version: string): Promise<string | undefined> {
    const fromEnv = process.env["NEAR_SANDBOX_BIN_PATH"];
    if (fromEnv) {
        return fromEnv;
    }

    const downloadPath = await getDownloadPath(version);
    const binPath = join(downloadPath, "near-sandbox");

    if (await fileExists(binPath)) {
        return binPath;
    }
    return undefined;
}

export async function installable(binPath: string): Promise<(() => Promise<void>) | null> {
    if (existsSync(binPath)) {
        return null;
    }

    const lockPath = `${binPath}.lock`;

    let release: () => Promise<void>;

    try {

        if (!existsSync(lockPath)) {
            await fs.writeFile(lockPath, '');
        }
        release = await lock(lockPath, {
            retries: {
                retries: 100,
                factor: 3,
                minTimeout: 200,
                maxTimeout: 2 * 1000,
                randomize: true,
            },
        });
    } catch (error) {
        throw new Error(`Failed to acquire lock for ${lockPath}: ${error}`);
    }

    if (existsSync(binPath)) {
        await release();
        return null;
    }

    return release;
}

export async function ensureBinWithVersion(version: string): Promise<string> {
    let _binPath = await binPath(version);
    const release = await installable(_binPath);

    if (release) {
        _binPath = await dowloadBin(version);
        process.env["NEAR_SANDBOX_BIN_PATH"] = _binPath;

        await release();
    }

    return _binPath;
}