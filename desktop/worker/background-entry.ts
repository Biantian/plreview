import { createBackgroundRouter } from "@/desktop/worker/background-router";
import { createWorkerPrisma } from "@/desktop/worker/prisma-provider";
import { createFileImportService } from "@/desktop/worker/services/file-import-service";
import { createReviewService } from "@/desktop/worker/services/review-service";
import { createRuleService } from "@/desktop/worker/services/rule-service";

type WorkerRequest = {
  id: string;
  channel: string;
  payload?: unknown;
};

type WorkerResponse =
  | {
      type: "desktop-worker:started";
    }
  | {
      type: "desktop-worker:response";
      id: string;
      payload: unknown;
    }
  | {
      type: "desktop-worker:error";
      id: string;
      error: string;
    };

const parentPort = (process as typeof process & {
  parentPort?: {
    postMessage(message: WorkerResponse): void;
    on(event: "message", listener: (message: unknown) => void): void;
  };
}).parentPort;

const prisma = createWorkerPrisma();
const router = createBackgroundRouter({
  reviews: createReviewService(prisma),
  rules: createRuleService(prisma),
  files: createFileImportService(prisma),
});

parentPort?.postMessage({
  type: "desktop-worker:started",
});

parentPort?.on("message", async (message) => {
  if (!isWorkerRequest(message)) {
    return;
  }

  try {
    const payload = await router.handle(message);
    parentPort?.postMessage({
      type: "desktop-worker:response",
      id: message.id,
      payload,
    });
  } catch (error) {
    parentPort?.postMessage({
      type: "desktop-worker:error",
      id: message.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

setInterval(() => {
  // Keep the utility process alive as a long-lived worker.
}, 60_000);

function isWorkerRequest(message: unknown): message is WorkerRequest {
  return (
    !!message &&
    typeof message === "object" &&
    typeof (message as WorkerRequest).id === "string" &&
    typeof (message as WorkerRequest).channel === "string"
  );
}
