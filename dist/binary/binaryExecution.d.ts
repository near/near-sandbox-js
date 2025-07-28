/// <reference types="node" />
import { DirectoryResult } from "tmp-promise";
import { ChildProcess, SpawnOptions } from "child_process";
export declare function initConfigsToTmpWithVersion(version: string, tmpDir: DirectoryResult): Promise<void>;
export declare function runWithArgsAndVersion(version: string, args: string[], options?: SpawnOptions): Promise<ChildProcess>;
