# Reviews New Desktop Two-Step Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove browser-fallback workflow remnants from `新建评审` so desktop users only see `选择本地文件 -> 开始评审`.

**Architecture:** Keep the existing `IntakeWorkbench` component as the single orchestration point, but delete the browser-placeholder branch from its user-facing workflow. Desktop mode continues to import through `window.plreview.pickFiles`, while non-desktop mode becomes a blocked informational state instead of a pseudo-import path.

**Tech Stack:** Next.js, React, Vitest, Testing Library

---

### Task 1: Lock the desired behavior in component tests

**Files:**
- Modify: `tests/components/intake-workbench.test.tsx`
- Test: `tests/components/intake-workbench.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("shows a desktop-only blocker instead of browser file input when the bridge is unavailable", () => {
  // @ts-expect-error test-only partial desktop api
  window.plreview.pickFiles = undefined;

  render(<IntakeWorkbench llmProfiles={[...]} rules={[...]} />);

  expect(screen.getByText("请在桌面应用中启动后再导入本地文件。")).toBeInTheDocument();
  expect(screen.queryByLabelText("选择待导入文件")).not.toBeInTheDocument();
});

it("does not render retry workflow controls in desktop mode", () => {
  render(<IntakeWorkbench importedFiles={[...readyDocs]} llmProfiles={[...]} rules={[...]} />);

  expect(screen.queryByText(/待重新导入/)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /重新导入/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "清理待重新导入" })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/intake-workbench.test.tsx --exclude='.worktrees/**'`
Expected: FAIL because current implementation still renders browser fallback input and retry-oriented controls.

### Task 2: Remove fallback workflow from the workbench implementation

**Files:**
- Modify: `components/intake-workbench.tsx`
- Test: `tests/components/intake-workbench.test.tsx`

- [ ] **Step 3: Write minimal implementation**

```tsx
const hasDesktopPicker = typeof window !== "undefined" && Boolean(window.plreview?.pickFiles);
const importedFileCount = workbenchFiles.length;

// Delete browser fallback placeholder creation helpers and retry-only state.
// In the file section:
// - desktop: keep the immediate "选择本地文件" action
// - non-desktop: render a blocking message panel
// - remove status filter / retry stats / retry button / retry cleanup button
// - rename counts from "可提交" to "已导入" or "待评审"
```

- [ ] **Step 4: Run targeted tests to verify they pass**

Run: `npx vitest run tests/components/intake-workbench.test.tsx --exclude='.worktrees/**'`
Expected: PASS

### Task 3: Re-verify nearby interaction regressions

**Files:**
- Test: `tests/components/intake-workbench.test.tsx`
- Test: `tests/components/docs-shell.test.tsx`
- Test: `tests/components/model-manager.test.tsx`
- Test: `tests/components/rules-table.test.tsx`

- [ ] **Step 5: Run focused regression suite**

Run: `npx vitest run tests/components/intake-workbench.test.tsx tests/components/docs-shell.test.tsx tests/components/model-manager.test.tsx tests/components/rules-table.test.tsx --exclude='.worktrees/**'`
Expected: PASS

- [ ] **Step 6: Commit after verification**

```bash
git add docs/superpowers/specs/2026-04-15-desktop-interaction-cleanup-design.md \
  docs/superpowers/plans/2026-04-16-reviews-new-desktop-two-step.md \
  components/intake-workbench.tsx \
  tests/components/intake-workbench.test.tsx
git commit -m "refactor: simplify desktop review intake workflow"
```
