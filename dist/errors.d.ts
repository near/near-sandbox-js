export declare enum SandboxErrors {
    InitializationFailed = "InitializationFailed",
    RunFailed = "RunFailed",
    TearDownFailed = "TearDownFailed",
    InvalidConfig = "InvalidConfig"
}
export declare enum BinaryErrors {
    RunningFailed = "RunningFailed",
    DownloadFailed = "DownloadFailed",
    BinaryNotFound = "BinaryNotFound",
    InstallationFailed = "InstallationFailed"
}
export declare enum TcpAndLockErrors {
    PortNotAvailable = "PortNotAvailable",
    LockFailed = "LockFailed",
    PortAcquisitionFailed = "PortAcquisitionFailed"
}
export declare class TypedError extends Error {
    type: SandboxErrors | BinaryErrors | TcpAndLockErrors | "UntypedError";
    cause?: Error;
    constructor(message?: string, type?: SandboxErrors | BinaryErrors | TcpAndLockErrors | "UntypedError", cause?: Error);
}
