import { beforeEach, describe, expect, it, vi } from "vitest";

const { reviewJobFindUnique } = vi.hoisted(() => ({
  reviewJobFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    reviewJob: {
      findUnique: reviewJobFindUnique,
    },
  },
}));

import { getReviewDetailData } from "@/lib/review-detail";

describe("review-detail", () => {
  beforeEach(() => {
    reviewJobFindUnique.mockReset();
  });

  it("rejects empty review ids before querying Prisma", async () => {
    await expect(getReviewDetailData("   ")).rejects.toThrow("缺少评审任务 ID。");
    expect(reviewJobFindUnique).not.toHaveBeenCalled();
  });

  it("maps detail payload fields to the ReviewDetailData contract", async () => {
    reviewJobFindUnique.mockResolvedValue({
      id: "review_1",
      status: "running",
      summary: "整体方向可行。",
      errorMessage: null,
      overallScore: 86,
      reportMarkdown: "## 总结",
      providerSnapshot: "DashScope",
      modelNameSnapshot: "qwen-plus",
      createdAt: new Date("2026-04-19T10:00:00.000Z"),
      document: {
        title: "四月活动复盘",
        filename: "april.docx",
        blocks: [
          {
            blockIndex: 0,
            blockType: "heading",
            text: "项目概览",
            level: 1,
            listKind: null,
          },
        ],
        paragraphs: [
          {
            paragraphIndex: 0,
            text: "项目概览",
          },
        ],
      },
      annotations: [
        {
          id: "annotation_1",
          blockIndex: 0,
          paragraphIndex: null,
          issue: "结论缺少来源。",
          suggestion: "补充来源说明。",
          severity: "critical",
          evidenceText: "缺少来源",
          rule: {
            name: "证据完整性",
          },
        },
        {
          id: "annotation_2",
          blockIndex: null,
          paragraphIndex: 2,
          issue: "行动项缺少责任人。",
          suggestion: null,
          severity: "medium",
          evidenceText: null,
          rule: {
            name: "执行闭环",
          },
        },
        {
          id: "annotation_ignored",
          blockIndex: null,
          paragraphIndex: null,
          issue: "不会进入结果",
          suggestion: null,
          severity: "low",
          evidenceText: null,
          rule: {
            name: "占位规则",
          },
        },
      ],
    });

    const detail = await getReviewDetailData("review_1");

    expect(reviewJobFindUnique).toHaveBeenCalledWith({
      where: { id: "review_1" },
      include: {
        document: {
          include: {
            blocks: {
              orderBy: { blockIndex: "asc" },
            },
            paragraphs: {
              orderBy: { paragraphIndex: "asc" },
            },
          },
        },
        annotations: {
          include: {
            rule: true,
          },
          orderBy: [{ blockIndex: "asc" }, { paragraphIndex: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    expect(detail).toMatchObject({
      id: "review_1",
      title: "四月活动复盘",
      filename: "april.docx",
      status: "running",
      annotationsCount: 2,
      hitBlockCount: 2,
      highPriorityCount: 1,
      createdAt: "2026-04-19T10:00:00.000Z",
      blocks: [
        {
          blockIndex: 0,
          blockType: "heading",
          text: "项目概览",
          level: 1,
          listKind: null,
        },
      ],
      annotations: [
        {
          id: "annotation_1",
          blockIndex: 0,
          issue: "结论缺少来源。",
          suggestion: "补充来源说明。",
          severity: "critical",
          evidenceText: "缺少来源",
          ruleName: "证据完整性",
        },
        {
          id: "annotation_2",
          blockIndex: 2,
          issue: "行动项缺少责任人。",
          suggestion: null,
          severity: "medium",
          evidenceText: null,
          ruleName: "执行闭环",
        },
      ],
    });
    expect(detail).not.toHaveProperty("isProcessing");
    expect(detail).not.toHaveProperty("isFailed");
  });

  it("falls back to ordered document paragraphs when no structured blocks exist", async () => {
    reviewJobFindUnique.mockResolvedValue({
      id: "review_2",
      status: "completed",
      summary: null,
      errorMessage: null,
      overallScore: null,
      reportMarkdown: null,
      providerSnapshot: "DashScope",
      modelNameSnapshot: "qwen-plus",
      createdAt: new Date("2026-04-19T11:00:00.000Z"),
      document: {
        title: "五月活动复盘",
        filename: "may.docx",
        blocks: [],
        paragraphs: [
          {
            paragraphIndex: 0,
            text: "第一段",
          },
        ],
      },
      annotations: [],
    });

    const detail = await getReviewDetailData("review_2");

    expect(detail.blocks).toEqual([
      {
        blockIndex: 0,
        blockType: "paragraph",
        text: "第一段",
        level: null,
        listKind: null,
      },
    ]);
  });
});
