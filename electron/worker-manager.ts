import path from "node:path";
import { fileURLToPath } from "node:url";
import { utilityProcess } from "electron";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export function createWorkerManager() {
  let child: ReturnType<typeof utilityProcess.fork> | null = null;
  const bootstrapPath = path.join(currentDir, "../desktop/worker/background-entry.cjs");
  const workerPath = path.join(currentDir, "../desktop/worker/background-entry.ts");

  return {
    async start() {
      if (child) {
        return child;
      }

      child = utilityProcess.fork(workerPath, [], {
        execArgv: ["-r", bootstrapPath],
      });
      return child;
    },
    getChild() {
      return child;
    },
    stop() {
      child?.kill();
      child = null;
    },
  };
}
