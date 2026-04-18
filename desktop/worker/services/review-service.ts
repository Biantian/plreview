import type { PrismaClient } from "@prisma/client";

import {
  createReviewBatch,
  type CreateReviewBatchInput,
} from "@/desktop/core/reviews/create-review-batch";
import { listReviewJobs } from "@/desktop/core/reviews/list-review-jobs";
import { searchReviewJobs } from "@/desktop/core/reviews/search-review-jobs";

export function createReviewService(prisma: PrismaClient) {
  return {
    createReviewBatch: (input: CreateReviewBatchInput) =>
      createReviewBatch(prisma, input),
    listReviewJobs: () => listReviewJobs(prisma),
    searchReviewJobs: (query: string) => searchReviewJobs(prisma, query),
  };
}
