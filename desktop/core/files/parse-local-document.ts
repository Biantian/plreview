import fs from "node:fs/promises";
import path from "node:path";

import { parseSpreadsheetWorkbook } from "@/desktop/core/files/parse-spreadsheet";
import { createTaskRunner } from "@/desktop/worker/task-runner";
import { parseUploadedDocument, type ParsedDocument } from "@/lib/parse-document";

export async function parseLocalDocument(filePath: string): Promise<ParsedDocument> {
  const taskRunner = createTaskRunner();
  return taskRunner.run<ParsedDocument>("parse-document", { filePath });
}

export async function parseLocalDocumentInProcess(filePath: string): Promise<ParsedDocument> {
  const filename = path.basename(filePath);
  const buffer = await fs.readFile(filePath);

  if (filename.toLowerCase().endsWith(".xlsx")) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    return parseSpreadsheetWorkbook(workbook, filename);
  }

  return parseUploadedDocument(new File([buffer], filename, { type: "application/octet-stream" }));
}
