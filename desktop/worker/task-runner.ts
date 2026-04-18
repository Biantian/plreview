import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { utilityProcess } from "electron";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const bootstrapPath = path.join(currentDir, "./task-entry.cjs");
const workerPath = path.join(currentDir, "./task-entry.ts");

type TaskName = "parse-document" | "execute-review-job";

type TaskResponse = {
  id?: string;
  ok?: boolean;
  result?: unknown;
  error?: string;
};

export function createTaskRunner() {
  return {
    run<T>(task: TaskName, payload: unknown): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const child = utilityProcess.fork(workerPath, [], {
          execArgv: ["-r", bootstrapPath],
        });
        const id = randomUUID();
        let settled = false;

        const finishWithError = (error: Error) => {
          if (settled) {
            return;
          }

          settled = true;
          child.off("message", handleMessage);
          child.kill();
          reject(error);
        };

        const handleMessage = (message: TaskResponse) => {
          if (settled) {
            return;
          }

          if (message?.id !== id) {
            return;
          }

          settled = true;
          child.off("message", handleMessage);
          child.kill();

          if (message?.ok) {
            resolve(message.result as T);
            return;
          }

          reject(new Error(message?.error ?? "Task process failed."));
        };

        child.on("message", handleMessage);

        child.once("exit", (code: number) => {
          finishWithError(new Error(`Task process exited (${code})`));
        });

        child.once("error", (type, location) => {
          finishWithError(new Error(`Task process ${type} at ${location}`));
        });

        child.postMessage({
          id,
          task,
          payload,
        });
      });
    },
  };
}
