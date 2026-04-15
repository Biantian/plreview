"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { ModelEditorDrawer } from "@/components/model-editor-drawer";
import { TableSearchInput } from "@/components/table-search-input";
import {
  deleteLlmProfileAction,
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

function matchesQuery(profile: ModelProfileRecord, query: string) {
  if (!query) {
    return true;
  }

  return [
    profile.name,
    profile.provider,
    profile.mode === "demo" ? "演示模式" : "实时模式",
    profile.defaultModel,
    profile.baseUrl,
    profile.hasApiKey ? "已配置 Key" : "未配置 Key",
  ]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

export function ModelManager({
  metrics,
  profiles,
}: {
  metrics: {
    totalCount: number;
    enabledCount: number;
    liveCount: number;
    latestUpdatedAtLabel: string;
  };
  profiles: ModelProfileRecord[];
}) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const keyword = deferredQuery.trim().toLowerCase();
  const filteredProfiles = useMemo(
    () => profiles.filter((profile) => matchesQuery(profile, keyword)),
    [keyword, profiles],
  );
  const editingProfile =
    filteredProfiles.find((profile) => profile.id === editingId) ??
    profiles.find((profile) => profile.id === editingId) ??
    null;

  return (
    <section className="stack-lg">
      <div className="metric-grid">
        <div className="metric-card">
          <p className="metric-label">模型总数</p>
          <strong className="metric-value">{metrics.totalCount}</strong>
        </div>
        <div className="metric-card">
          <p className="metric-label">启用中</p>
          <strong className="metric-value">{metrics.enabledCount}</strong>
        </div>
        <div className="metric-card">
          <p className="metric-label">实时模式</p>
          <strong className="metric-value">{metrics.liveCount}</strong>
        </div>
        <div className="metric-card">
          <p className="metric-label">最近更新</p>
          <strong className="metric-value">{metrics.latestUpdatedAtLabel}</strong>
        </div>
      </div>

      <div className="table-toolbar">
        <TableSearchInput label="搜索模型" onChange={setQuery} value={query} />
        <div className="actions">
          <p className="muted">支持按配置名称、供应商、模式和默认模型筛选。</p>
          <button
            className="button"
            onClick={() => {
              setIsCreateOpen(true);
              setEditingId(null);
            }}
            type="button"
          >
            新增模型
          </button>
        </div>
      </div>

      {filteredProfiles.length === 0 ? (
        <div className="card stack">
          <p className="muted">
            {profiles.length === 0 ? "还没有模型配置，先新增第一个模型。" : "没有匹配的模型配置，换一个关键词试试。"}
          </p>
        </div>
      ) : (
        <div className="table-shell">
          <table aria-label="模型表格" className="data-table">
            <thead>
              <tr>
                <th scope="col">名称</th>
                <th scope="col">供应商</th>
                <th scope="col">模式</th>
                <th scope="col">默认模型</th>
                <th scope="col">Key 状态</th>
                <th scope="col">启用状态</th>
                <th scope="col">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((profile) => (
                <tr key={profile.id}>
                  <td>
                    <strong>{profile.name}</strong>
                  </td>
                  <td>{profile.provider}</td>
                  <td>{profile.mode === "demo" ? "演示模式" : "实时模式"}</td>
                  <td>{profile.defaultModel}</td>
                  <td>
                    {profile.hasApiKey ? `已配置 Key · 尾号 ${profile.apiKeyLast4}` : "未配置 Key"}
                  </td>
                  <td>{profile.enabled ? "启用中" : "已停用"}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        aria-label={`编辑 ${profile.name}`}
                        className="button-ghost button-inline"
                        onClick={() => {
                          setIsCreateOpen(false);
                          setEditingId(profile.id);
                        }}
                        type="button"
                      >
                        编辑
                      </button>

                      <form action={toggleLlmProfileEnabledAction}>
                        <input name="id" type="hidden" value={profile.id} />
                        <input name="enabled" type="hidden" value={String(!profile.enabled)} />
                        <button className="button-secondary button-inline" type="submit">
                          {profile.enabled ? "停用" : "启用"}
                        </button>
                      </form>

                      <form action={deleteLlmProfileAction}>
                        <input name="confirmed" type="hidden" value="true" />
                        <input name="id" type="hidden" value={profile.id} />
                        <button className="button-ghost button-inline" type="submit">
                          删除
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ModelEditorDrawer
        onClose={() => {
          setEditingId(null);
          setIsCreateOpen(false);
        }}
        open={isCreateOpen || !!editingProfile}
        profile={isCreateOpen ? null : editingProfile}
      />
    </section>
  );
}
