"use client";

import {
  deleteLlmProfileAction,
  saveLlmProfileAction,
  toggleLlmProfileEnabledAction,
} from "@/lib/actions";

type ModelProfileRecord = {
  id: string;
  name: string;
  provider: string;
  vendorKey: string;
  mode: "live" | "demo";
  baseUrl: string;
  defaultModel: string;
  modelOptionsText: string;
  enabled: boolean;
  hasApiKey: boolean;
  apiKeyLast4: string | null;
};

export function ModelManager({
  profiles,
}: {
  profiles: ModelProfileRecord[];
}) {
  return (
    <section className="stack-lg">
      <form action={saveLlmProfileAction} className="card form-grid">
        <div className="form-grid two">
          <div className="field">
            <label htmlFor="name">配置名称</label>
            <input id="name" name="name" placeholder="例如：百炼生产" required />
          </div>
          <div className="field">
            <label htmlFor="provider">供应商显示名</label>
            <input id="provider" name="provider" placeholder="例如：DashScope" required />
          </div>
        </div>

        <input name="vendorKey" type="hidden" value="openai_compatible" />

        <div className="form-grid two">
          <div className="field">
            <label htmlFor="mode">运行模式</label>
            <select defaultValue="live" id="mode" name="mode">
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
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="baseUrl">Base URL</label>
          <input id="baseUrl" name="baseUrl" required />
        </div>

        <div className="field">
          <label htmlFor="modelOptionsText">常用模型</label>
          <textarea
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
          <input defaultChecked name="enabled" type="checkbox" /> 保存后立即启用
        </label>

        <button className="button" type="submit">
          保存配置
        </button>
      </form>

      {profiles.map((profile) => (
        <div className="rule-row" key={profile.id}>
          <div className="rule-row-main">
            <div className="rule-row-copy">
              <div className="inline-actions">
                <strong className="rule-row-title">{profile.name}</strong>
                <span className="pill pill-brand">{profile.provider}</span>
                <span className="pill">{profile.mode === "demo" ? "演示模式" : "实时模式"}</span>
              </div>
              <p className="muted">
                {profile.baseUrl} · 默认模型 {profile.defaultModel}
              </p>
            </div>
            <div className="rule-row-meta">
              <span className="pill">
                {profile.hasApiKey ? `已配置 Key · 尾号 ${profile.apiKeyLast4}` : "未配置 Key"}
              </span>
            </div>
          </div>

          <div className="rule-row-actions">
            <form action={toggleLlmProfileEnabledAction}>
              <input name="id" type="hidden" value={profile.id} />
              <input name="enabled" type="hidden" value={String(!profile.enabled)} />
              <button className="button-secondary" type="submit">
                {profile.enabled ? "停用" : "启用"}
              </button>
            </form>

            <form action={saveLlmProfileAction}>
              <input name="id" type="hidden" value={profile.id} />
              <input name="name" type="hidden" value={profile.name} />
              <input name="provider" type="hidden" value={profile.provider} />
              <input name="vendorKey" type="hidden" value={profile.vendorKey} />
              <input name="mode" type="hidden" value={profile.mode} />
              <input name="baseUrl" type="hidden" value={profile.baseUrl} />
              <input name="defaultModel" type="hidden" value={profile.defaultModel} />
              <input name="modelOptionsText" type="hidden" value={profile.modelOptionsText} />
              <button className="button-ghost" type="submit">
                保存当前编辑值
              </button>
            </form>

            <form action={deleteLlmProfileAction}>
              <input name="id" type="hidden" value={profile.id} />
              <button className="button-ghost" type="submit">
                删除
              </button>
            </form>
          </div>
        </div>
      ))}
    </section>
  );
}
