import * as XLSX from "xlsx";

import { createParsedDocument, type ParsedBlock, type ParsedDocument } from "@/lib/parse-document";
type SpreadsheetMatrixRow = unknown[];

function cellText(value: unknown) {
  return String(value ?? "").trim();
}

function rowToParagraph(headers: string[], row: string[]) {
  return row
    .map((value, index) => [headers[index] || `列${index + 1}`, value] as const)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}：${value}`)
    .join("；");
}

export function parseSpreadsheetWorkbook(
  workbook: XLSX.WorkBook,
  filename: string,
): ParsedDocument {
  const blocks: ParsedBlock[] = [];
  const rawParts: string[] = [];
  let cursor = 0;

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return;
    }

    const rows = XLSX.utils
      .sheet_to_json<SpreadsheetMatrixRow>(sheet, { header: 1, defval: "" })
      .map((row) => row.map((cell) => cellText(cell)))
      .filter((row) => row.some(Boolean));

    if (rows.length === 0) {
      return;
    }

    const headingText = sheetName.trim() || "Sheet";
    const printable = `## ${headingText}`;
    const headerRow = rows[0];
    const dataRows = rows.length > 1 ? rows.slice(1) : [rows[0]];
    const headers =
      rows.length > 1
        ? headerRow.map((header, index) => header || `列${index + 1}`)
        : headerRow.map((_, index) => `列${index + 1}`);

    const paragraphTexts = dataRows
      .map((row) => rowToParagraph(headers, row))
      .filter(Boolean);

    if (paragraphTexts.length === 0) {
      return;
    }

    blocks.push({
      blockIndex: blocks.length,
      blockType: "heading",
      text: headingText,
      level: 2,
      listKind: null,
      charStart: cursor,
      charEnd: cursor + printable.length,
    });
    rawParts.push(printable);
    cursor += printable.length + 2;

    paragraphTexts.forEach((text) => {
      if (!text) {
        return;
      }

      blocks.push({
        blockIndex: blocks.length,
        blockType: "paragraph",
        text,
        level: null,
        listKind: null,
        charStart: cursor,
        charEnd: cursor + text.length,
      });
      rawParts.push(text);
      cursor += text.length + 2;
    });
  });

  if (blocks.length === 0) {
    throw new Error("未能从表格中解析出有效正文。");
  }

  return createParsedDocument({
    title: filename.replace(/\.[^.]+$/, ""),
    filename,
    fileType: "xlsx",
    rawText: rawParts.join("\n\n"),
    blocks,
  });
}
