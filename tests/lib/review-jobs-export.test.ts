import JSZip from "jszip";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import {
  buildReviewListWorkbook,
  buildReviewReportArchive,
  canExportReviewReport,
} from "../../lib/review-jobs-export";

describe("buildReviewListWorkbook", () => {
  it("writes the expected review columns", () => {
    const workbook = buildReviewListWorkbook([
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

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Array<string | number>>(sheet, {
      header: 1,
      defval: "",
    });

    expect(rows).toEqual([
      [
        "标题",
        "文件名",
        "文件类型",
        "批次",
        "模型",
        "状态",
        "问题数",
        "评分",
        "创建时间",
        "完成时间",
      ],
      [
        "四月活动方案",
        "april-plan.docx",
        "docx",
        "四月批次",
        "qwen-plus",
        "已完成",
        3,
        91,
        "2026-04-15T08:00:00.000Z",
        "2026-04-15T08:05:00.000Z",
      ],
    ]);
  });
});

describe("canExportReviewReport", () => {
  it.each([
    { reportMarkdown: "# report", expected: true },
    { reportMarkdown: "", expected: false },
    { reportMarkdown: "   ", expected: false },
    { reportMarkdown: null, expected: false },
  ])("returns $expected for $reportMarkdown", ({ reportMarkdown, expected }) => {
    expect(canExportReviewReport({ reportMarkdown })).toBe(expected);
  });
});

describe("buildReviewReportArchive", () => {
  it("only exports items with report markdown using approved filenames", async () => {
    const archive = await buildReviewReportArchive([
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
      {
        id: "review_3",
        title: "空白报告",
        filename: "blank.docx",
        status: "partial",
        reportMarkdown: "   ",
      },
      {
        id: "review_4",
        title: "标题/含:非法字符",
        filename: "path\\unsafe:name?.docx",
        status: "completed",
        reportMarkdown: "# report 2",
      },
    ]);

    const zip = await JSZip.loadAsync(archive);
    const filenames = Object.keys(zip.files).sort();

    expect(filenames).toEqual([
      "四月活动方案__april-plan.docx__completed.md",
      "标题_含_非法字符__path_unsafe_name_.docx__completed.md",
    ]);
    await expect(
      zip.file("四月活动方案__april-plan.docx__completed.md")?.async("string"),
    ).resolves.toBe("# report 1");
    await expect(
      zip.file("标题_含_非法字符__path_unsafe_name_.docx__completed.md")?.async("string"),
    ).resolves.toBe("# report 2");
  });

  it("keeps colliding filenames distinct", async () => {
    const archive = await buildReviewReportArchive([
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

    const zip = await JSZip.loadAsync(archive);
    const filenames = Object.keys(zip.files).sort();

    expect(filenames).toEqual([
      "标题_冲突__file_name.docx__completed.md",
      "标题_冲突__file_name.docx__completed__2.md",
    ]);
    await expect(
      zip.file("标题_冲突__file_name.docx__completed.md")?.async("string"),
    ).resolves.toBe("# report 1");
    await expect(
      zip.file("标题_冲突__file_name.docx__completed__2.md")?.async("string"),
    ).resolves.toBe("# report 2");
  });
});
