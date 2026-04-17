import Link from "next/link";

import { ReviewJobsTable } from "@/components/review-jobs-table";
import { getReviewDashboardData } from "@/lib/review-jobs";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const { items, totalCount, runningCount, completedCount, failedCount } =
    await getReviewDashboardData();

  return (
    <div className="stack-lg">
      <section className="panel stack-lg">
        <div className="stack">
          <div className="inline-actions">
            <span className="pill pill-brand">Review Queue</span>
            <span className="pill">后台任务中心</span>
            <Link className="button-ghost button-inline" href="/docs">
              查看文档
            </Link>
          </div>

          <div>
            <p className="section-eyebrow">Task Center</p>
            <h1 className="section-title">评审列表</h1>
            <p className="section-copy">
              这里改成表格式任务中心，方便按标题、文件名、批次和模型快速筛选，再决定先查看哪一份报告。
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
            <strong className="metric-value">{totalCount}</strong>
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

        <ReviewJobsTable items={items} />
      </section>
    </div>
  );
}
