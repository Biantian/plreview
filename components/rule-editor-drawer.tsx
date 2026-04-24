"use client";

import type { ChangeEvent } from "react";
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

export type RuleCreateDraft = {
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
  createDraft,
  busy,
  errorMessage,
  onChangeCreateDraft,
  onClearCreateDraft,
  onClose,
  onSave,
}: {
  open: boolean;
  rule: RuleEditorRecord | null;
  createDraft: RuleCreateDraft;
  busy: boolean;
  errorMessage: string | null;
  onChangeCreateDraft: (draft: RuleCreateDraft) => void;
  onClearCreateDraft: () => void;
  onClose: () => void;
  onSave: (payload: RuleSaveInput) => Promise<void>;
}) {
  if (!open) {
    return null;
  }

  const isCreateMode = !rule;
  const title = isCreateMode ? "新增规则" : "规则编辑";

  const updateCreateDraft = <Field extends keyof RuleCreateDraft>(
    field: Field,
    value: RuleCreateDraft[Field],
  ) => {
    onChangeCreateDraft({ ...createDraft, [field]: value });
  };

  const textFieldProps = (
    field: "name" | "category" | "description" | "promptTemplate",
    fallback: string,
  ) =>
    isCreateMode
      ? {
          value: createDraft[field],
          onChange: (
            event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
          ) => updateCreateDraft(field, event.target.value),
        }
      : {
          defaultValue: fallback,
        };

  return (
    <AdaptiveFormOverlay
      footer={
        <div className="actions">
          {errorMessage ? <p className="section-copy">{errorMessage}</p> : null}
          {isCreateMode ? (
            <button
              className="button-ghost"
              disabled={busy}
              onClick={onClearCreateDraft}
              type="button"
            >
              清空
            </button>
          ) : null}
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
              <input
                id="rule-name"
                name="name"
                required
                {...textFieldProps("name", rule?.name ?? "")}
              />
            </div>

            <div className="field">
              <label htmlFor="rule-category">分类</label>
              <input
                id="rule-category"
                name="category"
                required
                {...textFieldProps("category", rule?.category ?? "")}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="rule-description">规则说明</label>
            <textarea
              id="rule-description"
              name="description"
              required
              {...textFieldProps("description", rule?.description ?? "")}
            />
          </div>

          <div className="field">
            <label htmlFor="rule-template">评审模板</label>
            <textarea
              id="rule-template"
              name="promptTemplate"
              required
              {...textFieldProps("promptTemplate", rule?.promptTemplate ?? RULE_TEMPLATE)}
            />
          </div>

          <div className="form-grid two">
            <div className="field">
              <label htmlFor="rule-severity">默认严重级别</label>
              <select
                id="rule-severity"
                name="severity"
                {...(isCreateMode
                  ? {
                      value: createDraft.severity,
                      onChange: (event) =>
                        updateCreateDraft("severity", event.target.value as Severity),
                    }
                  : {
                      defaultValue: rule?.severity ?? Severity.medium,
                    })}
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
                <input
                  name="enabled"
                  type="checkbox"
                  {...(isCreateMode
                    ? {
                        checked: createDraft.enabled,
                        onChange: (event) => updateCreateDraft("enabled", event.target.checked),
                      }
                    : {
                        defaultChecked: rule?.enabled ?? true,
                      })}
                />
                保存后立即启用
              </label>
            </div>
          </div>
        </div>
      </form>
    </AdaptiveFormOverlay>
  );
}
