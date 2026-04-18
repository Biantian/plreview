import { NextResponse } from "next/server";

import { queueReviewJobRetry } from "@/lib/review-jobs";

const RETRY_VALIDATION_ERRORS = new Set([
  "未找到对应的评审任务。",
  "当前评审任务缺少模型配置，无法重试。",
  "当前评审任务缺少可重试的规则配置。",
  "只有失败或部分完成的任务支持重试。",
]);

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as { reviewJobId?: string };
    const reviewJobId = input.reviewJobId?.trim() ?? "";

    if (!reviewJobId) {
      return NextResponse.json(
        {
          error: "缺少评审任务 ID。",
        },
        {
          status: 400,
        },
      );
    }

    await queueReviewJobRetry(reviewJobId);

    return NextResponse.json({
      queued: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "重新发起评审失败。";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: RETRY_VALIDATION_ERRORS.has(message) ? 400 : 500,
      },
    );
  }
}
