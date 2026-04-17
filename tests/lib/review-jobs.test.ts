import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  reviewJobFindMany,
  reviewBatchFindMany,
  reviewJobDeleteMany,
  reviewJobUpdate,
  reviewJobTransaction,
  ruleVersionFindFirst,
  ruleVersionCreate,
  reviewDocument,
  resolveReviewRuntime,
} = vi.hoisted(() => ({
  reviewJobFindMany: vi.fn(),
  reviewBatchFindMany: vi.fn(),
  reviewJobDeleteMany: vi.fn(),
  reviewJobUpdate: vi.fn(),
  reviewJobTransaction: vi.fn(),
  ruleVersionFindFirst: vi.fn(),
  ruleVersionCreate: vi.fn(),
  reviewDocument: vi.fn(),
  resolveReviewRuntime: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    reviewJob: {
      findMany: reviewJobFindMany,
      update: reviewJobUpdate,
      deleteMany: reviewJobDeleteMany,
    },
    reviewBatch: {
      findMany: reviewBatchFindMany,
    },
    ruleVersion: {
      findFirst: ruleVersionFindFirst,
      create: ruleVersionCreate,
    },
    $transaction: reviewJobTransaction,
  },
}));

vi.mock("@/lib/llm-client", () => ({
  reviewDocument,
}));

vi.mock("@/lib/review-runtime", () => ({
  resolveReviewRuntime,
}));

import {
  deleteReviewJobs,
  executeReviewJob,
  getReviewListItems,
  getReviewListItemsByIds,
  getReviewReportRowsByIds,
} from "../../lib/review-jobs";

function createNotFoundError() {
  return Object.assign(new Error("Record to update not found."), {
    code: "P2025",
  });
}

function createTransactionContext() {
  return {
    reviewJob: {
      update: vi.fn(),
    },
    ruleVersion: {
      create: ruleVersionCreate,
      findFirst: ruleVersionFindFirst,
    },
  };
}

describe("review-jobs", () => {
  beforeEach(() => {
    reviewJobFindMany.mockReset();
    reviewBatchFindMany.mockReset();
    reviewJobDeleteMany.mockReset();
    reviewJobUpdate.mockReset();
    reviewJobTransaction.mockReset();
    ruleVersionFindFirst.mockReset();
    ruleVersionCreate.mockReset();
    reviewDocument.mockReset();
    resolveReviewRuntime.mockReset();
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

  it("deletes review jobs by ids and returns the deleted count", async () => {
    reviewJobDeleteMany.mockResolvedValue({
      count: 2,
    });

    await expect(deleteReviewJobs(["review_1", "review_2"])).resolves.toEqual({
      count: 2,
    });

    expect(reviewJobDeleteMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["review_1", "review_2"],
        },
      },
    });
  });

  it("loads review list items by ids", async () => {
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

    const items = await getReviewListItemsByIds(["review_1"]);

    expect(reviewJobFindMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["review_1"],
        },
      },
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

  it("preserves the requested id order when loading review list items by ids", async () => {
    reviewJobFindMany.mockResolvedValue([
      {
        id: "review_2",
        batchId: null,
        status: "completed",
        providerSnapshot: "DashScope",
        modelNameSnapshot: "qwen-plus",
        summary: "完成",
        overallScore: 81,
        errorMessage: null,
        createdAt: new Date("2026-04-15T08:10:00.000Z"),
        finishedAt: new Date("2026-04-15T08:15:00.000Z"),
        document: {
          fileType: "txt",
          title: "第二条",
          filename: "second.txt",
        },
        _count: {
          annotations: 2,
        },
      },
      {
        id: "review_1",
        batchId: null,
        status: "failed",
        providerSnapshot: "DashScope",
        modelNameSnapshot: "qwen-max",
        summary: null,
        overallScore: null,
        errorMessage: "失败",
        createdAt: new Date("2026-04-15T08:00:00.000Z"),
        finishedAt: new Date("2026-04-15T08:05:00.000Z"),
        document: {
          fileType: "docx",
          title: "第一条",
          filename: "first.docx",
        },
        _count: {
          annotations: 1,
        },
      },
    ]);

    const items = await getReviewListItemsByIds(["review_1", "review_2"]);

    expect(items.map((item) => item.id)).toEqual(["review_1", "review_2"]);
  });

  it("throws when a requested review id is missing", async () => {
    reviewJobFindMany.mockResolvedValue([
      {
        id: "review_2",
        batchId: null,
        status: "completed",
        providerSnapshot: "DashScope",
        modelNameSnapshot: "qwen-plus",
        summary: "完成",
        overallScore: 81,
        errorMessage: null,
        createdAt: new Date("2026-04-15T08:10:00.000Z"),
        finishedAt: new Date("2026-04-15T08:15:00.000Z"),
        document: {
          fileType: "txt",
          title: "第二条",
          filename: "second.txt",
        },
        _count: {
          annotations: 2,
        },
      },
    ]);

    await expect(getReviewListItemsByIds(["review_1", "review_2"])).rejects.toThrow(
      "未找到以下评审任务：review_1。",
    );
  });

  it("preserves the requested id order when loading report rows by ids", async () => {
    reviewJobFindMany.mockResolvedValue([
      {
        id: "review_2",
        status: "failed",
        reportMarkdown: "# report 2",
        document: {
          title: "第二条",
          filename: "second.txt",
        },
      },
      {
        id: "review_1",
        status: "completed",
        reportMarkdown: "# report 1",
        document: {
          title: "第一条",
          filename: "first.docx",
        },
      },
    ]);

    const rows = await getReviewReportRowsByIds(["review_1", "review_2"]);

    expect(rows.map((row) => row.id)).toEqual(["review_1", "review_2"]);
    expect(rows).toEqual([
      {
        id: "review_1",
        title: "第一条",
        filename: "first.docx",
        status: "completed",
        reportMarkdown: "# report 1",
      },
      {
        id: "review_2",
        title: "第二条",
        filename: "second.txt",
        status: "failed",
        reportMarkdown: "# report 2",
      },
    ]);
  });

  it("throws when a requested report row id is missing", async () => {
    reviewJobFindMany.mockResolvedValue([
      {
        id: "review_2",
        status: "completed",
        reportMarkdown: "# report 2",
        document: {
          title: "第二条",
          filename: "second.txt",
        },
      },
    ]);

    await expect(getReviewReportRowsByIds(["review_1", "review_2"])).rejects.toThrow(
      "未找到以下评审任务：review_1。",
    );
  });

  it("does not throw or mark failed when the job record disappears before final persistence", async () => {
    reviewJobUpdate.mockResolvedValueOnce(undefined);
    reviewJobTransaction.mockImplementation(async (callback: (tx: ReturnType<typeof createTransactionContext>) => Promise<void>) => {
      const tx = createTransactionContext();
      tx.reviewJob.update.mockRejectedValueOnce(createNotFoundError());
      await callback(tx);
    });
    reviewDocument.mockResolvedValue({
      response: {
        ruleFindings: [],
      },
      reportMarkdown: "# report",
      mode: "live",
    });
    resolveReviewRuntime.mockReturnValue({
      mode: "live",
      apiKey: "test-key",
    });

    await expect(
      executeReviewJob({
        reviewJobId: "review_1",
        documentTitle: "四月活动方案",
        modelName: "qwen-plus",
        llmProfile: {
          provider: "DashScope",
          mode: "live",
          apiKeyEncrypted: "encrypted",
          baseUrl: null,
        } as never,
        parsedDocument: {
          rawText: "",
          blocks: [],
        } as never,
        rules: [],
      }),
    ).resolves.toBeUndefined();

    expect(reviewJobUpdate).toHaveBeenCalledTimes(1);
    expect(reviewJobUpdate).toHaveBeenCalledWith({
      where: { id: "review_1" },
      data: {
        status: "running",
        errorMessage: null,
        finishedAt: null,
      },
    });
  });
});
