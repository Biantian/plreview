import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resolveReviewSelectionScope } from "@/lib/review-jobs-selection";
import {
  buildReviewReportArchive,
  canExportReviewReport,
} from "@/lib/review-jobs-export";
import { getReviewReportRowsByIds } from "@/lib/review-jobs";

const EMPTY_SELECTION_ERROR = "至少选择一条评审任务。";
const MISSING_SELECTED_IDS_ERROR_PREFIX = "未找到以下评审任务：";
const NO_EXPORTABLE_REPORT_ERROR = "没有可导出的评审报告。";
const ZIP_CONTENT_TYPE = "application/zip";

function isSelectionValidationError(message: string) {
  return (
    message === EMPTY_SELECTION_ERROR || message.startsWith(MISSING_SELECTED_IDS_ERROR_PREFIX)
  );
}

function buildExportFilename(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    "review-reports",
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`,
  ].join("-") + ".zip";
}

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const scope = await resolveReviewSelectionScope(prisma, input);
    const reportRows = await getReviewReportRowsByIds(scope.items.map((item) => item.id));
    const exportableRows = reportRows.filter(canExportReviewReport);
    const skippedCount = reportRows.length - exportableRows.length;

    if (exportableRows.length === 0) {
      return NextResponse.json(
        {
          error: NO_EXPORTABLE_REPORT_ERROR,
        },
        {
          status: 400,
        },
      );
    }

    const archive = await buildReviewReportArchive(exportableRows);

    return new Response(archive, {
      headers: {
        "Content-Type": ZIP_CONTENT_TYPE,
        "Content-Disposition": `attachment; filename="${buildExportFilename()}"`,
        "x-exported-count": String(exportableRows.length),
        "x-skipped-count": String(skippedCount),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "导出评审报告失败。";

    if (isSelectionValidationError(message) || message === NO_EXPORTABLE_REPORT_ERROR) {
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
