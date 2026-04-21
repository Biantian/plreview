import { createBackgroundRouter } from "@/desktop/worker/background-router";
import { createWorkerPrisma } from "@/desktop/worker/prisma-provider";
import {
  DESKTOP_REQUESTS,
  type WorkerEnvelope,
} from "@/desktop/worker/protocol";
import { createFileImportService } from "@/desktop/worker/services/file-import-service";
import { createReviewService } from "@/desktop/worker/services/review-service";
import { createRuleService } from "@/desktop/worker/services/rule-service";
import {
  deleteSelectedReviewJobs,
  exportReviewListFile,
  exportReviewReportArchive,
  retryReviewJobById,
} from "@/lib/review-ipc";

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
  const normalizedMessage = unwrapUtilityProcessMessage(message);

  if (!isWorkerRequest(normalizedMessage)) {
    return;
  }

  try {
    const payload = await handleWorkerRequest(normalizedMessage);
    parentPort?.postMessage({
      type: "desktop-worker:response",
      id: normalizedMessage.id,
      payload,
    });
  } catch (error) {
    parentPort?.postMessage({
      type: "desktop-worker:error",
      id: normalizedMessage.id,
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

async function handleWorkerRequest(message: WorkerEnvelope) {
  switch (message.channel) {
    case DESKTOP_REQUESTS.reviewJobsDelete:
      return deleteSelectedReviewJobs(readReviewSelectionPayload(message.payload), prisma);
    case DESKTOP_REQUESTS.reviewJobsRetry:
      return retryReviewJobById(readReviewJobId(message.payload), prisma);
    case DESKTOP_REQUESTS.reviewJobsExportList:
      return exportReviewListFile(readReviewSelectionPayload(message.payload), prisma);
    case DESKTOP_REQUESTS.reviewJobsExportReport:
      return exportReviewReportArchive(readReviewSelectionPayload(message.payload), prisma);
    default:
      return router.handle(message);
  }
}

function readReviewSelectionPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return {
      allMatching: false,
    };
  }

  const selection = payload as {
    selectedIds?: unknown;
    query?: unknown;
    allMatching?: unknown;
  };
  const selectedIds = Array.isArray(selection.selectedIds)
    ? selection.selectedIds.filter((selectedId): selectedId is string => typeof selectedId === "string")
    : undefined;
  const query = typeof selection.query === "string" ? selection.query : undefined;

  return {
    selectedIds,
    query,
    allMatching: selection.allMatching === true,
  };
}

function readReviewJobId(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const reviewJobId = (payload as { reviewJobId?: unknown }).reviewJobId;
  return typeof reviewJobId === "string" ? reviewJobId : "";
}
