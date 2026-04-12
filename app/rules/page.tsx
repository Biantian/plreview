import { RuleManager } from "@/components/rule-manager";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function RulesPage() {
  const rules = await prisma.rule.findMany({
    orderBy: [{ enabled: "desc" }, { category: "asc" }, { updatedAt: "desc" }],
  });

  const enabledCount = rules.filter((rule) => rule.enabled).length;
  const categoryCount = new Set(rules.map((rule) => rule.category)).size;

  return (
    <section className="panel stack-lg">
      <div>
        <p className="section-eyebrow">Rule Library</p>
        <h1 className="section-title">规则管理</h1>
        <p className="section-copy">规则页保持紧凑浏览，详细规则写法统一收敛到帮助页。</p>
      </div>

      <div className="metric-grid">
        <div className="metric-card">
          <p className="metric-label">规则总数</p>
          <strong className="metric-value">{rules.length}</strong>
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
          <strong className="metric-value">
            {rules[0] ? formatDate(rules[0].updatedAt).slice(5, 16) : "--"}
          </strong>
        </div>
      </div>

      <RuleManager
        rules={rules.map((rule) => ({
          id: rule.id,
          name: rule.name,
          category: rule.category,
          description: rule.description,
          promptTemplate: rule.promptTemplate,
          severity: rule.severity,
          enabled: rule.enabled,
          updatedAtLabel: formatDate(rule.updatedAt),
        }))}
      />
    </section>
  );
}
