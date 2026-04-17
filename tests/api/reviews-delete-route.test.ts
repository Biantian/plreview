import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveReviewSelectionScope, deleteReviewJobs } = vi.hoisted(() => ({
  resolveReviewSelectionScope: vi.fn(),
  deleteReviewJobs: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/review-jobs-selection", () => ({
  resolveReviewSelectionScope,
}));

vi.mock("@/lib/review-jobs", () => ({
  deleteReviewJobs,
}));

import { DELETE } from "../../app/api/reviews/delete/route";

describe("DELETE /api/reviews/delete", () => {
  beforeEach(() => {
    resolveReviewSelectionScope.mockReset();
    deleteReviewJobs.mockReset();
  });

  it("returns deletedCount on success", async () => {
    resolveReviewSelectionScope.mockResolvedValue({
      mode: "selected",
      items: [
        {
          id: "review_1",
          status: "completed",
          reportMarkdown: "# report",
        },
        {
          id: "review_2",
          status: "failed",
          reportMarkdown: null,
        },
      ],
    });
    deleteReviewJobs.mockResolvedValue({
      count: 2,
    });

    const response = await DELETE(
      new Request("http://localhost/api/reviews/delete", {
        method: "DELETE",
        body: JSON.stringify({
          selectedIds: ["review_1", "review_2"],
          allMatching: false,
        }),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      deletedCount: 2,
    });
    expect(response.status).toBe(200);
    expect(resolveReviewSelectionScope).toHaveBeenCalledWith(expect.anything(), {
      selectedIds: ["review_1", "review_2"],
      allMatching: false,
    });
    expect(deleteReviewJobs).toHaveBeenCalledWith(["review_1", "review_2"]);
  });

  it("returns 400 with the selection error payload for empty selection errors", async () => {
    resolveReviewSelectionScope.mockRejectedValue(new Error("至少选择一条评审任务。"));

    const response = await DELETE(
      new Request("http://localhost/api/reviews/delete", {
        method: "DELETE",
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
    expect(deleteReviewJobs).not.toHaveBeenCalled();
  });

  it("returns 400 with the selection error payload for missing selected ids", async () => {
    resolveReviewSelectionScope.mockRejectedValue(
      new Error("未找到以下评审任务：review_2。"),
    );

    const response = await DELETE(
      new Request("http://localhost/api/reviews/delete", {
        method: "DELETE",
        body: JSON.stringify({
          selectedIds: ["review_1", "review_2"],
          allMatching: false,
        }),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "未找到以下评审任务：review_2。",
    });
    expect(response.status).toBe(400);
    expect(deleteReviewJobs).not.toHaveBeenCalled();
  });

  it("returns 500 with the error payload for unexpected downstream failures", async () => {
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
    deleteReviewJobs.mockRejectedValue(new Error("database unavailable"));

    const response = await DELETE(
      new Request("http://localhost/api/reviews/delete", {
        method: "DELETE",
        body: JSON.stringify({
          selectedIds: ["review_1"],
          allMatching: false,
        }),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "database unavailable",
    });
    expect(response.status).toBe(500);
  });
});
