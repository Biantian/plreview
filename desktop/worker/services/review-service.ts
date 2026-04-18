import type { PrismaClient } from "@prisma/client";

import {
  createReviewBatch,
  type CreateReviewBatchInput,
} from "@/desktop/core/reviews/create-review-batch";
import { listReviewJobs } from "@/desktop/core/reviews/list-review-jobs";
import { searchReviewJobs } from "@/desktop/core/reviews/search-review-jobs";
import { createTaskRunner } from "@/desktop/worker/task-runner";

export function createReviewService(prisma: PrismaClient) {
  const taskRunner = createTaskRunner();

  return {
    createReviewBatch: (input: CreateReviewBatchInput) =>
      createReviewBatch(prisma, input, (job) =>
        taskRunner.run("execute-review-job", job),
      ),
    listReviewJobs: () => listReviewJobs(prisma),
    searchReviewJobs: (query: string) => searchReviewJobs(prisma, query),
  };
}
