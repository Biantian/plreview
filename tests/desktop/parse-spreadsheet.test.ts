import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { parseSpreadsheetWorkbook } from "@/desktop/core/files/parse-spreadsheet";

describe("parseSpreadsheetWorkbook", () => {
  it("turns sheets and rows into readable review blocks", () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["模块", "说明"],
      ["签到", "活动开始前 5 分钟开启"],
    ]);

    XLSX.utils.book_append_sheet(workbook, sheet, "总览");

    const parsed = parseSpreadsheetWorkbook(workbook, "活动排期.xlsx");

    expect(parsed.fileType).toBe("xlsx");
    expect(parsed.blocks).toHaveLength(2);
    expect(parsed.blocks[0]).toMatchObject({
      blockType: "heading",
      text: "总览",
      level: 2,
    });
    expect(parsed.blocks[1]).toMatchObject({
      blockType: "paragraph",
      text: "模块：签到；说明：活动开始前 5 分钟开启",
    });
    expect(parsed.rawText).toBe("## 总览\n\n模块：签到；说明：活动开始前 5 分钟开启");
  });

  it("skips empty sheets and preserves single-row sheet content", () => {
    const workbook = XLSX.utils.book_new();
    const emptySheet = XLSX.utils.aoa_to_sheet([["", ""], ["", ""]]);
    const singleRowSheet = XLSX.utils.aoa_to_sheet([["单行内容", "仍然保留"]]);

    XLSX.utils.book_append_sheet(workbook, emptySheet, "空表");
    XLSX.utils.book_append_sheet(workbook, singleRowSheet, "单行");

    const parsed = parseSpreadsheetWorkbook(workbook, "补充说明.xlsx");

    expect(parsed.blocks).toHaveLength(2);
    expect(parsed.blocks[0]).toMatchObject({
      blockType: "heading",
      text: "单行",
    });
    expect(parsed.blocks[1]).toMatchObject({
      blockType: "paragraph",
      text: "列1：单行内容；列2：仍然保留",
    });
    expect(parsed.rawText).toBe("## 单行\n\n列1：单行内容；列2：仍然保留");
  });
});
