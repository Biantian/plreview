# Docs Master-Detail Panes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the help docs page into a flat desktop three-pane workspace with independent pane scrolling and move docs-related quick actions into the main sidebar footer.

**Architecture:** Remove the docs page-level `PageIntro`, render `DocsShell` as the full page work surface, and rebuild `DocsShell` as a fixed three-column master-detail layout. Keep the existing docs data model, add a small sidebar footer action area, and replace docs-specific surface styles with pane dividers, text-first lists, and neutral selection states.

**Tech Stack:** Next.js App Router, React 19, TypeScript, global CSS, Vitest, Testing Library

---

### Task 1: Lock in the new page and sidebar contract with failing tests

**Files:**
- Create: `tests/app/docs-page.test.tsx`
- Modify: `tests/components/app-sidebar.test.tsx`
- Modify: `tests/components/docs-shell.test.tsx`

- [ ] **Step 1: Write the failing docs page test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DocsPage from "@/app/docs/page";

describe("DocsPage", () => {
  it("renders the docs workspace directly without a page intro shell", async () => {
    render(await DocsPage());

    expect(screen.queryByRole("heading", { level: 1, name: "帮助文档" })).not.toBeInTheDocument();
    expect(screen.getByTestId("docs-shell")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "文档目录" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "文档正文" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "文章目录" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Update the sidebar test to require the new footer actions**

```tsx
it("renders sidebar quick actions for docs exit paths", () => {
  mockedUsePathname.mockReturnValue("/docs");

  render(<AppSidebar />);

  expect(screen.getByRole("link", { name: "新建批次" })).toHaveAttribute("href", "/reviews/new");
  expect(screen.getByRole("link", { name: "返回评审任务" })).toHaveAttribute("href", "/reviews");
});
```

- [ ] **Step 3: Replace the collapsible docs-shell test with fixed-pane expectations**

```tsx
it("renders a fixed three-pane docs workspace with pane headers", () => {
  render(<DocsShell documents={documents} />);

  expect(screen.getByText("DIRECTORY")).toBeInTheDocument();
  expect(screen.getByText("DOCS")).toBeInTheDocument();
  expect(screen.getByText("ARTICLE TOC")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "折叠文档目录" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "折叠文章目录" })).not.toBeInTheDocument();
});
```

- [ ] **Step 4: Run the targeted tests to verify they fail for the right reasons**

Run:

```bash
npm test -- tests/app/docs-page.test.tsx tests/components/app-sidebar.test.tsx tests/components/docs-shell.test.tsx
```

Expected:

```text
FAIL  tests/app/docs-page.test.tsx
FAIL  tests/components/app-sidebar.test.tsx
FAIL  tests/components/docs-shell.test.tsx
```

- [ ] **Step 5: Commit the red test baseline**

```bash
git add tests/app/docs-page.test.tsx tests/components/app-sidebar.test.tsx tests/components/docs-shell.test.tsx
git commit -m "test: define docs pane workspace contract"
```

### Task 2: Remove the docs page header and move quick actions into the sidebar

**Files:**
- Modify: `app/docs/page.tsx`
- Modify: `components/app-sidebar.tsx`
- Test: `tests/app/docs-page.test.tsx`
- Test: `tests/components/app-sidebar.test.tsx`

- [ ] **Step 1: Replace the docs page wrapper with a direct workspace render**

```tsx
import { DocsShell, type DocsDocument } from "@/components/docs-shell";

export default function DocsPage() {
  return (
    <div className="desktop-management-page docs-page">
      <DocsShell documents={documents} />
    </div>
  );
}
```

- [ ] **Step 2: Add sidebar footer actions below the primary navigation**

```tsx
import Link from "next/link";

import { SiteNav } from "@/components/site-nav";

export function AppSidebar() {
  return (
    <aside className="app-sidebar" aria-label="应用侧边栏">
      <div className="sidebar-brand">
        <Link className="sidebar-brand-link" href="/">
          <span className="sidebar-brand-mark">PL</span>
          <span className="sidebar-brand-copy">
            <span className="sidebar-brand-title">PL Review</span>
            <span className="sidebar-brand-eyebrow">Desktop Workspace</span>
          </span>
        </Link>
        <p className="sidebar-brand-description">
          规则、批次、结果和文档都固定停靠在这条桌面导航轨道里。
        </p>
      </div>

      <SiteNav />

      <div className="sidebar-footer-actions" aria-label="快捷操作">
        <Link className="button" href="/reviews/new">
          新建批次
        </Link>
        <Link className="button-ghost" href="/reviews">
          返回评审任务
        </Link>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Run the page and sidebar tests to verify the contract now passes**

Run:

```bash
npm test -- tests/app/docs-page.test.tsx tests/components/app-sidebar.test.tsx
```

Expected:

```text
PASS  tests/app/docs-page.test.tsx
PASS  tests/components/app-sidebar.test.tsx
```

- [ ] **Step 4: Commit the page-shell and sidebar action migration**

```bash
git add app/docs/page.tsx components/app-sidebar.tsx tests/app/docs-page.test.tsx tests/components/app-sidebar.test.tsx
git commit -m "feat: move docs actions into sidebar footer"
```

### Task 3: Rebuild `DocsShell` as a fixed master-detail pane layout

**Files:**
- Modify: `components/docs-shell.tsx`
- Test: `tests/components/docs-shell.test.tsx`

- [ ] **Step 1: Simplify the docs shell state to only track the active document**

```tsx
"use client";

import { useState } from "react";

export function DocsShell({ documents }: DocsShellProps) {
  const [activeDocumentId, setActiveDocumentId] = useState(documents[0]?.id ?? "");

  const activeDocument =
    documents.find((document) => document.id === activeDocumentId) ?? documents[0] ?? null;

  if (!activeDocument) {
    return (
      <section className="docs-empty-state">
        <h1 className="section-title">文档</h1>
        <p className="section-copy">暂时还没有可展示的文档内容。</p>
      </section>
    );
  }
```

- [ ] **Step 2: Replace the collapsible rails with three fixed panes**

```tsx
  return (
    <div className="docs-shell docs-panes" data-testid="docs-shell">
      <aside aria-label="文档目录" className="docs-pane docs-pane-directory" role="complementary">
        <div className="docs-pane-header">
          <p className="docs-pane-kicker">DIRECTORY</p>
          <h2 className="docs-pane-title">文档目录</h2>
        </div>

        <div className="docs-pane-scroll">
          <div className="docs-directory-list">
            {documents.map((document) => {
              const isActive = document.id === activeDocument.id;

              return (
                <button
                  aria-current={isActive ? "true" : undefined}
                  aria-label={`打开文档 ${document.title}`}
                  className={isActive ? "docs-directory-item active" : "docs-directory-item"}
                  key={document.id}
                  onClick={() => setActiveDocumentId(document.id)}
                  type="button"
                >
                  <strong>{document.title}</strong>
                  <span>{document.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <article aria-label="文档正文" className="docs-pane docs-pane-article" role="article">
        <div className="docs-pane-header">
          <p className="docs-pane-kicker">DOCS</p>
          <h1 className="section-title">{activeDocument.title}</h1>
        </div>

        <div className="docs-pane-scroll docs-article-scroll">
          <div className="docs-article-intro">
            <p className="section-copy">{activeDocument.intro}</p>
          </div>
          <div className="document-stream">
            {activeDocument.sections.map((section, index) => (
              <section className="document-block" id={section.id} key={section.id}>
                <span className="feature-kicker">{String(index + 1).padStart(2, "0")}</span>
                <div className="stack">
                  <h2 className="subsection-title">{section.title}</h2>
                  <p className="section-copy">{section.body}</p>
                </div>
              </section>
            ))}
          </div>
        </div>
      </article>

      <aside aria-label="文章目录" className="docs-pane docs-pane-toc" role="complementary">
        <div className="docs-pane-header">
          <p className="docs-pane-kicker">ARTICLE TOC</p>
          <h2 className="docs-pane-title">文章目录</h2>
        </div>

        <div className="docs-pane-scroll">
          <nav className="docs-toc-list" aria-label="当前文章章节">
            {activeDocument.sections.map((section, index) => (
              <a className="docs-toc-item" href={`#${section.id}`} key={section.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{section.title}</strong>
              </a>
            ))}
          </nav>
        </div>
      </aside>
    </div>
  );
}
```

- [ ] **Step 3: Update the docs shell test to match the new fixed-pane DOM**

```tsx
expect(screen.getByRole("complementary", { name: "文档目录" })).toHaveClass(
  "docs-pane",
  "docs-pane-directory",
);
expect(screen.getByRole("article", { name: "文档正文" })).toHaveClass(
  "docs-pane",
  "docs-pane-article",
);
expect(screen.getByRole("complementary", { name: "文章目录" })).toHaveClass(
  "docs-pane",
  "docs-pane-toc",
);
```

- [ ] **Step 4: Run the docs shell test to verify the new pane structure passes**

Run:

```bash
npm test -- tests/components/docs-shell.test.tsx
```

Expected:

```text
PASS  tests/components/docs-shell.test.tsx
```

- [ ] **Step 5: Commit the new pane component structure**

```bash
git add components/docs-shell.tsx tests/components/docs-shell.test.tsx
git commit -m "feat: rebuild docs shell as master-detail panes"
```

### Task 4: Apply pane styling, independent scrolling, and targeted regression checks

**Files:**
- Modify: `app/globals.css`
- Test: `tests/lib/globals-shell.test.ts`
- Test: `tests/lib/globals-theme.test.ts`
- Test: `tests/app/docs-page.test.tsx`
- Test: `tests/components/docs-shell.test.tsx`
- Test: `tests/components/app-sidebar.test.tsx`

- [ ] **Step 1: Add sidebar footer styles and desktop pane layout styles**

```css
.sidebar-footer-actions {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.docs-page {
  min-height: 100vh;
}

.docs-panes {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 200px;
  min-height: 100vh;
  height: 100vh;
}

.docs-pane {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.docs-pane-directory {
  border-right: 1px solid #e5e7eb;
}

.docs-pane-toc {
  border-left: 1px solid #e5e7eb;
}
```

- [ ] **Step 2: Add aligned pane headers, scroll containers, and flattened list-item styles**

```css
.docs-pane-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--line);
}

.docs-pane-kicker {
  margin: 0;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.docs-pane-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.docs-pane-scroll {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 12px;
}

.docs-article-scroll {
  padding: 24px 40px 40px;
}

.docs-directory-item,
.docs-toc-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  text-align: left;
}

.docs-directory-item.active,
.docs-directory-item:hover,
.docs-toc-item:hover {
  background: #f3f4f6;
}
```

- [ ] **Step 3: Remove the old docs rail and card styles that conflict with pane behavior**

```css
.docs-sidebar,
.docs-rail-toggle {
  display: none;
}

.docs-directory-list,
.docs-toc-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.document-block {
  padding: 0;
  border: 0;
  background: transparent;
}
```

- [ ] **Step 4: Add or update CSS token assertions for the docs pane layout**

```ts
it("defines a fixed three-pane docs workspace with physical dividers", () => {
  expect(globalsCss).toContain(".docs-panes {");
  expect(globalsCss).toContain("grid-template-columns: 240px minmax(0, 1fr) 200px;");
  expect(globalsCss).toContain(".docs-pane-directory {");
  expect(globalsCss).toContain("border-right: 1px solid #e5e7eb;");
  expect(globalsCss).toContain(".docs-pane-toc {");
  expect(globalsCss).toContain("border-left: 1px solid #e5e7eb;");
});
```

- [ ] **Step 5: Run the complete targeted regression suite**

Run:

```bash
npm test -- tests/app/docs-page.test.tsx tests/components/app-sidebar.test.tsx tests/components/docs-shell.test.tsx tests/lib/globals-shell.test.ts tests/lib/globals-theme.test.ts
```

Expected:

```text
PASS  tests/app/docs-page.test.tsx
PASS  tests/components/app-sidebar.test.tsx
PASS  tests/components/docs-shell.test.tsx
PASS  tests/lib/globals-shell.test.ts
PASS  tests/lib/globals-theme.test.ts
```

- [ ] **Step 6: Commit the pane styling and regression coverage**

```bash
git add app/globals.css tests/lib/globals-shell.test.ts tests/lib/globals-theme.test.ts tests/app/docs-page.test.tsx tests/components/app-sidebar.test.tsx tests/components/docs-shell.test.tsx
git commit -m "feat: style docs page as desktop master-detail panes"
```

## Self-Review

### Spec coverage

- Remove page header: covered in Task 2
- Move actions into sidebar footer: covered in Task 2
- Three horizontal panes: covered in Task 3 and Task 4
- Fixed pane widths and `1px` dividers: covered in Task 4
- Independent pane scrolling: covered in Task 4
- Flattened directory and TOC lists: covered in Task 3 and Task 4
- Header baseline and title alignment: covered in Task 4

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” placeholders remain
- Every code-changing step includes concrete code
- Every verification step includes an exact command and expected result

### Type consistency

- `DocsShell` keeps `DocsDocument` and `DocsDocumentSection` unchanged
- Sidebar links use existing `Link` API and existing routes
- Pane class names are consistent across tests, JSX, and CSS: `docs-panes`, `docs-pane-directory`, `docs-pane-article`, `docs-pane-toc`
