import { describe, expect, it, vi } from "vitest";

import { listReviewJobs } from "@/desktop/core/reviews/list-review-jobs";

describe("listReviewJobs", () => {
  it("loads the full review queue without truncating to the newest 50 jobs", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "review_1",
        status: "completed",
        modelNameSnapshot: "qwen-plus",
        overallScore: 90,
        createdAt: new Date("2026-04-28T08:00:00.000Z"),
        finishedAt: new Date("2026-04-28T08:05:00.000Z"),
        reviewBatch: {
          name: "四月批次",
        },
        document: {
          title: "文档一",
          filename: "doc-1.docx",
          fileType: "docx",
        },
        _count: {
          annotations: 2,
        },
      },
    ]);

    const rows = await listReviewJobs({
      reviewJob: {
        findMany,
      },
    } as never);

    expect(findMany).toHaveBeenCalledWith({
      include: {
        reviewBatch: {
          select: {
            name: true,
          },
        },
        document: {
          select: {
            fileType: true,
            filename: true,
            title: true,
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
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        id: "review_1",
        title: "文档一",
        batchName: "四月批次",
      }),
    );
  });
});
