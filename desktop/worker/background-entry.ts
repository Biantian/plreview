import { createBackgroundRouter } from "@/desktop/worker/background-router";
import { createWorkerPrisma } from "@/desktop/worker/prisma-provider";
import {
  DESKTOP_REQUESTS,
  type WorkerEnvelope,
} from "@/desktop/worker/protocol";
import { createFileImportService } from "@/desktop/worker/services/file-import-service";
import { createReviewService } from "@/desktop/worker/services/review-service";
import { createRuleService } from "@/desktop/worker/services/rule-service";

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

parentPort?.on("message", async (message: unknown) => {
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

const requestChannels = new Set<string>(Object.values(DESKTOP_REQUESTS));

function isWorkerRequest(message: unknown): message is WorkerEnvelope {
  return (
    !!message &&
    typeof message === "object" &&
    typeof (message as WorkerEnvelope).id === "string" &&
    requestChannels.has((message as WorkerEnvelope).channel)
  );
}
