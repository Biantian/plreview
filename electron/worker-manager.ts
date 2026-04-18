import path from "node:path";
import { fileURLToPath } from "node:url";
import { utilityProcess } from "electron";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export function createWorkerManager() {
  let child: ReturnType<typeof utilityProcess.fork> | null = null;
  let pendingStart: Promise<ReturnType<typeof utilityProcess.fork>> | null = null;
  const bootstrapPath = path.join(currentDir, "../desktop/worker/background-entry.cjs");
  const workerPath = path.join(currentDir, "../desktop/worker/background-entry.ts");

  function clearCachedChild(worker: ReturnType<typeof utilityProcess.fork>) {
    if (child === worker) {
      child = null;
    }
  }

  return {
    async start() {
      if (child) {
        return pendingStart ?? child;
      }

      if (pendingStart) {
        return pendingStart;
      }

      const worker = utilityProcess.fork(workerPath, [], {
        execArgv: ["-r", bootstrapPath],
      });
      child = worker;

      pendingStart = new Promise((resolve, reject) => {
        let ready = false;

        worker.once("message", (message: unknown) => {
          if (message && typeof message === "object" && (message as { type?: string }).type === "desktop-worker:started") {
            ready = true;
            pendingStart = null;
            resolve(worker);
          }
        });

        worker.once("exit", (code: number, signal: string | null) => {
          clearCachedChild(worker);
          if (!ready) {
            pendingStart = null;
            reject(new Error(`Desktop worker exited before ready (${code}${signal ? `, ${signal}` : ""})`));
          }
        });

        worker.once("error", (error: Error) => {
          clearCachedChild(worker);
          if (!ready) {
            pendingStart = null;
            reject(error);
          }
        });
      });

      return pendingStart;
    },
    getChild() {
      return child;
    },
    stop() {
      child?.kill();
      child = null;
      pendingStart = null;
    },
  };
}
