"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { type Severity } from "@prisma/client";

import type { RuleDashboardData, RuleSaveInput } from "@/desktop/bridge/desktop-api";
import { RuleEditorDrawer, type RuleCreateDraft } from "@/components/rule-editor-drawer";
import { TableSearchInput } from "@/components/table-search-input";
import { RULE_TEMPLATE } from "@/lib/defaults";
import { severityLabel } from "@/lib/utils";

export type RuleRow = {
  id: string;
  enabled: boolean;
  name: string;
  category: string;
  severity: Severity;
  description: string;
  promptTemplate: string;
  updatedAtLabel: string;
};

function matchesQuery(item: RuleRow, query: string) {
  if (!query) {
    return true;
  }

  return [item.name, item.category, item.description, item.severity, severityLabel(item.severity)]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function createDefaultRuleDraft(): RuleCreateDraft {
  return {
    name: "",
    category: "",
    description: "",
    promptTemplate: RULE_TEMPLATE,
    severity: "medium",
    enabled: true,
  };
}

export function RulesTable({ items }: { items: RuleRow[] }) {
  const [records, setRecords] = useState(items);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<RuleCreateDraft>(() => createDefaultRuleDraft());
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const keyword = deferredQuery.trim().toLowerCase();
  const filteredItems = records.filter((item) => matchesQuery(item, keyword));
  const editingRule =
    filteredItems.find((item) => item.id === editingId) ??
    records.find((item) => item.id === editingId) ??
    null;
  const isEditorOpen = isCreateOpen || !!editingRule;

  useEffect(() => {
    setRecords(items);
  }, [items]);

  function openCreateEditor() {
    setFeedback(null);
    setIsCreateOpen(true);
    setEditingId(null);
  }

  function clearCreateDraft() {
    setCreateDraft(createDefaultRuleDraft());
    setFeedback(null);
  }

  function closeEditor() {
    if (isCreateOpen) {
      setFeedback(null);
    }

    setEditingId(null);
    setIsCreateOpen(false);
  }

  async function updateRules(
    action: () => Promise<RuleDashboardData>,
    successMessage: string,
  ): Promise<boolean> {
    if (!window.plreview?.getRuleDashboard) {
      setFeedback("桌面桥接不可用，请从 Electron 桌面壳启动。");
      return false;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const nextDashboard = await action();
      setRecords(nextDashboard.items);
      setFeedback(successMessage);
      setEditingId(null);
      setIsCreateOpen(false);
      return true;
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "规则操作失败。");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="desktop-table-card management-table-shell">
      <div className="desktop-table-header">
        <div className="desktop-table-heading">
          <p className="section-eyebrow">规则库</p>
          <h2 className="subsection-title">规则目录</h2>
        </div>
        <p className="desktop-table-summary">共 {records.length} 条规则 · 当前显示 {filteredItems.length} 条</p>
      </div>

      <div className="desktop-table-toolbar">
        <TableSearchInput label="搜索规则" onChange={setQuery} value={query} />
        <div className="desktop-table-toolbar-actions">
          <p className="muted">支持按规则名称、分类、说明和严重级别筛选。</p>
          <button
            className="button"
            onClick={openCreateEditor}
            type="button"
          >
            新增规则
          </button>
        </div>
      </div>

      {feedback && !isEditorOpen ? <p className="section-copy">{feedback}</p> : null}

      <div className="table-shell management-table-scroll-region">
        <table aria-label="规则表格" className="data-table">
          <thead>
            <tr>
              <th scope="col">启用</th>
              <th scope="col">规则名称</th>
              <th scope="col" className="table-nowrap">分类</th>
              <th scope="col" className="table-nowrap">默认严重级别</th>
              <th scope="col" className="table-nowrap">最近更新时间</th>
              <th scope="col">说明</th>
              <th scope="col" className="table-nowrap">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td className="muted" colSpan={7}>
                  没有匹配的规则，试试换一个关键词。
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id}>
                  <td className="table-nowrap">{item.enabled ? "启用中" : "已停用"}</td>
                  <td>
                    <span className="table-cell-primary">{item.name}</span>
                  </td>
                  <td className="table-nowrap">{item.category}</td>
                  <td className="table-nowrap">{severityLabel(item.severity)}</td>
                  <td className="table-nowrap">{item.updatedAtLabel}</td>
                  <td>
                    <span className="table-cell-secondary">{item.description}</span>
                  </td>
                  <td className="table-nowrap">
                    <div className="table-actions">
                      <button
                        aria-label={`编辑 ${item.name}`}
                        className="table-text-button"
                        onClick={() => {
                          setIsCreateOpen(false);
                          setEditingId(item.id);
                        }}
                        type="button"
                      >
                        编辑
                      </button>

                      <button
                        className="table-text-button"
                        disabled={isSaving}
                        onClick={() =>
                          void updateRules(
                            () => window.plreview.toggleRuleEnabled(item.id, !item.enabled),
                            item.enabled ? "规则已停用。" : "规则已启用。",
                          )
                        }
                        type="button"
                      >
                        {item.enabled ? "停用" : "启用"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <RuleEditorDrawer
        key={isCreateOpen ? "create" : editingRule?.id ?? "closed"}
        busy={isSaving}
        createDraft={createDraft}
        errorMessage={feedback}
        onChangeCreateDraft={setCreateDraft}
        onClearCreateDraft={clearCreateDraft}
        onClose={closeEditor}
        onSave={async (payload: RuleSaveInput) => {
          const saved = await updateRules(
            () => window.plreview.saveRule(payload),
            payload.id ? "规则已更新。" : "规则已创建。",
          );

          if (saved && !payload.id) {
            setCreateDraft(createDefaultRuleDraft());
          }
        }}
        open={isEditorOpen}
        rule={isCreateOpen ? null : editingRule}
      />
    </section>
  );
}
