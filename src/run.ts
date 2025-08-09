import { spawnWithArgsAndVersion } from "./binary/binaryExecution";
import { DEFAULT_NEAR_SANDBOX_VERSION } from "./server/Sandbox";

async function run() {
    try {
        if (process.argv.length < 3) {
            process.argv.push("--help");
        }
        const sandboxProcess = await spawnWithArgsAndVersion(DEFAULT_NEAR_SANDBOX_VERSION, process.argv.slice(2), { stdio: [null, 'inherit', 'inherit'] });

        sandboxProcess.on("exit", (code) => {
            if (code !== 0) {
                console.error(`Sandbox process exited with code ${code}`);
            }
        });
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};

run();
