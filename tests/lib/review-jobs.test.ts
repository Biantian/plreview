import { beforeEach, describe, expect, it, vi } from "vitest";

const { reviewJobFindMany, reviewBatchFindMany } = vi.hoisted(() => ({
  reviewJobFindMany: vi.fn(),
  reviewBatchFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    reviewJob: {
      findMany: reviewJobFindMany,
    },
    reviewBatch: {
      findMany: reviewBatchFindMany,
    },
  },
}));

import { getReviewListItems } from "../../lib/review-jobs";

describe("review-jobs", () => {
  beforeEach(() => {
    reviewJobFindMany.mockReset();
    reviewBatchFindMany.mockReset();
  });

  it("hydrates batch names from batch ids without relying on reviewBatch include", async () => {
    reviewJobFindMany.mockResolvedValue([
      {
        id: "review_1",
        batchId: "batch_1",
        status: "completed",
        providerSnapshot: "DashScope",
        modelNameSnapshot: "qwen-plus",
        summary: "完成",
        overallScore: 91,
        errorMessage: null,
        createdAt: new Date("2026-04-15T08:00:00.000Z"),
        finishedAt: new Date("2026-04-15T08:05:00.000Z"),
        document: {
          fileType: "docx",
          title: "四月活动方案",
          filename: "april-plan.docx",
        },
        _count: {
          annotations: 3,
        },
      },
    ]);

    reviewBatchFindMany.mockResolvedValue([
      {
        id: "batch_1",
        name: "四月批次",
      },
    ]);

    const items = await getReviewListItems();

    expect(reviewJobFindMany).toHaveBeenCalledWith({
      include: {
        document: {
          select: {
            fileType: true,
            title: true,
            filename: true,
          },
        },
        _count: {
          select: {
            annotations: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    expect(reviewBatchFindMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["batch_1"],
        },
      },
      select: {
        id: true,
        name: true,
      },
    });
    expect(items).toEqual([
      {
        id: "review_1",
        title: "四月活动方案",
        filename: "april-plan.docx",
        fileType: "docx",
        batchName: "四月批次",
        status: "completed",
        provider: "DashScope",
        modelName: "qwen-plus",
        summary: "完成",
        overallScore: 91,
        annotationsCount: 3,
        errorMessage: null,
        createdAt: "2026-04-15T08:00:00.000Z",
        finishedAt: "2026-04-15T08:05:00.000Z",
      },
    ]);
  });
});
