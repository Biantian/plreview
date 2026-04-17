import { spawn } from "node:child_process";

import { applyLocalDevEnvDefaults } from "../lib/dev-env";

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage: node --import tsx scripts/run-with-dev-env.ts <command> [...args]");
  process.exit(1);
}

const child = spawn(command, args, {
  stdio: "inherit",
  env: applyLocalDevEnvDefaults(process.env),
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
