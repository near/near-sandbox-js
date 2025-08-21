export enum SandboxErrors {
    InitializationFailed = "InitializationFailed",
    RunFailed = "RunFailed",
    TearDownFailed = "TearDownFailed",
    InvalidConfig = "InvalidConfig",
}

export enum BinaryErrors {
    RunningFailed = "RunningFailed",
    DownloadFailed = "DownloadFailed",
    BinaryNotFound = "BinaryNotFound",
    InstallationFailed = "InstallationFailed",
}

export enum TcpAndLockErrors {
    PortNotAvailable = "PortNotAvailable",
    LockFailed = "LockFailed",
    PortAcquisitionFailed = "PortAcquisitionFailed",
}

export class TypedError extends Error {
    type: SandboxErrors | BinaryErrors | TcpAndLockErrors | "UntypedError";
    cause?: Error;
    constructor(message?: string, type?: SandboxErrors | BinaryErrors | TcpAndLockErrors | "UntypedError", cause?: Error) {
        super(message);
        this.type = type || "UntypedError";
        this.cause = cause;
    }
}