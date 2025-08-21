"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypedError = exports.TcpAndLockErrors = exports.BinaryErrors = exports.SandboxErrors = void 0;
var SandboxErrors;
(function (SandboxErrors) {
    SandboxErrors["InitializationFailed"] = "InitializationFailed";
    SandboxErrors["RunFailed"] = "RunFailed";
    SandboxErrors["TearDownFailed"] = "TearDownFailed";
    SandboxErrors["InvalidConfig"] = "InvalidConfig";
})(SandboxErrors || (exports.SandboxErrors = SandboxErrors = {}));
var BinaryErrors;
(function (BinaryErrors) {
    BinaryErrors["RunningFailed"] = "RunningFailed";
    BinaryErrors["DownloadFailed"] = "DownloadFailed";
    BinaryErrors["BinaryNotFound"] = "BinaryNotFound";
    BinaryErrors["InstallationFailed"] = "InstallationFailed";
})(BinaryErrors || (exports.BinaryErrors = BinaryErrors = {}));
var TcpAndLockErrors;
(function (TcpAndLockErrors) {
    TcpAndLockErrors["PortNotAvailable"] = "PortNotAvailable";
    TcpAndLockErrors["LockFailed"] = "LockFailed";
    TcpAndLockErrors["PortAcquisitionFailed"] = "PortAcquisitionFailed";
})(TcpAndLockErrors || (exports.TcpAndLockErrors = TcpAndLockErrors = {}));
class TypedError extends Error {
    constructor(message, type, cause) {
        super(message);
        Object.defineProperty(this, "type", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "cause", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.type = type || "UntypedError";
        this.cause = cause;
    }
}
exports.TypedError = TypedError;
