import type { PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteReviewJobs,
  getReviewListItemsByIds,
  getReviewReportRowsByIds,
  queueReviewJobRetry,
} = vi.hoisted(() => ({
  deleteReviewJobs: vi.fn(),
  getReviewListItemsByIds: vi.fn(),
  getReviewReportRowsByIds: vi.fn(),
  queueReviewJobRetry: vi.fn(),
}));

vi.mock("@/lib/review-jobs", async () => {
  const actual = await vi.importActual<typeof import("@/lib/review-jobs")>(
    "@/lib/review-jobs",
  );

  return {
    ...actual,
    deleteReviewJobs,
    getReviewListItemsByIds,
    getReviewReportRowsByIds,
    queueReviewJobRetry,
  };
});

import {
  deleteSelectedReviewJobs,
  exportReviewListFile,
  exportReviewReportArchive,
  retryReviewJobById,
} from "@/lib/review-ipc";

function createPrismaClient(findMany: ReturnType<typeof vi.fn>) {
  return {
    reviewJob: {
      findMany,
    },
  } as unknown as PrismaClient;
}

describe("review-ipc", () => {
  beforeEach(() => {
    deleteReviewJobs.mockReset();
    getReviewListItemsByIds.mockReset();
    getReviewReportRowsByIds.mockReset();
    queueReviewJobRetry.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes selected ids and deletes through the injected prisma scope", async () => {
    const reviewJobFindMany = vi.fn().mockResolvedValue([
      { id: "review_1", status: "completed", reportMarkdown: "# report" },
      { id: "review_2", status: "failed", reportMarkdown: null },
    ]);
    const prismaClient = createPrismaClient(reviewJobFindMany);
    deleteReviewJobs.mockResolvedValue({ count: 2 });

    await expect(
      deleteSelectedReviewJobs(
        {
          selectedIds: [" review_1 ", "review_1", "review_2 "],
          allMatching: false,
        },
        prismaClient,
      ),
    ).resolves.toEqual({ deletedCount: 2 });

    expect(reviewJobFindMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["review_1", "review_2"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        status: true,
        reportMarkdown: true,
      },
    });
    expect(deleteReviewJobs).toHaveBeenCalledWith(["review_1", "review_2"], prismaClient);
  });

  it("rejects empty selected scope before deleting", async () => {
    const reviewJobFindMany = vi.fn();
    const prismaClient = createPrismaClient(reviewJobFindMany);

    await expect(
      deleteSelectedReviewJobs(
        {
          selectedIds: [],
          allMatching: false,
        },
        prismaClient,
      ),
    ).rejects.toThrow("至少选择一条评审任务。");

    expect(deleteReviewJobs).not.toHaveBeenCalled();
    expect(reviewJobFindMany).not.toHaveBeenCalled();
  });

  it("validates retry ids and forwards retries with the injected prisma client", async () => {
    const prismaClient = createPrismaClient(vi.fn());
    queueReviewJobRetry.mockResolvedValue(undefined);

    await expect(retryReviewJobById(" review_1 ", prismaClient)).resolves.toEqual({
      queued: true,
    });
    await expect(retryReviewJobById("   ", prismaClient)).rejects.toThrow("缺少评审任务 ID。");

    expect(queueReviewJobRetry).toHaveBeenCalledWith("review_1", prismaClient);
  });

  it("exports report archives with exported and skipped metadata", async () => {
    const reviewJobFindMany = vi.fn().mockResolvedValue([
      { id: "review_1", status: "completed", reportMarkdown: "# report" },
      { id: "review_2", status: "failed", reportMarkdown: null },
    ]);
    const prismaClient = createPrismaClient(reviewJobFindMany);
    getReviewReportRowsByIds.mockResolvedValue([
      {
        id: "review_1",
        title: "四月活动方案",
        filename: "april-plan.docx",
        status: "completed",
        reportMarkdown: "# report",
      },
      {
        id: "review_2",
        title: "空报告",
        filename: "empty.docx",
        status: "failed",
        reportMarkdown: null,
      },
    ]);

    const result = await exportReviewReportArchive(
      {
        selectedIds: ["review_1", "review_2"],
        allMatching: false,
      },
      prismaClient,
    );

    expect(getReviewReportRowsByIds).toHaveBeenCalledWith(
      ["review_1", "review_2"],
      prismaClient,
    );
    expect(result.exportedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.filename).toMatch(/^review-reports-\d{4}-\d{2}-\d{2}-\d{6}\.zip$/);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.bytes.byteLength).toBeGreaterThan(0);
  });

  it("rejects report export when no selected items are exportable", async () => {
    const reviewJobFindMany = vi.fn().mockResolvedValue([
      { id: "review_1", status: "failed", reportMarkdown: null },
    ]);
    const prismaClient = createPrismaClient(reviewJobFindMany);
    getReviewReportRowsByIds.mockResolvedValue([
      {
        id: "review_1",
        title: "空报告",
        filename: "empty.docx",
        status: "failed",
        reportMarkdown: "   ",
      },
    ]);

    await expect(
      exportReviewReportArchive(
        {
          selectedIds: ["review_1"],
          allMatching: false,
        },
        prismaClient,
      ),
    ).rejects.toThrow("没有可导出的评审报告。");
  });

  it("exports review lists through the injected prisma scope", async () => {
    const reviewJobFindMany = vi.fn().mockResolvedValue([
      { id: "review_1", status: "completed", reportMarkdown: "# report" },
    ]);
    const prismaClient = createPrismaClient(reviewJobFindMany);
    getReviewListItemsByIds.mockResolvedValue([
      {
        id: "review_1",
        title: "四月活动方案",
        filename: "april-plan.docx",
        fileType: "docx",
        batchName: "四月批次",
        status: "completed",
        provider: "DashScope",
        modelName: "qwen-plus",
        summary: null,
        overallScore: 95,
        annotationsCount: 2,
        errorMessage: null,
        createdAt: "2026-04-15T08:00:00.000Z",
        finishedAt: "2026-04-15T08:05:00.000Z",
      },
    ]);

    const result = await exportReviewListFile(
      {
        selectedIds: ["review_1"],
        allMatching: false,
      },
      prismaClient,
    );

    expect(getReviewListItemsByIds).toHaveBeenCalledWith(["review_1"], prismaClient);
    expect(result.filename).toMatch(/^review-list-\d{4}-\d{2}-\d{2}-\d{6}\.xlsx$/);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.bytes.byteLength).toBeGreaterThan(0);
  });
});
