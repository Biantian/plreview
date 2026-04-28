"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ReviewLaunchRuleDrawer } from "@/components/review-launch-rule-drawer";
import { type ReviewLaunchRuleItem } from "@/desktop/bridge/desktop-api";
import { severityLabel } from "@/lib/utils";

type LlmProfile = {
  id: string;
  name: string;
  provider: string;
  defaultModel: string;
};

type Rule = ReviewLaunchRuleItem;

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
  initialRuleIds?: string[];
};

type LaunchMissingKey = "batch" | "profile" | "rules" | "documents";

const EMPTY_IMPORTED_FILES: ImportedFile[] = [];
const SECTION_FOCUS_FALLBACK_SELECTOR =
  "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])";
const MISSING_KEY_TO_SECTION: Record<LaunchMissingKey, "batchProfile" | "rules" | "documents"> = {
  batch: "batchProfile",
  profile: "batchProfile",
  rules: "rules",
  documents: "documents",
};
const MISSING_KEY_TO_FOCUS_SELECTOR: Record<LaunchMissingKey, string> = {
  batch: "#batchName",
  profile: "#llmProfileId",
  rules: "button[data-launch-rules-trigger='true']",
  documents: "button[aria-label='选择本地文件']:not([disabled])",
};

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
  initialRuleIds,
}: IntakeWorkbenchProps) {
  const router = useRouter();
  const incomingImportedFiles = importedFiles ?? EMPTY_IMPORTED_FILES;
  const defaultProfile = llmProfiles[0];
  const [selectedProfileId, setSelectedProfileId] = useState(defaultProfile?.id ?? "");
  const selectedProfile =
    llmProfiles.find((profile) => profile.id === selectedProfileId) ?? defaultProfile;
  const [modelName, setModelName] = useState(defaultProfile?.defaultModel ?? "");
  const [batchName, setBatchName] = useState("");
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>(() => initialRuleIds ?? []);
  const [workbenchFiles, setWorkbenchFiles] = useState<ImportedFile[]>(() =>
    mergeImportedFiles([], incomingImportedFiles),
  );
  const [isPickingFiles, setIsPickingFiles] = useState(false);
  const [isRuleDrawerOpen, setIsRuleDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);
  const [highlightedLaunchKeys, setHighlightedLaunchKeys] = useState<LaunchMissingKey[]>([]);
  const [showInitialRuleNotice, setShowInitialRuleNotice] = useState(
    () => (initialRuleIds?.length ?? 0) > 0,
  );
  const batchProfileSectionRef = useRef<HTMLElement | null>(null);
  const rulesSectionRef = useRef<HTMLElement | null>(null);
  const documentsSectionRef = useRef<HTMLElement | null>(null);
  const readyDocuments = workbenchFiles.filter(
    (file): file is ImportedFile & { documentId: string } => isReadyDocument(file),
  );
  const selectedRules = selectedRuleIds
    .map((ruleId) => rules.find((rule) => rule.id === ruleId))
    .filter((rule): rule is Rule => Boolean(rule));
  const selectedSummaryFile =
    workbenchFiles.find((file) => file.id === selectedSummaryId) ?? null;
  const hasDesktopPicker = typeof window !== "undefined" && Boolean(window.plreview?.pickFiles);
  const isBatchReady = batchName.trim().length > 0;
  const isProfileReady = selectedProfileId.length > 0;
  const isRulesReady = selectedRuleIds.length > 0;
  const isDocumentsReady = readyDocuments.length > 0;
  const launchMissingKeys: LaunchMissingKey[] = [];

  if (!isBatchReady) {
    launchMissingKeys.push("batch");
  }

  if (!isProfileReady) {
    launchMissingKeys.push("profile");
  }

  if (!isRulesReady) {
    launchMissingKeys.push("rules");
  }

  if (!isDocumentsReady) {
    launchMissingKeys.push("documents");
  }

  const isLaunchReady =
    !isPickingFiles &&
    !isSubmitting &&
    launchMissingKeys.length === 0;
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
    const filteredInitialRuleIds = (initialRuleIds ?? []).filter((ruleId) =>
      nextRuleIds.includes(ruleId),
    );

    if (nextRuleIds.length === 0) {
      setSelectedRuleIds([]);
      return;
    }

    setSelectedRuleIds((current) => {
      const filteredCurrent = current.filter((ruleId) => nextRuleIds.includes(ruleId));
      if (filteredCurrent.length > 0) {
        return filteredCurrent;
      }
      return filteredInitialRuleIds;
    });
  }, [initialRuleIds, rules]);

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

  useEffect(() => {
    if (!showInitialRuleNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowInitialRuleNotice(false);
    }, 3200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showInitialRuleNotice]);

  useEffect(() => {
    setHighlightedLaunchKeys((current) =>
      current.filter((missingKey) => launchMissingKeys.includes(missingKey)),
    );
  }, [isBatchReady, isProfileReady, isRulesReady, isDocumentsReady]);

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

  const focusSectionControl = (missingKey: LaunchMissingKey) => {
    const targetSection = MISSING_KEY_TO_SECTION[missingKey];
    const sectionElement =
      targetSection === "batchProfile"
        ? batchProfileSectionRef.current
        : targetSection === "rules"
          ? rulesSectionRef.current
          : documentsSectionRef.current;

    if (!sectionElement) {
      return;
    }

    if (typeof sectionElement.scrollIntoView === "function") {
      sectionElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const preferredSelector = MISSING_KEY_TO_FOCUS_SELECTOR[missingKey];
    const preferredElement = sectionElement.querySelector<HTMLElement>(preferredSelector);
    const fallbackElement = sectionElement.querySelector<HTMLElement>(SECTION_FOCUS_FALLBACK_SELECTOR);
    const focusTarget = preferredElement ?? fallbackElement;

    if (!focusTarget) {
      return;
    }

    focusTarget.focus();

    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => {
        focusTarget.focus({ preventScroll: true });
      });
    }
  };

  const handleCreateReviewBatch = async () => {
    if (launchMissingKeys.length > 0) {
      setHighlightedLaunchKeys(launchMissingKeys);
      focusSectionControl(launchMissingKeys[0]);
      return;
    }

    if (!window.plreview?.createReviewBatch || !selectedProfileId) {
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

  const isBatchHighlighted = highlightedLaunchKeys.includes("batch");
  const isProfileHighlighted = highlightedLaunchKeys.includes("profile");
  const isRulesHighlighted = highlightedLaunchKeys.includes("rules");
  const isDocumentsHighlighted = highlightedLaunchKeys.includes("documents");

  return (
    <section aria-label="评审启动工作区" className="launch-workspace launch-quickstart">
      {showInitialRuleNotice ? (
        <div className="launch-inline-notice" role="status">
          <span>已带入上次批次规则</span>
          <button
            aria-label="关闭带入规则提示"
            className="button-ghost button-inline"
            onClick={() => setShowInitialRuleNotice(false)}
            type="button"
          >
            知道了
          </button>
        </div>
      ) : null}

      <div className="launch-main-column">
        <section
          aria-labelledby="launch-config-heading"
          className="desktop-surface stack-lg launch-guidance-section"
          data-testid="launch-section-batch-profile"
          ref={batchProfileSectionRef}
        >
          <div className="launch-section-header">
            <div>
              <p className="section-eyebrow">Launch Setup</p>
              <h2 className="subsection-title" id="launch-config-heading">
                基础信息
              </h2>
            </div>
            <div className="launch-pill-row">
              <span className="pill pill-brand">当前模型：{selectedProfile?.name ?? "未配置"}</span>
              <span className="pill">模型名称：{modelName || "待填写"}</span>
            </div>
          </div>

          <p className="section-copy">填写批次名称并选择模型。</p>

          <div className="form-grid two">
            <div
              className={`field launch-guidance-target ${isProfileHighlighted ? "is-missing" : ""}`}
              data-missing={isProfileHighlighted ? "true" : "false"}
              data-testid="launch-missing-profile"
            >
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

          <div
            className={`field launch-guidance-target ${isBatchHighlighted ? "is-missing" : ""}`}
            data-missing={isBatchHighlighted ? "true" : "false"}
            data-testid="launch-missing-batch"
          >
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

        <section
          aria-labelledby="launch-rules-heading"
          className="desktop-surface stack-lg launch-guidance-section"
          data-testid="launch-section-rules"
          ref={rulesSectionRef}
        >
          <div className="inline-actions">
            <div>
              <p className="section-eyebrow">Selected Rules</p>
              <h2 className="subsection-title" id="launch-rules-heading">
                规则摘要
              </h2>
            </div>
            <div className="actions">
              <button
                className="button"
                data-launch-rules-trigger="true"
                onClick={() => setIsRuleDrawerOpen(true)}
                type="button"
              >
                选择规则
              </button>
              <button
                className="button-ghost"
                disabled={selectedRuleIds.length === 0}
                onClick={() => setSelectedRuleIds([])}
                type="button"
              >
                一键清空
              </button>
            </div>
          </div>

          <p className="section-copy">确认本次批次会使用哪些规则。</p>

          <div data-missing={isRulesHighlighted ? "true" : "false"} data-testid="launch-missing-rules">
            {rules.length === 0 ? (
              <div
                className={`checkbox-card launch-guidance-target ${isRulesHighlighted ? "is-missing" : ""}`}
                data-missing={isRulesHighlighted ? "true" : "false"}
                data-testid="launch-missing-rules-empty-state"
              >
                <div>
                  <strong>还没有启用规则</strong>
                  <p className="muted">
                    先去 <Link href="/rules">规则库</Link> 页面创建至少一条启用规则。
                  </p>
                </div>
              </div>
            ) : selectedRules.length === 0 ? (
              <div
                className={`checkbox-card launch-guidance-target ${isRulesHighlighted ? "is-missing" : ""}`}
                data-missing={isRulesHighlighted ? "true" : "false"}
                data-testid="launch-missing-rules-empty-state"
              >
                <div>
                  <strong>当前未选择规则</strong>
                  <p className="muted">点击“选择规则”后可继续调整本次批次的规则集。</p>
                </div>
              </div>
            ) : (
              <div className="launch-rule-summary-grid">
                {selectedRules.map((rule) => (
                  <article className="launch-rule-summary-card" key={rule.id}>
                    <div className="inline-actions">
                      <strong>{rule.name}</strong>
                      <button
                        aria-label={`移除规则 ${rule.name}`}
                        className="table-text-button is-danger"
                        onClick={() =>
                          setSelectedRuleIds((current) =>
                            current.filter((ruleId) => ruleId !== rule.id),
                          )
                        }
                        type="button"
                      >
                        移除
                      </button>
                    </div>
                    <p className="muted">{rule.description}</p>
                    <p className="muted">
                      {rule.category} · {severityLabel(rule.severity)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section
          aria-labelledby="launch-files-heading"
          className="desktop-surface stack-lg launch-guidance-section"
          data-testid="launch-section-documents"
          ref={documentsSectionRef}
        >
          <div className="launch-section-header">
            <div>
              <p className="section-eyebrow">File Intake</p>
              <h2 className="subsection-title" id="launch-files-heading">
                文件导入
              </h2>
            </div>
            <div className="launch-pill-row">
              <span className="pill pill-brand">已导入 {workbenchFiles.length} 条</span>
              <span className="pill">待评审 {readyDocuments.length} 条</span>
            </div>
          </div>

          {hasDesktopPicker ? (
            <div
              className={`upload-panel launch-guidance-target ${isDocumentsHighlighted ? "is-missing" : ""}`}
              data-missing={isDocumentsHighlighted ? "true" : "false"}
              data-testid="launch-missing-documents"
            >
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
            <div
              className={`upload-panel launch-guidance-target ${isDocumentsHighlighted ? "is-missing" : ""}`}
              data-missing={isDocumentsHighlighted ? "true" : "false"}
              data-testid="launch-missing-documents"
            >
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
        </section>

        <section className="desktop-surface stack-lg" aria-labelledby="launch-submit-heading">
          <div className="launch-section-header">
            <div>
              <p className="section-eyebrow">Launch Action</p>
              <h2 className="subsection-title" id="launch-submit-heading">
                启动区
              </h2>
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
              <strong>{selectedRules.length} 条已选</strong>
              <p className="muted">当前页会提交已带入并保留在本次批次中的规则。</p>
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
              disabled={isSubmitting || isPickingFiles}
              onClick={handleCreateReviewBatch}
              type="button"
            >
              {isSubmitting ? "正在提交..." : "开始评审"}
            </button>
            <p className="muted">需填写批次名称，并至少导入 1 个文件与保留 1 条规则。</p>
          </div>
        </section>
      </div>

      <ReviewLaunchRuleDrawer
        initialRuleIds={initialRuleIds ?? []}
        onClose={() => setIsRuleDrawerOpen(false)}
        onConfirm={(nextRuleIds) => {
          setSelectedRuleIds(nextRuleIds);
          setIsRuleDrawerOpen(false);
        }}
        open={isRuleDrawerOpen}
        rules={rules}
        selectedRuleIds={selectedRuleIds}
      />
    </section>
  );
}
