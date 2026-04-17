import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveReviewSelectionScope, getReviewListItemsByIds } = vi.hoisted(() => ({
  resolveReviewSelectionScope: vi.fn(),
  getReviewListItemsByIds: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/review-jobs-selection", () => ({
  resolveReviewSelectionScope,
}));

vi.mock("@/lib/review-jobs", () => ({
  getReviewListItemsByIds,
}));

import { POST } from "../../app/api/reviews/export-list/route";

describe("POST /api/reviews/export-list", () => {
  beforeEach(() => {
    resolveReviewSelectionScope.mockReset();
    getReviewListItemsByIds.mockReset();
  });

  it("returns an xlsx attachment", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-17T15:30:00.000Z"));

    resolveReviewSelectionScope.mockResolvedValue({
      mode: "selected",
      items: [
        {
          id: "review_1",
          status: "completed",
          reportMarkdown: "# report",
        },
      ],
    });
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
        overallScore: 91,
        annotationsCount: 3,
        errorMessage: null,
        createdAt: "2026-04-15T08:00:00.000Z",
        finishedAt: "2026-04-15T08:05:00.000Z",
      },
    ]);

    const response = await POST(
      new Request("http://localhost/api/reviews/export-list", {
        method: "POST",
        body: JSON.stringify({
          selectedIds: ["review_1"],
          allMatching: false,
        }),
      }),
    );

    const contentDisposition = response.headers.get("content-disposition");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(contentDisposition).toMatch(
      /^attachment; filename="review-list-\d{4}-\d{2}-\d{2}-\d{6}\.xlsx"$/,
    );
    expect(resolveReviewSelectionScope).toHaveBeenCalledWith(expect.anything(), {
      selectedIds: ["review_1"],
      allMatching: false,
    });
    expect(getReviewListItemsByIds).toHaveBeenCalledWith(["review_1"]);
    expect(await response.arrayBuffer()).toBeInstanceOf(ArrayBuffer);
    vi.useRealTimers();
  });

  it("returns 400 for selection validation errors", async () => {
    resolveReviewSelectionScope.mockRejectedValue(new Error("至少选择一条评审任务。"));

    const response = await POST(
      new Request("http://localhost/api/reviews/export-list", {
        method: "POST",
        body: JSON.stringify({
          selectedIds: [],
          allMatching: false,
        }),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "至少选择一条评审任务。",
    });
    expect(response.status).toBe(400);
    expect(getReviewListItemsByIds).not.toHaveBeenCalled();
  });
});
