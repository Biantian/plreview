import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  llmProfileFindMany,
  ruleFindMany,
  reviewBatchFindFirst,
} = vi.hoisted(() => ({
  llmProfileFindMany: vi.fn(),
  ruleFindMany: vi.fn(),
  reviewBatchFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    llmProfile: {
      findMany: llmProfileFindMany,
    },
    rule: {
      findMany: ruleFindMany,
    },
    reviewBatch: {
      findFirst: reviewBatchFindFirst,
    },
  },
}));

import { getReviewLaunchData } from "@/lib/review-launch";

describe("review-launch", () => {
  beforeEach(() => {
    llmProfileFindMany.mockReset();
    ruleFindMany.mockReset();
    reviewBatchFindFirst.mockReset();
  });

  it("returns enabled models and rules plus deduped rule ids from the latest batch", async () => {
    llmProfileFindMany.mockResolvedValue([
      {
        id: "profile_2",
        name: "Qwen Production",
        provider: "dashscope",
        defaultModel: "qwen-plus",
      },
    ]);
    ruleFindMany.mockResolvedValue([
      {
        id: "rule_b",
        name: "Tone",
        category: "Content",
        description: "Check tone consistency",
        severity: "medium",
      },
      {
        id: "rule_a",
        name: "Headline",
        category: "Structure",
        description: "Check headline quality",
        severity: "high",
      },
    ]);
    reviewBatchFindFirst.mockResolvedValue({
      batchRules: [
        { ruleVersion: { ruleId: "rule_a" } },
        { ruleVersion: { ruleId: "rule_b" } },
        { ruleVersion: { ruleId: "rule_a" } },
      ],
    });

    const data = await getReviewLaunchData();

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
    expect(ruleFindMany).toHaveBeenCalledWith({
      where: {
        enabled: true,
        deletedAt: null,
      },
      orderBy: [{ category: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        severity: true,
      },
    });
    expect(reviewBatchFindFirst).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
        select: {
          batchRules: {
            select: {
              ruleVersion: {
              select: {
                ruleId: true,
              },
            },
          },
        },
      },
    });
    expect(data).toEqual({
      llmProfiles: [
        {
          id: "profile_2",
          name: "Qwen Production",
          provider: "dashscope",
          defaultModel: "qwen-plus",
        },
      ],
      rules: [
        {
          id: "rule_b",
          name: "Tone",
          category: "Content",
          description: "Check tone consistency",
          severity: "medium",
        },
        {
          id: "rule_a",
          name: "Headline",
          category: "Structure",
          description: "Check headline quality",
          severity: "high",
        },
      ],
      lastBatchRuleIds: ["rule_a", "rule_b"],
    });
  });
});
