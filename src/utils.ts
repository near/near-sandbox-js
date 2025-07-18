import { stat, rm as RM } from "fs/promises";
import { join } from "path";

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const f = await stat(filePath);
    return f.isFile();
  } catch {
    return false;
  }
}

export async function searchPath(
  filename: string
): Promise<string | undefined> {
  const binPath = process.env["NEAR_SANDBOX_BINARY_PATH"];
  if (
    binPath &&
    binPath.length > 0 &&
    (await fileExists(join(binPath, filename)))
  ){
    return binPath;
  }

  return undefined;
}

export const inherit: "inherit" = "inherit";

export async function rm(path: string): Promise<void> {
  try {
    await RM(path);
  } catch (e) {}
}
