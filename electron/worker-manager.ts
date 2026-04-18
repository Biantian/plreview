import path from "node:path";
import { fileURLToPath } from "node:url";
import { utilityProcess } from "electron";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export function createWorkerManager() {
  let child: ReturnType<typeof utilityProcess.fork> | null = null;

  return {
    async start() {
      if (child) {
        return child;
      }

      child = utilityProcess.fork(path.join(currentDir, "../desktop/worker/background-entry.cjs"));
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
