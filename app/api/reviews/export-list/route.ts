import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { resolveReviewSelectionScope } from "@/lib/review-jobs-selection";
import { buildReviewListWorkbook } from "@/lib/review-jobs-export";
import { getReviewListItemsByIds } from "@/lib/review-jobs";

const EMPTY_SELECTION_ERROR = "至少选择一条评审任务。";
const MISSING_SELECTED_IDS_ERROR_PREFIX = "未找到以下评审任务：";
const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function isSelectionValidationError(message: string) {
  return (
    message === EMPTY_SELECTION_ERROR || message.startsWith(MISSING_SELECTED_IDS_ERROR_PREFIX)
  );
}

function buildExportFilename(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    "review-list",
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`,
  ].join("-") + ".xlsx";
}

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const scope = await resolveReviewSelectionScope(prisma, input);
    const reviews = await getReviewListItemsByIds(scope.items.map((item) => item.id));
    const workbook = buildReviewListWorkbook(reviews);
    const buffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });

    return new Response(buffer, {
      headers: {
        "Content-Type": XLSX_CONTENT_TYPE,
        "Content-Disposition": `attachment; filename="${buildExportFilename()}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "导出评审清单失败。";

    if (isSelectionValidationError(message)) {
      return NextResponse.json(
        {
          error: message,
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}
