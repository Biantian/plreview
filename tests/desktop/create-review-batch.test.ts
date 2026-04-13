import { ReviewStatus, Severity } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { createReviewBatch } from "@/desktop/core/reviews/create-review-batch";

describe("createReviewBatch", () => {
  it("creates one batch and one pending review job per imported document", async () => {
    const batch = { id: "batch_1" };

    const tx = {
      llmProfile: {
        findUnique: vi.fn().mockResolvedValue({
          id: "profile_1",
          provider: "dashscope",
          defaultModel: "qwen-plus",
        }),
      },
      rule: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "rule_a",
            name: "规则 A",
            description: "说明 A",
            promptTemplate: "提示 A",
            severity: Severity.high,
          },
          {
            id: "rule_b",
            name: "规则 B",
            description: "说明 B",
            promptTemplate: "提示 B",
            severity: Severity.medium,
          },
        ]),
      },
      ruleVersion: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({ id: "rule_version_a", ruleId: "rule_a" })
          .mockResolvedValueOnce({ id: "rule_version_b", ruleId: "rule_b" }),
        create: vi.fn(),
      },
      reviewBatch: {
        create: vi.fn().mockResolvedValue(batch),
      },
      reviewBatchRule: {
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      reviewJob: {
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    };

    const prisma = {
      $transaction: vi.fn(async (callback) => callback(tx as never)),
      ...tx,
    };

    const result = await createReviewBatch(prisma as never, {
      batchName: "四月策划案",
      llmProfileId: "profile_1",
      modelName: "qwen-plus",
      ruleIds: ["rule_a", "rule_b"],
      documents: [{ documentId: "doc_1" }, { documentId: "doc_2" }],
    });

    expect(result).toBe(batch);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.reviewBatch.create).toHaveBeenCalledWith({
      data: {
        name: "四月策划案",
        llmProfileId: "profile_1",
        providerSnapshot: "dashscope",
        modelNameSnapshot: "qwen-plus",
      },
    });
    expect(tx.reviewBatchRule.createMany).toHaveBeenCalledWith({
      data: [
        { reviewBatchId: "batch_1", ruleVersionId: "rule_version_a" },
        { reviewBatchId: "batch_1", ruleVersionId: "rule_version_b" },
      ],
    });
    expect(tx.reviewJob.createMany).toHaveBeenCalledWith({
      data: [
        {
          batchId: "batch_1",
          documentId: "doc_1",
          llmProfileId: "profile_1",
          providerSnapshot: "dashscope",
          modelNameSnapshot: "qwen-plus",
          status: ReviewStatus.pending,
        },
        {
          batchId: "batch_1",
          documentId: "doc_2",
          llmProfileId: "profile_1",
          providerSnapshot: "dashscope",
          modelNameSnapshot: "qwen-plus",
          status: ReviewStatus.pending,
        },
      ],
    });
  });

  it("deduplicates document ids and rejects empty batches", async () => {
    const tx = {
      llmProfile: {
        findUnique: vi.fn().mockResolvedValue({
          id: "profile_1",
          provider: "dashscope",
          defaultModel: "qwen-plus",
        }),
      },
      rule: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "rule_a",
            name: "规则 A",
            description: "说明 A",
            promptTemplate: "提示 A",
            severity: Severity.high,
          },
        ]),
      },
      ruleVersion: {
        findFirst: vi.fn().mockResolvedValue({ id: "rule_version_a", ruleId: "rule_a" }),
        create: vi.fn(),
      },
      reviewBatch: {
        create: vi.fn().mockResolvedValue({ id: "batch_2" }),
      },
      reviewBatchRule: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      reviewJob: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const prisma = {
      $transaction: vi.fn(async (callback) => callback(tx as never)),
      ...tx,
    };

    await createReviewBatch(prisma as never, {
      batchName: "去重批次",
      llmProfileId: "profile_1",
      ruleIds: ["rule_a"],
      documents: [{ documentId: "doc_1" }, { documentId: "doc_1" }, { documentId: " doc_1 " }],
    });

    expect(tx.reviewJob.createMany).toHaveBeenCalledWith({
      data: [
        {
          batchId: "batch_2",
          documentId: "doc_1",
          llmProfileId: "profile_1",
          providerSnapshot: "dashscope",
          modelNameSnapshot: "qwen-plus",
          status: ReviewStatus.pending,
        },
      ],
    });

    await expect(
      createReviewBatch(prisma as never, {
        batchName: "空批次",
        llmProfileId: "profile_1",
        ruleIds: ["rule_a"],
        documents: [],
      }),
    ).rejects.toThrow("请至少选择一份待评审文档。");
  });
});
