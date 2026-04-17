import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveReviewSelectionScope, getReviewReportRowsByIds } = vi.hoisted(() => ({
  resolveReviewSelectionScope: vi.fn(),
  getReviewReportRowsByIds: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/review-jobs-selection", () => ({
  resolveReviewSelectionScope,
}));

vi.mock("@/lib/review-jobs", () => ({
  getReviewReportRowsByIds,
}));

import { POST } from "../../app/api/reviews/export-report/route";

describe("POST /api/reviews/export-report", () => {
  beforeEach(() => {
    resolveReviewSelectionScope.mockReset();
    getReviewReportRowsByIds.mockReset();
  });

  it("returns a zip attachment with exported and skipped counts", async () => {
    resolveReviewSelectionScope.mockResolvedValue({
      mode: "selected",
      items: [
      {
        id: "review_1",
        status: "completed",
        reportMarkdown: "# report 1",
        },
        {
          id: "review_2",
          status: "failed",
          reportMarkdown: null,
        },
      ],
    });
    getReviewReportRowsByIds.mockResolvedValue([
      {
        id: "review_1",
        title: "四月活动方案",
        filename: "april-plan.docx",
        status: "completed",
        reportMarkdown: "# report 1",
      },
      {
        id: "review_2",
        title: "没有报告",
        filename: "missing.docx",
        status: "failed",
        reportMarkdown: null,
      },
    ]);

    const response = await POST(
      new Request("http://localhost/api/reviews/export-report", {
        method: "POST",
        body: JSON.stringify({
          selectedIds: ["review_1", "review_2"],
          allMatching: false,
        }),
      }),
    );

    const archive = await JSZip.loadAsync(await response.arrayBuffer());
    const filenames = Object.keys(archive.files).sort();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toMatch(
      /^attachment; filename="review-reports-\d{4}-\d{2}-\d{2}-\d{6}\.zip"$/,
    );
    expect(response.headers.get("x-exported-count")).toBe("1");
    expect(response.headers.get("x-skipped-count")).toBe("1");
    expect(resolveReviewSelectionScope).toHaveBeenCalledWith(expect.anything(), {
      selectedIds: ["review_1", "review_2"],
      allMatching: false,
    });
    expect(getReviewReportRowsByIds).toHaveBeenCalledWith(["review_1", "review_2"]);
    expect(filenames).toEqual(["四月活动方案__april-plan.docx__completed.md"]);
    await expect(
      archive.file("四月活动方案__april-plan.docx__completed.md")?.async("string"),
    ).resolves.toBe("# report 1");
  });

  it("returns 400 when nothing is exportable", async () => {
    resolveReviewSelectionScope.mockResolvedValue({
      mode: "selected",
      items: [
        {
          id: "review_1",
          status: "failed",
          reportMarkdown: null,
        },
      ],
    });
    getReviewReportRowsByIds.mockResolvedValue([
      {
        id: "review_1",
        title: "没有报告",
        filename: "missing.docx",
        reportMarkdown: null,
      },
    ]);

    const response = await POST(
      new Request("http://localhost/api/reviews/export-report", {
        method: "POST",
        body: JSON.stringify({
          selectedIds: ["review_1"],
          allMatching: false,
        }),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "没有可导出的评审报告。",
    });
    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("keeps colliding sanitized filenames distinct and counts exported entries", async () => {
    resolveReviewSelectionScope.mockResolvedValue({
      mode: "selected",
      items: [
        {
          id: "review_1",
          status: "completed",
          reportMarkdown: "# report 1",
        },
        {
          id: "review_2",
          status: "completed",
          reportMarkdown: "# report 2",
        },
      ],
    });
    getReviewReportRowsByIds.mockResolvedValue([
      {
        id: "review_1",
        title: "标题/冲突",
        filename: "file:name.docx",
        status: "completed",
        reportMarkdown: "# report 1",
      },
      {
        id: "review_2",
        title: "标题?冲突",
        filename: "file*name.docx",
        status: "completed",
        reportMarkdown: "# report 2",
      },
    ]);

    const response = await POST(
      new Request("http://localhost/api/reviews/export-report", {
        method: "POST",
        body: JSON.stringify({
          selectedIds: ["review_1", "review_2"],
          allMatching: false,
        }),
      }),
    );

    const archive = await JSZip.loadAsync(await response.arrayBuffer());
    const filenames = Object.keys(archive.files).sort();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-exported-count")).toBe("2");
    expect(filenames).toEqual([
      "标题_冲突__file_name.docx__completed.md",
      "标题_冲突__file_name.docx__completed__2.md",
    ]);
    expect(Object.keys(archive.files).length).toBe(2);
    await expect(
      archive.file("标题_冲突__file_name.docx__completed.md")?.async("string"),
    ).resolves.toBe("# report 1");
    await expect(
      archive.file("标题_冲突__file_name.docx__completed__2.md")?.async("string"),
    ).resolves.toBe("# report 2");
  });
});
