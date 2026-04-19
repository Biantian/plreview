import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { RulesTable } from "@/components/rules-table";
import { getRuleDashboardData } from "@/lib/rules";

export default async function RulesPage() {
  const { items, totalCount, enabledCount, categoryCount, latestUpdatedAtLabel } =
    await getRuleDashboardData();

  return (
    <div className="desktop-management-page stack-lg">
      <section className="panel stack-lg">
        <PageIntro
          actions={
            <>
              <Link className="button" href="/reviews/new">
                去新建评审
              </Link>
              <Link className="button-ghost" href="/models">
                查看模型配置
              </Link>
            </>
          }
          description="按规则名称、分类与严重级别维护规则目录，先浏览筛选，再通过抽屉更新内容和启用状态。"
          eyebrow="Rule Library"
          title="规则管理"
        />

        <div className="desktop-kpi-grid">
          <div className="metric-card">
            <p className="metric-label">规则总数</p>
            <strong className="metric-value">{totalCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">启用中</p>
            <strong className="metric-value">{enabledCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">分类数</p>
            <strong className="metric-value">{categoryCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">最近更新</p>
            <strong className="metric-value">{latestUpdatedAtLabel}</strong>
          </div>
        </div>
      </section>

      <RulesTable items={items} />
    </div>
  );
}
