import JSZip from "jszip";
import * as XLSX from "xlsx";

import { reviewStatusLabel } from "@/lib/utils";

import type { ReviewListItem, ReviewReportRow } from "./review-jobs";

const REVIEW_LIST_HEADERS = [
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
];

export function buildReviewListWorkbook(items: ReviewListItem[]) {
  const sheet = XLSX.utils.aoa_to_sheet([
    REVIEW_LIST_HEADERS,
    ...items.map((item) => [
      item.title,
      item.filename,
      item.fileType,
      item.batchName ?? "",
      item.modelName,
      reviewStatusLabel(item.status),
      item.annotationsCount,
      item.overallScore ?? "",
      item.createdAt,
      item.finishedAt ?? "",
    ]),
  ]);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, sheet, "评审清单");

  return workbook;
}

export function canExportReviewReport(item: Pick<ReviewReportRow, "reportMarkdown">) {
  return Boolean(item.reportMarkdown?.trim());
}

function sanitizeArchiveFilenamePart(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._ ]+|[._ ]+$/g, "");
}

function buildReviewReportFilename(item: ReviewReportRow) {
  return `${[
    sanitizeArchiveFilenamePart(item.title),
    sanitizeArchiveFilenamePart(item.filename),
    sanitizeArchiveFilenamePart(item.status),
  ].join("__")}.md`;
}

export async function buildReviewReportArchive(items: ReviewReportRow[]) {
  const zip = new JSZip();
  const usedFilenames = new Map<string, number>();

  for (const item of items) {
    if (!canExportReviewReport(item)) {
      continue;
    }

    const baseFilename = buildReviewReportFilename(item);
    const nextCollisionCount = (usedFilenames.get(baseFilename) ?? 0) + 1;
    usedFilenames.set(baseFilename, nextCollisionCount);
    const archiveFilename =
      nextCollisionCount === 1
        ? baseFilename
        : baseFilename.replace(/\.md$/, `__${nextCollisionCount}.md`);

    zip.file(archiveFilename, item.reportMarkdown!);
  }

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
}
