import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ruleCount,
  documentCount,
  reviewJobCount,
  annotationCount,
  reviewJobFindMany,
  llmProfileFindMany,
} = vi.hoisted(() => ({
  ruleCount: vi.fn(),
  documentCount: vi.fn(),
  reviewJobCount: vi.fn(),
  annotationCount: vi.fn(),
  reviewJobFindMany: vi.fn(),
  llmProfileFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    rule: {
      count: ruleCount,
    },
    document: {
      count: documentCount,
    },
    reviewJob: {
      count: reviewJobCount,
      findMany: reviewJobFindMany,
    },
    annotation: {
      count: annotationCount,
    },
    llmProfile: {
      findMany: llmProfileFindMany,
    },
  },
}));

import { getHomeDashboardData } from "@/lib/home-dashboard";

describe("home-dashboard", () => {
  beforeEach(() => {
    ruleCount.mockReset();
    documentCount.mockReset();
    reviewJobCount.mockReset();
    annotationCount.mockReset();
    reviewJobFindMany.mockReset();
    llmProfileFindMany.mockReset();
  });

  it("aggregates counts and maps recent reviews for the desktop bridge contract", async () => {
    ruleCount.mockResolvedValueOnce(12).mockResolvedValueOnce(8);
    documentCount.mockResolvedValue(24);
    reviewJobCount.mockResolvedValue(9);
    annotationCount.mockResolvedValue(31);
    reviewJobFindMany.mockResolvedValue([
      {
        id: "review_1",
        status: "completed",
        modelNameSnapshot: "qwen-plus",
        createdAt: new Date("2026-04-20T10:00:00.000Z"),
        document: {
          title: "四月活动复盘",
        },
      },
    ]);
    llmProfileFindMany.mockResolvedValue([
      {
        id: "profile_1",
        name: "百炼生产",
        provider: "DashScope",
        defaultModel: "qwen-plus",
      },
    ]);

    const data = await getHomeDashboardData();

    expect(ruleCount).toHaveBeenNthCalledWith(1);
    expect(ruleCount).toHaveBeenNthCalledWith(2, { where: { enabled: true } });
    expect(reviewJobFindMany).toHaveBeenCalledWith({
      include: {
        document: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });
    expect(llmProfileFindMany).toHaveBeenCalledWith({
      where: { enabled: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        provider: true,
        defaultModel: true,
      },
    });

    expect(data).toEqual({
      rulesCount: 12,
      enabledRulesCount: 8,
      documentsCount: 24,
      reviewJobsCount: 9,
      annotationsCount: 31,
      recentReviews: [
        {
          id: "review_1",
          title: "四月活动复盘",
          status: "completed",
          modelName: "qwen-plus",
          createdAt: "2026-04-20T10:00:00.000Z",
        },
      ],
      llmProfiles: [
        {
          id: "profile_1",
          name: "百炼生产",
          provider: "DashScope",
          defaultModel: "qwen-plus",
        },
      ],
    });
  });
});
