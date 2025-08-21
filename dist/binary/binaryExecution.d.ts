/// <reference types="node" />
import { ChildProcess, StdioOptions } from "child_process";
export declare function initConfigsWithVersion(version: string, dirPath: string): Promise<void>;
export declare function spawnWithArgsAndVersion(version: string, args: string[], stdio?: StdioOptions): Promise<ChildProcess>;
