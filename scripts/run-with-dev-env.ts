import path from "node:path";
import { spawn } from "node:child_process";

import { resolveLocalDevDesktopUserDataPath } from "../electron/user-data-path";
import { applyLocalDevEnvDefaults } from "../lib/dev-env";

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage: node --import tsx scripts/run-with-dev-env.ts <command> [...args]");
  process.exit(1);
}

const projectRoot = path.resolve(process.cwd());
const env = applyLocalDevEnvDefaults({
  ...process.env,
  PLREVIEW_DESKTOP_USER_DATA_PATH:
    process.env.PLREVIEW_DESKTOP_USER_DATA_PATH?.trim() ||
    resolveLocalDevDesktopUserDataPath(projectRoot),
});

const child = spawn(command, args, {
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
