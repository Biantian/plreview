import { Severity } from "@prisma/client";

import { saveRuleAction, toggleRuleEnabledAction } from "@/lib/actions";
import { RULE_TEMPLATE } from "@/lib/defaults";
import { prisma } from "@/lib/prisma";
import { formatDate, severityLabel } from "@/lib/utils";

const severityOptions = [
  Severity.low,
  Severity.medium,
  Severity.high,
  Severity.critical,
];

export default async function RulesPage() {
  const rules = await prisma.rule.findMany({
    orderBy: [{ enabled: "desc" }, { category: "asc" }, { updatedAt: "desc" }],
  });

  const enabledCount = rules.filter((rule) => rule.enabled).length;
  const categoryCount = new Set(rules.map((rule) => rule.category)).size;

  return (
    <div className="grid-main">
      <section className="panel stack-lg">
        <div>
          <p className="section-eyebrow">Rule Studio</p>
          <h1 className="section-title">新增规则</h1>
          <p className="section-copy">
            规则页现在更像一个规则工作台，而不是连续的长表单。你可以先定义意图，再补充模板，最后决定默认严重级别和启用状态。
          </p>
        </div>

        <form action={saveRuleAction} className="form-grid">
          <div className="form-section">
            <div>
              <h2 className="subsection-title">规则基础信息</h2>
              <p className="section-copy">先定义名称、分类和这条规则的审查范围。</p>
            </div>

            <div className="form-grid two">
              <div className="field">
                <label htmlFor="name">规则名称</label>
                <input id="name" name="name" placeholder="例如：目标清晰度" required />
              </div>

              <div className="field">
                <label htmlFor="category">分类</label>
                <input id="category" name="category" placeholder="例如：基础质量" required />
              </div>
            </div>

            <div className="field">
              <label htmlFor="description">规则说明</label>
              <textarea
                id="description"
                name="description"
                placeholder="描述这条规则希望审查什么问题。"
                required
              />
            </div>
          </div>

          <div className="form-section">
            <div>
              <h2 className="subsection-title">评审模板</h2>
              <p className="section-copy">模板会在发起评审时被冻结为版本快照，方便你在后续持续优化。</p>
            </div>

            <div className="field">
              <label htmlFor="promptTemplate">评审模板</label>
              <textarea
                id="promptTemplate"
                name="promptTemplate"
                defaultValue={RULE_TEMPLATE}
                required
              />
            </div>
          </div>

          <div className="form-section">
            <div>
              <h2 className="subsection-title">默认行为</h2>
            </div>

            <div className="form-grid two">
              <div className="field">
                <label htmlFor="severity">默认严重级别</label>
                <select defaultValue={Severity.medium} id="severity" name="severity">
                  {severityOptions.map((severity) => (
                    <option key={severity} value={severity}>
                      {severityLabel(severity)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <span>启用状态</span>
                <label>
                  <input defaultChecked name="enabled" type="checkbox" /> 创建后立即启用
                </label>
              </div>
            </div>
          </div>

          <div className="actions">
            <button className="button" type="submit">
              保存规则
            </button>
          </div>
        </form>
      </section>

      <section className="stack-lg">
        <div className="card stack">
          <div>
            <p className="section-eyebrow">Library Snapshot</p>
            <h2 className="section-title">现有规则</h2>
            <p className="section-copy">支持直接在列表中修改、启停和调整提示词模板。</p>
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
              <p className="metric-label">已停用</p>
              <strong className="metric-value">{rules.length - enabledCount}</strong>
            </div>
          </div>
        </div>

        {rules.map((rule) => (
          <div className="card stack" key={rule.id}>
            <div className="inline-actions">
              <span className="pill pill-brand">{rule.category}</span>
              <span className="pill">默认严重级别：{severityLabel(rule.severity)}</span>
              <span className="pill">{rule.enabled ? "启用中" : "已停用"}</span>
              <span className="pill">{formatDate(rule.updatedAt)}</span>
            </div>

            <form action={saveRuleAction} className="form-grid">
              <input name="id" type="hidden" value={rule.id} />

              <div className="form-section">
                <div className="form-grid two">
                  <div className="field">
                    <label htmlFor={`name-${rule.id}`}>规则名称</label>
                    <input defaultValue={rule.name} id={`name-${rule.id}`} name="name" required />
                  </div>

                  <div className="field">
                    <label htmlFor={`category-${rule.id}`}>分类</label>
                    <input
                      defaultValue={rule.category}
                      id={`category-${rule.id}`}
                      name="category"
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor={`description-${rule.id}`}>规则说明</label>
                  <textarea
                    defaultValue={rule.description}
                    id={`description-${rule.id}`}
                    name="description"
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor={`promptTemplate-${rule.id}`}>评审模板</label>
                  <textarea
                    defaultValue={rule.promptTemplate}
                    id={`promptTemplate-${rule.id}`}
                    name="promptTemplate"
                    required
                  />
                </div>

                <div className="form-grid two">
                  <div className="field">
                    <label htmlFor={`severity-${rule.id}`}>默认严重级别</label>
                    <select
                      defaultValue={rule.severity}
                      id={`severity-${rule.id}`}
                      name="severity"
                    >
                      {severityOptions.map((severity) => (
                        <option key={severity} value={severity}>
                          {severityLabel(severity)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <span>启用状态</span>
                    <label>
                      <input checked={rule.enabled} name="enabled" readOnly type="checkbox" />{" "}
                      本表单保持当前状态
                    </label>
                  </div>
                </div>
              </div>

              <div className="actions">
                <button className="button-secondary" type="submit">
                  保存修改
                </button>
              </div>
            </form>

            <form action={toggleRuleEnabledAction}>
              <input name="id" type="hidden" value={rule.id} />
              <input name="enabled" type="hidden" value={String(!rule.enabled)} />
              <button className="button-ghost" type="submit">
                {rule.enabled ? "停用规则" : "重新启用"}
              </button>
            </form>
          </div>
        ))}
      </section>
    </div>
  );
}
