"use client";

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

export function ModelEditorDrawer({
  open,
  profile,
  busy,
  errorMessage,
  onClose,
  onSave,
}: {
  open: boolean;
  profile: ModelEditorProfile | null;
  busy: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSave: (payload: ModelSaveInput) => Promise<void>;
}) {
  const isCreateMode = !profile;

  if (!open) {
    return null;
  }

  const title = isCreateMode ? "新增模型配置" : "模型编辑";

  return (
    <AdaptiveFormOverlay
      footer={
        <div className="actions">
          {errorMessage ? <p className="section-copy">{errorMessage}</p> : null}
          <button className="button" form="model-editor-form" disabled={busy} type="submit">
            {busy ? "保存中..." : isCreateMode ? "保存配置" : "保存修改"}
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
          value={profile?.vendorKey ?? "openai_compatible"}
        />

        <div className="form-section compact">
          <div className="form-grid two">
            <div className="field">
              <label htmlFor="model-name">配置名称</label>
              <input defaultValue={profile?.name ?? ""} id="model-name" name="name" required />
            </div>
            <div className="field">
              <label htmlFor="provider">供应商显示名</label>
              <input
                defaultValue={profile?.provider ?? ""}
                id="provider"
                name="provider"
                required
              />
            </div>
          </div>

          <div className="form-grid two">
            <div className="field">
              <label htmlFor="mode">运行模式</label>
              <select defaultValue={profile?.mode ?? "live"} id="mode" name="mode">
                <option value="live">实时模式</option>
                <option value="demo">演示模式</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="defaultModel">默认模型</label>
              <input
                defaultValue={profile?.defaultModel ?? ""}
                id="defaultModel"
                name="defaultModel"
                placeholder="例如：qwen-plus"
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="baseUrl">Base URL</label>
            <input defaultValue={profile?.baseUrl ?? ""} id="baseUrl" name="baseUrl" required />
          </div>

          <div className="field">
            <label htmlFor="modelOptionsText">常用模型</label>
            <textarea
              defaultValue={profile?.modelOptionsText ?? ""}
              id="modelOptionsText"
              name="modelOptionsText"
              placeholder={"qwen-plus\nqwen-turbo"}
            />
          </div>

          <div className="field">
            <label htmlFor="apiKey">API Key</label>
            <input id="apiKey" name="apiKey" type="password" />
          </div>

          <label>
            <input defaultChecked={profile?.enabled ?? true} name="enabled" type="checkbox" />{" "}
            保存后立即启用
          </label>
        </div>
      </form>
    </AdaptiveFormOverlay>
  );
}
