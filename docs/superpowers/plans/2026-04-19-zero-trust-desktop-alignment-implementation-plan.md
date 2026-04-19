# Zero-Trust Desktop Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish aligning the in-progress desktop redesign with the original implementation plan and the approved warm, clean desktop reference style.

**Architecture:** Keep the current desktop shell, workspace composition, and feature behavior intact. Focus the remaining work on shared styling semantics, sidebar rail polish, and zero-trust verification so the application feels like one coherent desktop tool instead of a partially glassy concept UI. Use test-first checks for shared CSS contracts where visual regressions are otherwise easy to miss.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, CSS in `app/globals.css`, Vitest, Testing Library

---

## File Structure

### New files

- `tests/lib/globals-shell.test.ts`

### Modified files

- `app/globals.css`
- `components/app-sidebar.tsx`
- `components/site-nav.tsx`
- `tests/components/app-sidebar.test.tsx`
- `tests/components/site-nav.test.tsx`

### Responsibility notes

- `app/globals.css` remains the single source of truth for shell, surface, sidebar, and navigation tokens.
- `components/app-sidebar.tsx` owns the sidebar brand block and desktop rail composition.
- `components/site-nav.tsx` owns navigation labels and active-item structure only; the visual language stays in CSS.
- `tests/lib/globals-shell.test.ts` should lock down CSS-level contracts that are too easy to regress by inspection alone.

## Task 1: Tighten The Desktop Shell And Sidebar Rail

**Files:**
- Create: `tests/lib/globals-shell.test.ts`
- Modify: `app/globals.css`
- Modify: `components/app-sidebar.tsx`
- Modify: `components/site-nav.tsx`
- Modify: `tests/components/app-sidebar.test.tsx`
- Modify: `tests/components/site-nav.test.tsx`

- [ ] **Step 1: Write the failing tests**

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

describe("globals shell styles", () => {
  it("keeps the sidebar and panels crisp instead of glassy", () => {
    expect(globalsCss).not.toContain(".app-sidebar {\n  position: sticky;\n  top: 24px;\n  align-self: start;\n  display: flex;\n  flex-direction: column;\n  gap: 24px;\n  padding: 24px;\n  border: 1px solid rgba(255, 255, 255, 0.8);\n  border-radius: 30px;\n  background: var(--surface-strong);\n  box-shadow: var(--shadow-md);\n  backdrop-filter");
    expect(globalsCss).toContain(".desktop-surface,");
    expect(globalsCss).toContain("background: rgba(255, 255, 255, 0.88);");
  });
});
```

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppSidebar } from "@/components/app-sidebar";
import { usePathname } from "next/navigation";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const mockedUsePathname = vi.mocked(usePathname);

describe("AppSidebar", () => {
  beforeEach(() => {
    mockedUsePathname.mockReset();
  });

  it("renders a compact desktop rail brand block", () => {
    mockedUsePathname.mockReturnValue("/");

    render(<AppSidebar />);

    expect(screen.getByText("PL Review")).toBeInTheDocument();
    expect(screen.getByText("Desktop Workspace")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "主导航" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- --run tests/lib/globals-shell.test.ts tests/components/app-sidebar.test.tsx
```

Expected:
- `tests/lib/globals-shell.test.ts` fails because the current shell still uses lower-opacity surfaces and lacks the new contract
- `tests/components/app-sidebar.test.tsx` fails because the brand copy still reads `策划案评审系统` / `Planning Review Workspace`

- [ ] **Step 3: Write the minimal implementation**

```tsx
// components/app-sidebar.tsx
<aside className="app-sidebar" aria-label="应用侧边栏">
  <div className="sidebar-brand">
    <Link className="sidebar-brand-link" href="/">
      <span className="sidebar-brand-mark">PL</span>
      <span className="sidebar-brand-copy">
        <span className="sidebar-brand-title">PL Review</span>
        <span className="sidebar-brand-eyebrow">Desktop Workspace</span>
      </span>
    </Link>
    <p className="sidebar-brand-description">规则、批次、结果和文档都固定停靠在这条桌面导航轨道里。</p>
  </div>

  <SiteNav />
</aside>
```

```css
/* app/globals.css */
.app-sidebar {
  border: 1px solid rgba(255, 255, 255, 0.88);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 14px 34px rgba(120, 86, 54, 0.08);
}

.desktop-surface,
.desktop-table-card,
.desktop-mini-card {
  background: rgba(255, 255, 255, 0.88);
}

.site-nav-link {
  min-height: 42px;
  border-radius: 14px;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- --run tests/lib/globals-shell.test.ts tests/components/app-sidebar.test.tsx tests/components/site-nav.test.tsx
```

Expected: PASS for all selected tests

- [ ] **Step 5: Commit**

```bash
git add tests/lib/globals-shell.test.ts app/globals.css components/app-sidebar.tsx components/site-nav.tsx tests/components/app-sidebar.test.tsx tests/components/site-nav.test.tsx
git commit -m "fix: tighten desktop shell and sidebar rail"
```

## Task 2: Neutralize Residual Glassiness In Dense Workspace Surfaces

**Files:**
- Modify: `app/globals.css`
- Modify: `tests/lib/globals-theme.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("keeps dense management surfaces neutral and high-opacity", () => {
  expect(globalsCss).toContain(".desktop-table-toolbar {");
  expect(globalsCss).toContain("linear-gradient(135deg, rgba(233, 138, 71, 0.06), rgba(255, 255, 255, 0.94))");
  expect(globalsCss).toContain(".table-shell {");
  expect(globalsCss).toContain("background: rgba(255, 255, 255, 0.9);");
  expect(globalsCss).not.toContain("background: rgba(255, 255, 255, 0.52);");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- --run tests/lib/globals-theme.test.ts
```

Expected: FAIL because low-opacity glassy surface values still exist in shared workspace regions

- [ ] **Step 3: Write the minimal implementation**

```css
/* app/globals.css */
.desktop-table-toolbar {
  background:
    linear-gradient(135deg, rgba(233, 138, 71, 0.06), rgba(255, 255, 255, 0.94)),
    rgba(255, 255, 255, 0.9);
}

.table-shell,
.review-bulk-toolbar,
.launch-zone,
.launch-file-board,
.launch-submit-zone,
.queue-item,
.issue-detail,
.markdown-table-wrap {
  background: rgba(255, 255, 255, 0.9);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- --run tests/lib/globals-theme.test.ts tests/components/review-jobs-table.test.tsx tests/components/rules-table.test.tsx tests/components/model-manager.test.tsx tests/components/intake-workbench.test.tsx
```

Expected: PASS for all selected tests

- [ ] **Step 5: Commit**

```bash
git add app/globals.css tests/lib/globals-theme.test.ts
git commit -m "fix: neutralize dense desktop workspace surfaces"
```

## Task 3: Final Zero-Trust Verification Sweep

**Files:**
- No source changes expected unless verification reveals a regression

- [ ] **Step 1: Run the focused desktop regression suite**

Run:

```bash
npm test -- --run \
  tests/lib/globals-theme.test.ts \
  tests/lib/globals-shell.test.ts \
  tests/components/app-sidebar.test.tsx \
  tests/components/site-nav.test.tsx \
  tests/components/page-intro.test.tsx \
  tests/components/review-jobs-table.test.tsx \
  tests/components/rules-table.test.tsx \
  tests/components/model-manager.test.tsx \
  tests/components/intake-workbench.test.tsx \
  tests/app/reviews-new-page.test.tsx \
  tests/components/review-detail-viewer.test.tsx \
  tests/components/docs-shell.test.tsx
```

Expected: PASS with all selected desktop UI regression tests green

- [ ] **Step 2: Run production build verification**

Run:

```bash
npm run build
```

Expected: PASS with no new warnings introduced by the latest CSS changes

- [ ] **Step 3: Review git diff for remaining scope**

Run:

```bash
git diff --stat
git diff -- app/globals.css components/app-sidebar.tsx components/site-nav.tsx components/intake-workbench.tsx tests/lib/globals-theme.test.ts tests/lib/globals-shell.test.ts tests/components/app-sidebar.test.tsx tests/components/site-nav.test.tsx tests/components/intake-workbench.test.tsx tests/app/reviews-new-page.test.tsx
```

Expected: only shell, surface, and launch-workspace alignment changes remain in scope

- [ ] **Step 4: Commit**

```bash
git add app/globals.css components/app-sidebar.tsx components/site-nav.tsx components/intake-workbench.tsx tests/lib/globals-theme.test.ts tests/lib/globals-shell.test.ts tests/components/app-sidebar.test.tsx tests/components/site-nav.test.tsx tests/components/intake-workbench.test.tsx tests/app/reviews-new-page.test.tsx
git commit -m "fix: complete zero-trust desktop alignment"
```

## Self-Review Checklist

- Spec coverage:
  - Shared shell polish is covered by Task 1.
  - Residual glassiness cleanup is covered by Task 2.
  - Zero-trust regression evidence refresh is covered by Task 3.
- Placeholder scan:
  - No `TODO`, `TBD`, or implicit “fix later” language remains.
  - Every task includes concrete files, commands, and expected outcomes.
- Type consistency:
  - Shared vocabulary stays consistent: `desktop-shell`, `app-sidebar`, `site-nav-link`, `page-intro`, `launch-workspace`, `启动摘要`, `文件工作台`.
