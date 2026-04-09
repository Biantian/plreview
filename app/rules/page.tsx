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

  return (
    <div className="grid-main">
      <section className="panel stack">
        <div>
          <h1 className="section-title">新增规则</h1>
          <p className="section-copy">
            规则会在评审时被冻结为版本快照，因此你可以持续优化规则，而不影响历史报告的可追溯性。
          </p>
        </div>

        <form action={saveRuleAction} className="form-grid">
          <div className="form-grid two">
            <div className="field">
              <label htmlFor="name">规则名称</label>
              <input id="name" name="name" placeholder="例如：目标清晰度" required />
            </div>

            <div className="field">
              <label htmlFor="category">分类</label>
              <input
                id="category"
                name="category"
                placeholder="例如：基础质量"
                required
              />
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

          <div className="field">
            <label htmlFor="promptTemplate">评审模板</label>
            <textarea
              id="promptTemplate"
              name="promptTemplate"
              defaultValue={RULE_TEMPLATE}
              required
            />
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

          <div className="actions">
            <button className="button" type="submit">
              保存规则
            </button>
          </div>
        </form>
      </section>

      <section className="stack">
        <div className="card">
          <h2 className="section-title">现有规则</h2>
          <p className="section-copy">支持直接在列表中修改、启停和调整提示词模板。</p>
        </div>

        {rules.map((rule) => (
          <div className="card stack" key={rule.id}>
            <div className="inline-actions">
              <span className="pill">{rule.category}</span>
              <span className="pill">默认严重级别：{severityLabel(rule.severity)}</span>
              <span className="pill">
                {rule.enabled ? "启用中" : "已停用"} · {formatDate(rule.updatedAt)}
              </span>
            </div>

            <form action={saveRuleAction} className="form-grid">
              <input name="id" type="hidden" value={rule.id} />

              <div className="form-grid two">
                <div className="field">
                  <label htmlFor={`name-${rule.id}`}>规则名称</label>
                  <input
                    defaultValue={rule.name}
                    id={`name-${rule.id}`}
                    name="name"
                    required
                  />
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

              <div className="actions">
                <button className="button-secondary" type="submit">
                  保存修改
                </button>
              </div>
            </form>

            <form action={toggleRuleEnabledAction}>
              <input name="id" type="hidden" value={rule.id} />
              <input
                name="enabled"
                type="hidden"
                value={String(!rule.enabled)}
              />
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
