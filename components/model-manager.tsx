"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import type {
  ModelDashboardData,
  ModelDashboardProfile,
  ModelSaveInput,
} from "@/desktop/bridge/desktop-api";
import { ModelEditorDrawer, type ModelCreateDraft } from "@/components/model-editor-drawer";
import { TableSearchInput } from "@/components/table-search-input";

type ModelProfileRecord = ModelDashboardProfile;

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

function createDefaultModelDraft(): ModelCreateDraft {
  return {
    name: "",
    provider: "",
    vendorKey: "openai_compatible",
    mode: "live",
    baseUrl: "",
    defaultModel: "",
    modelOptionsText: "",
    apiKey: "",
    enabled: true,
  };
}

export function ModelManager({
  profiles,
}: {
  profiles: ModelProfileRecord[];
}) {
  const [records, setRecords] = useState(profiles);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<ModelCreateDraft>(() => createDefaultModelDraft());
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const keyword = deferredQuery.trim().toLowerCase();
  const filteredProfiles = useMemo(
    () => records.filter((profile) => matchesQuery(profile, keyword)),
    [keyword, records],
  );
  const editingProfile =
    filteredProfiles.find((profile) => profile.id === editingId) ??
    records.find((profile) => profile.id === editingId) ??
    null;
  const isEditorOpen = isCreateOpen || !!editingProfile;

  useEffect(() => {
    setRecords(profiles);
  }, [profiles]);

  async function updateProfiles(
    action: () => Promise<ModelDashboardData>,
    successMessage: string,
  ): Promise<boolean> {
    if (!window.plreview?.getModelDashboard) {
      setFeedback("桌面桥接不可用，请从 Electron 桌面壳启动。");
      return false;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const nextDashboard = await action();
      setRecords(nextDashboard.profiles);
      setFeedback(successMessage);
      setEditingId(null);
      setIsCreateOpen(false);
      return true;
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "模型配置操作失败。");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="desktop-table-card management-table-shell">
      <div className="desktop-table-header">
        <div className="desktop-table-heading">
          <p className="section-eyebrow">模型配置矩阵</p>
          <h2 className="subsection-title">模型目录</h2>
        </div>
        <p className="desktop-table-summary">共 {records.length} 条配置 · 当前显示 {filteredProfiles.length} 条</p>
      </div>

      <div className="desktop-table-toolbar">
        <TableSearchInput label="搜索模型" onChange={setQuery} value={query} />
        <div className="desktop-table-toolbar-actions">
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

      {feedback && !isEditorOpen ? <p className="section-copy">{feedback}</p> : null}

      {filteredProfiles.length === 0 ? (
        <div className="card stack management-table-empty">
          <p className="muted">
            {records.length === 0 ? "还没有模型配置，先新增第一个模型。" : "没有匹配的模型配置，换一个关键词试试。"}
          </p>
        </div>
      ) : (
        <div className="table-shell management-table-scroll-region">
          <table aria-label="模型表格" className="data-table">
            <thead>
              <tr>
                <th scope="col">名称</th>
                <th scope="col" className="table-nowrap">供应商</th>
                <th scope="col" className="table-nowrap">模式</th>
                <th scope="col">默认模型</th>
                <th scope="col" className="table-nowrap">Key 状态</th>
                <th scope="col" className="table-nowrap">启用状态</th>
                <th scope="col" className="table-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((profile) => (
                <tr key={profile.id}>
                  <td>
                    <span className="table-cell-primary">{profile.name}</span>
                  </td>
                  <td className="table-nowrap">{profile.provider}</td>
                  <td className="table-nowrap">{profile.mode === "demo" ? "演示模式" : "实时模式"}</td>
                  <td>{profile.defaultModel}</td>
                  <td className="table-nowrap">
                    {profile.hasApiKey ? `已配置 Key · 尾号 ${profile.apiKeyLast4}` : "未配置 Key"}
                  </td>
                  <td className="table-nowrap">{profile.enabled ? "启用中" : "已停用"}</td>
                  <td className="table-nowrap">
                    <div className="table-actions">
                      <button
                        aria-label={`编辑 ${profile.name}`}
                        className="table-text-button"
                        onClick={() => {
                          setIsCreateOpen(false);
                          setEditingId(profile.id);
                        }}
                        type="button"
                      >
                        编辑
                      </button>

                      <button
                        className="table-text-button"
                        disabled={isSaving}
                        onClick={() =>
                          void updateProfiles(
                            () =>
                              window.plreview.toggleModelProfileEnabled(
                                profile.id,
                                !profile.enabled,
                              ),
                            profile.enabled ? "模型配置已停用。" : "模型配置已启用。",
                          )
                        }
                        type="button"
                      >
                        {profile.enabled ? "停用" : "启用"}
                      </button>

                      <button
                        className="table-text-button is-danger"
                        disabled={isSaving}
                        onClick={() =>
                          void updateProfiles(
                            () => window.plreview.deleteModelProfile(profile.id),
                            "模型配置已删除。",
                          )
                        }
                        type="button"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ModelEditorDrawer
        busy={isSaving}
        createDraft={createDraft}
        errorMessage={feedback}
        onChangeCreateDraft={setCreateDraft}
        onClearCreateDraft={() => setCreateDraft(createDefaultModelDraft())}
        onClose={() => {
          setEditingId(null);
          setIsCreateOpen(false);
        }}
        onSave={async (payload: ModelSaveInput) => {
          const saved = await updateProfiles(
            () => window.plreview.saveModelProfile(payload),
            payload.id ? "模型配置已更新。" : "模型配置已创建。",
          );

          if (saved && !payload.id) {
            setCreateDraft(createDefaultModelDraft());
          }
        }}
        open={isEditorOpen}
        profile={isCreateOpen ? null : editingProfile}
      />
    </section>
  );
}
