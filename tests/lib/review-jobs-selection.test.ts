import { beforeEach, describe, expect, it, vi } from "vitest";

const { reviewJobFindMany } = vi.hoisted(() => ({
  reviewJobFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    reviewJob: {
      findMany: reviewJobFindMany,
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { resolveReviewSelectionScope } from "../../lib/review-jobs-selection";

describe("resolveReviewSelectionScope", () => {
  beforeEach(() => {
    reviewJobFindMany.mockReset();
  });

  it("loads explicit selected ids when allMatching is false", async () => {
    reviewJobFindMany.mockResolvedValue([
      {
        id: "review_1",
        status: "completed",
        reportMarkdown: "# report",
      },
      {
        id: "review_2",
        status: "failed",
        reportMarkdown: null,
      },
    ]);

    await expect(
      resolveReviewSelectionScope(prisma, {
        selectedIds: ["review_1", "review_2"],
        allMatching: false,
      }),
    ).resolves.toEqual({
      mode: "selected",
      items: [
        {
          id: "review_1",
          status: "completed",
          reportMarkdown: "# report",
        },
        {
          id: "review_2",
          status: "failed",
          reportMarkdown: null,
        },
      ],
    });

    expect(reviewJobFindMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["review_1", "review_2"],
        },
      },
      select: {
        id: true,
        status: true,
        reportMarkdown: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  });

  it("trims and deduplicates explicit selected ids", async () => {
    reviewJobFindMany.mockResolvedValue([
      {
        id: "review_1",
        status: "completed",
        reportMarkdown: "# report",
      },
      {
        id: "review_2",
        status: "failed",
        reportMarkdown: null,
      },
    ]);

    await resolveReviewSelectionScope(prisma, {
      selectedIds: [" review_1 ", "review_1", "review_2 "],
      allMatching: false,
    });

    expect(reviewJobFindMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["review_1", "review_2"],
        },
      },
      select: {
        id: true,
        status: true,
        reportMarkdown: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  });

  it("uses the search predicate when allMatching is true", async () => {
    reviewJobFindMany.mockResolvedValue([
      {
        id: "review_3",
        status: "completed",
        reportMarkdown: "matched",
      },
    ]);

    await expect(
      resolveReviewSelectionScope(prisma, {
        allMatching: true,
        query: "已完成",
      }),
    ).resolves.toEqual({
      mode: "allMatching",
      items: [
        {
          id: "review_3",
          status: "completed",
          reportMarkdown: "matched",
        },
      ],
    });

    expect(reviewJobFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              document: expect.objectContaining({
                title: expect.objectContaining({
                  contains: "已完成",
                }),
              }),
            }),
            expect.objectContaining({
              document: expect.objectContaining({
                filename: expect.objectContaining({
                  contains: "已完成",
                }),
              }),
            }),
            expect.objectContaining({
              reviewBatch: expect.objectContaining({
                name: expect.objectContaining({
                  contains: "已完成",
                }),
              }),
            }),
            expect.objectContaining({
              modelNameSnapshot: expect.objectContaining({
                contains: "已完成",
              }),
            }),
            expect.objectContaining({
              status: {
                in: ["completed"],
              },
            }),
          ]),
        }),
      }),
    );
  });

  it("keeps blank-query allMatching requests broad", async () => {
    reviewJobFindMany.mockResolvedValue([
      {
        id: "review_4",
        status: "completed",
        reportMarkdown: "matched",
      },
    ]);

    await resolveReviewSelectionScope(prisma, {
      allMatching: true,
      query: "   ",
    });

    expect(reviewJobFindMany).toHaveBeenCalledWith({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        status: true,
        reportMarkdown: true,
      },
    });
  });

  it("fails when explicit selected ids are partially missing", async () => {
    reviewJobFindMany.mockResolvedValue([
      {
        id: "review_1",
        status: "completed",
        reportMarkdown: "# report",
      },
    ]);

    await expect(
      resolveReviewSelectionScope(prisma, {
        selectedIds: ["review_1", "review_2"],
        allMatching: false,
      }),
    ).rejects.toThrowError("未找到以下评审任务：review_2。");
  });

  it("keeps the text query as entered when building search filters", async () => {
    reviewJobFindMany.mockResolvedValue([
      {
        id: "review_5",
        status: "completed",
        reportMarkdown: "matched",
      },
    ]);

    await resolveReviewSelectionScope(prisma, {
      allMatching: true,
      query: "QwEn",
    });

    expect(reviewJobFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              document: expect.objectContaining({
                title: expect.objectContaining({
                  contains: "QwEn",
                }),
              }),
            }),
            expect.objectContaining({
              document: expect.objectContaining({
                filename: expect.objectContaining({
                  contains: "QwEn",
                }),
              }),
            }),
            expect.objectContaining({
              reviewBatch: expect.objectContaining({
                name: expect.objectContaining({
                  contains: "QwEn",
                }),
              }),
            }),
            expect.objectContaining({
              modelNameSnapshot: expect.objectContaining({
                contains: "QwEn",
              }),
            }),
          ]),
        }),
      }),
    );
  });

  it("rejects an empty scope", async () => {
    await expect(
      resolveReviewSelectionScope(prisma, {
        selectedIds: [],
        allMatching: false,
      }),
    ).rejects.toThrowError("至少选择一条评审任务。");
  });
});
