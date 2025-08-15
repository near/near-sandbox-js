/// <reference types="node" />
import { DirectoryResult } from "tmp-promise";
import { ChildProcess, StdioOptions } from "child_process";
export declare function initConfigsToTmpWithVersion(version: string, tmpDir: DirectoryResult): Promise<void>;
export declare function spawnWithArgsAndVersion(version: string, args: string[], stdio?: StdioOptions): Promise<ChildProcess>;
