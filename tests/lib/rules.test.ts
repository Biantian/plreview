import { Severity } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { ruleFindMany, ruleUpdate, ruleDelete, annotationCount, reviewBatchRuleCount } = vi.hoisted(
  () => ({
    ruleFindMany: vi.fn(),
    ruleUpdate: vi.fn(),
    ruleDelete: vi.fn(),
    annotationCount: vi.fn(),
    reviewBatchRuleCount: vi.fn(),
  }),
);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    rule: {
      findMany: ruleFindMany,
      update: ruleUpdate,
      delete: ruleDelete,
    },
    annotation: {
      count: annotationCount,
    },
    reviewBatchRule: {
      count: reviewBatchRuleCount,
    },
  },
}));

import { deleteRule, getRuleDashboardData } from "@/lib/rules";

describe("rules data layer", () => {
  beforeEach(() => {
    ruleFindMany.mockReset();
    ruleUpdate.mockReset();
    ruleDelete.mockReset();
    annotationCount.mockReset();
    reviewBatchRuleCount.mockReset();
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
    annotationCount.mockResolvedValue(1);
    reviewBatchRuleCount.mockResolvedValue(0);
    ruleUpdate.mockResolvedValue({});

    await expect(deleteRule("  rule_1  ")).resolves.toEqual({ mode: "soft" });

    expect(annotationCount).toHaveBeenCalledWith({
      where: { ruleId: "rule_1" },
    });
    expect(reviewBatchRuleCount).toHaveBeenCalledWith({
      where: { ruleVersion: { ruleId: "rule_1" } },
    });
    expect(ruleUpdate).toHaveBeenCalledWith({
      where: { id: "rule_1" },
      data: {
        deletedAt: expect.any(Date),
        enabled: false,
      },
    });
    expect(ruleDelete).not.toHaveBeenCalled();
  });

  it("deleteRule performs hard delete when no associations exist", async () => {
    annotationCount.mockResolvedValue(0);
    reviewBatchRuleCount.mockResolvedValue(0);
    ruleDelete.mockResolvedValue({});

    await expect(deleteRule("rule_2")).resolves.toEqual({ mode: "hard" });

    expect(ruleDelete).toHaveBeenCalledWith({
      where: { id: "rule_2" },
    });
    expect(ruleUpdate).not.toHaveBeenCalled();
  });
});
