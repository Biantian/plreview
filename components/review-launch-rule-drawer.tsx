"use client";

import { useDeferredValue, useEffect, useState } from "react";

import { AdaptiveFormOverlay } from "@/components/adaptive-form-overlay";
import { TableSearchInput } from "@/components/table-search-input";
import type { ReviewLaunchRuleItem } from "@/desktop/bridge/desktop-api";
import { normalizeRuleSearchText, rankRuleSearchResults } from "@/lib/rule-search";
import { severityLabel } from "@/lib/utils";

type ReviewLaunchRuleDrawerProps = {
  open: boolean;
  rules: ReviewLaunchRuleItem[];
  initialRuleIds: string[];
  selectedRuleIds: string[];
  onClose: () => void;
  onConfirm: (ruleIds: string[]) => void;
};

export function ReviewLaunchRuleDrawer({
  open,
  rules,
  initialRuleIds,
  selectedRuleIds,
  onClose,
  onConfirm,
}: ReviewLaunchRuleDrawerProps) {
  const [draftRuleIds, setDraftRuleIds] = useState<string[]>(selectedRuleIds);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = normalizeRuleSearchText(deferredQuery);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraftRuleIds(selectedRuleIds);
    setQuery("");
  }, [open, selectedRuleIds]);

  if (!open) {
    return null;
  }

  const visibleRules = rankRuleSearchResults(rules, normalizedQuery);

  return (
    <AdaptiveFormOverlay
      footer={
        <div className="actions">
          <span className="muted">已选 {draftRuleIds.length} 条规则</span>
          <button className="button-ghost" onClick={onClose} type="button">
            取消
          </button>
          <button className="button" onClick={() => onConfirm(draftRuleIds)} type="button">
            确认
          </button>
        </div>
      }
      onClose={onClose}
      open={open}
      title="选择规则"
    >
      <div className="stack">
        <div className="inline-actions">
          <TableSearchInput
            label="搜索规则"
            onChange={setQuery}
            placeholder="搜索规则名称、分类、说明和严重级别"
            value={query}
          />
          <div className="actions">
            <button className="button-ghost" onClick={() => setDraftRuleIds([])} type="button">
              一键清空
            </button>
            <button
              className="button-ghost"
              onClick={() => setDraftRuleIds(initialRuleIds)}
              type="button"
            >
              恢复上次
            </button>
          </div>
        </div>

        <div className="launch-rule-drawer-list">
          {draftRuleIds.length === 0 ? (
            <p className="muted">当前未选择规则</p>
          ) : null}
          {visibleRules.length === 0 ? (
            <p className="muted">没有匹配的规则，换个关键词试试</p>
          ) : (
            visibleRules.map((rule) => {
              const checked = draftRuleIds.includes(rule.id);

              return (
                <label className="launch-rule-option" key={rule.id}>
                  <input
                    checked={checked}
                    onChange={(event) => {
                      setDraftRuleIds((current) =>
                        event.target.checked
                          ? current.includes(rule.id)
                            ? current
                            : [...current, rule.id]
                          : current.filter((ruleId) => ruleId !== rule.id),
                      );
                    }}
                    type="checkbox"
                  />
                  <div>
                    <strong>{rule.name}</strong>
                    <p className="muted">{rule.description}</p>
                    <p className="muted">
                      {rule.category} · {severityLabel(rule.severity)}
                    </p>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>
    </AdaptiveFormOverlay>
  );
}
