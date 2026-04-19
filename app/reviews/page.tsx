import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { ReviewJobsTable } from "@/components/review-jobs-table";
import { getReviewDashboardData } from "@/lib/review-jobs";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const { items, totalCount, runningCount, completedCount, failedCount } =
    await getReviewDashboardData();

  return (
    <div className="desktop-management-page stack-lg">
      <section className="panel stack-lg">
        <PageIntro
          actions={
            <>
              <Link className="button" href="/reviews/new">
                新建评审
              </Link>
              <Link className="button-ghost" href="/docs">
                使用说明
              </Link>
              <Link className="button-ghost" href="/">
                返回工作台
              </Link>
            </>
          }
          description="集中查看后台评审状态，按标题、文件、批次和模型筛选队列，并继续处理失败项、导出结果或打开报告。"
          eyebrow="Review Operations"
          title="评审任务中心"
        />

        <div className="desktop-kpi-grid">
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
      </section>

      <ReviewJobsTable items={items} />
    </div>
  );
}
