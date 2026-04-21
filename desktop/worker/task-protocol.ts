export const MALFORMED_TASK_MESSAGE_ERROR = "Malformed or unsupported task message.";

type ParseDocumentTaskRequest = {
  id: string;
  task: "parse-document";
  payload: {
    filePath: string;
  };
};

type ExecuteReviewJobTaskRequest = {
  id: string;
  task: "execute-review-job";
  payload: unknown;
};

export type TaskRequest = ParseDocumentTaskRequest | ExecuteReviewJobTaskRequest;

export function parseTaskRequest(
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
      error: MALFORMED_TASK_MESSAGE_ERROR,
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
      error: MALFORMED_TASK_MESSAGE_ERROR,
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
      error: MALFORMED_TASK_MESSAGE_ERROR,
    };
  }

  if (candidate.task === "execute-review-job") {
    return {
      ok: true,
      value: {
        id: candidate.id,
        task: "execute-review-job",
        payload: candidate.payload,
      },
    };
  }

  return {
    ok: false,
    id,
    error: MALFORMED_TASK_MESSAGE_ERROR,
  };
}
