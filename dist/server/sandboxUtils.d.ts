export declare function rpcSocket(port: number): string;
export declare function acquireOrLockPort(port?: number): Promise<{
    port: number;
    lockFilePath: string;
}>;
