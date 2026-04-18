import { parseLocalDocumentInProcess } from "@/desktop/core/files/parse-local-document";
import { executeReviewJob } from "@/lib/review-jobs";

type TaskRequest =
  | {
      id: string;
      task: "parse-document";
      payload: {
        filePath: string;
      };
    }
  | {
      id: string;
      task: "execute-review-job";
      payload: Parameters<typeof executeReviewJob>[0];
    };

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
  if (!isTaskRequest(message)) {
    return;
  }

  try {
    if (message.task === "parse-document") {
      const result = await parseLocalDocumentInProcess(message.payload.filePath);
      parentPort?.postMessage({ id: message.id, ok: true, result });
      return;
    }

    const result = await executeReviewJob(message.payload);
    parentPort?.postMessage({ id: message.id, ok: true, result });
  } catch (error) {
    parentPort?.postMessage({
      id: message.id,
      ok: false,
      error: error instanceof Error ? error.message : "Unknown task error.",
    });
  }
});

function isTaskRequest(message: unknown): message is TaskRequest {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as {
    id?: unknown;
    task?: unknown;
    payload?: unknown;
  };

  if (typeof candidate.id !== "string") {
    return false;
  }

  if (candidate.task === "parse-document") {
    return (
      !!candidate.payload &&
      typeof candidate.payload === "object" &&
      typeof (candidate.payload as { filePath?: unknown }).filePath === "string"
    );
  }

  return candidate.task === "execute-review-job";
}
