import { Severity } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ruleFindMany,
  rootRuleUpdate,
  rootRuleDelete,
  rootAnnotationCount,
  rootReviewBatchRuleCount,
  txRuleUpdate,
  txRuleDelete,
  txAnnotationCount,
  txReviewBatchRuleCount,
  transaction,
} = vi.hoisted(() => ({
    ruleFindMany: vi.fn(),
    rootRuleUpdate: vi.fn(),
    rootRuleDelete: vi.fn(),
    rootAnnotationCount: vi.fn(),
    rootReviewBatchRuleCount: vi.fn(),
    txRuleUpdate: vi.fn(),
    txRuleDelete: vi.fn(),
    txAnnotationCount: vi.fn(),
    txReviewBatchRuleCount: vi.fn(),
    transaction: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transaction,
    rule: {
      findMany: ruleFindMany,
      update: rootRuleUpdate,
      delete: rootRuleDelete,
    },
    annotation: {
      count: rootAnnotationCount,
    },
    reviewBatchRule: {
      count: rootReviewBatchRuleCount,
    },
  },
}));

import { deleteRule, getRuleDashboardData } from "@/lib/rules";

describe("rules data layer", () => {
  beforeEach(() => {
    ruleFindMany.mockReset();
    rootRuleUpdate.mockReset();
    rootRuleDelete.mockReset();
    rootAnnotationCount.mockReset();
    rootReviewBatchRuleCount.mockReset();
    txRuleUpdate.mockReset();
    txRuleDelete.mockReset();
    txAnnotationCount.mockReset();
    txReviewBatchRuleCount.mockReset();
    transaction.mockReset();
    transaction.mockImplementation(async (callback) =>
      callback({
        rule: {
          update: txRuleUpdate,
          delete: txRuleDelete,
        },
        annotation: {
          count: txAnnotationCount,
        },
        reviewBatchRule: {
          count: txReviewBatchRuleCount,
        },
      } as never),
    );
  });

  it("default dashboard query filters out deleted rows", async () => {
    ruleFindMany.mockResolvedValue([]);

    await getRuleDashboardData();

    expect(ruleFindMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      orderBy: [{ enabled: "desc" }, { category: "asc" }, { updatedAt: "desc" }],
    });
  });

  it("includeDeleted query includes deleted rows", async () => {
    const updatedAt = new Date("2026-04-27T10:00:00.000Z");
    ruleFindMany.mockResolvedValue([
      {
        id: "rule_active",
        name: "启用规则",
        category: "文案",
        description: "说明",
        promptTemplate: "模板",
        severity: Severity.medium,
        enabled: true,
        deletedAt: null,
        updatedAt,
      },
      {
        id: "rule_deleted",
        name: "已删除规则",
        category: "文案",
        description: "说明",
        promptTemplate: "模板",
        severity: Severity.low,
        enabled: true,
        deletedAt: new Date("2026-04-26T10:00:00.000Z"),
        updatedAt,
      },
    ]);

    const data = await getRuleDashboardData({ includeDeleted: true });

    expect(ruleFindMany).toHaveBeenCalledWith({
      orderBy: [{ enabled: "desc" }, { category: "asc" }, { updatedAt: "desc" }],
    });
    expect(data.totalCount).toBe(2);
    expect(data.enabledCount).toBe(1);
    expect(data.items).toEqual([
      expect.objectContaining({
        id: "rule_active",
        enabled: true,
        isDeleted: false,
      }),
      expect.objectContaining({
        id: "rule_deleted",
        enabled: true,
        isDeleted: true,
      }),
    ]);
  });

  it("deleteRule performs soft delete when associations exist", async () => {
    txAnnotationCount.mockResolvedValue(1);
    txReviewBatchRuleCount.mockResolvedValue(0);
    txRuleUpdate.mockResolvedValue({});

    await expect(deleteRule("  rule_1  ")).resolves.toEqual({ mode: "soft" });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(txAnnotationCount).toHaveBeenCalledWith({
      where: { ruleId: "rule_1" },
    });
    expect(txReviewBatchRuleCount).toHaveBeenCalledWith({
      where: { ruleVersion: { ruleId: "rule_1" } },
    });
    expect(txRuleUpdate).toHaveBeenCalledWith({
      where: { id: "rule_1" },
      data: {
        deletedAt: expect.any(Date),
        enabled: false,
      },
    });
    expect(txRuleDelete).not.toHaveBeenCalled();
    expect(rootAnnotationCount).not.toHaveBeenCalled();
    expect(rootReviewBatchRuleCount).not.toHaveBeenCalled();
    expect(rootRuleUpdate).not.toHaveBeenCalled();
    expect(rootRuleDelete).not.toHaveBeenCalled();
  });

  it("deleteRule performs hard delete when no associations exist", async () => {
    txAnnotationCount.mockResolvedValue(0);
    txReviewBatchRuleCount.mockResolvedValue(0);
    txRuleDelete.mockResolvedValue({});

    await expect(deleteRule("rule_2")).resolves.toEqual({ mode: "hard" });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(txRuleDelete).toHaveBeenCalledWith({
      where: { id: "rule_2" },
    });
    expect(txRuleUpdate).not.toHaveBeenCalled();
    expect(rootAnnotationCount).not.toHaveBeenCalled();
    expect(rootReviewBatchRuleCount).not.toHaveBeenCalled();
    expect(rootRuleUpdate).not.toHaveBeenCalled();
    expect(rootRuleDelete).not.toHaveBeenCalled();
  });
});
