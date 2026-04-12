import Link from "next/link";
import { ReviewStatus } from "@prisma/client";

import { ReviewQueue } from "@/components/review-queue";
import { getReviewListItems } from "@/lib/review-jobs";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const initialReviews = await getReviewListItems();
  const runningCount = initialReviews.filter(
    (review) => review.status === ReviewStatus.pending || review.status === ReviewStatus.running,
  ).length;
  const completedCount = initialReviews.filter(
    (review) => review.status === ReviewStatus.completed || review.status === ReviewStatus.partial,
  ).length;
  const failedCount = initialReviews.filter((review) => review.status === ReviewStatus.failed).length;

  return (
    <div className="stack-lg">
      <section className="panel stack-lg">
        <div className="stack">
          <div className="inline-actions">
            <span className="pill pill-brand">Review Queue</span>
            <span className="pill">后台任务中心</span>
            <Link className="button-ghost button-inline" href="/docs">
              查看帮助
            </Link>
          </div>

          <div>
            <p className="section-eyebrow">Task Center</p>
            <h1 className="section-title">评审列表</h1>
            <p className="section-copy">
              这里负责查看任务状态和进入结果页，不再重复展示完整教学流程。
            </p>
          </div>

          <div className="actions">
            <Link className="button" href="/reviews/new">
              新建评审
            </Link>
            <Link className="button-ghost" href="/">
              返回总览
            </Link>
          </div>
        </div>

        <div className="metric-grid">
          <div className="metric-card">
            <p className="metric-label">总任务数</p>
            <strong className="metric-value">{initialReviews.length}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">进行中</p>
            <strong className="metric-value">{runningCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">已完成</p>
            <strong className="metric-value">{completedCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">失败</p>
            <strong className="metric-value">{failedCount}</strong>
          </div>
        </div>

        <ReviewQueue initialReviews={initialReviews} />
      </section>
    </div>
  );
}
