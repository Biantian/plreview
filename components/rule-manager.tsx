"use client";

import { useState } from "react";

import { Severity } from "@prisma/client";

import { saveRuleAction, toggleRuleEnabledAction } from "@/lib/actions";
import { RULE_TEMPLATE } from "@/lib/defaults";
import { severityLabel } from "@/lib/utils";

type RuleRecord = {
  id: string;
  name: string;
  category: string;
  description: string;
  promptTemplate: string;
  severity: Severity;
  enabled: boolean;
  updatedAtLabel: string;
};

const severityOptions = [
  Severity.low,
  Severity.medium,
  Severity.high,
  Severity.critical,
];

export function RuleManager({
  rules,
}: {
  rules: RuleRecord[];
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  return (
    <section className="stack-lg">
      <div className="card stack">
        <div className="inline-actions">
          <div>
            <p className="section-eyebrow">Rule Studio</p>
            <h2 className="section-title">规则库操作</h2>
          </div>
          <button
            className="button"
            onClick={() => {
              setIsCreateOpen((current) => !current);
              setEditingRuleId(null);
            }}
            type="button"
          >
            {isCreateOpen ? "收起新增表单" : "新增规则"}
          </button>
        </div>

        {isCreateOpen ? (
          <form action={saveRuleAction} className="form-grid">
            <div className="form-section compact">
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

              <div className="field">
                <label htmlFor="promptTemplate">评审模板</label>
                <textarea
                  defaultValue={RULE_TEMPLATE}
                  id="promptTemplate"
                  name="promptTemplate"
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
            </div>

            <div className="actions">
              <button className="button" type="submit">
                保存规则
              </button>
              <button
                className="button-ghost"
                onClick={() => setIsCreateOpen(false)}
                type="button"
              >
                取消
              </button>
            </div>
          </form>
        ) : null}
      </div>

      <div className="stack">
        {rules.map((rule) => {
          const isEditing = editingRuleId === rule.id;

          return (
            <div className="rule-row" key={rule.id}>
              <div className="rule-row-main">
                <div className="rule-row-copy">
                  <div className="inline-actions">
                    <strong className="rule-row-title">{rule.name}</strong>
                    <span className="pill pill-brand">{rule.category}</span>
                    <span className="pill">默认严重级别：{severityLabel(rule.severity)}</span>
                  </div>
                  <p className="muted">{rule.description}</p>
                </div>

                <div className="rule-row-meta">
                  <span className="pill">{rule.enabled ? "启用中" : "已停用"}</span>
                  <span className="pill">{rule.updatedAtLabel}</span>
                </div>
              </div>

              <div className="rule-row-actions">
                <button
                  className="button-ghost"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingRuleId((current) => (current === rule.id ? null : rule.id));
                  }}
                  type="button"
                >
                  {isEditing ? "收起编辑" : "编辑"}
                </button>

                <form action={toggleRuleEnabledAction}>
                  <input name="id" type="hidden" value={rule.id} />
                  <input name="enabled" type="hidden" value={String(!rule.enabled)} />
                  <button className="button-secondary" type="submit">
                    {rule.enabled ? "停用" : "启用"}
                  </button>
                </form>
              </div>

              {isEditing ? (
                <form action={saveRuleAction} className="form-grid rule-row-editor">
                  <input name="id" type="hidden" value={rule.id} />

                  <div className="form-section compact">
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
                    <button className="button" type="submit">
                      保存修改
                    </button>
                    <button
                      className="button-ghost"
                      onClick={() => setEditingRuleId(null)}
                      type="button"
                    >
                      取消
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
