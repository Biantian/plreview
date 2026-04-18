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
  const taskRequest = parseTaskRequest(message);

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

    const result = await executeReviewJob(taskRequest.value.payload);
    parentPort?.postMessage({ id: taskRequest.value.id, ok: true, result });
  } catch (error) {
    parentPort?.postMessage({
      id: taskRequest.value.id,
      ok: false,
      error: error instanceof Error ? error.message : "Unknown task error.",
    });
  }
});

function parseTaskRequest(
  message: unknown,
):
  | {
      ok: true;
      value: TaskRequest;
    }
  | {
      ok: false;
      id: string;
      error: string;
    } {
  if (!message || typeof message !== "object") {
    return {
      ok: false,
      id: "unknown",
      error: "Malformed or unsupported task message.",
    };
  }

  const candidate = message as {
    id?: unknown;
    task?: unknown;
    payload?: unknown;
  };
  const id = typeof candidate.id === "string" ? candidate.id : "unknown";

  if (typeof candidate.id !== "string") {
    return {
      ok: false,
      id,
      error: "Malformed or unsupported task message.",
    };
  }

  if (candidate.task === "parse-document") {
    if (
      !!candidate.payload &&
      typeof candidate.payload === "object" &&
      typeof (candidate.payload as { filePath?: unknown }).filePath === "string"
    ) {
      return {
        ok: true,
        value: {
          id: candidate.id,
          task: "parse-document",
          payload: {
            filePath: (candidate.payload as { filePath: string }).filePath,
          },
        },
      };
    }

    return {
      ok: false,
      id,
      error: "Malformed or unsupported task message.",
    };
  }

  if (candidate.task === "execute-review-job") {
    return {
      ok: true,
      value: {
        id: candidate.id,
        task: "execute-review-job",
        payload: candidate.payload as Parameters<typeof executeReviewJob>[0],
      },
    };
  }

  return {
    ok: false,
    id,
    error: "Malformed or unsupported task message.",
  };
}
