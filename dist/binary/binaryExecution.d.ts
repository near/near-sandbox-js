/// <reference types="node" />
import { DirectoryResult } from "tmp-promise";
import { ChildProcess } from "child_process";
export declare function initHomeDirWithVersion(version: string, homeDir: DirectoryResult): Promise<void>;
export declare function runWithOptionsAndVersion(version: string, options: string[]): Promise<ChildProcess>;
