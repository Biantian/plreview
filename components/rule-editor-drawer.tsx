"use client";

import { Severity } from "@prisma/client";

import { AdaptiveFormOverlay } from "@/components/adaptive-form-overlay";
import type { RuleSaveInput } from "@/desktop/bridge/desktop-api";
import { RULE_TEMPLATE } from "@/lib/defaults";
import { severityLabel } from "@/lib/utils";

type RuleEditorRecord = {
  id: string;
  name: string;
  category: string;
  description: string;
  promptTemplate: string;
  severity: Severity;
  enabled: boolean;
};

const severityOptions = [
  Severity.low,
  Severity.medium,
  Severity.high,
  Severity.critical,
];

export function RuleEditorDrawer({
  open,
  rule,
  busy,
  errorMessage,
  onClose,
  onSave,
}: {
  open: boolean;
  rule: RuleEditorRecord | null;
  busy: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSave: (payload: RuleSaveInput) => Promise<void>;
}) {
  if (!open) {
    return null;
  }

  const isCreateMode = !rule;
  const title = isCreateMode ? "新增规则" : "规则编辑";

  return (
    <AdaptiveFormOverlay
      footer={
        <div className="actions">
          {errorMessage ? <p className="section-copy">{errorMessage}</p> : null}
          <button className="button" disabled={busy} form="rule-editor-form" type="submit">
            {busy ? "保存中..." : isCreateMode ? "保存规则" : "保存修改"}
          </button>
          <button className="button-ghost" disabled={busy} onClick={onClose} type="button">
            取消
          </button>
        </div>
      }
      onClose={onClose}
      open={open}
      title={title}
    >
      <form
        className="form-grid"
        id="rule-editor-form"
        onSubmit={(event) => {
          event.preventDefault();

          const formData = new FormData(event.currentTarget);

          void onSave({
            id: rule?.id,
            name: String(formData.get("name") ?? ""),
            category: String(formData.get("category") ?? ""),
            description: String(formData.get("description") ?? ""),
            promptTemplate: String(formData.get("promptTemplate") ?? ""),
            severity: String(formData.get("severity") ?? Severity.medium) as Severity,
            enabled: formData.has("enabled"),
          });
        }}
      >
        {rule ? <input name="id" type="hidden" value={rule.id} /> : null}

        <div className="form-section compact">
          <div className="form-grid two">
            <div className="field">
              <label htmlFor="rule-name">规则名称</label>
              <input defaultValue={rule?.name ?? ""} id="rule-name" name="name" required />
            </div>

            <div className="field">
              <label htmlFor="rule-category">分类</label>
              <input
                defaultValue={rule?.category ?? ""}
                id="rule-category"
                name="category"
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="rule-description">规则说明</label>
            <textarea
              defaultValue={rule?.description ?? ""}
              id="rule-description"
              name="description"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="rule-template">评审模板</label>
            <textarea
              defaultValue={rule?.promptTemplate ?? RULE_TEMPLATE}
              id="rule-template"
              name="promptTemplate"
              required
            />
          </div>

          <div className="form-grid two">
            <div className="field">
              <label htmlFor="rule-severity">默认严重级别</label>
              <select
                defaultValue={rule?.severity ?? Severity.medium}
                id="rule-severity"
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
                <input defaultChecked={rule?.enabled ?? true} name="enabled" type="checkbox" />
                保存后立即启用
              </label>
            </div>
          </div>
        </div>
      </form>
    </AdaptiveFormOverlay>
  );
}
