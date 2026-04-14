import Link from "next/link";

import { ReviewJobsTable } from "@/components/review-jobs-table";
import { getReviewDashboardData } from "@/lib/review-jobs";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const { items, totalCount, runningCount, completedCount, failedCount } =
    await getReviewDashboardData();

  return (
    <div className="grid-main">
      <section className="panel stack-lg">
        <div className="stack">
          <div className="inline-actions">
            <span className="pill pill-brand">Review Queue</span>
            <span className="pill">后台任务中心</span>
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

      <aside className="stack-lg">
        <section className="card stack">
          <div>
            <p className="section-eyebrow">Queue Signals</p>
            <h2 className="section-title">阅读节奏</h2>
            <p className="section-copy">
              表格页优先回答两个问题：哪一批任务正在处理，哪些任务已经值得进入详情页仔细看。
            </p>
          </div>

          <div className="feature-list">
            <div className="feature-row">
              <span className="feature-kicker">进行中</span>
              <div>
                <strong>用动态状态感知后台进度</strong>
                <p className="muted">处理中任务会明确标出状态，避免把未完成任务误当成可读报告。</p>
              </div>
            </div>
            <div className="feature-row">
              <span className="feature-kicker">已完成</span>
              <div>
                <strong>结果一旦可读，就显示评分与问题数</strong>
                <p className="muted">筛选后能直接判断先看哪份报告，而不用挨个点开详情页。</p>
              </div>
            </div>
            <div className="feature-row">
              <span className="feature-kicker">失败</span>
              <div>
                <strong>失败任务也保留详情入口</strong>
                <p className="muted">这样你可以快速查看错误原因，不需要猜测任务卡在哪一步。</p>
              </div>
            </div>
          </div>
        </section>

        <section className="card stack">
          <div>
            <p className="section-eyebrow">Next Step</p>
            <h2 className="section-title">进入结果页后会看到什么</h2>
          </div>

          <div className="feature-list">
            <div className="feature-row">
              <span className="feature-kicker">报告</span>
              <div>
                <strong>报告正文按 Markdown 排版</strong>
                <p className="muted">表格、列表、任务清单和代码块会按可读文档方式展示。</p>
              </div>
            </div>
            <div className="feature-row">
              <span className="feature-kicker">命中</span>
              <div>
                <strong>原文只在命中处显示提示标签</strong>
                <p className="muted">阅读顺序更自然，问题定位也保留足够明确的落点。</p>
              </div>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}
