import * as XLSX from "xlsx";

import { reviewStatusLabel } from "@/lib/utils";

import type { ReviewListItem } from "./review-jobs";

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
