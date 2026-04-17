import type { PrismaClient, ReviewStatus } from "@prisma/client";

import { buildReviewJobSearchWhere } from "@/lib/review-jobs";

export type ReviewSelectionMode = "selected" | "allMatching";

export type ReviewSelectionItem = {
  id: string;
  status: ReviewStatus;
  reportMarkdown: string | null;
};

export type ReviewSelectionScope = {
  mode: ReviewSelectionMode;
  items: ReviewSelectionItem[];
};

export type ResolveReviewSelectionScopeInput = {
  selectedIds?: string[];
  query?: string;
  allMatching: boolean;
};

function normalizeSelectedIds(selectedIds: string[] | undefined) {
  return Array.from(
    new Set((selectedIds ?? []).map((selectedId) => selectedId.trim()).filter(Boolean)),
  );
}

function getMissingSelectedIds(selectedIds: string[], items: ReviewSelectionItem[]) {
  const foundIds = new Set(items.map((item) => item.id));

  return selectedIds.filter((selectedId) => !foundIds.has(selectedId));
}

export async function resolveReviewSelectionScope(
  prisma: PrismaClient,
  input: ResolveReviewSelectionScopeInput,
): Promise<ReviewSelectionScope> {
  const select = {
    id: true,
    status: true,
    reportMarkdown: true,
  } as const;

  if (input.allMatching) {
    const where = buildReviewJobSearchWhere(input.query ?? "");

    const items = await prisma.reviewJob.findMany({
      ...(where ? { where } : {}),
      orderBy: {
        createdAt: "desc",
      },
      select,
    });

    return {
      mode: "allMatching",
      items,
    };
  }

  const selectedIds = normalizeSelectedIds(input.selectedIds);

  if (selectedIds.length === 0) {
    throw new Error("至少选择一条评审任务。");
  }

  const items = await prisma.reviewJob.findMany({
    where: {
      id: {
        in: selectedIds,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select,
  });

  const missingSelectedIds = getMissingSelectedIds(selectedIds, items);

  if (missingSelectedIds.length > 0) {
    throw new Error(`未找到以下评审任务：${missingSelectedIds.join("、")}。`);
  }

  return {
    mode: "selected",
    items,
  };
}
