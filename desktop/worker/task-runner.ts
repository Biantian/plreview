import { randomUUID } from "node:crypto";
import { utilityProcess } from "electron";

import { resolveForkTarget } from "@/desktop/runtime-targets";
import { parseTaskRequest } from "@/desktop/worker/task-protocol";

const taskProcessTarget = resolveForkTarget(
  __filename,
  "./task-entry.ts",
  "./task-entry.cjs",
  "./task-entry.cjs",
);

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
      if (typeof utilityProcess?.fork !== "function") {
        return runTaskInProcess(task, payload);
      }

      return new Promise<T>((resolve, reject) => {
        const child = utilityProcess.fork(
          taskProcessTarget.entryPath,
          [],
          taskProcessTarget.execArgv.length > 0
            ? {
                execArgv: taskProcessTarget.execArgv,
              }
            : {},
        );
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

async function runTaskInProcess<T>(task: TaskName, payload: unknown): Promise<T> {
  const parsedTaskRequest = parseTaskRequest({
    id: "in_process_fallback",
    task,
    payload,
  });

  if (!parsedTaskRequest.ok) {
    throw new Error(parsedTaskRequest.error);
  }

  if (parsedTaskRequest.value.task === "parse-document") {
    const { parseLocalDocumentInProcess } = await import(
      "@/desktop/core/files/parse-local-document"
    );

    return parseLocalDocumentInProcess(parsedTaskRequest.value.payload.filePath) as Promise<T>;
  }

  const { executeReviewJob } = await import("@/lib/review-jobs");

  return executeReviewJob(
    parsedTaskRequest.value.payload as Parameters<typeof executeReviewJob>[0],
  ) as Promise<T>;
}
