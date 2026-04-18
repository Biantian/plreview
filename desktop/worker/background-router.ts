import type { CreateReviewBatchInput } from "@/desktop/core/reviews/create-review-batch";
import type { WorkerEnvelope } from "@/desktop/worker/protocol";

type BackgroundServices = {
  reviews: {
    createReviewBatch: (input: CreateReviewBatchInput) => Promise<unknown>;
    listReviewJobs: () => Promise<unknown>;
    searchReviewJobs: (query: string) => Promise<unknown>;
  };
  rules: {
    listRules: () => Promise<unknown>;
    searchRules: (query: string) => Promise<unknown>;
  };
  files: {
    importDocumentsIntoStore: (paths: string[]) => Promise<unknown>;
  };
};

export function createBackgroundRouter(services: BackgroundServices) {
  return {
    async handle(message: WorkerEnvelope) {
      switch (message.channel) {
        case "files:pick":
          return services.files.importDocumentsIntoStore(
            Array.isArray(message.payload) ? message.payload.filter(isString) : [],
          );
        case "review-batches:create":
          return services.reviews.createReviewBatch(
            (message.payload ?? {}) as CreateReviewBatchInput,
          );
        case "review-jobs:list":
          return services.reviews.listReviewJobs();
        case "review-jobs:search":
          return services.reviews.searchReviewJobs(readQuery(message.payload));
        case "rules:list":
          return services.rules.listRules();
        case "rules:search":
          return services.rules.searchRules(readQuery(message.payload));
        default:
          throw new Error(`Unsupported worker message: ${message.channel}`);
      }
    },
  };
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function readQuery(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  return String((payload as { query?: unknown }).query ?? "");
}
