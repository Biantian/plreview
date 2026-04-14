import { RulesTable } from "@/components/rules-table";
import { getRuleDashboardData } from "@/lib/rules";

export default async function RulesPage() {
  const { items, totalCount, enabledCount, categoryCount, latestUpdatedAtLabel } =
    await getRuleDashboardData();

  return (
    <div className="grid-main">
      <section className="panel stack">
        <div>
          <p className="section-eyebrow">Rule Library</p>
          <h1 className="section-title">规则管理</h1>
          <p className="section-copy">
            规则页现在改成表格管理视图，方便先搜索和筛选，再通过抽屉编辑单条规则，避免规则数量一多就变成长长的编辑墙。
          </p>
        </div>

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
      </section>

      <RulesTable items={items} />
    </div>
  );
}
