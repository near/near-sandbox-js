import { AWSUrl, fileExists } from "./binaryUtils";
import { join } from "path";
import { promisify } from "util";
import * as stream from "stream";
import * as tar from "tar";
import got from "got";
import { existsSync } from "fs";
import { lock } from "proper-lockfile";
import * as fs from "fs/promises";
import { spawn } from "child_process";
import { BinaryErrors, TcpAndLockErrors, TypedError } from "../errors";

const pipeline = promisify(stream.pipeline);

export async function downloadBin(version: string): Promise<string> {
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

    try {
        await pipeline(
            got.stream(url),
            new stream.PassThrough(),
            tar.x({ strip: 1, C: await getDownloadPath(version) })
        );

    } catch (error) {
        throw new TypedError(`Failed to download binary. Check Url and version`,
            BinaryErrors.DownloadFailed,
            error instanceof Error ? error : new Error(String(error)));
    }

    const binPath = join(await getDownloadPath(version), "near-sandbox");
    return binPath;
}

// Returns a path to the directory where the binary will be downloaded
// If the arg DIR_TO_DOWNLOAD_BINARY is not undefined directory will be created in the specified path
// otherwise it will be created in the bin directory of the project
async function getDownloadPath(version: string): Promise<string> {
    const baseDir = process.env["DIR_TO_DOWNLOAD_BINARY"]
        ?? join(__dirname, "..", "..", "bin");
    const dirToDownloadBin = join(baseDir, `near-sandbox-${version}`);

    await fs.mkdir(dirToDownloadBin, { recursive: true });
    return dirToDownloadBin;
}

export async function binPath(version: string): Promise<string> {
    const pathFromEnv = process.env["NEAR_SANDBOX_BIN_PATH"];

    if (pathFromEnv) {
        if (!(existsSync(pathFromEnv))) {
            throw new TypedError(`NEAR_SANDBOX_BIN_PATH does not exist.`,
                BinaryErrors.BinaryNotFound,
                new Error(`${pathFromEnv} does not exist`)
            );
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
        throw new TypedError(`Failed to acquire lock for downloading the binary.`,
            TcpAndLockErrors.LockFailed,
            error instanceof Error ? error : new Error(String(error))
        );
    }

    if (existsSync(binPath)) {
        await release();
        return null;
    }

    return release;
}

async function pingBin(binPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const proc = spawn(binPath, ["--version"]);

        let errorOutput = "";
        proc.stderr.on("data", chunk => errorOutput += chunk.toString());

        proc.on("error", err => {
            reject(err);
        });

        proc.on("exit", (code, signal) => {
            if (code === 0) {
                resolve();
            } else if (signal) {
                reject(new Error(`Binary was terminated by signal: ${signal}`));
            } else {
                reject(new Error(`Binary exited with code ${code}. Stderr: ${errorOutput}`));
            }
        });
    });
}

export async function ensureBinWithVersion(version: string): Promise<string> {
    let _binPath = await binPath(version);
    const release = await installable(_binPath);

    if (release) {
        _binPath = await downloadBin(version);
        process.env["NEAR_SANDBOX_BIN_PATH"] = _binPath;

        await release();
    }
    try {
        await pingBin(_binPath);
    } catch (error) {
        await fs.rm(join(__dirname, "..", "..", "bin", `near-sandbox-${version}`), { recursive: true, force: true });
        throw new TypedError(`Binary doesn't respond, probably is corrupted. Try re-downloading`,
            BinaryErrors.RunningFailed,
            error instanceof Error ? error : new Error(String(error))
        );
    }
    return _binPath;
}
