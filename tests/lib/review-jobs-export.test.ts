import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { buildReviewListWorkbook } from "../../lib/review-jobs-export";

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
