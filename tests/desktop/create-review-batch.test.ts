import { ReviewStatus, Severity } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { executeReviewJob } = vi.hoisted(() => ({
  executeReviewJob: vi.fn(),
}));

vi.mock("@/lib/review-jobs", () => ({
  executeReviewJob,
}));

import { createReviewBatch } from "@/desktop/core/reviews/create-review-batch";

describe("createReviewBatch", () => {
  beforeEach(() => {
    executeReviewJob.mockReset();
  });

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
        findMany: vi.fn().mockResolvedValue([
          {
            id: "review_job_1",
            documentId: "doc_1",
            document: {
              title: "文档一",
              filename: "doc-1.docx",
              fileType: "docx",
              rawText: "内容一",
              blocks: [
                {
                  blockIndex: 0,
                  blockType: "paragraph",
                  text: "内容一",
                  level: null,
                  listKind: null,
                  charStart: 0,
                  charEnd: 3,
                },
              ],
              paragraphs: [
                {
                  paragraphIndex: 0,
                  text: "内容一",
                  charStart: 0,
                  charEnd: 3,
                },
              ],
            },
          },
          {
            id: "review_job_2",
            documentId: "doc_2",
            document: {
              title: "文档二",
              filename: "doc-2.docx",
              fileType: "docx",
              rawText: "内容二",
              blocks: [
                {
                  blockIndex: 0,
                  blockType: "paragraph",
                  text: "内容二",
                  level: null,
                  listKind: null,
                  charStart: 0,
                  charEnd: 3,
                },
              ],
              paragraphs: [
                {
                  paragraphIndex: 0,
                  text: "内容二",
                  charStart: 0,
                  charEnd: 3,
                },
              ],
            },
          },
        ]),
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
    expect(tx.rule.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["rule_a", "rule_b"] },
        enabled: true,
        deletedAt: null,
      },
    });
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
        findMany: vi.fn().mockResolvedValue([
          {
            id: "review_job_3",
            documentId: "doc_1",
            document: {
              title: "文档一",
              filename: "doc-1.docx",
              fileType: "docx",
              rawText: "内容一",
              blocks: [
                {
                  blockIndex: 0,
                  blockType: "paragraph",
                  text: "内容一",
                  level: null,
                  listKind: null,
                  charStart: 0,
                  charEnd: 3,
                },
              ],
              paragraphs: [
                {
                  paragraphIndex: 0,
                  text: "内容一",
                  charStart: 0,
                  charEnd: 3,
                },
              ],
            },
          },
        ]),
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

  it("starts review execution for each created job in a three-document batch", async () => {
    const batch = { id: "batch_3" };
    const tx = {
      llmProfile: {
        findUnique: vi.fn().mockResolvedValue({
          id: "profile_1",
          provider: "dashscope",
          defaultModel: "qwen-plus",
          mode: "demo",
          apiKeyEncrypted: null,
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
        create: vi.fn().mockResolvedValue(batch),
      },
      reviewBatchRule: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      reviewJob: {
        createMany: vi.fn().mockResolvedValue({ count: 3 }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: "review_job_4",
            documentId: "doc_1",
            document: {
              title: "文档一",
              filename: "doc-1.docx",
              fileType: "docx",
              rawText: "内容一",
              blocks: [
                {
                  blockIndex: 0,
                  blockType: "paragraph",
                  text: "内容一",
                  level: null,
                  listKind: null,
                  charStart: 0,
                  charEnd: 3,
                },
              ],
              paragraphs: [
                {
                  paragraphIndex: 0,
                  text: "内容一",
                  charStart: 0,
                  charEnd: 3,
                },
              ],
            },
          },
          {
            id: "review_job_5",
            documentId: "doc_2",
            document: {
              title: "文档二",
              filename: "doc-2.docx",
              fileType: "docx",
              rawText: "内容二",
              blocks: [
                {
                  blockIndex: 0,
                  blockType: "paragraph",
                  text: "内容二",
                  level: null,
                  listKind: null,
                  charStart: 0,
                  charEnd: 3,
                },
              ],
              paragraphs: [
                {
                  paragraphIndex: 0,
                  text: "内容二",
                  charStart: 0,
                  charEnd: 3,
                },
              ],
            },
          },
          {
            id: "review_job_6",
            documentId: "doc_3",
            document: {
              title: "文档三",
              filename: "doc-3.md",
              fileType: "md",
              rawText: "内容三",
              blocks: [
                {
                  blockIndex: 0,
                  blockType: "paragraph",
                  text: "内容三",
                  level: null,
                  listKind: null,
                  charStart: 0,
                  charEnd: 3,
                },
              ],
              paragraphs: [
                {
                  paragraphIndex: 0,
                  text: "内容三",
                  charStart: 0,
                  charEnd: 3,
                },
              ],
            },
          },
        ]),
      },
    };

    const prisma = {
      $transaction: vi.fn(async (callback) => callback(tx as never)),
      ...tx,
    };

    executeReviewJob.mockResolvedValue(undefined);

    await createReviewBatch(prisma as never, {
      batchName: "批量评审",
      llmProfileId: "profile_1",
      ruleIds: ["rule_a"],
      documents: [{ documentId: "doc_1" }, { documentId: "doc_2" }, { documentId: "doc_3" }],
    });

    expect(executeReviewJob).toHaveBeenCalledTimes(3);
    expect(executeReviewJob).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        reviewJobId: expect.any(String),
        documentTitle: "文档一",
        modelName: "qwen-plus",
      }),
    );
    expect(executeReviewJob).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        reviewJobId: expect.any(String),
        documentTitle: "文档三",
        modelName: "qwen-plus",
      }),
    );
    expect(executeReviewJob).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        reviewJobId: expect.any(String),
        documentTitle: "文档二",
        modelName: "qwen-plus",
      }),
    );
  });

  it("marks jobs as failed when dispatch rejects before execution starts", async () => {
    const batch = { id: "batch_dispatch_failure" };
    const reviewJobUpdate = vi.fn().mockResolvedValue(undefined);
    const tx = {
      llmProfile: {
        findUnique: vi.fn().mockResolvedValue({
          id: "profile_1",
          provider: "dashscope",
          defaultModel: "qwen-plus",
          mode: "demo",
          apiKeyEncrypted: null,
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
        create: vi.fn().mockResolvedValue(batch),
      },
      reviewBatchRule: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      reviewJob: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: "review_job_dispatch_failure",
            documentId: "doc_1",
            document: {
              title: "文档一",
              filename: "doc-1.docx",
              fileType: "docx",
              rawText: "内容一",
              blocks: [
                {
                  blockIndex: 0,
                  blockType: "paragraph",
                  text: "内容一",
                  level: null,
                  listKind: null,
                  charStart: 0,
                  charEnd: 3,
                },
              ],
              paragraphs: [
                {
                  paragraphIndex: 0,
                  text: "内容一",
                  charStart: 0,
                  charEnd: 3,
                },
              ],
            },
          },
        ]),
        update: reviewJobUpdate,
      },
    };

    const prisma = {
      $transaction: vi.fn(async (callback) => callback(tx as never)),
      reviewJob: {
        update: reviewJobUpdate,
      },
      ...tx,
    };

    executeReviewJob.mockRejectedValueOnce(new Error("worker exited before ready"));

    await createReviewBatch(prisma as never, {
      batchName: "派发失败批次",
      llmProfileId: "profile_1",
      ruleIds: ["rule_a"],
      documents: [{ documentId: "doc_1" }],
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(reviewJobUpdate).toHaveBeenCalledWith({
      where: { id: "review_job_dispatch_failure" },
      data: expect.objectContaining({
        status: ReviewStatus.failed,
        errorMessage: "worker exited before ready",
      }),
    });
  });

  it("fails fast when created jobs cannot be reloaded for execution", async () => {
    const tx = {
      llmProfile: {
        findUnique: vi.fn().mockResolvedValue({
          id: "profile_1",
          provider: "dashscope",
          defaultModel: "qwen-plus",
          mode: "demo",
          apiKeyEncrypted: null,
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
        create: vi.fn().mockResolvedValue({ id: "batch_4" }),
      },
      reviewBatchRule: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      reviewJob: {
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: "review_job_6",
            documentId: "doc_1",
            document: {
              title: "文档一",
              filename: "doc-1.docx",
              fileType: "docx",
              rawText: "内容一",
              blocks: [
                {
                  blockIndex: 0,
                  blockType: "paragraph",
                  text: "内容一",
                  level: null,
                  listKind: null,
                  charStart: 0,
                  charEnd: 3,
                },
              ],
              paragraphs: [
                {
                  paragraphIndex: 0,
                  text: "内容一",
                  charStart: 0,
                  charEnd: 3,
                },
              ],
            },
          },
        ]),
      },
    };

    const prisma = {
      $transaction: vi.fn(async (callback) => callback(tx as never)),
      ...tx,
    };

    await expect(
      createReviewBatch(prisma as never, {
        batchName: "批量评审",
        llmProfileId: "profile_1",
        ruleIds: ["rule_a"],
        documents: [{ documentId: "doc_1" }, { documentId: "doc_2" }],
      }),
    ).rejects.toThrow("评审任务初始化失败，请重试。");

    expect(executeReviewJob).not.toHaveBeenCalled();
  });

  it("rejects when selected rules are missing, disabled, or deleted", async () => {
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
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      reviewBatch: {
        create: vi.fn(),
      },
      reviewBatchRule: {
        createMany: vi.fn(),
      },
      reviewJob: {
        createMany: vi.fn(),
        findMany: vi.fn(),
      },
    };

    const prisma = {
      $transaction: vi.fn(async (callback) => callback(tx as never)),
      ...tx,
    };

    await expect(
      createReviewBatch(prisma as never, {
        batchName: "规则不完整批次",
        llmProfileId: "profile_1",
        ruleIds: ["rule_a", "rule_b"],
        documents: [{ documentId: "doc_1" }],
      }),
    ).rejects.toThrow("部分已选择的评审规则不存在、已停用或已删除。");
  });
});
