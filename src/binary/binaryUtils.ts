import { stat} from "fs/promises";
import * as os from "os";
import { DEFAULT_NEAR_SANDBOX_VERSION } from "../constants";

function getPlatform() {
  const type = os.type();
  const arch = os.arch();

  // Darwind x86_64 is not supported for quite some time :(
  if (type === "Linux" && arch === "x64") {
    return [type, "x86_64"];
  } else if (type === "Darwin" && arch === "arm64") {
    return [type, "arm64"];
  }

  throw new Error("Only linux-x86 and darwin-arm are supported");
}

export function AWSUrl(version: string = DEFAULT_NEAR_SANDBOX_VERSION): string {
  const [platform, arch] = getPlatform();
  return `https://s3-us-west-1.amazonaws.com/build.nearprotocol.com/nearcore/${platform}-${arch}/${version}/near-sandbox.tar.gz`;
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const f = await stat(filePath);
    return f.isFile();
  } catch {
    return false;
  }
}
