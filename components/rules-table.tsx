"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import { type Severity } from "@prisma/client";

import type { RuleDashboardData, RuleSaveInput } from "@/desktop/bridge/desktop-api";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RuleEditorDrawer, type RuleCreateDraft } from "@/components/rule-editor-drawer";
import { TableSearchInput } from "@/components/table-search-input";
import { RULE_TEMPLATE } from "@/lib/defaults";
import { normalizeRuleSearchText, rankRuleSearchResults } from "@/lib/rule-search";
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
  isDeleted?: boolean;
};

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
  const [showDeleted, setShowDeleted] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RuleRow | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<RuleCreateDraft>(() => createDefaultRuleDraft());
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const deferredQuery = useDeferredValue(query);
  const keyword = normalizeRuleSearchText(deferredQuery);
  const visibleRecords = records.filter((item) => showDeleted || !item.isDeleted);
  const filteredItems = rankRuleSearchResults(visibleRecords, keyword);
  const editingRule =
    filteredItems.find((item) => item.id === editingId) ??
    visibleRecords.find((item) => item.id === editingId) ??
    null;
  const isEditorOpen = isCreateOpen || !!editingRule;

  useEffect(() => {
    setRecords(items);
  }, [items]);

  useEffect(() => {
    if (!isFilterMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (filterMenuRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsFilterMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isFilterMenuOpen]);

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

  async function loadDashboard(includeDeleted: boolean) {
    if (!window.plreview?.getRuleDashboard) {
      throw new Error("桌面桥接不可用，请从 Electron 桌面壳启动。");
    }

    return window.plreview.getRuleDashboard({ includeDeleted });
  }

  async function refreshRecords(includeDeleted: boolean) {
    const nextDashboard = await loadDashboard(includeDeleted);
    setRecords(nextDashboard.items);
  }

  async function handleToggleShowDeleted(checked: boolean) {
    if (checked === showDeleted) {
      return;
    }

    const previousShowDeleted = showDeleted;
    setShowDeleted(checked);
    setFeedback(null);
    setIsSaving(true);

    try {
      await refreshRecords(checked);
    } catch (error) {
      setShowDeleted(previousShowDeleted);
      setFeedback(error instanceof Error ? error.message : "规则加载失败。");
    } finally {
      setIsSaving(false);
    }
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

      if (showDeleted) {
        await refreshRecords(true);
      } else {
        setRecords(nextDashboard.items);
      }

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

  async function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }

    if (!window.plreview?.deleteRule) {
      setFeedback("桌面桥接不可用，请从 Electron 桌面壳启动。");
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      await window.plreview.deleteRule(deleteTarget.id);
      setDeleteTarget(null);
      setEditingId(null);
      setIsCreateOpen(false);

      try {
        await refreshRecords(showDeleted);
        setFeedback(null);
      } catch (refreshError) {
        const refreshMessage = refreshError instanceof Error ? refreshError.message : "规则刷新失败。";
        setFeedback(`规则列表刷新失败：${refreshMessage}`);
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "规则删除失败。");
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
        <p className="desktop-table-summary">
          共 {visibleRecords.length} 条规则 · 当前显示 {filteredItems.length} 条
        </p>
      </div>

      <div className="desktop-table-toolbar">
        <TableSearchInput
          label="搜索规则"
          onChange={setQuery}
          placeholder="搜索规则名称、分类、说明和严重级别"
          value={query}
        />
        <div className="desktop-table-toolbar-actions">
          <div className="table-toolbar-primary-actions">
            <button
              className="button"
              onClick={openCreateEditor}
              type="button"
            >
              新增规则
            </button>
            <div className="table-more-filters" ref={filterMenuRef}>
              <button
                aria-expanded={isFilterMenuOpen}
                aria-haspopup="true"
                aria-label="更多筛选"
                className="icon-button table-more-filters-trigger"
                onClick={() => {
                  setIsFilterMenuOpen((current) => !current);
                }}
                title="更多筛选"
                type="button"
              >
                <span aria-hidden="true" className="table-more-filters-dots">
                  ...
                </span>
              </button>
              {isFilterMenuOpen ? (
                <div aria-label="更多筛选选项" className="table-more-filters-menu" role="group">
                  <label className="table-more-filters-option">
                    <input
                      checked={showDeleted}
                      disabled={isSaving}
                      onChange={(event) => void handleToggleShowDeleted(event.currentTarget.checked)}
                      type="checkbox"
                    />
                    <span>显示已删除</span>
                  </label>
                </div>
              ) : null}
            </div>
          </div>
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
                <tr className={item.isDeleted ? "rule-row-deleted" : undefined} key={item.id}>
                  <td className="table-nowrap">{item.isDeleted ? "已删除" : item.enabled ? "启用中" : "已停用"}</td>
                  <td>
                    <div className="rule-name-cell">
                      <span className="table-cell-primary">{item.name}</span>
                      {item.isDeleted ? <span className="pill rule-deleted-pill">已删除</span> : null}
                    </div>
                  </td>
                  <td className="table-nowrap">{item.category}</td>
                  <td className="table-nowrap">{severityLabel(item.severity)}</td>
                  <td className="table-nowrap">{item.updatedAtLabel}</td>
                  <td>
                    <span className="table-cell-secondary">{item.description}</span>
                  </td>
                  <td className="table-nowrap">
                    {item.isDeleted ? (
                      <span className="muted">已删除</span>
                    ) : (
                      <div className="table-actions">
                        <button
                          aria-label={`编辑 ${item.name}`}
                          className="table-text-button"
                          disabled={isSaving}
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

                        <button
                          aria-label={`删除 ${item.name}`}
                          className="table-text-button is-danger"
                          disabled={isSaving}
                          onClick={() => {
                            setFeedback(null);
                            setDeleteTarget(item);
                          }}
                          type="button"
                        >
                          删除
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        confirmBusyLabel="删除中..."
        confirmDisabled={isSaving}
        confirmLabel="仍要删除"
        destructive
        description={
          deleteTarget
            ? `确认删除规则「${deleteTarget.name}」吗？删除后将按关联关系进行软删除或永久删除。`
            : ""
        }
        open={deleteTarget !== null}
        onClose={() => {
          if (!isSaving) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={() => void handleConfirmDelete()}
        title="删除规则"
      />

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
