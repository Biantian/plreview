import * as XLSX from "xlsx";
import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  buildReviewListWorkbook,
  buildReviewReportArchive,
  canExportReviewReport,
} from "@/lib/review-jobs-export";
import {
  deleteReviewJobs,
  getReviewListItemsByIds,
  getReviewReportRowsByIds,
  queueReviewJobRetry,
} from "@/lib/review-jobs";
import {
  resolveReviewSelectionScope,
  type ResolveReviewSelectionScopeInput,
} from "@/lib/review-jobs-selection";

function buildTimestampedFilename(prefix: string, extension: string, date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    prefix,
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`,
  ].join("-") + extension;
}

export async function deleteSelectedReviewJobs(
  input: ResolveReviewSelectionScopeInput,
  prismaClient: PrismaClient = prisma,
) {
  const scope = await resolveReviewSelectionScope(prismaClient, input);
  const result = await deleteReviewJobs(
    scope.items.map((item) => item.id),
    prismaClient,
  );

  return {
    deletedCount: result.count,
  };
}

export async function retryReviewJobById(
  reviewJobId: string,
  prismaClient: PrismaClient = prisma,
) {
  const normalizedReviewJobId = reviewJobId.trim();

  if (!normalizedReviewJobId) {
    throw new Error("缺少评审任务 ID。");
  }

  await queueReviewJobRetry(normalizedReviewJobId, prismaClient);

  return {
    queued: true as const,
  };
}

export async function exportReviewListFile(
  input: ResolveReviewSelectionScopeInput,
  prismaClient: PrismaClient = prisma,
) {
  const scope = await resolveReviewSelectionScope(prismaClient, input);
  const reviews = await getReviewListItemsByIds(
    scope.items.map((item) => item.id),
    prismaClient,
  );
  const workbook = buildReviewListWorkbook(reviews);
  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  });

  return {
    bytes: new Uint8Array(buffer),
    filename: buildTimestampedFilename("review-list", ".xlsx"),
  };
}

export async function exportReviewReportArchive(
  input: ResolveReviewSelectionScopeInput,
  prismaClient: PrismaClient = prisma,
) {
  const scope = await resolveReviewSelectionScope(prismaClient, input);
  const reportRows = await getReviewReportRowsByIds(
    scope.items.map((item) => item.id),
    prismaClient,
  );
  const exportableRows = reportRows.filter(canExportReviewReport);
  const skippedCount = reportRows.length - exportableRows.length;

  if (exportableRows.length === 0) {
    throw new Error("没有可导出的评审报告。");
  }

  const archive = await buildReviewReportArchive(exportableRows);

  return {
    bytes: new Uint8Array(archive),
    filename: buildTimestampedFilename("review-reports", ".zip"),
    exportedCount: exportableRows.length,
    skippedCount,
  };
}
