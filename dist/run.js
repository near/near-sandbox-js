"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const binaryExecution_1 = require("./binary/binaryExecution");
const Sandbox_1 = require("./sandbox/Sandbox");
async function run() {
    try {
        if (process.argv.length < 3) {
            process.argv.push("--help");
        }
        const sandboxProcess = await (0, binaryExecution_1.spawnWithArgsAndVersion)(Sandbox_1.DEFAULT_NEAR_SANDBOX_VERSION, process.argv.slice(2), [null, 'inherit', 'inherit']);
        sandboxProcess.on("exit", (code) => {
            if (code !== 0) {
                console.error(`Sandbox process exited with code ${code}`);
            }
        });
    }
    catch (error) {
        console.log(error);
        process.exit(1);
    }
}
;
run();
