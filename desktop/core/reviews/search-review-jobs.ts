import type { PrismaClient } from "@prisma/client";

import { listReviewJobs } from "@/desktop/core/reviews/list-review-jobs";
import { reviewStatusLabel } from "@/lib/utils";

export async function searchReviewJobs(
  prisma: PrismaClient,
  query: string,
  limit?: number,
) {
  const keyword = query.trim().toLowerCase();
  const items = await listReviewJobs(prisma, limit);

  if (!keyword) {
    return items;
  }

  return items.filter((item) =>
    [
      item.title,
      item.filename,
      item.batchName ?? "",
      item.modelName,
      item.status,
      reviewStatusLabel(item.status),
    ]
      .join(" ")
      .toLowerCase()
      .includes(keyword),
  );
}
