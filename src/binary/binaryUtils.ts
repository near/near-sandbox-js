import { stat} from "fs/promises";
import * as os from "os";

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
