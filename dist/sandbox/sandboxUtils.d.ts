export declare function rpcSocket(port: number): string;
export declare function acquireOrLockPort(port?: number): Promise<{
    port: number;
    lockFilePath: string;
}>;
export declare function dumpStateFromPath(pathToState: string): Promise<{
    config: Record<string, unknown>;
    genesis: Record<string, unknown>;
    nodeKey: Record<string, unknown>;
    validatorKey: Record<string, unknown>;
}>;
export declare function createTmpDir(): Promise<import("tmp-promise").DirectoryResult>;
