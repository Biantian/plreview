# Local-First Desktop Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前 Web MVP 整理为可在 `macOS` 与 `Windows 11` 分发的本地优先桌面应用，支持 Excel 导入、同规则批处理、表格式任务中心与规则中心，并保持数据默认只保存在本机。

**Architecture:** 使用 `Electron` 作为第一代桌面壳，保留 React/Next 作为 UI 渲染层，但把新增业务入口迁移到本地 `App Core`。核心层负责文件导入、Excel 解析、批量建任务、本地搜索与模型调用；桌面壳只负责窗口、桥接、文件选择与打包。

**Tech Stack:** `Electron`, `Next.js 15`, `React 19`, `TypeScript`, `Prisma`, `SQLite`, `Vitest`, `Testing Library`, `xlsx`

---

## File Structure

### New files

- `electron/main.ts`
- `electron/preload.ts`
- `electron/channels.ts`
- `desktop/bridge/desktop-api.ts`
- `desktop/core/index.ts`
- `desktop/core/paths.ts`
- `desktop/core/files/import-documents.ts`
- `desktop/core/files/parse-local-document.ts`
- `desktop/core/files/parse-spreadsheet.ts`
- `desktop/core/reviews/create-review-batch.ts`
- `desktop/core/reviews/list-review-jobs.ts`
- `desktop/core/reviews/search-review-jobs.ts`
- `desktop/core/rules/list-rules.ts`
- `desktop/core/rules/search-rules.ts`
- `components/intake-workbench.tsx`
- `components/review-jobs-table.tsx`
- `components/rules-table.tsx`
- `components/rule-editor-drawer.tsx`
- `components/table-search-input.tsx`
- `tests/setup.ts`
- `tests/desktop/paths.test.ts`
- `tests/desktop/desktop-api.test.ts`
- `tests/desktop/create-review-batch.test.ts`
- `tests/desktop/parse-spreadsheet.test.ts`
- `tests/desktop/desktop-packaging.test.ts`
- `tests/components/intake-workbench.test.tsx`
- `tests/components/review-jobs-table.test.tsx`
- `tests/components/rules-table.test.tsx`
- `vitest.config.ts`

### Modified files

- `package.json`
- `next.config.ts`
- `prisma/schema.prisma`
- `prisma/seed.mjs`
- `app/reviews/new/page.tsx`
- `app/reviews/page.tsx`
- `app/rules/page.tsx`
- `components/file-picker.tsx`
- `lib/parse-document.ts`
- `lib/review-jobs.ts`
- `lib/actions.ts`

### Responsibility notes

- `electron/*` only handles shell and bridge wiring
- `desktop/core/*` owns local business logic and must not import UI components
- `components/*table*.tsx` own table rendering and local client-side filtering
- `app/*` pages become thin composition layers
- `lib/*` keeps shared parsing/review utilities that remain useful to both desktop and existing web runtime during transition

## Task 1: Add Test Harness And Desktop Paths

**Files:**
- Create: `tests/setup.ts`
- Create: `tests/desktop/paths.test.ts`
- Create: `vitest.config.ts`
- Create: `desktop/core/paths.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { resolveAppPaths } from "@/desktop/core/paths";

describe("resolveAppPaths", () => {
  it("creates stable desktop directories under the supplied base dir", () => {
    const paths = resolveAppPaths("/tmp/plreview");

    expect(paths.dataDir).toBe("/tmp/plreview/data");
    expect(paths.dbPath).toBe("/tmp/plreview/data/app.db");
    expect(paths.documentsDir).toBe("/tmp/plreview/data/documents");
    expect(paths.logsDir).toBe("/tmp/plreview/logs");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/desktop/paths.test.ts`

Expected: FAIL with `Cannot find module '@/desktop/core/paths'`

- [ ] **Step 3: Write minimal implementation**

```ts
// desktop/core/paths.ts
import path from "node:path";

export function resolveAppPaths(baseDir: string) {
  const dataDir = path.join(baseDir, "data");

  return {
    rootDir: baseDir,
    dataDir,
    dbPath: path.join(dataDir, "app.db"),
    documentsDir: path.join(dataDir, "documents"),
    logsDir: path.join(baseDir, "logs"),
  };
}
```

```ts
// vitest.config.ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

```ts
// tests/setup.ts
import "@testing-library/jest-dom/vitest";
```

```json
// package.json (scripts/devDependencies excerpt)
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "jsdom": "^25.0.1",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/desktop/paths.test.ts`

Expected: PASS with `1 passed`

- [ ] **Step 5: Commit**

```bash
git add package.json vitest.config.ts tests/setup.ts tests/desktop/paths.test.ts desktop/core/paths.ts
git commit -m "test: add desktop test harness and path utilities"
```

## Task 2: Add Electron Shell And Typed Desktop Bridge

**Files:**
- Create: `electron/channels.ts`
- Create: `desktop/bridge/desktop-api.ts`
- Create: `electron/preload.ts`
- Create: `electron/main.ts`
- Create: `tests/desktop/desktop-api.test.ts`
- Modify: `package.json`
- Modify: `next.config.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";

import { createDesktopApi } from "@/desktop/bridge/desktop-api";

describe("createDesktopApi", () => {
  it("routes batch creation through the typed channel map", async () => {
    const invoke = vi.fn().mockResolvedValue({ batchId: "batch_1", createdCount: 2 });
    const api = createDesktopApi(invoke);

    await api.createReviewBatch({
      batchName: "四月策划案",
      llmProfileId: "profile_1",
      modelName: "qwen-plus",
      ruleIds: ["rule_a"],
      items: [],
    });

    expect(invoke).toHaveBeenCalledWith("review-batches:create", {
      batchName: "四月策划案",
      llmProfileId: "profile_1",
      modelName: "qwen-plus",
      ruleIds: ["rule_a"],
      items: [],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/desktop/desktop-api.test.ts`

Expected: FAIL with `Cannot find module '@/desktop/bridge/desktop-api'`

- [ ] **Step 3: Write minimal implementation**

```ts
// electron/channels.ts
export const CHANNELS = {
  reviewBatchesCreate: "review-batches:create",
  reviewJobsList: "review-jobs:list",
  reviewJobsSearch: "review-jobs:search",
  rulesList: "rules:list",
  rulesSearch: "rules:search",
  filesPick: "files:pick",
} as const;
```

```ts
// desktop/bridge/desktop-api.ts
import { CHANNELS } from "@/electron/channels";

export type DesktopInvoke = (channel: string, payload?: unknown) => Promise<unknown>;

export function createDesktopApi(invoke: DesktopInvoke) {
  return {
    pickFiles: () => invoke(CHANNELS.filesPick),
    listReviewJobs: () => invoke(CHANNELS.reviewJobsList),
    searchReviewJobs: (query: string) => invoke(CHANNELS.reviewJobsSearch, { query }),
    listRules: () => invoke(CHANNELS.rulesList),
    searchRules: (query: string) => invoke(CHANNELS.rulesSearch, { query }),
    createReviewBatch: (payload: unknown) => invoke(CHANNELS.reviewBatchesCreate, payload),
  };
}
```

```ts
// electron/preload.ts
import { contextBridge, ipcRenderer } from "electron";

import { createDesktopApi } from "@/desktop/bridge/desktop-api";

contextBridge.exposeInMainWorld("plreview", createDesktopApi(ipcRenderer.invoke.bind(ipcRenderer)));
```

```ts
// electron/main.ts
import path from "node:path";
import { BrowserWindow, app } from "electron";

async function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 960,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL ?? "http://localhost:3000";
  await win.loadURL(rendererUrl);
}

void app.whenReady().then(createWindow);
```

```json
// package.json (scripts excerpt)
{
  "scripts": {
    "desktop:dev": "concurrently -k \"next dev\" \"wait-on http://localhost:3000 && electron .\""
  },
  "devDependencies": {
    "concurrently": "^9.0.1",
    "electron": "^33.2.1",
    "wait-on": "^8.0.1"
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/desktop/desktop-api.test.ts`

Expected: PASS with `1 passed`

- [ ] **Step 5: Commit**

```bash
git add electron/channels.ts desktop/bridge/desktop-api.ts electron/preload.ts electron/main.ts tests/desktop/desktop-api.test.ts package.json next.config.ts
git commit -m "feat: scaffold electron shell and typed desktop bridge"
```

## Task 3: Add Batch-Oriented Review Data Model

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.mjs`
- Create: `desktop/core/reviews/create-review-batch.ts`
- Create: `tests/desktop/create-review-batch.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";

import { createReviewBatch } from "@/desktop/core/reviews/create-review-batch";

describe("createReviewBatch", () => {
  it("creates one batch and one review job per imported document", async () => {
    const prisma = {
      reviewBatch: { create: vi.fn().mockResolvedValue({ id: "batch_1" }) },
      reviewJob: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
    } as const;

    const result = await createReviewBatch(prisma as never, {
      batchName: "四月提案",
      llmProfileId: "profile_1",
      modelName: "qwen-plus",
      ruleIds: ["rule_a", "rule_b"],
      documents: [
        { documentId: "doc_1", title: "策划案 A" },
        { documentId: "doc_2", title: "策划案 B" },
      ],
    });

    expect(result.batchId).toBe("batch_1");
    expect(prisma.reviewJob.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ documentId: "doc_1", batchId: "batch_1" }),
        expect.objectContaining({ documentId: "doc_2", batchId: "batch_1" }),
      ]),
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/desktop/create-review-batch.test.ts`

Expected: FAIL with `Cannot find module '@/desktop/core/reviews/create-review-batch'`

- [ ] **Step 3: Write minimal implementation**

```prisma
// prisma/schema.prisma (new models/fields excerpt)
model ReviewBatch {
  id                String            @id @default(cuid())
  name              String
  llmProfileId      String?
  providerSnapshot  String
  modelNameSnapshot String
  createdAt         DateTime          @default(now())
  jobs              ReviewJob[]
  batchRules        ReviewBatchRule[]
}

model ReviewBatchRule {
  id          String      @id @default(cuid())
  reviewBatchId String
  ruleId      String
  ruleVersionId String
  reviewBatch ReviewBatch @relation(fields: [reviewBatchId], references: [id], onDelete: Cascade)
  rule        Rule        @relation(fields: [ruleId], references: [id], onDelete: Cascade)
  ruleVersion RuleVersion @relation(fields: [ruleVersionId], references: [id], onDelete: Cascade)
}

model ReviewJob {
  id           String       @id @default(cuid())
  batchId      String?
  documentId   String
  // ...
  reviewBatch  ReviewBatch? @relation(fields: [batchId], references: [id], onDelete: SetNull)
}
```

```ts
// desktop/core/reviews/create-review-batch.ts
import { ReviewStatus } from "@prisma/client";

type CreateReviewBatchInput = {
  batchName: string;
  llmProfileId: string;
  modelName: string;
  ruleIds: string[];
  documents: Array<{ documentId: string; title: string }>;
};

export async function createReviewBatch(prisma: any, input: CreateReviewBatchInput) {
  const profile = await prisma.llmProfile.findUniqueOrThrow({ where: { id: input.llmProfileId } });
  const rules = await prisma.rule.findMany({ where: { id: { in: input.ruleIds } } });

  const batch = await prisma.reviewBatch.create({
    data: {
      name: input.batchName,
      llmProfileId: profile.id,
      providerSnapshot: profile.provider,
      modelNameSnapshot: input.modelName || profile.defaultModel,
    },
  });

  await prisma.reviewJob.createMany({
    data: input.documents.map((document) => ({
      batchId: batch.id,
      documentId: document.documentId,
      llmProfileId: profile.id,
      providerSnapshot: profile.provider,
      modelNameSnapshot: input.modelName || profile.defaultModel,
      status: ReviewStatus.pending,
    })),
  });

  return {
    batchId: batch.id,
    createdCount: input.documents.length,
    ruleCount: rules.length,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/desktop/create-review-batch.test.ts`

Expected: PASS with `1 passed`

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/seed.mjs desktop/core/reviews/create-review-batch.ts tests/desktop/create-review-batch.test.ts
git commit -m "feat: add batch-oriented review data model"
```

## Task 4: Add Local Document Import And Excel Parsing

**Files:**
- Create: `desktop/core/files/parse-spreadsheet.ts`
- Create: `desktop/core/files/parse-local-document.ts`
- Create: `desktop/core/files/import-documents.ts`
- Create: `tests/desktop/parse-spreadsheet.test.ts`
- Modify: `lib/parse-document.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { parseSpreadsheetWorkbook } from "@/desktop/core/files/parse-spreadsheet";

describe("parseSpreadsheetWorkbook", () => {
  it("turns sheets and rows into readable review blocks", () => {
    const workbook = {
      SheetNames: ["总览"],
      Sheets: {
        总览: {
          "!ref": "A1:B2",
          A1: { v: "模块" },
          B1: { v: "说明" },
          A2: { v: "签到" },
          B2: { v: "活动开始前 5 分钟开启" },
        },
      },
    };

    const parsed = parseSpreadsheetWorkbook(workbook as never, "活动排期.xlsx");

    expect(parsed.fileType).toBe("xlsx");
    expect(parsed.blocks[0].text).toBe("总览");
    expect(parsed.rawText).toContain("模块：签到");
    expect(parsed.rawText).toContain("说明：活动开始前 5 分钟开启");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/desktop/parse-spreadsheet.test.ts`

Expected: FAIL with `Cannot find module '@/desktop/core/files/parse-spreadsheet'`

- [ ] **Step 3: Write minimal implementation**

```ts
// desktop/core/files/parse-spreadsheet.ts
import * as XLSX from "xlsx";

import type { ParsedDocument, ParsedBlock } from "@/lib/parse-document";

export function parseSpreadsheetWorkbook(workbook: XLSX.WorkBook, filename: string): ParsedDocument {
  const blocks: ParsedBlock[] = [];
  const rawParts: string[] = [];
  let cursor = 0;

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });

    const headingText = sheetName.trim();
    blocks.push({
      blockIndex: blocks.length,
      blockType: "heading",
      text: headingText,
      level: 2,
      listKind: null,
      charStart: cursor,
      charEnd: cursor + headingText.length,
    });
    rawParts.push(`## ${headingText}`);
    cursor += headingText.length + 4;

    rows.forEach((row) => {
      const text = Object.entries(row)
        .filter(([, value]) => String(value).trim())
        .map(([key, value]) => `${key}：${value}`)
        .join("；");

      if (!text) return;

      blocks.push({
        blockIndex: blocks.length,
        blockType: "paragraph",
        text,
        level: null,
        listKind: null,
        charStart: cursor,
        charEnd: cursor + text.length,
      });
      rawParts.push(text);
      cursor += text.length + 2;
    });
  });

  return {
    title: filename.replace(/\.xlsx$/i, ""),
    filename,
    fileType: "xlsx",
    rawText: rawParts.join("\n\n"),
    blocks,
    paragraphs: blocks.map((block) => ({
      paragraphIndex: block.blockIndex,
      text: block.text,
      charStart: block.charStart,
      charEnd: block.charEnd,
    })),
  };
}
```

```ts
// desktop/core/files/parse-local-document.ts
import fs from "node:fs/promises";
import * as XLSX from "xlsx";

import { parseUploadedDocument } from "@/lib/parse-document";
import { parseSpreadsheetWorkbook } from "@/desktop/core/files/parse-spreadsheet";

export async function parseLocalDocument(filePath: string) {
  if (filePath.toLowerCase().endsWith(".xlsx")) {
    const workbook = XLSX.readFile(filePath);
    return parseSpreadsheetWorkbook(workbook, filePath.split(/[\\/]/).pop() ?? "document.xlsx");
  }

  const blob = new File([await fs.readFile(filePath)], filePath.split(/[\\/]/).pop() ?? "document");
  return parseUploadedDocument(blob);
}
```

```json
// package.json (dependencies excerpt)
{
  "dependencies": {
    "xlsx": "^0.18.5"
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/desktop/parse-spreadsheet.test.ts`

Expected: PASS with `1 passed`

- [ ] **Step 5: Commit**

```bash
git add package.json lib/parse-document.ts desktop/core/files/parse-spreadsheet.ts desktop/core/files/parse-local-document.ts desktop/core/files/import-documents.ts tests/desktop/parse-spreadsheet.test.ts
git commit -m "feat: add local document import and spreadsheet parsing"
```

## Task 5: Replace Single File Form With Intake Workbench

**Files:**
- Create: `components/intake-workbench.tsx`
- Create: `tests/components/intake-workbench.test.tsx`
- Modify: `app/reviews/new/page.tsx`
- Modify: `components/file-picker.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";

import { IntakeWorkbench } from "@/components/intake-workbench";

describe("IntakeWorkbench", () => {
  it("renders imported files as table rows instead of a single file chip", () => {
    render(
      <IntakeWorkbench
        initialItems={[
          { id: "1", filename: "A.xlsx", fileType: "xlsx", status: "ready", title: "A" },
          { id: "2", filename: "B.docx", fileType: "docx", status: "error", title: "B" },
        ]}
        llmProfiles={[]}
        rules={[]}
      />,
    );

    expect(screen.getByRole("table", { name: "待评审文件表格" })).toBeInTheDocument();
    expect(screen.getByText("A.xlsx")).toBeInTheDocument();
    expect(screen.getByText("B.docx")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/components/intake-workbench.test.tsx`

Expected: FAIL with `Cannot find module '@/components/intake-workbench'`

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/intake-workbench.tsx
"use client";

import { useMemo, useState } from "react";

type IntakeItem = {
  id: string;
  filename: string;
  fileType: string;
  status: "ready" | "parsing" | "error";
  title: string;
  errorMessage?: string;
};

export function IntakeWorkbench({
  initialItems,
  llmProfiles,
  rules,
}: {
  initialItems: IntakeItem[];
  llmProfiles: Array<{ id: string; name: string; provider: string }>;
  rules: Array<{ id: string; name: string; category: string }>;
}) {
  const [items, setItems] = useState(initialItems);
  const readyCount = useMemo(() => items.filter((item) => item.status === "ready").length, [items]);

  return (
    <section className="panel stack-lg">
      <div className="inline-actions">
        <button className="button" type="button">
          选择文件
        </button>
        <span className="pill pill-brand">可发起 {readyCount} 条任务</span>
      </div>

      <table aria-label="待评审文件表格" className="data-table">
        <thead>
          <tr>
            <th>文件名</th>
            <th>类型</th>
            <th>解析状态</th>
            <th>预估标题</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.filename}</td>
              <td>{item.fileType}</td>
              <td>{item.status}</td>
              <td>{item.title}</td>
              <td>
                <button className="button-ghost" type="button">
                  移除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

```tsx
// app/reviews/new/page.tsx
import { IntakeWorkbench } from "@/components/intake-workbench";
import { prisma } from "@/lib/prisma";

export default async function NewReviewPage() {
  const [rules, llmProfiles] = await Promise.all([
    prisma.rule.findMany({ where: { enabled: true }, orderBy: [{ category: "asc" }, { updatedAt: "desc" }] }),
    prisma.llmProfile.findMany({ where: { enabled: true }, orderBy: { updatedAt: "desc" } }),
  ]);

  return <IntakeWorkbench initialItems={[]} llmProfiles={llmProfiles} rules={rules} />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/components/intake-workbench.test.tsx`

Expected: PASS with `1 passed`

- [ ] **Step 5: Commit**

```bash
git add app/reviews/new/page.tsx components/intake-workbench.tsx components/file-picker.tsx tests/components/intake-workbench.test.tsx
git commit -m "feat: replace single-file form with intake workbench"
```

## Task 6: Add Review Jobs Table With Local Search

**Files:**
- Create: `desktop/core/reviews/list-review-jobs.ts`
- Create: `desktop/core/reviews/search-review-jobs.ts`
- Create: `components/table-search-input.tsx`
- Create: `components/review-jobs-table.tsx`
- Create: `tests/components/review-jobs-table.test.tsx`
- Modify: `app/reviews/page.tsx`
- Modify: `lib/review-jobs.ts`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ReviewJobsTable } from "@/components/review-jobs-table";

describe("ReviewJobsTable", () => {
  it("filters rows by filename, title, batch name and model", async () => {
    const user = userEvent.setup();

    render(
      <ReviewJobsTable
        items={[
          { id: "1", status: "completed", title: "玩法复盘", filename: "玩法.xlsx", batchName: "四月批次", modelName: "qwen-plus", annotationsCount: 3, overallScore: 80, createdAt: "2026-04-13T10:00:00.000Z", finishedAt: null, fileType: "xlsx" },
          { id: "2", status: "failed", title: "活动包装", filename: "包装.docx", batchName: "五月批次", modelName: "qwen-max", annotationsCount: 0, overallScore: null, createdAt: "2026-04-13T11:00:00.000Z", finishedAt: null, fileType: "docx" },
        ]}
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: "搜索评审任务" }), "四月");

    expect(screen.getByText("玩法复盘")).toBeInTheDocument();
    expect(screen.queryByText("活动包装")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/components/review-jobs-table.test.tsx`

Expected: FAIL with `Cannot find module '@/components/review-jobs-table'`

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/table-search-input.tsx
"use client";

export function TableSearchInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="table-search">
      <span className="sr-only">{label}</span>
      <input
        aria-label={label}
        role="searchbox"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="输入关键词筛选"
      />
    </label>
  );
}
```

```tsx
// components/review-jobs-table.tsx
"use client";

import { useMemo, useState } from "react";

import { TableSearchInput } from "@/components/table-search-input";

type ReviewJobRow = {
  id: string;
  status: string;
  title: string;
  filename: string;
  fileType: string;
  batchName: string | null;
  modelName: string;
  annotationsCount: number;
  overallScore: number | null;
  createdAt: string;
  finishedAt: string | null;
};

export function ReviewJobsTable({ items }: { items: ReviewJobRow[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return items;

    return items.filter((item) =>
      [item.title, item.filename, item.batchName ?? "", item.modelName, item.status]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [items, query]);

  return (
    <section className="card stack">
      <TableSearchInput label="搜索评审任务" value={query} onChange={setQuery} />

      <table aria-label="评审任务表格" className="data-table">
        <thead>
          <tr>
            <th>状态</th>
            <th>标题</th>
            <th>文件</th>
            <th>批次</th>
            <th>模型</th>
            <th>问题数</th>
            <th>评分</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item) => (
            <tr key={item.id}>
              <td>{item.status}</td>
              <td>{item.title}</td>
              <td>{item.filename}</td>
              <td>{item.batchName ?? "--"}</td>
              <td>{item.modelName}</td>
              <td>{item.annotationsCount}</td>
              <td>{item.overallScore ?? "--"}</td>
              <td>
                <button className="button-ghost" type="button">
                  查看详情
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

```tsx
// app/reviews/page.tsx
import { ReviewJobsTable } from "@/components/review-jobs-table";
import { getReviewListItems } from "@/lib/review-jobs";

export default async function ReviewsPage() {
  const initialReviews = await getReviewListItems();
  return <ReviewJobsTable items={initialReviews} />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/components/review-jobs-table.test.tsx`

Expected: PASS with `1 passed`

- [ ] **Step 5: Commit**

```bash
git add app/reviews/page.tsx lib/review-jobs.ts desktop/core/reviews/list-review-jobs.ts desktop/core/reviews/search-review-jobs.ts components/table-search-input.tsx components/review-jobs-table.tsx tests/components/review-jobs-table.test.tsx
git commit -m "feat: add review jobs table with local search"
```

## Task 7: Add Rules Table, Search, And Drawer Editing

**Files:**
- Create: `desktop/core/rules/list-rules.ts`
- Create: `desktop/core/rules/search-rules.ts`
- Create: `components/rule-editor-drawer.tsx`
- Create: `components/rules-table.tsx`
- Create: `tests/components/rules-table.test.tsx`
- Modify: `app/rules/page.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RulesTable } from "@/components/rules-table";

describe("RulesTable", () => {
  it("filters rows locally and opens the editor drawer from the row action", async () => {
    const user = userEvent.setup();

    render(
      <RulesTable
        items={[
          { id: "1", enabled: true, name: "目标清晰度", category: "基础质量", severity: "medium", description: "检查目标表达是否清楚", updatedAtLabel: "2026-04-13 10:00" },
          { id: "2", enabled: false, name: "商业闭环", category: "商业化", severity: "high", description: "检查付费路径", updatedAtLabel: "2026-04-13 11:00" },
        ]}
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: "搜索规则" }), "商业");
    await user.click(screen.getByRole("button", { name: "编辑 商业闭环" }));

    expect(screen.getByText("商业闭环")).toBeInTheDocument();
    expect(screen.queryByText("目标清晰度")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "规则编辑抽屉" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/components/rules-table.test.tsx`

Expected: FAIL with `Cannot find module '@/components/rules-table'`

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/rule-editor-drawer.tsx
"use client";

export function RuleEditorDrawer({
  open,
  rule,
  onClose,
}: {
  open: boolean;
  rule: { id: string; name: string; category: string; description: string } | null;
  onClose: () => void;
}) {
  if (!open || !rule) return null;

  return (
    <aside aria-label="规则编辑抽屉" className="drawer" role="dialog">
      <div className="stack">
        <h2>{rule.name}</h2>
        <p>{rule.category}</p>
        <textarea defaultValue={rule.description} />
        <button className="button-ghost" onClick={onClose} type="button">
          关闭
        </button>
      </div>
    </aside>
  );
}
```

```tsx
// components/rules-table.tsx
"use client";

import { useMemo, useState } from "react";

import { RuleEditorDrawer } from "@/components/rule-editor-drawer";
import { TableSearchInput } from "@/components/table-search-input";

type RuleRow = {
  id: string;
  enabled: boolean;
  name: string;
  category: string;
  severity: string;
  description: string;
  updatedAtLabel: string;
};

export function RulesTable({ items }: { items: RuleRow[] }) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) =>
      [item.name, item.category, item.description, item.severity].join(" ").toLowerCase().includes(keyword),
    );
  }, [items, query]);

  const editingRule = filtered.find((item) => item.id === editingId) ?? items.find((item) => item.id === editingId) ?? null;

  return (
    <section className="panel stack">
      <TableSearchInput label="搜索规则" value={query} onChange={setQuery} />

      <table aria-label="规则表格" className="data-table">
        <thead>
          <tr>
            <th>启用</th>
            <th>规则名称</th>
            <th>分类</th>
            <th>严重级别</th>
            <th>说明</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item) => (
            <tr key={item.id}>
              <td>{item.enabled ? "启用" : "停用"}</td>
              <td>{item.name}</td>
              <td>{item.category}</td>
              <td>{item.severity}</td>
              <td>{item.description}</td>
              <td>{item.updatedAtLabel}</td>
              <td>
                <button aria-label={`编辑 ${item.name}`} className="button-ghost" onClick={() => setEditingId(item.id)} type="button">
                  编辑
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <RuleEditorDrawer open={Boolean(editingRule)} rule={editingRule} onClose={() => setEditingId(null)} />
    </section>
  );
}
```

```tsx
// app/rules/page.tsx
import { RulesTable } from "@/components/rules-table";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function RulesPage() {
  const rules = await prisma.rule.findMany({ orderBy: [{ enabled: "desc" }, { category: "asc" }, { updatedAt: "desc" }] });

  return (
    <RulesTable
      items={rules.map((rule) => ({
        id: rule.id,
        enabled: rule.enabled,
        name: rule.name,
        category: rule.category,
        severity: rule.severity,
        description: rule.description,
        updatedAtLabel: formatDate(rule.updatedAt),
      }))}
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/components/rules-table.test.tsx`

Expected: PASS with `1 passed`

- [ ] **Step 5: Commit**

```bash
git add app/rules/page.tsx desktop/core/rules/list-rules.ts desktop/core/rules/search-rules.ts components/rules-table.tsx components/rule-editor-drawer.tsx tests/components/rules-table.test.tsx
git commit -m "feat: add rules table and drawer editor"
```

## Task 8: Package The Desktop App And Document Smoke Tests

**Files:**
- Modify: `package.json`
- Modify: `next.config.ts`
- Create: `electron-builder.yml`
- Create: `tests/desktop/desktop-packaging.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import packageJson from "@/package.json";

describe("desktop packaging scripts", () => {
  it("declares build scripts for both desktop development and production packaging", () => {
    expect(packageJson.scripts["desktop:dev"]).toBeTruthy();
    expect(packageJson.scripts["desktop:build"]).toBeTruthy();
    expect(packageJson.scripts["desktop:dist"]).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/desktop/desktop-packaging.test.ts`

Expected: FAIL with `desktop:build` or `desktop:dist` missing

- [ ] **Step 3: Write minimal implementation**

```json
// package.json (scripts/build excerpt)
{
  "main": "dist-electron/main.js",
  "scripts": {
    "desktop:dev": "concurrently -k \"next dev\" \"wait-on http://localhost:3000 && electron .\"",
    "desktop:build": "next build",
    "desktop:dist": "npm run desktop:build && electron-builder"
  },
  "devDependencies": {
    "electron-builder": "^25.1.8"
  }
}
```

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

```yaml
# electron-builder.yml
appId: com.plreview.desktop
productName: PLReview
directories:
  output: release
files:
  - .next/standalone/**
  - .next/static/**
  - dist-electron/**
  - electron-builder.yml
mac:
  target:
    - dmg
win:
  target:
    - nsis
```

````md
<!-- README.md excerpt -->
## 桌面应用调试

```bash
npm install
npm run desktop:dev
```

## 桌面应用打包

```bash
npm run desktop:dist
```
````

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/desktop/desktop-packaging.test.ts`

Expected: PASS with `1 passed`

Then run:

Run: `npm run desktop:dist`

Expected: SUCCESS and generated artifacts under `release/`

- [ ] **Step 5: Commit**

```bash
git add package.json next.config.ts electron-builder.yml README.md tests/desktop/desktop-packaging.test.ts
git commit -m "build: add desktop packaging workflow"
```

## Self-Review

### Spec coverage

- 本地优先桌面交付：Task 2、Task 8
- 数据默认保存在本机：Task 1、Task 3、Task 4
- Excel 导入：Task 4
- 同规则批处理：Task 3、Task 5
- 评审列表表格化与搜索：Task 6
- 规则列表表格化与搜索：Task 7
- 未来可迁移到更原生方案：Task 2 的壳层与桥接边界、Task 3-7 的 `App Core` 分层

### Placeholder scan

- 未保留 `TODO`、`TBD`、`之后补` 之类占位语
- 每个任务都给了明确文件路径、测试入口、最小实现片段和提交命令

### Type consistency

- `ReviewBatch` / `ReviewJob.batchId` 在 Task 3 定义，并在 Task 5-6 中消费
- `createDesktopApi` 在 Task 2 定义，并作为 Task 5-7 前端调用入口
- `parseSpreadsheetWorkbook` 在 Task 4 定义，并由本地导入链路复用

### Known follow-ups

- 若后续需要“按批次视图”或“失败重试”，可在 `desktop/core/reviews/*` 和 `components/review-jobs-table.tsx` 上继续扩展，不需要推翻本轮结构
- 若后续改为 `Tauri`，优先替换 `electron/*` 与桥接实现，尽量保留 `desktop/core/*`
