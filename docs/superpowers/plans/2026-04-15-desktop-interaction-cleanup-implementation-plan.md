# Desktop Interaction Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 先把当前桌面化特性分支整理并合入 `main`，再基于更新后的主干完成 `新建评审`、`模型设置`、`文档` 3 个页面的交互收口。

**Architecture:** 先做一次“特性整合前置任务”：忽略本地产物、验证桌面主线测试、合并到 `main`、再从更新后的主干切出新的交互改造分支。随后按页面拆成 3 个独立任务：`新建评审` 只保留单栏主流程，`模型设置` 对齐规则管理的表格 + 抽屉交互，`文档` 页面采用左文档目录 / 中正文 / 右文章目录的经典三栏布局，并补齐折叠与响应式行为。

**Tech Stack:** `Next.js 15`, `React 19`, `TypeScript`, `Prisma`, `Electron`, `Vitest`, `Testing Library`

---

## File Structure

### New files

- `components/model-editor-drawer.tsx`
  - 承载模型新增/编辑抽屉表单，避免 `components/model-manager.tsx` 继续膨胀
- `components/docs-shell.tsx`
  - 承载文档页三栏布局、左右栏折叠和主题切换逻辑
- `lib/llm-profiles.ts`
  - 生成模型页表格行数据与统计指标，和 `lib/rules.ts`、`lib/review-jobs.ts` 的职责保持一致
- `tests/components/model-manager.test.tsx`
  - 覆盖模型页搜索、抽屉开关、空状态和行操作
- `tests/components/docs-shell.test.tsx`
  - 覆盖文档三栏渲染、文档切换、侧栏折叠和窄屏入口

### Modified files

- `.gitignore`
- `app/reviews/new/page.tsx`
- `app/models/page.tsx`
- `app/docs/page.tsx`
- `app/globals.css`
- `components/intake-workbench.tsx`
- `components/model-manager.tsx`
- `components/site-nav.tsx`
- `lib/actions.ts`
- `tests/components/intake-workbench.test.tsx`

### Responsibility notes

- `components/intake-workbench.tsx` 只负责“创建批次”交互，不再承载长说明或双栏工作台骨架
- `components/model-manager.tsx` 只负责列表、搜索、行操作和抽屉开关，不再内嵌完整表单
- `components/model-editor-drawer.tsx` 只负责模型表单渲染和提交
- `components/docs-shell.tsx` 只负责文档信息架构和局部 UI 状态，不负责全局导航
- `lib/llm-profiles.ts` 只负责模型页展示数据的查询和整形

## Task 1: Integrate The Existing Desktop Feature Line Before New UI Work

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Write the failing ignore check**

```bash
git check-ignore .superpowers/brainstorm/test.html release/tmp-artifact
```

- [ ] **Step 2: Run the check to verify it fails**

Run: `git check-ignore .superpowers/brainstorm/test.html release/tmp-artifact`
Expected: command exits non-zero because `.superpowers/` and `release/` are not ignored yet

- [ ] **Step 3: Update `.gitignore` to ignore local brainstorm and packaging artifacts**

```gitignore
# local brainstorm sessions
/.superpowers

# local desktop packaging output
/release
```

- [ ] **Step 4: Re-run the ignore check**

Run: `git check-ignore .superpowers/brainstorm/test.html release/tmp-artifact`
Expected:

```text
.superpowers/brainstorm/test.html
release/tmp-artifact
```

- [ ] **Step 5: Run the current desktop feature test suite on the feature branch**

Run: `npm test -- --run`
Expected: PASS with `12 passed` and `42 passed`

- [ ] **Step 6: Commit the ignore fix on the current desktop feature branch**

```bash
git add .gitignore
git commit -m "chore: ignore brainstorm state and desktop artifacts"
```

- [ ] **Step 7: Update `main` with the current desktop feature branch before starting UI cleanup**

```bash
git switch main
git merge --ff-only codex/local-first-desktop-delivery
```

- [ ] **Step 8: Verify the merged `main` branch still passes tests**

Run: `npm test -- --run`
Expected: PASS with `12 passed` and `42 passed`

- [ ] **Step 9: Create the dedicated cleanup branch from updated `main`**

```bash
git switch -c codex/desktop-interaction-cleanup
```

- [ ] **Step 10: Commit**

```bash
git status --short
```

Expected:

```text
## codex/desktop-interaction-cleanup
```

## Task 2: Convert Models Into A Table-Centered Management Page

**Files:**
- Create: `components/model-editor-drawer.tsx`
- Create: `lib/llm-profiles.ts`
- Create: `tests/components/model-manager.test.tsx`
- Modify: `app/models/page.tsx`
- Modify: `components/model-manager.tsx`
- Modify: `lib/actions.ts`

- [ ] **Step 1: Write the failing model manager tests**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ModelManager } from "@/components/model-manager";

vi.mock("@/lib/actions", () => ({
  deleteLlmProfileAction: vi.fn(),
  saveLlmProfileAction: vi.fn(),
  toggleLlmProfileEnabledAction: vi.fn(),
}));

describe("ModelManager", () => {
  const profiles = [
    {
      id: "profile_1",
      name: "百炼生产",
      provider: "DashScope",
      vendorKey: "openai_compatible",
      mode: "live" as const,
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      defaultModel: "qwen-plus",
      modelOptionsText: "qwen-plus\nqwen-max",
      enabled: true,
      hasApiKey: true,
      apiKeyLast4: "abcd",
    },
    {
      id: "profile_2",
      name: "演示配置",
      provider: "Demo",
      vendorKey: "openai_compatible",
      mode: "demo" as const,
      baseUrl: "https://demo.invalid/v1",
      defaultModel: "mock-model",
      modelOptionsText: "mock-model",
      enabled: false,
      hasApiKey: false,
      apiKeyLast4: null,
    },
  ];

  it("filters rows and opens the drawer for editing", async () => {
    const user = userEvent.setup();

    render(
      <ModelManager
        metrics={{
          totalCount: 2,
          enabledCount: 1,
          liveCount: 1,
          latestUpdatedAtLabel: "2026-04-15 16:00",
        }}
        profiles={profiles}
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: "搜索模型" }), "演示");
    await user.click(screen.getByRole("button", { name: "编辑 演示配置" }));

    expect(screen.getByText("演示配置")).toBeInTheDocument();
    expect(screen.queryByText("百炼生产")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "模型编辑抽屉" })).toBeInTheDocument();
  });

  it("opens the create drawer from the toolbar", async () => {
    const user = userEvent.setup();

    render(
      <ModelManager
        metrics={{
          totalCount: 0,
          enabledCount: 0,
          liveCount: 0,
          latestUpdatedAtLabel: "--",
        }}
        profiles={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "新增模型" }));

    expect(screen.getByRole("dialog", { name: "模型编辑抽屉" })).toBeInTheDocument();
    expect(screen.getByText("新增模型配置")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the model manager test to verify it fails**

Run: `npm test -- --run tests/components/model-manager.test.tsx`
Expected: FAIL because `ModelManager` does not yet render a searchable table or a drawer

- [ ] **Step 3: Add a model dashboard loader aligned with the existing page loaders**

```ts
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export async function getModelDashboardData() {
  const profiles = await prisma.llmProfile.findMany({
    orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
  });

  const enabledCount = profiles.filter((profile) => profile.enabled).length;
  const liveCount = profiles.filter((profile) => profile.mode === "live").length;
  const latestUpdatedAt = profiles.reduce<Date | null>(
    (latest, profile) => (!latest || profile.updatedAt > latest ? profile.updatedAt : latest),
    null,
  );

  return {
    metrics: {
      totalCount: profiles.length,
      enabledCount,
      liveCount,
      latestUpdatedAtLabel: latestUpdatedAt ? formatDate(latestUpdatedAt).slice(5, 16) : "--",
    },
    profiles: profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      provider: profile.provider,
      vendorKey: profile.vendorKey,
      mode: profile.mode,
      baseUrl: profile.baseUrl,
      defaultModel: profile.defaultModel,
      modelOptionsText: JSON.parse(profile.modelOptionsJson ?? "[]").join("\n"),
      enabled: profile.enabled,
      hasApiKey: profile.hasApiKey,
      apiKeyLast4: profile.apiKeyLast4,
    })),
  };
}
```

- [ ] **Step 4: Implement the reusable model editor drawer**

```tsx
"use client";

import { saveLlmProfileAction } from "@/lib/actions";

type ModelEditorDrawerProps = {
  open: boolean;
  profile: {
    id: string;
    name: string;
    provider: string;
    vendorKey: string;
    mode: "live" | "demo";
    baseUrl: string;
    defaultModel: string;
    modelOptionsText: string;
    enabled: boolean;
  } | null;
  onClose: () => void;
};

export function ModelEditorDrawer({ open, profile, onClose }: ModelEditorDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="drawer-backdrop" onClick={onClose} role="presentation">
      <section
        aria-label="模型编辑抽屉"
        aria-modal="true"
        className="drawer-panel stack"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="drawer-header">
          <div>
            <p className="section-eyebrow">Model Editor</p>
            <h2 className="subsection-title">{profile ? "编辑模型配置" : "新增模型配置"}</h2>
          </div>
          <button className="button-ghost button-inline" onClick={onClose} type="button">
            关闭
          </button>
        </div>

        <form action={saveLlmProfileAction} className="form-grid">
          {profile ? <input name="id" type="hidden" value={profile.id} /> : null}
          <input
            name="vendorKey"
            type="hidden"
            value={profile?.vendorKey ?? "openai_compatible"}
          />

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
            />
          </div>

          <div className="field">
            <label htmlFor="apiKey">API Key</label>
            <input id="apiKey" name="apiKey" type="password" />
          </div>

          <label>
            <input
              defaultChecked={profile?.enabled ?? true}
              name="enabled"
              type="checkbox"
            />{" "}
            保存后立即启用
          </label>

          <div className="actions">
            <button className="button" type="submit">
              {profile ? "保存修改" : "保存配置"}
            </button>
            <button className="button-ghost" onClick={onClose} type="button">
              取消
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Replace the inline model form with a searchable table + drawer**

```tsx
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
    <section className="panel stack">
      <div className="metric-grid">
        <div className="metric-card"><p className="metric-label">模型总数</p><strong className="metric-value">{metrics.totalCount}</strong></div>
        <div className="metric-card"><p className="metric-label">启用中</p><strong className="metric-value">{metrics.enabledCount}</strong></div>
        <div className="metric-card"><p className="metric-label">实时模式</p><strong className="metric-value">{metrics.liveCount}</strong></div>
        <div className="metric-card"><p className="metric-label">最近更新</p><strong className="metric-value">{metrics.latestUpdatedAtLabel}</strong></div>
      </div>

      <div className="table-toolbar">
        <TableSearchInput label="搜索模型" onChange={setQuery} value={query} />
        <button className="button" onClick={() => { setIsCreateOpen(true); setEditingId(null); }} type="button">
          新增模型
        </button>
      </div>

      {filteredProfiles.length === 0 ? (
        <div className="table-empty-state">
          <p className="muted">{profiles.length === 0 ? "还没有模型配置，先新增第一个模型。" : "没有匹配的模型配置，换一个关键词试试。"}</p>
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
                  <td><strong>{profile.name}</strong></td>
                  <td>{profile.provider}</td>
                  <td>{profile.mode === "demo" ? "演示模式" : "实时模式"}</td>
                  <td>{profile.defaultModel}</td>
                  <td>{profile.hasApiKey ? `已配置 Key · 尾号 ${profile.apiKeyLast4}` : "未配置 Key"}</td>
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
                        <input name="id" type="hidden" value={profile.id} />
                        <input name="confirmed" type="hidden" value="true" />
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
```

- [ ] **Step 6: Wire the models page to the new dashboard loader**

```tsx
import { ModelManager } from "@/components/model-manager";
import { getModelDashboardData } from "@/lib/llm-profiles";

export default async function ModelsPage() {
  const { metrics, profiles } = await getModelDashboardData();

  return (
    <section className="panel stack-lg">
      <div>
        <p className="section-eyebrow">Model Settings</p>
        <h1 className="section-title">模型设置</h1>
        <p className="section-copy">这里统一查看、搜索和维护模型配置。</p>
      </div>

      <ModelManager metrics={metrics} profiles={profiles} />
    </section>
  );
}
```

- [ ] **Step 7: Add a delete confirmation in the server action path**

```ts
export async function deleteLlmProfileAction(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const confirmed = formData.get("confirmed") === "true";

  if (!id) {
    throw new Error("缺少模型配置 ID。");
  }

  if (!confirmed) {
    throw new Error("删除模型配置前需要明确确认。");
  }

  await prisma.llmProfile.delete({
    where: { id },
  });

  revalidatePath("/models");
  revalidatePath("/reviews/new");
  revalidatePath("/");
}
```

- [ ] **Step 8: Run the model manager test to verify it passes**

Run: `npm test -- --run tests/components/model-manager.test.tsx`
Expected: PASS with `2 passed`

- [ ] **Step 9: Commit**

```bash
git add app/models/page.tsx components/model-manager.tsx components/model-editor-drawer.tsx lib/llm-profiles.ts lib/actions.ts tests/components/model-manager.test.tsx
git commit -m "feat: rebuild model settings as a table workflow"
```

## Task 3: Turn New Review Into A Single-Column Launch Flow

**Files:**
- Modify: `components/intake-workbench.tsx`
- Modify: `tests/components/intake-workbench.test.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add a failing test for the simplified launch layout**

```tsx
it("renders launch actions without the old split workbench copy", () => {
  render(
    <IntakeWorkbench
      llmProfiles={[
        { defaultModel: "qwen-plus", id: "profile-1", name: "Default", provider: "openai" },
      ]}
      rules={[{ category: "内容", description: "保持表达统一", id: "rule-1", name: "Tone" }]}
    />,
  );

  expect(screen.getByRole("heading", { level: 1, name: "新建评审" })).toBeInTheDocument();
  expect(screen.queryByText("这里先保留一个批量导入和批量配置的工作台外壳")).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "查看帮助" })).not.toBeInTheDocument();
});

it("keeps batch submission disabled until the required launch fields are complete", async () => {
  const user = userEvent.setup();

  render(
    <IntakeWorkbench
      importedFiles={[
        {
          id: "doc_1",
          documentId: "doc_1",
          name: "schedule.xlsx",
          fileType: "xlsx",
          status: "已导入",
        },
      ]}
      llmProfiles={[
        { defaultModel: "qwen-plus", id: "profile-1", name: "Default", provider: "openai" },
      ]}
      rules={[{ category: "内容", description: "保持表达统一", id: "rule-1", name: "Tone" }]}
    />,
  );

  const submitButton = screen.getByRole("button", { name: "开始批量评审" });

  expect(submitButton).toBeDisabled();

  await user.type(screen.getByLabelText("批次名称"), "四月策划案");

  expect(submitButton).toBeEnabled();
});
```

- [ ] **Step 2: Run the intake workbench test to verify it fails**

Run: `npm test -- --run tests/components/intake-workbench.test.tsx`
Expected: FAIL because the old split-layout copy still exists and the new assertions do not match

- [ ] **Step 3: Restructure the workbench header and sections into a pure launch flow**

```tsx
return (
  <section className="panel stack-lg launch-flow">
    <header className="stack">
      <p className="section-eyebrow">Review Launchpad</p>
      <h1 className="section-title">新建评审</h1>
      <p className="section-copy">按顺序完成批次信息、模型、规则和文件导入，然后直接创建评审。</p>
    </header>

    <section className="form-section">
      <div>
        <h2 className="subsection-title">批次信息</h2>
        <p className="section-copy">这一步只确认本次批量评审的名称与模型。</p>
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

      <div className="form-grid two">
        <div className="field">
          <label htmlFor="llmProfileId">模型配置</label>
          <select
            id="llmProfileId"
            name="llmProfileId"
            onChange={(event) => {
              const nextProfileId = event.target.value;
              const nextProfile = llmProfiles.find((profile) => profile.id === nextProfileId);

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
        <h2 className="subsection-title">规则选择</h2>
        <p className="section-copy">只保留本次真正需要的规则。</p>
      </div>
      <div className="checkbox-list">
        {rules.length === 0 ? (
          <div className="checkbox-card">
            <div>
              <strong>还没有启用规则</strong>
              <p className="muted">请先到规则管理页启用至少一条规则。</p>
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
                      : current.filter((item) => item !== rule.id),
                  );
                }}
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

    <section className="form-section">
      <div>
        <h2 className="subsection-title">文件导入</h2>
        <p className="section-copy">导入本地文件后，在当前页直接查看解析状态与摘要。</p>
      </div>
      <FilePicker />

      <div className="actions">
        <button
          className="button-secondary"
          disabled={isPickingFiles}
          onClick={handlePickFiles}
          type="button"
        >
          {isPickingFiles ? "正在导入…" : "导入本地文件"}
        </button>
        <button
          className="button-ghost"
          disabled={pendingRetryFiles.length === 0}
          onClick={handleClearRetryFiles}
          type="button"
        >
          清理待重新导入
        </button>
        <button
          className="button-ghost"
          disabled={workbenchFiles.length === 0}
          onClick={handleClearWorkbench}
          type="button"
        >
          清空当前工作区
        </button>
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      <div className="table-shell">
        <table aria-label="已导入文件" className="data-table">
          <thead>
            <tr>
              <th scope="col">文件名</th>
              <th scope="col">类型</th>
              <th scope="col">状态</th>
              <th scope="col">说明</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkbenchFiles.length === 0 ? (
              <tr>
                <td className="table-empty" colSpan={5}>
                  尚未导入文件，文件解析结果会在这里逐行呈现。
                </td>
              </tr>
            ) : (
              filteredWorkbenchFiles.map((file) => (
                <tr key={file.id}>
                  <th scope="row">{file.name}</th>
                  <td>{file.fileType ?? "待识别"}</td>
                  <td>{file.status ?? "待处理"}</td>
                  <td>{file.note ?? "等待批量提交"}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="button-ghost button-inline"
                        onClick={() => setSelectedSummaryId(file.id)}
                        type="button"
                      >
                        查看摘要
                      </button>
                      {!isReadyDocument(file) ? (
                        <button
                          className="button-ghost button-inline"
                          onClick={() => handleRetryImport(file.id)}
                          type="button"
                        >
                          重新导入
                        </button>
                      ) : null}
                      <button
                        className="button-ghost button-inline"
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

      {selectedSummaryFile?.summary ? (
        <aside className="summary-panel stack">
          <h3 className="subsection-title">解析摘要</h3>
          <p className="muted">{selectedSummaryFile.summary.title ?? selectedSummaryFile.name}</p>
          <p className="muted">
            {formatCount(selectedSummaryFile.summary.blockCount, "文档块")} ·{" "}
            {formatCount(selectedSummaryFile.summary.paragraphCount, "段落")}
          </p>
          <p className="muted">{selectedSummaryFile.summary.sourceLabel ?? "本地桌面导入"}</p>
        </aside>
      ) : null}
    </section>

    <div className="actions">
      <button
        className="button"
        disabled={
          isSubmitting ||
          !selectedProfileId ||
          selectedRuleIds.length === 0 ||
          readyDocuments.length === 0 ||
          batchName.trim().length === 0
        }
        onClick={handleCreateReviewBatch}
        type="button"
      >
        {isSubmitting ? "正在创建批次…" : "开始批量评审"}
      </button>
    </div>
  </section>
);
```

- [ ] **Step 4: Replace the split-layout CSS with a launch-flow friendly single-column layout**

```css
.launch-flow {
  width: min(100%, 980px);
  margin: 0 auto;
}

.launch-flow .form-section {
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.72);
}

.launch-flow .table-shell,
.launch-flow .summary-panel {
  width: 100%;
}

.launch-flow .actions {
  justify-content: flex-start;
}
```

- [ ] **Step 5: Run the intake workbench test to verify it passes**

Run: `npm test -- --run tests/components/intake-workbench.test.tsx`
Expected: PASS and includes the two new assertions

- [ ] **Step 6: Commit**

```bash
git add components/intake-workbench.tsx tests/components/intake-workbench.test.tsx app/globals.css
git commit -m "feat: simplify new review into a single launch flow"
```

## Task 4: Rebuild Docs As A Three-Column Knowledge Layout

**Files:**
- Create: `components/docs-shell.tsx`
- Create: `tests/components/docs-shell.test.tsx`
- Modify: `app/docs/page.tsx`
- Modify: `components/site-nav.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Write the failing docs shell tests**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DocsShell } from "@/components/docs-shell";

const sections = [
  {
    id: "workflow",
    label: "工作流程",
    title: "工作流程",
    summary: "先确认模型与规则，再导入文件并查看结果。",
    blocks: [
      { id: "workflow-start", title: "开始前准备", body: "确认模型配置与规则启用状态。" },
      { id: "workflow-review", title: "提交评审", body: "导入文档并提交评审任务。" },
    ],
  },
  {
    id: "models",
    label: "模型配置",
    title: "模型配置",
    summary: "管理供应商、默认模型和密钥状态。",
    blocks: [
      { id: "models-provider", title: "供应商与连接地址", body: "先确认 Base URL。" },
    ],
  },
];

describe("DocsShell", () => {
  it("switches the article body when the left docs nav changes", async () => {
    const user = userEvent.setup();

    render(<DocsShell sections={sections} />);

    await user.click(screen.getByRole("button", { name: "模型配置" }));

    expect(screen.getByRole("heading", { level: 2, name: "模型配置" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "工作流程" })).not.toBeInTheDocument();
  });

  it("collapses and expands both sidebars", async () => {
    const user = userEvent.setup();

    render(<DocsShell sections={sections} />);

    await user.click(screen.getByRole("button", { name: "折叠文档目录" }));
    await user.click(screen.getByRole("button", { name: "折叠文章目录" }));

    expect(screen.getByRole("button", { name: "展开文档目录" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "展开文章目录" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the docs shell test to verify it fails**

Run: `npm test -- --run tests/components/docs-shell.test.tsx`
Expected: FAIL because `DocsShell` does not exist yet

- [ ] **Step 3: Create the docs shell component with classic left-nav / article / right-toc layout**

```tsx
"use client";

import { useMemo, useState } from "react";

type DocsSection = {
  id: string;
  label: string;
  title: string;
  summary: string;
  blocks: Array<{
    id: string;
    title: string;
    body: string;
  }>;
};

export function DocsShell({ sections }: { sections: DocsSection[] }) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? "");
  const [isDocsNavCollapsed, setIsDocsNavCollapsed] = useState(false);
  const [isTocCollapsed, setIsTocCollapsed] = useState(false);
  const activeSection = useMemo(
    () => sections.find((section) => section.id === activeSectionId) ?? sections[0],
    [activeSectionId, sections],
  );

  if (!activeSection) {
    return null;
  }

  return (
    <div className="docs-layout">
      <aside className={`docs-sidebar ${isDocsNavCollapsed ? "is-collapsed" : ""}`}>
        <div className="docs-sidebar-header">
          <p className="section-eyebrow">文档目录</p>
          <button
            aria-label={isDocsNavCollapsed ? "展开文档目录" : "折叠文档目录"}
            className="button-ghost button-inline"
            onClick={() => setIsDocsNavCollapsed((value) => !value)}
            type="button"
          >
            {isDocsNavCollapsed ? "展开" : "折叠"}
          </button>
        </div>

        {!isDocsNavCollapsed ? (
          <nav className="docs-nav">
            {sections.map((section) => (
              <button
                className={section.id === activeSection.id ? "active" : undefined}
                key={section.id}
                onClick={() => setActiveSectionId(section.id)}
                type="button"
              >
                {section.label}
              </button>
            ))}
          </nav>
        ) : null}
      </aside>

      <article className="docs-article panel stack-lg">
        <div className="page-header">
          <p className="section-eyebrow">文档</p>
          <h1 className="section-title">文档</h1>
          <p className="section-copy">统一查看工作流程、模型配置、规则编写和结果阅读说明。</p>
        </div>

        <section className="stack" aria-label={activeSection.title}>
          <div className="page-header">
            <h2 className="subsection-title">{activeSection.title}</h2>
            <p className="section-copy">{activeSection.summary}</p>
          </div>

          {activeSection.blocks.map((block) => (
            <section className="list-item" id={block.id} key={block.id}>
              <div>
                <h3>{block.title}</h3>
                <p className="muted">{block.body}</p>
              </div>
            </section>
          ))}
        </section>
      </article>

      <aside className={`docs-toc ${isTocCollapsed ? "is-collapsed" : ""}`}>
        <div className="docs-sidebar-header">
          <p className="section-eyebrow">文章目录</p>
          <button
            aria-label={isTocCollapsed ? "展开文章目录" : "折叠文章目录"}
            className="button-ghost button-inline"
            onClick={() => setIsTocCollapsed((value) => !value)}
            type="button"
          >
            {isTocCollapsed ? "展开" : "折叠"}
          </button>
        </div>

        {!isTocCollapsed ? (
          <nav className="docs-nav">
            {activeSection.blocks.map((block) => (
              <a href={`#${block.id}`} key={block.id}>
                {block.title}
              </a>
            ))}
          </nav>
        ) : null}
      </aside>
    </div>
  );
}
```

- [ ] **Step 4: Replace the static docs page with a structured docs data source**

```tsx
import { DocsShell } from "@/components/docs-shell";

const sections = [
  {
    id: "workflow",
    label: "工作流程",
    title: "工作流程",
    summary: "先确认模型与规则准备好，再导入文件、提交评审并回到结果页复核。",
    blocks: [
      { id: "workflow-models", title: "先检查模型配置", body: "确认供应商连接可用、默认模型正确、API Key 状态符合预期。" },
      { id: "workflow-rules", title: "再确认本次规则", body: "只保留本次评审真正需要的规则，避免一次性塞入过多口径。" },
      { id: "workflow-submit", title: "导入文档并提交评审", body: "文档会被解析后送入后台任务队列，前台只负责展示状态与结果。" },
      { id: "workflow-review", title: "回到结果页复核", body: "按摘要、命中列表和原文定位逐步核对结论是否成立。" },
    ],
  },
  {
    id: "models",
    label: "模型配置",
    title: "模型配置",
    summary: "模型设置页负责管理供应商、默认模型和密钥状态。",
    blocks: [
      { id: "models-provider", title: "供应商与连接地址", body: "优先确认 Base URL 和供应商信息没有偏差。" },
      { id: "models-default-model", title: "默认模型", body: "优先选择稳定、成本可控、输出格式一致的默认模型。" },
      { id: "models-key", title: "API Key 与可用性", body: "提交前确认密钥尾号和连接状态符合预期，避免后台任务直接失败。" },
    ],
  },
  {
    id: "rules",
    label: "规则编写",
    title: "规则编写",
    summary: "规则应该是可执行的检查指令，而不是模糊愿望。",
    blocks: [
      { id: "rules-target", title: "先写检查目标", body: "明确这条规则到底在看一致性、缺失项还是数字错误。" },
      { id: "rules-criteria", title: "再写判断标准", body: "明确什么情况算命中，什么情况算通过。" },
      { id: "rules-output", title: "最后定义命中输出", body: "写清楚问题摘要、原文依据、修正建议和严重程度。" },
    ],
  },
  {
    id: "results",
    label: "结果阅读",
    title: "结果阅读",
    summary: "结果页不只是看总分，而是要顺着问题和原文逐步核对。",
    blocks: [
      { id: "results-status", title: "先看整体状态", body: "completed 可以直接核对；partial 或 failed 先看错误信息和可恢复片段。" },
      { id: "results-evidence", title: "再看命中与证据", body: "每个问题都应该能回到原文位置，优先检查命中证据是否完整。" },
      { id: "results-next-step", title: "最后决定下一步", body: "规则问题回规则页，模型问题回模型页，文档问题重新上传再跑。" },
    ],
  },
] as const;

export default function DocsPage() {
  return (
    <DocsShell
      sections={sections.map((section) => ({
        id: section.id,
        label: section.label,
        title: section.title,
        summary: section.summary,
        blocks: section.blocks.map((block) => ({
          id: block.id,
          title: block.title,
          body: block.body,
        })),
      }))}
    />
  );
}
```

- [ ] **Step 5: Update nav labeling and docs-specific styles**

```tsx
const navItems: NavItem[] = [
  { href: "/", label: "总览" },
  { href: "/reviews", label: "评审列表" },
  { href: "/reviews/new", label: "新建评审" },
  { href: "/rules", label: "规则管理" },
  { href: "/models", label: "模型设置" },
  { href: "/docs", label: "文档" },
];
```

```css
.docs-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 220px;
  gap: 20px;
  align-items: start;
}

.docs-sidebar,
.docs-toc {
  position: sticky;
  top: 110px;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.76);
}

.docs-sidebar.is-collapsed,
.docs-toc.is-collapsed {
  width: 72px;
}

.docs-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.docs-nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.docs-nav button,
.docs-nav a {
  display: block;
  text-align: left;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.72);
}

.docs-nav .active {
  border-color: rgba(15, 118, 110, 0.24);
  background: rgba(15, 118, 110, 0.12);
  color: var(--brand-strong);
  font-weight: 700;
}

@media (max-width: 1180px) {
  .docs-layout {
    grid-template-columns: 1fr;
  }

  .docs-sidebar,
  .docs-toc {
    position: static;
  }
}
```

- [ ] **Step 6: Run the docs shell test to verify it passes**

Run: `npm test -- --run tests/components/docs-shell.test.tsx`
Expected: PASS with `2 passed`

- [ ] **Step 7: Run the full UI test suite for the touched components**

Run: `npm test -- --run tests/components/intake-workbench.test.tsx tests/components/model-manager.test.tsx tests/components/rules-table.test.tsx tests/components/review-jobs-table.test.tsx tests/components/docs-shell.test.tsx`
Expected: PASS with all component suites green

- [ ] **Step 8: Commit**

```bash
git add app/docs/page.tsx app/globals.css components/docs-shell.tsx components/site-nav.tsx tests/components/docs-shell.test.tsx
git commit -m "feat: rebuild docs as a three-column workspace"
```

## Task 5: Final Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the usage flow in the README to match the cleaned-up interaction model**

```md
## 使用流程

1. 在顶部“模型设置”中创建或启用一个模型配置
2. 在“规则管理”中确认本次需要的规则
3. 在“新建评审”中按顺序填写批次信息、模型、规则并导入文件
4. 在“评审列表”中等待后台任务完成
5. 在“文档”页查看完整操作说明
```

- [ ] **Step 2: Run the full regression suite**

Run: `npm test -- --run`
Expected: PASS with all component and desktop suites green

- [ ] **Step 3: Run a production build to verify the UI refactor does not break Next output**

Run: `npm run build`
Expected: PASS with `Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: align usage flow with desktop interaction cleanup"
```
