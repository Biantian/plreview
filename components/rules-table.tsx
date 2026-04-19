"use client";

import { useDeferredValue, useState } from "react";
import { type Severity } from "@prisma/client";

import { RuleEditorDrawer } from "@/components/rule-editor-drawer";
import { TableSearchInput } from "@/components/table-search-input";
import { toggleRuleEnabledAction } from "@/lib/actions";
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

export function RulesTable({ items }: { items: RuleRow[] }) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const keyword = deferredQuery.trim().toLowerCase();
  const filteredItems = items.filter((item) => matchesQuery(item, keyword));
  const editingRule =
    filteredItems.find((item) => item.id === editingId) ??
    items.find((item) => item.id === editingId) ??
    null;

  return (
    <section className="desktop-table-card stack">
      <div className="desktop-table-header">
        <div className="desktop-table-heading">
          <p className="section-eyebrow">规则库</p>
          <h2 className="subsection-title">规则目录</h2>
        </div>
        <p className="desktop-table-summary">共 {items.length} 条规则 · 当前显示 {filteredItems.length} 条</p>
      </div>

      <div className="desktop-table-toolbar">
        <TableSearchInput label="搜索规则" onChange={setQuery} value={query} />
        <div className="desktop-table-toolbar-actions">
          <p className="muted">支持按规则名称、分类、说明和严重级别筛选。</p>
          <button
            className="button"
            onClick={() => {
              setIsCreateOpen(true);
              setEditingId(null);
            }}
            type="button"
          >
            新增规则
          </button>
        </div>
      </div>

      <div className="table-shell">
        <table aria-label="规则表格" className="data-table">
          <thead>
            <tr>
              <th scope="col">启用</th>
              <th scope="col">规则名称</th>
              <th scope="col">分类</th>
              <th scope="col">默认严重级别</th>
              <th scope="col">最近更新时间</th>
              <th scope="col">说明</th>
              <th scope="col">操作</th>
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
                  <td>{item.enabled ? "启用中" : "已停用"}</td>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>{item.category}</td>
                  <td>{severityLabel(item.severity)}</td>
                  <td>{item.updatedAtLabel}</td>
                  <td>{item.description}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        aria-label={`编辑 ${item.name}`}
                        className="button-ghost button-inline"
                        onClick={() => {
                          setIsCreateOpen(false);
                          setEditingId(item.id);
                        }}
                        type="button"
                      >
                        编辑
                      </button>

                      <form action={toggleRuleEnabledAction}>
                        <input name="id" type="hidden" value={item.id} />
                        <input name="enabled" type="hidden" value={String(!item.enabled)} />
                        <button className="button-secondary button-inline" type="submit">
                          {item.enabled ? "停用" : "启用"}
                        </button>
                      </form>
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
        onClose={() => {
          setEditingId(null);
          setIsCreateOpen(false);
        }}
        open={isCreateOpen || !!editingRule}
        rule={isCreateOpen ? null : editingRule}
      />
    </section>
  );
}
