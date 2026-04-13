"use client";

import { useState } from "react";
import Link from "next/link";

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
};

type IntakeWorkbenchProps = {
  llmProfiles: LlmProfile[];
  rules: Rule[];
  importedFiles?: ImportedFile[];
};

export function IntakeWorkbench({
  llmProfiles,
  rules,
  importedFiles = [],
}: IntakeWorkbenchProps) {
  const defaultProfile = llmProfiles[0];
  const [selectedProfileId, setSelectedProfileId] = useState(defaultProfile?.id ?? "");
  const selectedProfile =
    llmProfiles.find((profile) => profile.id === selectedProfileId) ?? defaultProfile;
  const [modelName, setModelName] = useState(defaultProfile?.defaultModel ?? "");

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
              这些控件先展示批次级别的模型与规则选项，真正的提交逻辑会在下一步补齐。
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
            description="暂时保留导入入口，下一步会把这里接到多文件本地工作流。"
            multiple
            title="选择待导入文件"
          />

          <table aria-label="已导入文件">
            <thead>
              <tr>
                <th scope="col">文件名</th>
                <th scope="col">类型</th>
                <th scope="col">状态</th>
                <th scope="col">备注</th>
              </tr>
            </thead>
            <tbody>
              {importedFiles.length === 0 ? (
                <tr>
                  <td className="muted" colSpan={4}>
                    尚未导入文件，文件解析结果会在这里逐行呈现。
                  </td>
                </tr>
              ) : (
                importedFiles.map((file) => (
                  <tr key={file.id}>
                    <th scope="row">{file.name}</th>
                    <td>{file.fileType ?? "待识别"}</td>
                    <td>
                      <span className="pill pill-brand">{file.status ?? "待处理"}</span>
                    </td>
                    <td className="muted">
                      {file.note ?? "后续会补上批量操作与解析状态。"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                  <input defaultChecked name="ruleIds" type="checkbox" value={rule.id} />
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
                  现在先把导入文件整理成可扫描的表格工作台，后续会接上批量处理逻辑。
                </p>
              </div>
            </div>
            <div className="feature-row">
              <span className="feature-kicker">02</span>
              <div>
                <strong>批量配置与规则保持同屏</strong>
                <p className="muted">
                  模型配置、模型名称和规则选择会一起固定为本次批次的评审参数。
                </p>
              </div>
            </div>
            <div className="feature-row">
              <span className="feature-kicker">03</span>
              <div>
                <strong>后续会扩展为多文件队列</strong>
                <p className="muted">
                  下一步会把本地文件选取、队列管理和任务创建补进同一条工作流。
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
                <strong>{importedFiles.length} 个文件位已预留</strong>
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
