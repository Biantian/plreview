"use client";

import type { ChangeEvent } from "react";

import type { ModelSaveInput } from "@/desktop/bridge/desktop-api";
import { AdaptiveFormOverlay } from "@/components/adaptive-form-overlay";

type ModelEditorProfile = {
  id: string;
  name: string;
  provider: string;
  vendorKey: string;
  mode: "live" | "demo";
  baseUrl: string;
  defaultModel: string;
  modelOptionsText: string;
  enabled: boolean;
};

export type ModelCreateDraft = {
  name: string;
  provider: string;
  vendorKey: string;
  mode: "live" | "demo";
  baseUrl: string;
  defaultModel: string;
  modelOptionsText: string;
  apiKey: string;
  enabled: boolean;
};

export function ModelEditorDrawer({
  open,
  profile,
  createDraft,
  busy,
  errorMessage,
  onChangeCreateDraft,
  onClearCreateDraft,
  onClose,
  onSave,
}: {
  open: boolean;
  profile: ModelEditorProfile | null;
  createDraft: ModelCreateDraft;
  busy: boolean;
  errorMessage: string | null;
  onChangeCreateDraft: (draft: ModelCreateDraft) => void;
  onClearCreateDraft: () => void;
  onClose: () => void;
  onSave: (payload: ModelSaveInput) => Promise<void>;
}) {
  const isCreateMode = !profile;

  if (!open) {
    return null;
  }

  const title = isCreateMode ? "新增模型配置" : "模型编辑";

  const updateCreateDraft = <Field extends keyof ModelCreateDraft>(
    field: Field,
    value: ModelCreateDraft[Field],
  ) => {
    onChangeCreateDraft({ ...createDraft, [field]: value });
  };

  const handleCloseRequest = () => {
    if (busy) {
      return;
    }

    onClose();
  };

  const textFieldProps = (
    field: "name" | "provider" | "baseUrl" | "defaultModel" | "modelOptionsText" | "apiKey",
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
            <button className="button-ghost" disabled={busy} onClick={onClearCreateDraft} type="button">
              清空
            </button>
          ) : null}
          <button className="button" form="model-editor-form" disabled={busy} type="submit">
            {busy ? "保存中..." : isCreateMode ? "保存配置" : "保存修改"}
          </button>
          <button className="button-ghost" disabled={busy} onClick={handleCloseRequest} type="button">
            取消
          </button>
        </div>
      }
      onClose={handleCloseRequest}
      open={open}
      title={title}
    >
      <form
        className="form-grid"
        id="model-editor-form"
        onSubmit={(event) => {
          event.preventDefault();

          const formData = new FormData(event.currentTarget);

          void onSave({
            id: profile?.id,
            name: String(formData.get("name") ?? ""),
            provider: String(formData.get("provider") ?? ""),
            vendorKey: String(formData.get("vendorKey") ?? "openai_compatible"),
            mode: String(formData.get("mode") ?? "live") as "live" | "demo",
            baseUrl: String(formData.get("baseUrl") ?? ""),
            defaultModel: String(formData.get("defaultModel") ?? ""),
            modelOptionsText: String(formData.get("modelOptionsText") ?? ""),
            apiKey: String(formData.get("apiKey") ?? ""),
            enabled: formData.has("enabled"),
          });
        }}
      >
        {profile ? <input name="id" type="hidden" value={profile.id} /> : null}
        <input
          name="vendorKey"
          type="hidden"
          value={isCreateMode ? createDraft.vendorKey : profile?.vendorKey ?? "openai_compatible"}
        />

        <div className="form-section compact">
          <div className="form-grid two">
            <div className="field">
              <label htmlFor="model-name">配置名称</label>
              <input
                id="model-name"
                name="name"
                required
                {...textFieldProps("name", profile?.name ?? "")}
              />
            </div>
            <div className="field">
              <label htmlFor="provider">供应商显示名</label>
              <input
                id="provider"
                name="provider"
                required
                {...textFieldProps("provider", profile?.provider ?? "")}
              />
            </div>
          </div>

          <div className="form-grid two">
            <div className="field">
              <label htmlFor="mode">运行模式</label>
              <select
                id="mode"
                name="mode"
                {...(isCreateMode
                  ? {
                      value: createDraft.mode,
                      onChange: (event: ChangeEvent<HTMLSelectElement>) =>
                        updateCreateDraft("mode", event.target.value as "live" | "demo"),
                    }
                  : {
                      defaultValue: profile?.mode ?? "live",
                    })}
              >
                <option value="live">实时模式</option>
                <option value="demo">演示模式</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="defaultModel">默认模型</label>
              <input
                id="defaultModel"
                name="defaultModel"
                placeholder="例如：qwen-plus"
                required
                {...textFieldProps("defaultModel", profile?.defaultModel ?? "")}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="baseUrl">Base URL</label>
            <input
              id="baseUrl"
              name="baseUrl"
              required
              {...textFieldProps("baseUrl", profile?.baseUrl ?? "")}
            />
          </div>

          <div className="field">
            <label htmlFor="modelOptionsText">常用模型</label>
            <textarea
              id="modelOptionsText"
              name="modelOptionsText"
              placeholder={"qwen-plus\nqwen-turbo"}
              {...textFieldProps("modelOptionsText", profile?.modelOptionsText ?? "")}
            />
          </div>

          <div className="field">
            <label htmlFor="apiKey">API Key</label>
            <input
              id="apiKey"
              name="apiKey"
              type="password"
              {...textFieldProps("apiKey", "")}
            />
          </div>

          <label>
            <input
              name="enabled"
              type="checkbox"
              {...(isCreateMode
                ? {
                    checked: createDraft.enabled,
                    onChange: (event: ChangeEvent<HTMLInputElement>) =>
                      updateCreateDraft("enabled", event.target.checked),
                  }
                : {
                    defaultChecked: profile?.enabled ?? true,
                  })}
            />{" "}
            保存后立即启用
          </label>
        </div>
      </form>
    </AdaptiveFormOverlay>
  );
}
