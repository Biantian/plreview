# Desktop Static Export Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成当前中断的桌面静态导出迁移，把剩余未提交工作补齐为可验收、可打包、可烟测、可收尾的一整批交付，并最终完成提交、验收与本地集成清理。

**Architecture:** 按四段闭环顺序推进：先收口所有桥接页面，确认运行路径彻底摆脱 `app/api` 与 server actions；再把 Electron channel、preload、worker 和导出/重试链路补齐；随后用真实打包、体积报告和 packaged smoke 证明生产产物只依赖 `out/` 与桌面运行时；最后补文档、清理临时文件、分段提交并完成最终验收与本地集成收尾。

**Tech Stack:** `Next.js 15`, `React 19`, `TypeScript`, `Electron`, `Prisma`, `Vitest`, `Testing Library`, `electron-builder`

---

## File Structure

### Create

- `app/reviews/detail/page.tsx`
  - 静态导出可用的详情页入口，替代旧的 `/reviews/[id]` 动态路由
- `lib/home-dashboard.ts`
  - 工作台首页桥接数据聚合
- `lib/review-detail.ts`
  - 详情页桥接数据聚合
- `lib/review-ipc.ts`
  - 评审列表删除、重试、导出清单、导出报告等桌面 IPC 辅助逻辑
- `tests/app/home-page.test.tsx`
  - 首页 bridge 加载与静态详情链接回归
- `tests/app/reviews-detail-page.test.tsx`
  - 详情页 bridge 加载与 query-string 路由回归
- `tests/desktop/background-entry.test.ts`
  - worker background 入口协议与 handler 覆盖回归
- `tests/desktop/task-runner-fallback.test.ts`
  - `utilityProcess` 不可用时的任务回退链路回归

### Delete

- `app/api/reviews/route.ts`
- `app/api/reviews/delete/route.ts`
- `app/api/reviews/export-list/route.ts`
- `app/api/reviews/export-report/route.ts`
- `app/api/reviews/retry/route.ts`
- `app/reviews/[id]/page.tsx`
- `components/review-queue.tsx`
- `components/rule-manager.tsx`
- `lib/actions.ts`
- `tests/api/reviews-delete-route.test.ts`
- `tests/api/reviews-export-list-route.test.ts`
- `tests/api/reviews-export-report-route.test.ts`
- `tests/api/reviews-retry-route.test.ts`

### Modify

- `app/page.tsx`
- `app/reviews/page.tsx`
- `app/reviews/new/page.tsx`
- `app/models/page.tsx`
- `app/rules/page.tsx`
- `components/model-editor-drawer.tsx`
- `components/model-manager.tsx`
- `components/review-detail-viewer.tsx`
- `components/review-jobs-table.tsx`
- `components/rule-editor-drawer.tsx`
- `components/rules-table.tsx`
- `desktop/bridge/desktop-api.ts`
- `desktop/worker/background-entry.ts`
- `desktop/worker/protocol.ts`
- `desktop/worker/task-entry.ts`
- `desktop/worker/task-runner.ts`
- `electron/channels.ts`
- `electron/renderer-runtime.ts`
- `electron-builder.yml`
- `next.config.ts`
- `scripts/build-desktop-runtime.mjs`
- `scripts/report-desktop-bundle-size.mjs`
- `tests/app/models-page.test.tsx`
- `tests/app/reviews-new-page.test.tsx`
- `tests/components/model-manager.test.tsx`
- `tests/components/review-jobs-table.test.tsx`
- `tests/components/rules-table.test.tsx`
- `tests/desktop/desktop-api.test.ts`
- `tests/desktop/desktop-packaging.test.ts`
- `tests/desktop/desktop-size-report.test.ts`
- `tests/desktop/renderer-runtime.test.ts`
- `tests/desktop/task-runner.test.ts`
- `tests/lib/user-facing-copy.test.ts`
- `README.md`
- `docs/qa/2026-04-19-electron-packaged-runtime-regression-checklist.md`
- `docs/qa/2026-04-21-desktop-smoke-regression.md`

### Responsibility Notes

- `app/*` 页面只负责 bridge 驱动的 UI 壳与加载态，不再直接承接服务端 API 调用
- `lib/home-dashboard.ts`、`lib/review-detail.ts`、`lib/review-ipc.ts` 负责为桌面 handler 提供可复用的数据和动作逻辑
- `desktop/bridge/desktop-api.ts`、`electron/channels.ts`、`electron/preload.ts` 必须保持完全同构的 contract
- `desktop/worker/*` 负责桌面后台执行路径，不允许再把 Next server runtime 当作生产依赖
- `electron/renderer-runtime.ts`、`electron-builder.yml`、构建脚本和体积脚本必须共享同一套静态导出口径

## Task 1: Establish A Safe Closeout Branch And Baseline

**Files:**
- Modify: none

- [ ] **Step 1: Create the dedicated closeout branch from the current state**

Run: `git switch -c codex/desktop-static-export-closeout`
Expected: branch switches successfully and preserves the current dirty migration state

- [ ] **Step 2: Capture the baseline closeout inventory**

Run: `git status --short`
Expected: the output lists the current interrupted migration files, including `app/api/reviews/*`, bridge-backed pages, worker/runtime files, packaging files, and test files

- [ ] **Step 3: Audit for old runtime references before editing**

Run: `rg -n "app/api/reviews|@/lib/actions|/reviews/\\[id\\]|next/server" app components lib electron desktop tests`
Expected: old server-style review paths and helpers are still discoverable, confirming the closeout has concrete removal work left

- [ ] **Step 4: Record the current verification baseline**

Run: `git log --oneline -3`
Expected: includes `377c5e4 docs: add desktop static export closeout design`, `9022914 fix: close desktop static export bridge gap`, and `4dacc0f fix desktop launch readiness and add smoke regression`

- [ ] **Step 5: Confirm the branch is ready for segmented commits**

Run: `git branch --show-current`
Expected:

```text
codex/desktop-static-export-closeout
```

## Task 2: Segment A - Close Out Bridge-Backed Pages And Remove Server Runtime Dependencies

**Files:**
- Create: `app/reviews/detail/page.tsx`
- Create: `lib/home-dashboard.ts`
- Create: `lib/review-detail.ts`
- Create: `tests/app/home-page.test.tsx`
- Create: `tests/app/reviews-detail-page.test.tsx`
- Delete: `app/api/reviews/route.ts`
- Delete: `app/api/reviews/delete/route.ts`
- Delete: `app/api/reviews/export-list/route.ts`
- Delete: `app/api/reviews/export-report/route.ts`
- Delete: `app/api/reviews/retry/route.ts`
- Delete: `app/reviews/[id]/page.tsx`
- Delete: `lib/actions.ts`
- Delete: `tests/api/reviews-delete-route.test.ts`
- Delete: `tests/api/reviews-export-list-route.test.ts`
- Delete: `tests/api/reviews-export-report-route.test.ts`
- Delete: `tests/api/reviews-retry-route.test.ts`
- Modify: `app/page.tsx`
- Modify: `app/reviews/page.tsx`
- Modify: `app/reviews/new/page.tsx`
- Modify: `app/models/page.tsx`
- Modify: `app/rules/page.tsx`
- Modify: `components/review-jobs-table.tsx`
- Modify: `tests/app/models-page.test.tsx`
- Modify: `tests/app/reviews-new-page.test.tsx`
- Modify: `tests/components/review-jobs-table.test.tsx`
- Modify: `tests/components/model-manager.test.tsx`
- Modify: `tests/components/rules-table.test.tsx`
- Modify: `tests/lib/user-facing-copy.test.ts`

- [ ] **Step 1: Add the missing bridge page tests for home and review detail**

Create `tests/app/home-page.test.tsx` with a bridge-backed dashboard render test:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("loads the dashboard through window.plreview and links to the static detail route", async () => {
    window.plreview = {
      getHomeDashboard: vi.fn().mockResolvedValue({
        rulesCount: 4,
        enabledRulesCount: 2,
        documentsCount: 3,
        reviewJobsCount: 2,
        annotationsCount: 5,
        recentReviews: [
          {
            id: "review_1",
            title: "玩法复盘",
            status: "completed",
            modelName: "qwen-plus",
            createdAt: "2026-04-21T10:00:00.000Z",
          },
        ],
        llmProfiles: [],
      }),
    } as typeof window.plreview;

    render(<HomePage />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: "评审工作台" })).toBeInTheDocument(),
    );

    expect(screen.getByRole("link", { name: "玩法复盘" })).toHaveAttribute(
      "href",
      "/reviews/detail?id=review_1",
    );
  });
});
```

Create `tests/app/reviews-detail-page.test.tsx` with a query-string detail load test:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ReviewDetailPage from "@/app/reviews/detail/page";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("id=review_1"),
}));

describe("ReviewDetailPage", () => {
  it("loads detail data through window.plreview", async () => {
    window.plreview = {
      getReviewDetail: vi.fn().mockResolvedValue({
        id: "review_1",
        title: "玩法复盘",
        filename: "玩法.docx",
        providerSnapshot: "DashScope",
        modelNameSnapshot: "qwen-plus",
        createdAt: "2026-04-21T10:00:00.000Z",
        status: "completed",
        summary: null,
        errorMessage: null,
        overallScore: 88,
        annotationsCount: 1,
        hitBlockCount: 1,
        highPriorityCount: 0,
        reportMarkdown: "# 报告",
        blocks: [],
        annotations: [],
      }),
    } as typeof window.plreview;

    render(<ReviewDetailPage />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: "玩法复盘" })).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 2: Run the page bridge suite and verify the new tests fail before implementation**

Run: `npx vitest run tests/app/home-page.test.tsx tests/app/reviews-detail-page.test.tsx tests/app/reviews-new-page.test.tsx tests/app/models-page.test.tsx tests/components/review-jobs-table.test.tsx tests/components/rules-table.test.tsx tests/components/model-manager.test.tsx`
Expected: the new home/detail tests fail because the coverage is missing or the runtime path is not fully aligned yet

- [ ] **Step 3: Finish the page migration to the desktop bridge**

Implement these exact code moves:

```text
1. Keep `app/page.tsx`, `app/reviews/page.tsx`, `app/reviews/new/page.tsx`, `app/models/page.tsx`, `app/rules/page.tsx`, and `app/reviews/detail/page.tsx` as client pages that call `window.plreview`.
2. Move homepage aggregation into `lib/home-dashboard.ts`.
3. Move detail aggregation into `lib/review-detail.ts`.
4. Replace old `/reviews/[id]` usage with `/reviews/detail?id=<id>`.
5. Remove `app/api/reviews/*` and `lib/actions.ts` from the live runtime path.
```

- [ ] **Step 4: Audit the runtime tree after the migration**

Run: `rg -n "app/api/reviews|@/lib/actions|/reviews/\\[id\\]" app components lib tests`
Expected: no live runtime code references remain; matches may only appear in historical docs or intentionally retained notes outside the production path

- [ ] **Step 5: Re-run the page and component bridge suite**

Run: `npx vitest run tests/app/home-page.test.tsx tests/app/reviews-detail-page.test.tsx tests/app/reviews-new-page.test.tsx tests/app/models-page.test.tsx tests/components/review-jobs-table.test.tsx tests/components/rules-table.test.tsx tests/components/model-manager.test.tsx`
Expected: PASS for all listed files

- [ ] **Step 6: Commit the page and bridge closeout**

```bash
git add app/page.tsx app/reviews/page.tsx app/reviews/new/page.tsx app/models/page.tsx app/rules/page.tsx app/reviews/detail/page.tsx lib/home-dashboard.ts lib/review-detail.ts components/review-jobs-table.tsx tests/app/home-page.test.tsx tests/app/reviews-detail-page.test.tsx tests/app/reviews-new-page.test.tsx tests/app/models-page.test.tsx tests/components/review-jobs-table.test.tsx tests/components/rules-table.test.tsx tests/components/model-manager.test.tsx tests/lib/user-facing-copy.test.ts app/api/reviews app/reviews/[id]/page.tsx lib/actions.ts tests/api
git commit -m "feat: finish desktop bridge page migration"
```

## Task 3: Segment B - Close Out Electron Channels, Review IPC, And Worker Runtime

**Files:**
- Create: `lib/review-ipc.ts`
- Create: `tests/desktop/background-entry.test.ts`
- Create: `tests/desktop/task-runner-fallback.test.ts`
- Modify: `desktop/bridge/desktop-api.ts`
- Modify: `desktop/worker/background-entry.ts`
- Modify: `desktop/worker/protocol.ts`
- Modify: `desktop/worker/task-entry.ts`
- Modify: `desktop/worker/task-runner.ts`
- Modify: `electron/channels.ts`
- Modify: `components/model-editor-drawer.tsx`
- Modify: `components/model-manager.tsx`
- Modify: `components/review-detail-viewer.tsx`
- Modify: `components/rule-editor-drawer.tsx`
- Modify: `components/rules-table.tsx`
- Modify: `tests/desktop/desktop-api.test.ts`
- Modify: `tests/desktop/task-runner.test.ts`

- [ ] **Step 1: Extend the worker and IPC regression coverage before code changes**

Add or complete these assertions:

```ts
// tests/desktop/background-entry.test.ts
expect(postMessage).toHaveBeenCalledWith({
  type: "desktop-worker:response",
  id: "worker_msg_1",
  payload: [{ id: "rule_1" }],
});

// tests/desktop/task-runner-fallback.test.ts
await expect(
  runner.run("parse-document", { filePath: "/tmp/fallback-import.md" }),
).resolves.toEqual({ title: "回归导入文档" });
```

Add one more `tests/desktop/desktop-api.test.ts` case that verifies the bridge surface includes:

```ts
[
  "getHomeDashboard",
  "getReviewDetail",
  "deleteReviewJobs",
  "retryReviewJob",
  "exportReviewList",
  "exportReviewReport",
  "getRuntimeStatus",
  "subscribeRuntimeStatus",
]
```

- [ ] **Step 2: Run the desktop IPC and worker suite and confirm at least one gap exists before finishing the segment**

Run: `npx vitest run tests/desktop/desktop-api.test.ts tests/desktop/background-entry.test.ts tests/desktop/task-runner.test.ts tests/desktop/task-runner-fallback.test.ts`
Expected: one or more tests fail or reveal incomplete coverage before the IPC/worker contract is fully aligned

- [ ] **Step 3: Align the desktop contract surfaces**

Implement these exact alignments:

```text
1. `desktop/bridge/desktop-api.ts` must expose every UI-facing method used by pages and tables.
2. `electron/channels.ts` must register the same request names with no missing handler slots.
3. `lib/review-ipc.ts` must own delete/retry/export list/export report actions for review jobs.
4. `desktop/worker/background-entry.ts` must route those actions to concrete services rather than fallback placeholders.
5. `desktop/worker/task-runner.ts` and `desktop/worker/task-entry.ts` must keep both utilityProcess and in-process fallback paths alive.
6. `desktop/worker/protocol.ts` must remain the single source of truth for request/event names.
```

- [ ] **Step 4: Confirm there are no not-implemented desktop handlers left on the visible UI path**

Run: `rg -n "Desktop handler not implemented yet|not implemented" electron desktop lib app components`
Expected: no reachable production path contains an unimplemented desktop handler placeholder

- [ ] **Step 5: Re-run the desktop IPC and worker suite**

Run: `npx vitest run tests/desktop/desktop-api.test.ts tests/desktop/background-entry.test.ts tests/desktop/task-runner.test.ts tests/desktop/task-runner-fallback.test.ts`
Expected: PASS for all listed files

- [ ] **Step 6: Commit the Electron and worker closeout**

```bash
git add lib/review-ipc.ts desktop/bridge/desktop-api.ts desktop/worker/background-entry.ts desktop/worker/protocol.ts desktop/worker/task-entry.ts desktop/worker/task-runner.ts electron/channels.ts tests/desktop/desktop-api.test.ts tests/desktop/background-entry.test.ts tests/desktop/task-runner.test.ts tests/desktop/task-runner-fallback.test.ts components/model-editor-drawer.tsx components/model-manager.tsx components/review-detail-viewer.tsx components/rule-editor-drawer.tsx components/rules-table.tsx
git commit -m "feat: finish desktop ipc and worker runtime migration"
```

## Task 4: Segment C - Close Out Static Packaging, Artifact Size, And Packaged Smoke

**Files:**
- Modify: `next.config.ts`
- Modify: `electron/renderer-runtime.ts`
- Modify: `electron-builder.yml`
- Modify: `scripts/build-desktop-runtime.mjs`
- Modify: `scripts/report-desktop-bundle-size.mjs`
- Modify: `tests/desktop/desktop-packaging.test.ts`
- Modify: `tests/desktop/desktop-size-report.test.ts`
- Modify: `tests/desktop/renderer-runtime.test.ts`

- [ ] **Step 1: Tighten the packaging and static runtime tests first**

Make sure the test suite asserts these exact points:

```text
- `next.config.ts` exports `output: "export"`
- packaged renderer target resolves to `out/index.html`
- route assets resolve from the exported `out/` tree
- `electron-builder.yml` packages `out/**/*` and `.desktop-runtime/**/*`
- `.next/**/*` is not part of the packaged runtime input
- bundle size reporting inventories `out/`, `.desktop-runtime/`, and `release/`
```

- [ ] **Step 2: Run the packaging-focused tests before editing**

Run: `npx vitest run tests/desktop/renderer-runtime.test.ts tests/desktop/desktop-packaging.test.ts tests/desktop/desktop-size-report.test.ts`
Expected: any stale static-export assumption or packaging mismatch is exposed before finalizing the segment

- [ ] **Step 3: Finish the packaging chain so every production path agrees on static export**

Implement these exact outcomes:

```text
1. `next.config.ts` keeps `output: "export"` and contains no standalone output setting.
2. `electron/renderer-runtime.ts` loads `http://localhost:3000` only in development and `out/index.html` in packaged mode.
3. `electron-builder.yml` packages only `.desktop-runtime/**/*`, `out/**/*`, `package.json`, and required Prisma runtime.
4. `scripts/build-desktop-runtime.mjs` emits the desktop runtime bootstrap without relying on packaged `.next`.
5. `scripts/report-desktop-bundle-size.mjs` reports `out/`, `.desktop-runtime/`, and `release/` as the desktop artifact inventory.
```

- [ ] **Step 4: Re-run the packaging-focused tests**

Run: `npx vitest run tests/desktop/renderer-runtime.test.ts tests/desktop/desktop-packaging.test.ts tests/desktop/desktop-size-report.test.ts`
Expected: PASS for all listed files

- [ ] **Step 5: Build the desktop runtime and package a fresh app**

Run: `npm run desktop:build`
Expected: build completes successfully and regenerates `.desktop-runtime/`

Run: `npm run desktop:dist -- --mac dir`
Expected: packaging succeeds and regenerates a fresh `release/` app bundle

- [ ] **Step 6: Record the rebuilt artifact size**

Run: `npm run desktop:report-size`
Expected: JSON output lists `out`, `.desktop-runtime` artifacts, and `release`, with fresh byte counts for the rebuilt package

- [ ] **Step 7: Run the packaged smoke regression against the rebuilt app**

Run: `npm run test:desktop:smoke`
Expected: PASS; the packaged app launches, imports the smoke file, enables `开始评审`, and lands on `评审任务` with the created row visible

- [ ] **Step 8: Commit the packaging and size closeout**

```bash
git add next.config.ts electron/renderer-runtime.ts electron-builder.yml scripts/build-desktop-runtime.mjs scripts/report-desktop-bundle-size.mjs tests/desktop/renderer-runtime.test.ts tests/desktop/desktop-packaging.test.ts tests/desktop/desktop-size-report.test.ts
git commit -m "build: finalize static desktop packaging"
```

## Task 5: Segment D - Documentation, Final Acceptance, And Local Integration Wrap-Up

**Files:**
- Modify: `README.md`
- Modify: `docs/qa/2026-04-19-electron-packaged-runtime-regression-checklist.md`
- Modify: `docs/qa/2026-04-21-desktop-smoke-regression.md`

- [ ] **Step 1: Update the human-facing docs to match the final architecture**

Ensure the docs state these exact facts:

```text
- development Electron loads the Next dev server at `http://localhost:3000`
- production Electron loads exported HTML from `out/`
- operational pages obtain data through the desktop preload bridge
- `npm run test:desktop:smoke` is the packaged launch-path regression gate
- `npm run desktop:report-size` is the artifact size check
```

- [ ] **Step 2: Remove temporary local artifacts from the wrap-up commit set**

Run: `rm -f dev.db`
Expected: the stray repository-root SQLite file is removed from the working tree

- [ ] **Step 3: Run the final closeout verification set**

Run: `npx vitest run tests/app/home-page.test.tsx tests/app/reviews-detail-page.test.tsx tests/app/reviews-new-page.test.tsx tests/app/models-page.test.tsx tests/components/review-jobs-table.test.tsx tests/components/rules-table.test.tsx tests/components/model-manager.test.tsx tests/desktop/desktop-api.test.ts tests/desktop/background-entry.test.ts tests/desktop/task-runner.test.ts tests/desktop/task-runner-fallback.test.ts tests/desktop/renderer-runtime.test.ts tests/desktop/desktop-packaging.test.ts tests/desktop/desktop-size-report.test.ts`
Expected: PASS for all listed files

Run: `npm run test:desktop:smoke`
Expected: PASS against the rebuilt packaged app

- [ ] **Step 4: Commit the documentation and acceptance wrap-up**

```bash
git add README.md docs/qa/2026-04-19-electron-packaged-runtime-regression-checklist.md docs/qa/2026-04-21-desktop-smoke-regression.md
git commit -m "docs: close out desktop static export migration"
```

- [ ] **Step 5: Review the segmented history and confirm only task-related changes remain**

Run: `git log --oneline -6`
Expected: includes the four closeout commits plus the two earlier guardrail commits `9022914` and `4dacc0f`

Run: `git status --short`
Expected: empty output, or only explicitly deferred non-closeout files if the user chooses not to integrate yet

- [ ] **Step 6: Merge and cleanup if the user wants immediate local integration**

```bash
git switch main
git merge --no-ff codex/desktop-static-export-closeout
git branch -d codex/desktop-static-export-closeout
```

Expected: merge completes cleanly, branch is deleted, and `main` contains the full static-export closeout history

## Self-Check

- This plan covers the full approved scope:
  - implementation closeout
  - packaged verification closeout
  - artifact size re-check
  - docs and smoke gate updates
  - staged commits
  - optional local merge and branch cleanup
- The segment order matches the approved gates:
  - pages first
  - IPC/worker second
  - packaging third
  - docs/integration last
- The plan intentionally does **not** reopen the old Next standalone server path or reintroduce `app/api/reviews/*`.
