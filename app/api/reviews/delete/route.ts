import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resolveReviewSelectionScope } from "@/lib/review-jobs-selection";
import { deleteReviewJobs } from "@/lib/review-jobs";

const EMPTY_SELECTION_ERROR = "至少选择一条评审任务。";
const MISSING_SELECTED_IDS_ERROR_PREFIX = "未找到以下评审任务：";

function isSelectionValidationError(message: string) {
  return (
    message === EMPTY_SELECTION_ERROR || message.startsWith(MISSING_SELECTED_IDS_ERROR_PREFIX)
  );
}

export async function DELETE(request: Request) {
  try {
    const input = await request.json();
    const scope = await resolveReviewSelectionScope(prisma, input);
    const result = await deleteReviewJobs(scope.items.map((item) => item.id));

    return NextResponse.json({
      deletedCount: result.count,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除评审任务失败。";

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
