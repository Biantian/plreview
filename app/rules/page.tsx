import { PageIntro } from "@/components/page-intro";
import { RulesTable } from "@/components/rules-table";
import { getRuleDashboardData } from "@/lib/rules";

export default async function RulesPage() {
  const { items, totalCount, enabledCount, categoryCount, latestUpdatedAtLabel } =
    await getRuleDashboardData();

  return (
    <section className="panel stack-lg">
      <PageIntro
        description="规则页保持紧凑浏览，先检索和筛选，再通过行末操作管理规则。"
        eyebrow="Rule Library"
        title="规则管理"
      />

      <div className="metric-grid">
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

      <RulesTable items={items} />
    </section>
  );
}
