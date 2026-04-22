"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type LlmProfile = {
  id: string;
  name: string;
  provider: string;
  defaultModel: string;
};

type Rule = {
  id: string;
  name: string;
  category: string;
  description: string;
};

type ImportedFile = {
  id: string;
  name: string;
  fileType?: string | null;
  status?: string;
  note?: string;
  documentId?: string | null;
  summary?: {
    title?: string;
    blockCount?: number;
    paragraphCount?: number;
    sourceLabel?: string;
  };
};

type IntakeWorkbenchProps = {
  llmProfiles: LlmProfile[];
  rules: Rule[];
  importedFiles?: ImportedFile[];
};

const EMPTY_IMPORTED_FILES: ImportedFile[] = [];

function normalizeImportedFile(file: ImportedFile): ImportedFile {
  return {
    ...file,
    documentId: file.documentId === undefined ? file.id : file.documentId,
  };
}

function formatCount(value: number | undefined, unit: string) {
  if (value === undefined) {
    return "待生成";
  }

  return `${value} 个${unit}`;
}

function mergeImportedFiles(existing: ImportedFile[], incoming: ImportedFile[]) {
  const filesById = new Map<string, ImportedFile>();

  for (const file of existing) {
    filesById.set(file.id, normalizeImportedFile(file));
  }

  for (const file of incoming) {
    filesById.set(file.id, normalizeImportedFile(file));
  }

  return Array.from(filesById.values());
}

function removeImportedFile(files: ImportedFile[], targetId: string) {
  return files.filter((file) => file.id !== targetId);
}

function isReadyDocument(file: ImportedFile) {
  return Boolean(file.documentId?.trim());
}

export function IntakeWorkbench({
  llmProfiles,
  rules,
  importedFiles,
}: IntakeWorkbenchProps) {
  const router = useRouter();
  const incomingImportedFiles = importedFiles ?? EMPTY_IMPORTED_FILES;
  const defaultProfile = llmProfiles[0];
  const [selectedProfileId, setSelectedProfileId] = useState(defaultProfile?.id ?? "");
  const selectedProfile =
    llmProfiles.find((profile) => profile.id === selectedProfileId) ?? defaultProfile;
  const [modelName, setModelName] = useState(defaultProfile?.defaultModel ?? "");
  const [batchName, setBatchName] = useState("");
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>(() =>
    rules.map((rule) => rule.id),
  );
  const [workbenchFiles, setWorkbenchFiles] = useState<ImportedFile[]>(() =>
    mergeImportedFiles([], incomingImportedFiles),
  );
  const [isPickingFiles, setIsPickingFiles] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);
  const hasInitializedRuleSelection = useRef(false);
  const readyDocuments = workbenchFiles.filter(
    (file): file is ImportedFile & { documentId: string } => isReadyDocument(file),
  );
  const selectedSummaryFile =
    workbenchFiles.find((file) => file.id === selectedSummaryId) ?? null;
  const hasDesktopPicker = typeof window !== "undefined" && Boolean(window.plreview?.pickFiles);
  const isLaunchReady =
    !isPickingFiles &&
    !isSubmitting &&
    batchName.trim().length > 0 &&
    selectedProfileId.length > 0 &&
    readyDocuments.length > 0 &&
    selectedRuleIds.length > 0;
  const launchChecklist = [
    {
      id: "batch",
      isReady: batchName.trim().length > 0,
      label: "批次名称",
      value: batchName.trim() || "待命名",
    },
    {
      id: "profile",
      isReady: selectedProfileId.length > 0,
      label: "模型配置",
      value: selectedProfile?.name ?? "未配置",
    },
    {
      id: "rules",
      isReady: selectedRuleIds.length > 0,
      label: "评审规则",
      value: selectedRuleIds.length > 0 ? `${selectedRuleIds.length} 条已选` : "待选择",
    },
    {
      id: "documents",
      isReady: readyDocuments.length > 0,
      label: "待评审文件",
      value: readyDocuments.length > 0 ? `${readyDocuments.length} 条待评审` : "待导入",
    },
  ];

  useEffect(() => {
    if (llmProfiles.length === 0) {
      setSelectedProfileId("");
      return;
    }

    setSelectedProfileId((current) => {
      if (current && llmProfiles.some((profile) => profile.id === current)) {
        return current;
      }

      return llmProfiles[0]?.id ?? "";
    });
  }, [llmProfiles]);

  useEffect(() => {
    const nextRuleIds = rules.map((rule) => rule.id);

    if (nextRuleIds.length === 0) {
      hasInitializedRuleSelection.current = false;
      setSelectedRuleIds([]);
      return;
    }

    setSelectedRuleIds((current) => {
      const filtered = current.filter((ruleId) => nextRuleIds.includes(ruleId));

      if (!hasInitializedRuleSelection.current) {
        hasInitializedRuleSelection.current = true;
        return filtered.length > 0 ? filtered : nextRuleIds;
      }

      return filtered;
    });
  }, [rules]);

  useEffect(() => {
    setWorkbenchFiles((current) => mergeImportedFiles(current, incomingImportedFiles));
  }, [incomingImportedFiles]);

  useEffect(() => {
    if (!selectedSummaryId) {
      return;
    }

    if (workbenchFiles.some((file) => file.id === selectedSummaryId)) {
      return;
    }

    setSelectedSummaryId(null);
  }, [selectedSummaryId, workbenchFiles]);

  useEffect(() => {
    if (selectedProfile) {
      setModelName(selectedProfile.defaultModel);
    }
  }, [selectedProfile]);

  const handlePickFiles = async () => {
    if (!window.plreview?.pickFiles) {
      return;
    }

    setErrorMessage("");
    setIsPickingFiles(true);

    try {
      const nextFiles = await window.plreview.pickFiles();
      setWorkbenchFiles((current) => mergeImportedFiles(current, nextFiles ?? []));
    } catch {
      setErrorMessage("本地文件导入失败，请重试。");
    } finally {
      setIsPickingFiles(false);
    }
  };

  const handleCreateReviewBatch = async () => {
    if (
      !window.plreview?.createReviewBatch ||
      !selectedProfileId ||
      readyDocuments.length === 0 ||
      selectedRuleIds.length === 0 ||
      batchName.trim().length === 0
    ) {
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await window.plreview.createReviewBatch({
        batchName,
        llmProfileId: selectedProfileId,
        modelName,
        ruleIds: selectedRuleIds,
        documents: readyDocuments.map((file) => ({ documentId: file.documentId })),
      });
      router.push("/reviews");
    } catch {
      setErrorMessage("批量评审创建失败，请重试。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveFile = (targetId: string) => {
    setWorkbenchFiles((current) => removeImportedFile(current, targetId));
    setErrorMessage("");
  };

  const handleClearWorkbench = () => {
    setWorkbenchFiles([]);
    setErrorMessage("");
  };

  return (
    <section aria-label="评审启动工作区" className="launch-workspace">
      <div className="launch-main-column">
        <section className="desktop-surface stack-lg" aria-labelledby="launch-config-heading">
          <div className="launch-section-header">
            <div>
              <p className="section-eyebrow">Launch Setup</p>
              <h2 className="subsection-title" id="launch-config-heading">
                批次配置
              </h2>
            </div>
            <div className="launch-pill-row">
              <span className="pill pill-brand">当前模型：{selectedProfile?.name ?? "未配置"}</span>
              <span className="pill">模型名称：{modelName || "待填写"}</span>
            </div>
          </div>

          <p className="section-copy">填写批次名称并选择模型。</p>

          <div className="form-grid two">
            <div className="field">
              <label htmlFor="llmProfileId">模型配置</label>
              <select
                id="llmProfileId"
                name="llmProfileId"
                onChange={(event) => {
                  const nextProfileId = event.target.value;
                  const nextProfile = llmProfiles.find(
                    (profile) => profile.id === nextProfileId,
                  );

                  setSelectedProfileId(nextProfileId);
                  setModelName(nextProfile?.defaultModel ?? "");
                }}
                required={llmProfiles.length > 0}
                value={selectedProfileId}
              >
                {llmProfiles.length === 0 ? (
                  <option value="">暂无可用模型配置</option>
                ) : (
                  llmProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} · {profile.provider}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="field">
              <label htmlFor="modelName">模型名称</label>
              <input
                id="modelName"
                name="modelName"
                onChange={(event) => setModelName(event.target.value)}
                placeholder="例如 qwen-plus"
                value={modelName}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="batchName">批次名称</label>
            <input
              id="batchName"
              name="batchName"
              onChange={(event) => setBatchName(event.target.value)}
              placeholder="例如 四月策划案"
              value={batchName}
            />
          </div>
        </section>

        <section className="desktop-surface stack-lg" aria-labelledby="launch-flow-heading">
          <div className="launch-section-header">
            <div>
              <p className="section-eyebrow">File Workbench</p>
              <h2 className="subsection-title" id="launch-flow-heading">
                文件工作台
              </h2>
            </div>
            <div className="launch-pill-row">
              <span className="pill">{selectedRuleIds.length} / {rules.length} 条规则已选</span>
              <span className="pill pill-brand">已导入 {workbenchFiles.length} 条</span>
              <span className="pill">待评审 {readyDocuments.length} 条</span>
            </div>
          </div>

          <div className="launch-zone-grid">
            <section className="launch-zone stack" aria-labelledby="launch-rules-heading">
              <div className="launch-section-header">
                <div>
                  <p className="section-eyebrow">Rules</p>
                  <h3 className="subsection-title" id="launch-rules-heading">
                    规则选择
                  </h3>
                </div>
                <span className="pill">
                  {selectedRuleIds.length} / {rules.length} 条已选
                </span>
              </div>

              <p className="section-copy">选择本次评审要使用的规则。</p>

              <div className="checkbox-list">
                {rules.length === 0 ? (
                  <div className="checkbox-card">
                    <div>
                      <strong>还没有启用规则</strong>
                      <p className="muted">
                        先去 <Link href="/rules">规则库</Link> 页面创建至少一条启用规则。
                      </p>
                    </div>
                  </div>
                ) : (
                  rules.map((rule) => (
                    <label className="checkbox-card" key={rule.id}>
                      <input
                        checked={selectedRuleIds.includes(rule.id)}
                        onChange={(event) => {
                          setSelectedRuleIds((current) =>
                            event.target.checked
                              ? [...current, rule.id]
                              : current.filter((ruleId) => ruleId !== rule.id),
                          );
                        }}
                        name="ruleIds"
                        type="checkbox"
                        value={rule.id}
                      />
                      <div>
                        <strong>{rule.name}</strong>
                        <p className="muted">
                          {rule.category} · {rule.description}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </section>

            <section className="launch-zone stack" aria-labelledby="launch-files-heading">
              <div className="launch-section-header">
                <div>
                  <p className="section-eyebrow">File Intake</p>
                  <h3 className="subsection-title" id="launch-files-heading">
                    文件导入
                  </h3>
                </div>
                <div className="launch-pill-row">
                  <span className="pill pill-brand">已导入 {workbenchFiles.length} 条</span>
                  <span className="pill">待评审 {readyDocuments.length} 条</span>
                </div>
              </div>

              {hasDesktopPicker ? (
                <div className="upload-panel">
                  <div>
                    <p className="section-eyebrow">Desktop Intake</p>
                    <strong>选择本地文件</strong>
                    <p className="muted">选择文件后开始导入和解析。</p>
                  </div>

                  <div className="actions">
                    <button
                      aria-label="选择本地文件"
                      className="button"
                      disabled={isPickingFiles || isSubmitting}
                      onClick={handlePickFiles}
                      type="button"
                    >
                      {isPickingFiles ? "正在导入..." : "选择本地文件"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="upload-panel">
                  <div>
                    <p className="section-eyebrow">Desktop Required</p>
                    <strong>请在桌面应用中启动后再导入本地文件。</strong>
                    <p className="muted">当前环境仅显示桌面端导入结果。</p>
                  </div>
                </div>
              )}

              {errorMessage ? (
                <p className="muted" role="alert">
                  {errorMessage}
                </p>
              ) : null}

            </section>

            <section className="launch-file-board stack" aria-labelledby="launch-file-board-heading">
              <div className="launch-section-header">
                <div>
                  <p className="section-eyebrow">Imported Files</p>
                  <h3 className="subsection-title" id="launch-file-board-heading">
                    导入文件清单
                  </h3>
                </div>
                <div className="launch-pill-row">
                  <span className="pill pill-brand">已导入 {workbenchFiles.length} 条</span>
                  <span className="pill">待评审 {readyDocuments.length} 条</span>
                </div>
              </div>

              <div className="table-toolbar">
                <div className="table-actions">
                  <span className="muted">
                    共 {workbenchFiles.length} 条 · 待评审 {readyDocuments.length} 条
                  </span>
                  <button
                    className="table-text-button is-danger"
                    disabled={isSubmitting || workbenchFiles.length === 0}
                    onClick={handleClearWorkbench}
                    type="button"
                  >
                    清空工作台
                  </button>
                </div>
              </div>

              <div className="table-shell">
                <table aria-label="已导入文件" className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">文件名</th>
                      <th scope="col" className="table-nowrap">类型</th>
                      <th scope="col" className="table-nowrap">状态</th>
                      <th scope="col">备注</th>
                      <th scope="col" className="table-nowrap">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workbenchFiles.length === 0 ? (
                      <tr>
                        <td className="muted" colSpan={5}>
                          尚未导入文件，文件解析结果会在这里逐行呈现。
                        </td>
                      </tr>
                    ) : (
                      workbenchFiles.map((file) => (
                        <tr key={file.id}>
                          <th scope="row">
                            <span className="table-cell-primary">{file.name}</span>
                          </th>
                          <td className="table-nowrap">{file.fileType ?? "待识别"}</td>
                          <td className="table-nowrap">
                            <span className="pill pill-brand">{file.status ?? "待处理"}</span>
                          </td>
                          <td>
                            <span className="table-cell-secondary">
                              {file.note ?? "已完成本地导入，等待加入评审。"}
                            </span>
                          </td>
                          <td className="table-nowrap">
                            <div className="table-actions">
                              <button
                                aria-label={`查看摘要 ${file.name}`}
                                className="table-text-button"
                                onClick={() => setSelectedSummaryId(file.id)}
                                type="button"
                              >
                                查看摘要
                              </button>
                              <button
                                aria-label={`移除 ${file.name}`}
                                className="table-text-button is-danger"
                                disabled={isSubmitting}
                                onClick={() => handleRemoveFile(file.id)}
                                type="button"
                              >
                                移除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {selectedSummaryFile ? (
                <section className="card stack" aria-label="解析摘要面板">
                  <div className="inline-actions">
                    <div>
                      <p className="section-eyebrow">Summary</p>
                      <h3 className="subsection-title">解析摘要</h3>
                    </div>
                    <button
                      className="table-text-button"
                      onClick={() => setSelectedSummaryId(null)}
                      type="button"
                    >
                      收起摘要
                    </button>
                  </div>

                  <div className="feature-list">
                    <div className="feature-row">
                      <span className="feature-kicker">文件</span>
                      <div>
                        <strong>{selectedSummaryFile.name}</strong>
                        <p className="muted">{selectedSummaryFile.fileType ?? "待识别"}</p>
                      </div>
                    </div>
                    <div className="feature-row">
                      <span className="feature-kicker">标题</span>
                      <div>
                        <strong>{selectedSummaryFile.summary?.title ?? "待完成本地解析"}</strong>
                        <p className="muted">导入后会显示文档标题。</p>
                      </div>
                    </div>
                    <div className="feature-row">
                      <span className="feature-kicker">状态</span>
                      <div>
                        <strong>{selectedSummaryFile.status ?? "待处理"}</strong>
                        <p className="muted">这份文件已经完成本地导入，可以直接加入本次评审。</p>
                      </div>
                    </div>
                    <div className="feature-row">
                      <span className="feature-kicker">结构</span>
                      <div>
                        <strong>
                          {formatCount(selectedSummaryFile.summary?.blockCount, "文档块")} ·{" "}
                          {formatCount(selectedSummaryFile.summary?.paragraphCount, "段落")}
                        </strong>
                        <p className="muted">显示文档块和段落数量。</p>
                      </div>
                    </div>
                    <div className="feature-row">
                      <span className="feature-kicker">来源</span>
                      <div>
                        <strong>{selectedSummaryFile.summary?.sourceLabel ?? "待识别来源"}</strong>
                        <p className="muted">显示当前文件的导入来源。</p>
                      </div>
                    </div>
                    <div className="feature-row">
                      <span className="feature-kicker">摘要</span>
                      <div>
                        <strong>{selectedSummaryFile.note ?? "暂无解析摘要"}</strong>
                        <p className="muted">显示当前文件的解析摘要。</p>
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}
            </section>

            <section className="launch-submit-zone stack" aria-labelledby="launch-submit-heading">
              <div className="launch-section-header">
                <div>
                  <p className="section-eyebrow">Launch Action</p>
                  <h3 className="subsection-title" id="launch-submit-heading">
                    启动批次
                  </h3>
                </div>
                <span className={`pill ${isLaunchReady ? "pill-brand" : ""}`}>
                  {isLaunchReady ? "可创建批次" : "待补全启动信息"}
                </span>
              </div>

              <div className="stats launch-submit-grid">
                <div className="stat">
                  <p className="metric-label">批次</p>
                  <strong>{batchName.trim() || "待命名"}</strong>
                  <p className="muted">
                    模型 {modelName || "待选择"} · 配置 {selectedProfile?.name ?? "未配置"}
                  </p>
                </div>
                <div className="stat">
                  <p className="metric-label">规则</p>
                  <strong>{selectedRuleIds.length} 条已选</strong>
                  <p className="muted">当前页只会提交已勾选的启用规则。</p>
                </div>
                <div className="stat">
                  <p className="metric-label">文件</p>
                  <strong>{readyDocuments.length} 条待评审</strong>
                  <p className="muted">导入完成的文件会直接进入本次评审批次。</p>
                </div>
              </div>

              <div className="actions">
                <button
                  aria-label="开始评审"
                  className="button"
                  disabled={!isLaunchReady}
                  onClick={handleCreateReviewBatch}
                  type="button"
                >
                  {isSubmitting ? "正在提交..." : "开始评审"}
                </button>
                <p className="muted">需填写批次名称，并至少导入 1 个文件与保留 1 条规则。</p>
              </div>
            </section>
          </div>
        </section>
      </div>

      <aside aria-label="启动摘要" className="desktop-info-rail launch-readiness-rail">
        <section className="desktop-surface stack" aria-labelledby="launch-readiness-heading">
          <div className="launch-section-header">
            <div>
              <p className="section-eyebrow">Launch Summary</p>
              <h2 className="subsection-title" id="launch-readiness-heading">
                启动摘要
              </h2>
            </div>
            <span className={`pill ${isLaunchReady ? "pill-brand" : ""}`}>
              {isLaunchReady ? "可创建批次" : "待补全启动信息"}
            </span>
          </div>

          <div className="launch-checklist" role="list" aria-label="启动摘要检查项">
            {launchChecklist.map((item) => (
              <div className="launch-check-row" key={item.id} role="listitem">
                <div>
                  <p className="metric-label">{item.label}</p>
                  <strong>{item.value}</strong>
                </div>
                <span className={`pill ${item.isReady ? "pill-brand" : ""}`}>
                  {item.isReady ? "已就绪" : "待补全"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="desktop-surface stack">
          <div>
            <p className="section-eyebrow">Launch Snapshot</p>
            <h3 className="subsection-title">本次提交</h3>
          </div>

          <div className="launch-summary-grid">
            <div className="stat">
              <p className="metric-label">批次</p>
              <strong>{batchName.trim() || "待命名"}</strong>
              <p className="muted">
                模型 {modelName || "待选择"} · 配置 {selectedProfile?.name ?? "未配置"}
              </p>
            </div>
            <div className="stat">
              <p className="metric-label">规则</p>
              <strong>{selectedRuleIds.length} 条已选</strong>
              <p className="muted">当前页只会提交已勾选的启用规则。</p>
            </div>
            <div className="stat">
              <p className="metric-label">文件</p>
              <strong>{readyDocuments.length} 条待评审</strong>
              <p className="muted">导入完成的文件会直接进入本次评审批次。</p>
            </div>
          </div>
        </section>

      </aside>
    </section>
  );
}
