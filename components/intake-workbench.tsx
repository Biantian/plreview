"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { FilePicker } from "@/components/file-picker";

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
};

type IntakeWorkbenchProps = {
  llmProfiles: LlmProfile[];
  rules: Rule[];
  importedFiles?: ImportedFile[];
};

const EMPTY_IMPORTED_FILES: ImportedFile[] = [];
const BROWSER_FALLBACK_NOTE = "网页回退入口已记录，请使用“导入本地文件”完成本地解析。";

function inferFileType(filename: string) {
  const extension = filename.split(".").pop()?.trim().toLowerCase();
  return extension || "待识别";
}

function createBrowserFallbackFiles(files: File[]): ImportedFile[] {
  return files.map((file) => ({
    id: `browser:${file.name}:${file.lastModified}:${file.size}`,
    documentId: null,
    name: file.name,
    fileType: inferFileType(file.name),
    status: "待从桌面导入",
    note: BROWSER_FALLBACK_NOTE,
  }));
}

function normalizeImportedFile(file: ImportedFile): ImportedFile {
  return {
    ...file,
    documentId: file.documentId === undefined ? file.id : file.documentId,
  };
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
  const readyDocuments = workbenchFiles.filter(
    (file): file is ImportedFile & { documentId: string } => Boolean(file.documentId?.trim()),
  );
  const selectedSummaryFile =
    workbenchFiles.find((file) => file.id === selectedSummaryId) ?? null;

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

  const handleRetryImport = async (targetId: string) => {
    if (!window.plreview?.pickFiles) {
      return;
    }

    setErrorMessage("");
    setIsPickingFiles(true);

    try {
      const nextFiles = await window.plreview.pickFiles();
      if (!nextFiles || nextFiles.length === 0) {
        return;
      }

      setWorkbenchFiles((current) =>
        mergeImportedFiles(removeImportedFile(current, targetId), nextFiles),
      );
    } catch {
      setErrorMessage("本地文件导入失败，请重试。");
    } finally {
      setIsPickingFiles(false);
    }
  };

  return (
    <div className="grid-main">
      <section className="panel stack-lg">
        <div>
          <p className="section-eyebrow">Review Launchpad</p>
          <h1 className="section-title">新建评审</h1>
          <p className="section-copy">
            这里先保留一个批量导入和批量配置的工作台外壳，后续会在同一张页面里接上文件选择、分组提交和任务创建。
          </p>
        </div>

        <section className="form-section">
          <div>
            <h2 className="subsection-title">批量配置</h2>
            <p className="section-copy">
              这些控件会直接驱动本地批次创建，提交时会把当前选择的模型、规则和文件一起发送到桌面端。
            </p>
          </div>

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

        <section className="form-section">
          <div>
            <h2 className="subsection-title">文件工作台</h2>
            <p className="section-copy">
              导入后的文件会以表格行展示，方便后续扩展排序、移除和批量提交。
            </p>
          </div>

          <FilePicker
            accept=".docx,.txt,.md,.xlsx"
            badgeLabel="本地文件入口"
            description="浏览器回退入口会先把文件记录进工作台；桌面版请使用下方“导入本地文件”完成本地解析。"
            multiple
            onFilesSelected={(files) => {
              setErrorMessage("");
              setWorkbenchFiles((current) =>
                mergeImportedFiles(current, createBrowserFallbackFiles(files)),
              );
            }}
            title="选择待导入文件"
          />

          <div className="actions">
            <button
              aria-label="导入本地文件"
              className="button"
              disabled={isPickingFiles || isSubmitting}
              onClick={handlePickFiles}
              type="button"
            >
              {isPickingFiles ? "正在导入..." : "导入本地文件"}
            </button>
          </div>

          {errorMessage ? (
            <p className="muted" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <table aria-label="已导入文件">
            <thead>
              <tr>
                <th scope="col">文件名</th>
                <th scope="col">类型</th>
                <th scope="col">状态</th>
                <th scope="col">备注</th>
                <th scope="col">操作</th>
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
                    <th scope="row">{file.name}</th>
                    <td>{file.fileType ?? "待识别"}</td>
                    <td>
                      <span className="pill pill-brand">{file.status ?? "待处理"}</span>
                    </td>
                    <td className="muted">
                      {file.note ?? "后续会补上批量操作与解析状态。"}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          aria-label={`查看摘要 ${file.name}`}
                          className="button-ghost button-inline"
                          onClick={() => setSelectedSummaryId(file.id)}
                          type="button"
                        >
                          查看摘要
                        </button>
                        {!file.documentId ? (
                          <button
                            aria-label={`重新导入 ${file.name}`}
                            className="button-secondary button-inline"
                            disabled={isPickingFiles || isSubmitting}
                            onClick={() => void handleRetryImport(file.id)}
                            type="button"
                          >
                            重新导入
                          </button>
                        ) : null}
                        <button
                          aria-label={`移除 ${file.name}`}
                          className="button-ghost button-inline"
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

          {selectedSummaryFile ? (
            <section className="card stack" aria-label="解析摘要面板">
              <div className="inline-actions">
                <div>
                  <p className="section-eyebrow">Summary</p>
                  <h3 className="subsection-title">解析摘要</h3>
                </div>
                <button
                  className="button-ghost button-inline"
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
                  <span className="feature-kicker">状态</span>
                  <div>
                    <strong>{selectedSummaryFile.status ?? "待处理"}</strong>
                    <p className="muted">
                      {selectedSummaryFile.documentId
                        ? "这份文件已经完成本地解析，可以加入批量评审。"
                        : "这份文件还在浏览器回退队列里，需要重新走桌面导入。"}
                    </p>
                  </div>
                </div>
                <div className="feature-row">
                  <span className="feature-kicker">摘要</span>
                  <div>
                    <strong>{selectedSummaryFile.note ?? "暂无解析摘要"}</strong>
                    <p className="muted">这里会保留当前文件的解析说明，方便行级排查。</p>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </section>

        <section className="form-section">
          <div>
            <h2 className="subsection-title">本次评审规则</h2>
            <p className="section-copy">
              默认展示所有启用规则，后续会把批次级配置和提交动作收拢到同一条工作流里。
            </p>
          </div>

          <div className="checkbox-list">
            {rules.length === 0 ? (
              <div className="checkbox-card">
                <div>
                  <strong>还没有启用规则</strong>
                  <p className="muted">
                    先去 <Link href="/rules">规则管理</Link> 页面创建至少一条启用规则。
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

          <div className="actions">
            <button
              aria-label="开始批量评审"
              className="button"
              disabled={
                isPickingFiles ||
                isSubmitting ||
                batchName.trim().length === 0 ||
                selectedProfileId.length === 0 ||
                readyDocuments.length === 0 ||
                selectedRuleIds.length === 0
              }
              onClick={handleCreateReviewBatch}
              type="button"
            >
              {isSubmitting ? "正在提交..." : "开始批量评审"}
            </button>
          </div>
        </section>
      </section>

      <aside className="stack-lg">
        <section className="card stack">
          <div>
            <p className="section-eyebrow">Flow</p>
            <h2 className="section-title">这次提交会发生什么</h2>
          </div>

          <div className="feature-list">
            <div className="feature-row">
              <span className="feature-kicker">01</span>
              <div>
                <strong>文件先入表，再接提交</strong>
                <p className="muted">
                  先通过桌面桥接导入本地文件，再把去重后的文档行合并到工作台表格。
                </p>
              </div>
            </div>
            <div className="feature-row">
              <span className="feature-kicker">02</span>
              <div>
                <strong>批量配置与规则保持同屏</strong>
                <p className="muted">
                  模型配置、模型名称、批次名称和已选规则会一起成为本次提交参数。
                </p>
              </div>
            </div>
            <div className="feature-row">
              <span className="feature-kicker">03</span>
              <div>
                <strong>后续会扩展为多文件队列</strong>
                <p className="muted">
                  现在先保留文件选择回退，后续仍可继续扩展队列管理和移除操作。
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="card stack">
          <div>
            <p className="section-eyebrow">Runtime</p>
            <h2 className="section-title">运行环境</h2>
            <p className="section-copy">未配置真实 Key 时，系统会自动切换到演示模式，方便先验证流程。</p>
          </div>

          <div className="feature-list">
            <div className="feature-row">
              <span className="feature-kicker">规则</span>
              <div>
                <strong>{rules.length} 条启用规则可用</strong>
                <p className="muted">当前页只会展示启用状态的规则，减少误选和空跑。</p>
              </div>
            </div>
            <div className="feature-row">
              <span className="feature-kicker">模型</span>
              <div>
                <strong>{llmProfiles.length} 个配置可选</strong>
                <p className="muted">
                  当前选择 {selectedProfile?.name ?? "暂无配置"}，默认模型会随配置自动带入。
                </p>
              </div>
            </div>
            <div className="feature-row">
              <span className="feature-kicker">导入</span>
              <div>
                <strong>{workbenchFiles.length} 个文件位已预留</strong>
                <p className="muted">文件工作台先按表格布局好，后续再接真正的本地批量导入。</p>
              </div>
            </div>
          </div>

          <div className="hint">
            <code>OPENAI_COMPATIBLE_API_KEY</code>
          </div>
          <div className="hint">
            <code>OPENAI_COMPATIBLE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1</code>
          </div>
        </section>
      </aside>
    </div>
  );
}
