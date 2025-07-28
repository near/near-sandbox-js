export declare function downloadBin(version: string): Promise<string>;
export declare function binPath(version: string): Promise<string>;
export declare function checkForVersion(version: string): Promise<string | undefined>;
export declare function installable(binPath: string): Promise<(() => Promise<void>) | null>;
export declare function ensureBinWithVersion(version: string): Promise<string>;
