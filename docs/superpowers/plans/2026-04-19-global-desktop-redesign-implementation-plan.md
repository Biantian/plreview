# Global Desktop Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the PLReview Electron app into a desktop-first workspace with a persistent left sidebar, warm editorial visual system, and denser operational pages.

**Architecture:** Start by replacing the shared app shell and global CSS tokens so every page inherits the new desktop layout language. Then migrate page families in descending order of shared impact: dashboard, management/task pages, intake workspace, and split-pane detail/docs experiences. Keep product behavior intact while improving navigation, hierarchy, and desktop ergonomics.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, CSS in `app/globals.css`, Prisma-backed server pages, Vitest, Testing Library, Electron desktop runtime

---

## File Structure

### New files

- `components/app-sidebar.tsx`
- `components/page-intro.tsx`
- `tests/components/site-nav.test.tsx`
- `tests/components/page-intro.test.tsx`
- `tests/components/review-detail-viewer.test.tsx`

### Modified files

- `app/layout.tsx`
- `app/globals.css`
- `app/page.tsx`
- `app/reviews/page.tsx`
- `app/reviews/new/page.tsx`
- `app/reviews/[id]/page.tsx`
- `app/rules/page.tsx`
- `app/models/page.tsx`
- `app/docs/page.tsx`
- `components/site-nav.tsx`
- `components/review-jobs-table.tsx`
- `components/intake-workbench.tsx`
- `components/review-detail-viewer.tsx`
- `components/model-manager.tsx`
- `components/rules-table.tsx`
- `components/docs-shell.tsx`
- `tests/components/review-jobs-table.test.tsx`
- `tests/components/intake-workbench.test.tsx`
- `tests/components/model-manager.test.tsx`
- `tests/components/rules-table.test.tsx`
- `tests/components/docs-shell.test.tsx`

### Responsibility notes

- `app/layout.tsx`, `components/app-sidebar.tsx`, and `components/site-nav.tsx` own the new desktop shell and information architecture.
- `app/globals.css` remains the single source of truth for shared surface, layout, and component tokens.
- `components/page-intro.tsx` standardizes page-local headers so pages stop reimplementing ad hoc hero/header blocks.
- Page files own high-level layout composition only; dense interaction remains inside existing client components.
- Existing table/workbench/detail components should be restyled and lightly reorganized in place rather than replaced wholesale.

## Task 1: Replace The Top Nav Shell With A Desktop Sidebar

**Files:**
- Create: `components/app-sidebar.tsx`
- Create: `tests/components/site-nav.test.tsx`
- Modify: `components/site-nav.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SiteNav } from "@/components/site-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/reviews/new",
}));

describe("SiteNav", () => {
  it("renders the desktop workflow labels and active route", () => {
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "工作台" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "评审任务" })).toHaveAttribute("href", "/reviews");
    expect(screen.getByRole("link", { name: "新建批次" })).toHaveAttribute("href", "/reviews/new");
    expect(screen.getByRole("link", { name: "新建批次" })).toHaveAttribute("aria-current", "page");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/components/site-nav.test.tsx`

Expected: FAIL because the current labels still read `总览` / `评审列表` / `新建评审`

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/site-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const navItems = [
  { href: "/", label: "工作台", caption: "Overview" },
  { href: "/reviews", label: "评审任务", caption: "Jobs" },
  { href: "/reviews/new", label: "新建批次", caption: "Launch" },
  { href: "/rules", label: "规则库", caption: "Rules" },
  { href: "/models", label: "模型配置", caption: "Models" },
  { href: "/docs", label: "帮助文档", caption: "Docs" },
] as const;

export function SiteNav() {
  const pathname = usePathname() ?? "/";
  const activeHref =
    navItems.find((item) => item.href === pathname)?.href ??
    navItems.find(
      (item) => item.href !== "/" && pathname.startsWith(`${item.href}/`),
    )?.href;

  return (
    <nav aria-label="主导航" className="sidebar-nav">
      {navItems.map((item) => {
        const isActive = item.href === activeHref;
        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`sidebar-link ${isActive ? "active" : ""}`}
            href={item.href}
            key={item.href}
          >
            <span className="sidebar-link-label">{item.label}</span>
            <span className="sidebar-link-caption">{item.caption}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

```tsx
// components/app-sidebar.tsx
import Link from "next/link";

import { SiteNav } from "@/components/site-nav";

export function AppSidebar() {
  return (
    <aside className="app-sidebar">
      <Link className="sidebar-brand" href="/">
        <span className="sidebar-brand-mark">PL</span>
        <span className="sidebar-brand-copy">
          <strong>PLReview</strong>
          <span>Desktop Review Workspace</span>
        </span>
      </Link>

      <SiteNav />
    </aside>
  );
}
```

```tsx
// app/layout.tsx
import { AppSidebar } from "@/components/app-sidebar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="desktop-shell">
          <AppSidebar />
          <main className="desktop-workspace">{children}</main>
        </div>
      </body>
    </html>
  );
}
```

```css
/* app/globals.css */
.desktop-shell {
  display: grid;
  grid-template-columns: 268px minmax(0, 1fr);
  min-height: 100vh;
  padding: 18px;
  gap: 18px;
}

.app-sidebar {
  position: sticky;
  top: 18px;
  align-self: start;
  min-height: calc(100vh - 36px);
}

.desktop-workspace {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/components/site-nav.test.tsx`

Expected: PASS with `1 passed`

- [ ] **Step 5: Commit**

```bash
git add components/app-sidebar.tsx components/site-nav.tsx app/layout.tsx app/globals.css tests/components/site-nav.test.tsx
git commit -m "feat: add desktop sidebar shell"
```

## Task 2: Add Shared Page Header And Desktop Visual Tokens

**Files:**
- Create: `components/page-intro.tsx`
- Create: `tests/components/page-intro.test.tsx`
- Modify: `app/globals.css`
- Modify: `app/page.tsx`
- Modify: `app/reviews/page.tsx`
- Modify: `app/rules/page.tsx`
- Modify: `app/models/page.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageIntro } from "@/components/page-intro";

describe("PageIntro", () => {
  it("renders eyebrow, title, copy, and actions in a desktop header shell", () => {
    render(
      <PageIntro
        eyebrow="Task Center"
        title="评审任务"
        description="统一查看后台评审状态。"
        actions={<button type="button">新建批次</button>}
      />,
    );

    expect(screen.getByText("Task Center")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "评审任务" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建批次" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/components/page-intro.test.tsx`

Expected: FAIL with `Cannot find module '@/components/page-intro'`

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/page-intro.tsx
import type { ReactNode } from "react";

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-intro">
      <div className="page-intro-copy">
        <p className="section-eyebrow">{eyebrow}</p>
        <h1 className="page-intro-title">{title}</h1>
        <p className="page-intro-description">{description}</p>
      </div>
      {actions ? <div className="page-intro-actions">{actions}</div> : null}
    </header>
  );
}
```

```css
/* app/globals.css */
:root {
  --bg: #f6efe7;
  --bg-strong: #fffaf5;
  --surface: rgba(255, 251, 247, 0.92);
  --surface-strong: rgba(255, 255, 255, 0.98);
  --brand: #e98a47;
  --brand-strong: #c96b2c;
  --brand-soft: rgba(233, 138, 71, 0.14);
  --ink: #1f2937;
  --muted: #6b7280;
  --line: rgba(148, 163, 184, 0.22);
}

.page-intro {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 26px;
  border: 1px solid var(--line);
  border-radius: 28px;
  background: var(--surface);
  box-shadow: 0 20px 44px rgba(148, 163, 184, 0.08);
}
```

```tsx
// app/reviews/page.tsx (excerpt)
import { PageIntro } from "@/components/page-intro";

<section className="stack-lg">
  <PageIntro
    eyebrow="Task Center"
    title="评审任务"
    description="统一查看后台评审状态、批量操作和结果入口。"
    actions={<Link className="button" href="/reviews/new">新建批次</Link>}
  />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/components/page-intro.test.tsx`

Expected: PASS with `1 passed`

- [ ] **Step 5: Commit**

```bash
git add components/page-intro.tsx tests/components/page-intro.test.tsx app/globals.css app/page.tsx app/reviews/page.tsx app/rules/page.tsx app/models/page.tsx
git commit -m "feat: add shared desktop page intro"
```

## Task 3: Convert Dashboard And Management Pages To The New Desktop Surface System

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/reviews/page.tsx`
- Modify: `components/review-jobs-table.tsx`
- Modify: `app/rules/page.tsx`
- Modify: `components/rules-table.tsx`
- Modify: `app/models/page.tsx`
- Modify: `components/model-manager.tsx`
- Modify: `tests/components/review-jobs-table.test.tsx`
- Modify: `tests/components/rules-table.test.tsx`
- Modify: `tests/components/model-manager.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/model-manager.test.tsx
it("renders desktop management toolbar copy and table shell", () => {
  render(<ModelManager metrics={metrics} profiles={profiles} />);

  expect(screen.getByText("支持按配置名称、供应商、模式和默认模型筛选。")).toBeInTheDocument();
  expect(screen.getByRole("table", { name: "模型表格" }).closest(".desktop-table-card")).toBeTruthy();
});
```

```tsx
// tests/components/review-jobs-table.test.tsx
it("shows the task-toolbar summary inside the desktop table shell", () => {
  render(<ReviewJobsTable items={items} />);

  expect(screen.getByText(/共 2 条/)).toBeInTheDocument();
  expect(screen.getByRole("table", { name: "评审任务表格" }).closest(".desktop-table-card")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/components/review-jobs-table.test.tsx tests/components/rules-table.test.tsx tests/components/model-manager.test.tsx`

Expected: FAIL because the current table shells still use mixed `card`/`table-shell` wrappers

- [ ] **Step 3: Write minimal implementation**

```tsx
// app/page.tsx (shape only)
<div className="desktop-dashboard">
  <PageIntro
    eyebrow="Workspace"
    title="工作台"
    description="查看当前评审状态、配置准备度和常用入口。"
    actions={<Link className="button" href="/reviews/new">新建批次</Link>}
  />
  <section className="desktop-kpi-grid">...</section>
  <section className="desktop-dashboard-grid">...</section>
</div>
```

```tsx
// components/review-jobs-table.tsx (excerpt)
return (
  <section className="desktop-table-card stack">
    <div className="desktop-table-toolbar">
      <TableSearchInput label="搜索任务" onChange={setQuery} value={query} />
      <div className="desktop-table-toolbar-copy">
        <span className="muted">共 {reviews.length} 条 · 当前筛选 {filteredItems.length} 条</span>
      </div>
    </div>
    <div className="table-shell">
      <table aria-label="评审任务表格" className="data-table">...</table>
    </div>
  </section>
);
```

```tsx
// components/model-manager.tsx (excerpt)
<section className="desktop-table-card stack-lg">
  <div className="metric-grid">...</div>
  <div className="desktop-table-toolbar">...</div>
  <div className="table-shell">
    <table aria-label="模型表格" className="data-table">...</table>
  </div>
</section>
```

```css
/* app/globals.css */
.desktop-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.desktop-table-card {
  border: 1px solid var(--line);
  border-radius: 28px;
  background: var(--surface);
  padding: 22px;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/components/review-jobs-table.test.tsx tests/components/rules-table.test.tsx tests/components/model-manager.test.tsx`

Expected: PASS with all selected component tests green

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/reviews/page.tsx components/review-jobs-table.tsx app/rules/page.tsx components/rules-table.tsx app/models/page.tsx components/model-manager.tsx tests/components/review-jobs-table.test.tsx tests/components/rules-table.test.tsx tests/components/model-manager.test.tsx
git commit -m "feat: restyle dashboard and management surfaces"
```

## Task 4: Rebuild New Batch As A Desktop Launch Workspace

**Files:**
- Modify: `app/reviews/new/page.tsx`
- Modify: `components/intake-workbench.tsx`
- Modify: `app/globals.css`
- Modify: `tests/components/intake-workbench.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("renders the launch workspace with desktop zones and a persistent summary rail", () => {
  render(<IntakeWorkbench llmProfiles={profiles} rules={rules} importedFiles={files} />);

  expect(screen.getByText("批次配置")).toBeInTheDocument();
  expect(screen.getByText("文件工作台")).toBeInTheDocument();
  expect(screen.getByText("启动摘要")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/components/intake-workbench.test.tsx`

Expected: FAIL because the current step titles are `批次信息` / `文件导入` / `提交`

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/intake-workbench.tsx (shape only)
return (
  <div className="launch-workspace">
    <div className="launch-main-column">
      <PageIntro
        eyebrow="Launch Workspace"
        title="新建批次"
        description="在桌面工作区中完成模型、规则、文件和启动确认。"
      />
      <section className="desktop-panel stack-lg">
        <h2 className="subsection-title">批次配置</h2>
        ...
      </section>
      <section className="desktop-panel stack-lg">
        <h2 className="subsection-title">文件工作台</h2>
        ...
      </section>
    </div>

    <aside className="launch-summary-rail">
      <section className="desktop-panel stack">
        <h2 className="subsection-title">启动摘要</h2>
        ...
      </section>
    </aside>
  </div>
);
```

```css
/* app/globals.css */
.launch-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) 320px;
  gap: 18px;
  align-items: start;
}

.launch-summary-rail {
  position: sticky;
  top: 24px;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/components/intake-workbench.test.tsx`

Expected: PASS with `1 passed`

- [ ] **Step 5: Commit**

```bash
git add app/reviews/new/page.tsx components/intake-workbench.tsx app/globals.css tests/components/intake-workbench.test.tsx
git commit -m "feat: redesign launch workspace for desktop"
```

## Task 5: Strengthen Review Detail As A Desktop Split-Pane Investigation View

**Files:**
- Modify: `app/reviews/[id]/page.tsx`
- Modify: `components/review-detail-viewer.tsx`
- Modify: `app/globals.css`
- Create: `tests/components/review-detail-viewer.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("keeps issue navigation and detail in a dedicated inspector rail", () => {
  render(<ReviewDetailViewer annotations={annotations} blocks={blocks} status="completed" />);

  expect(screen.getByText("问题导航")).toBeInTheDocument();
  expect(screen.getByText("问题详情")).toBeInTheDocument();
  expect(document.querySelector(".review-inspector-rail")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/components/review-detail-viewer.test.tsx`

Expected: FAIL because there is no `.review-inspector-rail` class and the copy still uses `Issue Navigator` / `当前问题`

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/review-detail-viewer.tsx (excerpt)
return (
  <section className="review-workspace">
    <div className="desktop-panel review-document-pane">...</div>

    <aside className="review-inspector-rail stack">
      <section className="desktop-panel stack">
        <p className="section-eyebrow">Issue Navigator</p>
        <h2 className="section-title">问题导航</h2>
        ...
      </section>

      <section className="desktop-panel stack">
        <p className="section-eyebrow">Issue Detail</p>
        <h2 className="section-title">问题详情</h2>
        ...
      </section>
    </aside>
  </section>
);
```

```tsx
// app/reviews/[id]/page.tsx (excerpt)
<div className="stack-lg">
  <PageIntro
    eyebrow="Review Snapshot"
    title={review.document.title}
    description={`文件：${review.document.filename} · 文档块：${review.document.blockCount || blocks.length}`}
    actions={<StatusBadge status={review.status} />}
  />
  <section className="desktop-kpi-grid">...</section>
  <ReviewDetailViewer ... />
</div>
```

```css
/* app/globals.css */
.review-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) 380px;
  gap: 18px;
  align-items: start;
}

.review-inspector-rail {
  position: sticky;
  top: 24px;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/components/review-detail-viewer.test.tsx`

Expected: PASS with the inspector rail assertion succeeding

- [ ] **Step 5: Commit**

```bash
git add app/reviews/[id]/page.tsx components/review-detail-viewer.tsx app/globals.css tests/components/review-detail-viewer.test.tsx
git commit -m "feat: upgrade review detail split pane"
```

## Task 6: Bring Docs Into The Shared Desktop Shell And Run Regression Coverage

**Files:**
- Modify: `app/docs/page.tsx`
- Modify: `components/docs-shell.tsx`
- Modify: `app/globals.css`
- Modify: `tests/components/docs-shell.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("renders docs inside the shared desktop article workspace", () => {
  render(<DocsShell documents={documents} />);

  expect(screen.getByRole("article", { name: "文档正文" }).className).toContain("desktop-panel");
  expect(screen.getByRole("complementary", { name: "文档目录" }).className).toContain("docs-rail");
  expect(screen.getByRole("complementary", { name: "文章目录" }).className).toContain("docs-rail");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/components/docs-shell.test.tsx`

Expected: FAIL because the current shell still uses generic `card` / `panel` classes

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/docs-shell.tsx (excerpt)
<div className="docs-workspace" data-testid="docs-shell" ...>
  <aside className="desktop-panel docs-rail docs-rail-left" ...>...</aside>
  <article aria-label="文档正文" className="desktop-panel stack-lg docs-main" role="article">...</article>
  <aside className="desktop-panel docs-rail docs-rail-right" ...>...</aside>
</div>
```

```css
/* app/globals.css */
.docs-workspace {
  display: grid;
  grid-template-columns: var(--docs-left-column, 248px) minmax(0, 1fr) var(--docs-right-column, 220px);
  gap: 18px;
}

.desktop-panel {
  border: 1px solid var(--line);
  border-radius: 28px;
  background: var(--surface);
  padding: 22px;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/components/docs-shell.test.tsx`

Expected: PASS with `3 passed`

- [ ] **Step 5: Run full targeted regression and commit**

Run:

```bash
npm test -- --run \
  tests/components/site-nav.test.tsx \
  tests/components/page-intro.test.tsx \
  tests/components/review-jobs-table.test.tsx \
  tests/components/rules-table.test.tsx \
  tests/components/model-manager.test.tsx \
  tests/components/intake-workbench.test.tsx \
  tests/components/docs-shell.test.tsx
```

Expected: PASS for all selected desktop UI regressions

Then commit:

```bash
git add app/docs/page.tsx components/docs-shell.tsx app/globals.css tests/components/docs-shell.test.tsx
git commit -m "feat: unify docs with desktop workspace shell"
```

## Self-Review Checklist

- Spec coverage:
  - Global shell and left navigation are covered by Task 1.
  - Shared page headers and visual tokens are covered by Task 2.
  - Dashboard, task center, rule library, and model configuration styling are covered by Task 3.
  - Desktop-first new batch workspace is covered by Task 4.
  - Split-pane review detail improvements are covered by Task 5.
  - Docs shell consistency and regression verification are covered by Task 6.
- Placeholder scan:
  - No `TODO`, `TBD`, or vague “handle appropriately” steps remain.
  - Every task contains an explicit file list, concrete code sketch, run command, and commit command.
- Type consistency:
  - Shared shell vocabulary stays consistent across tasks: `desktop-shell`, `desktop-workspace`, `desktop-panel`, `desktop-table-card`, `page-intro`.
  - Navigation naming stays consistent with the approved IA: `工作台`, `评审任务`, `新建批次`, `规则库`, `模型配置`, `帮助文档`.
