import { parseLocalDocumentInProcess } from "@/desktop/core/files/parse-local-document";
import { parseTaskRequest } from "@/desktop/worker/task-protocol";
import { executeReviewJob } from "@/lib/review-jobs";

type TaskResponse =
  | {
      id: string;
      ok: true;
      result: unknown;
    }
  | {
      id: string;
      ok: false;
      error: string;
    };

const parentPort = (process as typeof process & {
  parentPort?: {
    postMessage(message: TaskResponse): void;
    on(event: "message", listener: (message: unknown) => void): void;
  };
}).parentPort;

parentPort?.on("message", async (message: unknown) => {
  const taskRequest = parseTaskRequest(unwrapUtilityProcessMessage(message));

  if (!taskRequest.ok) {
    parentPort?.postMessage({
      id: taskRequest.id,
      ok: false,
      error: taskRequest.error,
    });
    return;
  }

  try {
    if (taskRequest.value.task === "parse-document") {
      const result = await parseLocalDocumentInProcess(taskRequest.value.payload.filePath);
      parentPort?.postMessage({ id: taskRequest.value.id, ok: true, result });
      return;
    }

    const result = await executeReviewJob(
      taskRequest.value.payload as Parameters<typeof executeReviewJob>[0],
    );
    parentPort?.postMessage({ id: taskRequest.value.id, ok: true, result });
  } catch (error) {
    parentPort?.postMessage({
      id: taskRequest.value.id,
      ok: false,
      error: error instanceof Error ? error.message : "Unknown task error.",
    });
  }
});

function unwrapUtilityProcessMessage(message: unknown) {
  if (
    message &&
    typeof message === "object" &&
    "data" in message &&
    typeof (message as { data?: unknown }).data !== "undefined"
  ) {
    return (message as { data: unknown }).data;
  }

  return message;
}
