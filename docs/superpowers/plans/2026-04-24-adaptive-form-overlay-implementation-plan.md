# Adaptive Form Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shared adaptive form overlay for model and rule editors so long forms stay usable in desktop windows, switch between drawer and dialog layouts based on window size, and preserve in-progress form state while switching.

**Architecture:** Extract the common overlay shell into a reusable client component that owns focus management, close behavior, background locking, and responsive layout selection. Keep the model and rule editors responsible only for form fields and payload assembly, then wrap each form inside the shared shell so both entry points get the same long-form behavior without duplicating modal logic.

**Tech Stack:** Next.js App Router, React 19 client components, TypeScript, global CSS in `app/globals.css`, Vitest, Testing Library, `@testing-library/user-event`

---

## File Structure

- Create: `components/adaptive-form-overlay.tsx`
  - Shared overlay shell for dialog semantics, focus trap, escape handling, backdrop close, body scroll lock, and adaptive layout mode.
- Modify: `components/model-editor-drawer.tsx`
  - Keep model form fields and payload mapping, but render inside the shared overlay shell with stable header/body/footer slots.
- Modify: `components/rule-editor-drawer.tsx`
  - Keep rule form fields and payload mapping, but render inside the shared overlay shell with the same slot structure.
- Modify: `app/globals.css`
  - Add overlay shell, backdrop, drawer/dialog layout, fixed header/footer, and scrolling body styles.
- Create: `tests/components/adaptive-form-overlay.test.tsx`
  - Unit coverage for escape, focus restore, layout switching, and subtree preservation across resize.
- Modify: `tests/components/model-manager.test.tsx`
  - Assert the create/edit flow uses the overlay shell and that form values survive layout changes.
- Modify: `tests/components/rules-table.test.tsx`
  - Assert the rule editor uses the overlay shell, preserves state across layout changes, and still resets correctly when switching to a different record.

## Task 1: Add the shared adaptive overlay shell

**Files:**
- Create: `components/adaptive-form-overlay.tsx`
- Create: `tests/components/adaptive-form-overlay.test.tsx`

- [ ] **Step 1: Write the failing overlay behavior tests**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { AdaptiveFormOverlay } from "@/components/adaptive-form-overlay";

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
    writable: true,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
    writable: true,
  });
  window.dispatchEvent(new Event("resize"));
}

describe("AdaptiveFormOverlay", () => {
  beforeEach(() => {
    setViewport(1440, 960);
  });

  it("restores focus on close and closes on Escape", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);

      return (
        <>
          <button onClick={() => setOpen(true)} type="button">
            打开模型编辑
          </button>
          <AdaptiveFormOverlay
            description="填写模型配置字段。"
            onClose={() => setOpen(false)}
            open={open}
            title="新增模型配置"
          >
            <div data-testid="overlay-body">
              <label htmlFor="config-name">配置名称</label>
              <input id="config-name" name="name" />
            </div>
          </AdaptiveFormOverlay>
        </>
      );
    }

    render(<Harness />);

    const trigger = screen.getByRole("button", { name: "打开模型编辑" });
    trigger.focus();

    await user.click(trigger);

    expect(screen.getByRole("dialog", { name: "新增模型配置" })).toHaveAttribute(
      "data-overlay-mode",
      "drawer",
    );
    expect(screen.getByLabelText("配置名称")).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "新增模型配置" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("switches to dialog mode on short windows without remounting form fields", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(true);

      return (
        <AdaptiveFormOverlay
          description="填写模型配置字段。"
          onClose={() => setOpen(false)}
          open={open}
          title="新增模型配置"
        >
          <div data-testid="overlay-body">
            <label htmlFor="config-name">配置名称</label>
            <input id="config-name" defaultValue="" name="name" />
          </div>
        </AdaptiveFormOverlay>
      );
    }

    render(<Harness />);

    const input = screen.getByLabelText("配置名称");
    await user.type(input, "桌面主配置");

    setViewport(900, 640);

    expect(screen.getByRole("dialog", { name: "新增模型配置" })).toHaveAttribute(
      "data-overlay-mode",
      "dialog",
    );
    expect(screen.getByLabelText("配置名称")).toHaveValue("桌面主配置");
  });
});
```

- [ ] **Step 2: Run the new test file and confirm it fails because the component does not exist yet**

Run: `npm test -- --run tests/components/adaptive-form-overlay.test.tsx`

Expected: FAIL with a module resolution error for `@/components/adaptive-form-overlay`

- [ ] **Step 3: Create the shared overlay component with adaptive mode detection and keyboard handling**

```tsx
"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

type AdaptiveFormOverlayProps = {
  open: boolean;
  title: string;
  description?: string;
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
};

function getOverlayMode(width: number, height: number) {
  return width >= 1180 && height >= 760 ? "drawer" : "dialog";
}

export function AdaptiveFormOverlay({
  open,
  title,
  description,
  footer,
  onClose,
  children,
}: AdaptiveFormOverlayProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const [mode, setMode] = useState<"drawer" | "dialog">(() =>
    typeof window === "undefined"
      ? "drawer"
      : getOverlayMode(window.innerWidth, window.innerHeight),
  );

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    (focusable?.[0] ?? panelRef.current)?.focus();

    return () => {
      previousActiveElementRef.current?.focus?.();
      previousActiveElementRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const getFocusableElements = () =>
    Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = getFocusableElements();

    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];
    const activeElement = document.activeElement as HTMLElement | null;

    if (event.shiftKey && activeElement === firstFocusable) {
      event.preventDefault();
      lastFocusable.focus();
      return;
    }

    if (!event.shiftKey && activeElement === lastFocusable) {
      event.preventDefault();
      firstFocusable.focus();
    }
  };

  return (
    <div className="form-overlay-backdrop" onMouseDown={onClose}>
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="form-overlay-panel"
        data-overlay-mode={mode}
        onKeyDown={handleKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="form-overlay-header">
          <div className="form-overlay-heading">
            <h2 className="section-title" id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className="section-copy" id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>
          <button className="button-ghost button-inline" onClick={onClose} type="button">
            关闭
          </button>
        </header>

        <div className="form-overlay-body">{children}</div>

        {footer ? <footer className="form-overlay-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add resize-driven mode updates so the layout reacts while the overlay stays open**

```tsx
const [mode, setMode] = useState<"drawer" | "dialog">(() =>
  typeof window === "undefined"
    ? "drawer"
    : getOverlayMode(window.innerWidth, window.innerHeight),
);

useEffect(() => {
  if (!open) {
    return;
  }

  const syncMode = () => {
    setMode(getOverlayMode(window.innerWidth, window.innerHeight));
  };

  syncMode();
  window.addEventListener("resize", syncMode);

  return () => {
    window.removeEventListener("resize", syncMode);
  };
}, [open]);
```

- [ ] **Step 5: Run the overlay test file and confirm it passes**

Run: `npm test -- --run tests/components/adaptive-form-overlay.test.tsx`

Expected: PASS for the two new `AdaptiveFormOverlay` tests

- [ ] **Step 6: Commit the shared shell**

```bash
git add components/adaptive-form-overlay.tsx tests/components/adaptive-form-overlay.test.tsx
git commit -m "feat: add adaptive form overlay shell"
```

## Task 2: Add overlay layout and scroll styles

**Files:**
- Modify: `app/globals.css`
- Modify: `tests/lib/globals-shell.test.ts`

- [ ] **Step 1: Add a failing CSS contract test for the overlay selectors**

```tsx
it("defines a fixed overlay shell with a dedicated scrolling body", () => {
  hasRule(".form-overlay-backdrop", ["position: fixed;", "inset: 0;", "z-index: 55;"]);
  hasRule(".form-overlay-panel", [
    "display: grid;",
    "grid-template-rows: auto minmax(0, 1fr) auto;",
    "max-height: calc(100vh - 40px);",
    "overflow: hidden;",
  ]);
  hasRule(".form-overlay-body", ["min-height: 0;", "overflow-y: auto;"]);
  hasRule(".form-overlay-header", ["border-bottom: 1px solid var(--line);"]);
  hasRule(".form-overlay-footer", ["border-top: 1px solid var(--line);"]);
});
```

- [ ] **Step 2: Run the globals shell tests and confirm the new assertions fail until the CSS exists**

Run: `npm test -- --run tests/lib/globals-shell.test.ts`

Expected: FAIL with `missing CSS rule for .form-overlay-backdrop` or another missing overlay selector

- [ ] **Step 3: Add the overlay styles to `app/globals.css`**

```css
.form-overlay-backdrop {
  position: fixed;
  inset: 0;
  z-index: 55;
  display: flex;
  justify-content: flex-end;
  padding: 20px;
  background: rgba(10, 18, 28, 0.46);
  backdrop-filter: blur(8px);
}

.form-overlay-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(520px, calc(100vw - 40px));
  max-height: calc(100vh - 40px);
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 20px;
  background: var(--surface-strong);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.form-overlay-panel[data-overlay-mode="drawer"] {
  margin-left: auto;
}

.form-overlay-panel[data-overlay-mode="dialog"] {
  width: min(720px, calc(100vw - 40px));
  margin: auto;
}

.form-overlay-header,
.form-overlay-footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px;
  background: var(--surface-strong);
}

.form-overlay-header {
  border-bottom: 1px solid var(--line);
}

.form-overlay-footer {
  border-top: 1px solid var(--line);
}

.form-overlay-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.form-overlay-body {
  min-height: 0;
  overflow-y: auto;
  padding: 20px 22px 24px;
}
```

- [ ] **Step 4: Run the globals shell tests again**

Run: `npm test -- --run tests/lib/globals-shell.test.ts`

Expected: PASS with the new overlay shell CSS contract

- [ ] **Step 5: Commit the styles**

```bash
git add app/globals.css tests/lib/globals-shell.test.ts
git commit -m "style: add adaptive overlay layout regions"
```

## Task 3: Migrate the model editor to the shared shell

**Files:**
- Modify: `components/model-editor-drawer.tsx`
- Modify: `tests/components/model-manager.test.tsx`
- Test: `tests/components/adaptive-form-overlay.test.tsx`

- [ ] **Step 1: Extend the model manager tests with overlay and resize expectations**

```tsx
function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
    writable: true,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
    writable: true,
  });
  window.dispatchEvent(new Event("resize"));
}

it("uses the adaptive overlay shell for creating a model and keeps typed values across resize", async () => {
  const user = userEvent.setup();
  setViewport(1440, 900);

  render(<ModelManager profiles={[]} />);

  await user.click(screen.getByRole("button", { name: "新增模型" }));
  await user.type(screen.getByLabelText("配置名称"), "桌面主配置");

  expect(screen.getByRole("dialog", { name: "新增模型配置" })).toHaveAttribute(
    "data-overlay-mode",
    "drawer",
  );

  setViewport(900, 640);

  expect(screen.getByRole("dialog", { name: "新增模型配置" })).toHaveAttribute(
    "data-overlay-mode",
    "dialog",
  );
  expect(screen.getByLabelText("配置名称")).toHaveValue("桌面主配置");
  expect(screen.getByRole("button", { name: "保存配置" }).closest(".form-overlay-footer")).toBeTruthy();
});
```

- [ ] **Step 2: Run the model manager tests and confirm the new expectations fail**

Run: `npm test -- --run tests/components/model-manager.test.tsx`

Expected: FAIL because `ModelEditorDrawer` still renders the inline `card stack drawer` shell without adaptive mode attributes or footer slot

- [ ] **Step 3: Refactor `ModelEditorDrawer` to render the form inside `AdaptiveFormOverlay`**

```tsx
import { AdaptiveFormOverlay } from "@/components/adaptive-form-overlay";

export function ModelEditorDrawer({
  open,
  profile,
  busy,
  errorMessage,
  onClose,
  onSave,
}: {
  open: boolean;
  profile: ModelEditorProfile | null;
  busy: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSave: (payload: ModelSaveInput) => Promise<void>;
}) {
  if (!open) {
    return null;
  }

  const isCreateMode = !profile;

  return (
    <AdaptiveFormOverlay
      description="填写模型配置字段，保存后会返回当前列表上下文。"
      footer={
        <div className="actions">
          {errorMessage ? <p className="section-copy">{errorMessage}</p> : null}
          <div className="actions">
            <button className="button" disabled={busy} form="model-editor-form" type="submit">
              {busy ? "保存中..." : isCreateMode ? "保存配置" : "保存修改"}
            </button>
            <button className="button-ghost" disabled={busy} onClick={onClose} type="button">
              取消
            </button>
          </div>
        </div>
      }
      onClose={onClose}
      open={open}
      title={isCreateMode ? "新增模型配置" : "模型编辑"}
    >
      <form
        className="form-grid"
        id="model-editor-form"
        onSubmit={(event) => {
          event.preventDefault();

          const formData = new FormData(event.currentTarget);

          void onSave({
            id: profile?.id,
            name: String(formData.get("name") ?? ""),
            provider: String(formData.get("provider") ?? ""),
            vendorKey: String(formData.get("vendorKey") ?? "openai_compatible"),
            mode: String(formData.get("mode") ?? "live") as "live" | "demo",
            baseUrl: String(formData.get("baseUrl") ?? ""),
            defaultModel: String(formData.get("defaultModel") ?? ""),
            modelOptionsText: String(formData.get("modelOptionsText") ?? ""),
            apiKey: String(formData.get("apiKey") ?? ""),
            enabled: formData.has("enabled"),
          });
        }}
      >
        {profile ? <input name="id" type="hidden" value={profile.id} /> : null}
        <input name="vendorKey" type="hidden" value={profile?.vendorKey ?? "openai_compatible"} />
        <div className="form-section compact">
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
                placeholder="例如：qwen-plus"
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
              placeholder={"qwen-plus\nqwen-turbo"}
            />
          </div>

          <div className="field">
            <label htmlFor="apiKey">API Key</label>
            <input id="apiKey" name="apiKey" type="password" />
          </div>

          <label>
            <input defaultChecked={profile?.enabled ?? true} name="enabled" type="checkbox" />{" "}
            保存后立即启用
          </label>
        </div>
      </form>
    </AdaptiveFormOverlay>
  );
}
```

- [ ] **Step 4: Run the model manager tests again**

Run: `npm test -- --run tests/components/model-manager.test.tsx`

Expected: PASS for the existing toolbar tests plus the new adaptive overlay regression

- [ ] **Step 5: Commit the model integration**

```bash
git add components/model-editor-drawer.tsx tests/components/model-manager.test.tsx
git commit -m "feat: move model editor into adaptive overlay"
```

## Task 4: Migrate the rule editor to the shared shell and keep record switching behavior

**Files:**
- Modify: `components/rule-editor-drawer.tsx`
- Modify: `tests/components/rules-table.test.tsx`

- [ ] **Step 1: Add rule editor coverage for adaptive mode and in-progress value retention**

```tsx
function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
    writable: true,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
    writable: true,
  });
  window.dispatchEvent(new Event("resize"));
}

it("keeps typed rule values when the shell switches from drawer to dialog", async () => {
  const user = userEvent.setup();
  setViewport(1400, 900);

  render(
    <RulesTable
      items={[
        {
          category: "基础质量",
          description: "检查目标表达是否清楚",
          enabled: true,
          id: "1",
          name: "目标清晰度",
          promptTemplate: "模板 A",
          severity: "medium",
          updatedAtLabel: "2026-04-13 10:00",
        },
      ]}
    />,
  );

  await user.click(screen.getByRole("button", { name: "编辑 目标清晰度" }));
  await user.type(screen.getByLabelText("规则说明"), " - 桌面浮层");

  expect(screen.getByRole("dialog", { name: "规则编辑" })).toHaveAttribute(
    "data-overlay-mode",
    "drawer",
  );

  setViewport(900, 620);

  expect(screen.getByRole("dialog", { name: "规则编辑" })).toHaveAttribute(
    "data-overlay-mode",
    "dialog",
  );
  expect(screen.getByLabelText("规则说明")).toHaveValue("检查目标表达是否清楚 - 桌面浮层");
});
```

- [ ] **Step 2: Run the rule table tests and confirm the new adaptive assertion fails**

Run: `npm test -- --run tests/components/rules-table.test.tsx`

Expected: FAIL because the editor still renders the existing inline drawer shell

- [ ] **Step 3: Refactor `RuleEditorDrawer` to use the shared shell without changing its field set**

```tsx
import { AdaptiveFormOverlay } from "@/components/adaptive-form-overlay";

export function RuleEditorDrawer({
  open,
  rule,
  busy,
  errorMessage,
  onClose,
  onSave,
}: {
  open: boolean;
  rule: RuleEditorRecord | null;
  busy: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSave: (payload: RuleSaveInput) => Promise<void>;
}) {
  if (!open) {
    return null;
  }

  const isCreateMode = !rule;

  return (
    <AdaptiveFormOverlay
      description="填写规则说明、模板与默认严重级别。"
      footer={
        <div className="actions">
          {errorMessage ? <p className="section-copy">{errorMessage}</p> : null}
          <div className="actions">
            <button className="button" disabled={busy} form="rule-editor-form" type="submit">
              {busy ? "保存中..." : isCreateMode ? "保存规则" : "保存修改"}
            </button>
            <button className="button-ghost" disabled={busy} onClick={onClose} type="button">
              取消
            </button>
          </div>
        </div>
      }
      onClose={onClose}
      open={open}
      title={isCreateMode ? "新增规则" : "规则编辑"}
    >
      <form
        className="form-grid"
        id="rule-editor-form"
        onSubmit={(event) => {
          event.preventDefault();

          const formData = new FormData(event.currentTarget);

          void onSave({
            id: rule?.id,
            name: String(formData.get("name") ?? ""),
            category: String(formData.get("category") ?? ""),
            description: String(formData.get("description") ?? ""),
            promptTemplate: String(formData.get("promptTemplate") ?? ""),
            severity: String(formData.get("severity") ?? Severity.medium) as Severity,
            enabled: formData.has("enabled"),
          });
        }}
      >
        {rule ? <input name="id" type="hidden" value={rule.id} /> : null}
        <div className="form-section compact">
          <div className="form-grid two">
            <div className="field">
              <label htmlFor="rule-name">规则名称</label>
              <input defaultValue={rule?.name ?? ""} id="rule-name" name="name" required />
            </div>

            <div className="field">
              <label htmlFor="rule-category">分类</label>
              <input
                defaultValue={rule?.category ?? ""}
                id="rule-category"
                name="category"
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="rule-description">规则说明</label>
            <textarea
              defaultValue={rule?.description ?? ""}
              id="rule-description"
              name="description"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="rule-template">评审模板</label>
            <textarea
              defaultValue={rule?.promptTemplate ?? RULE_TEMPLATE}
              id="rule-template"
              name="promptTemplate"
              required
            />
          </div>

          <div className="form-grid two">
            <div className="field">
              <label htmlFor="rule-severity">默认严重级别</label>
              <select
                defaultValue={rule?.severity ?? Severity.medium}
                id="rule-severity"
                name="severity"
              >
                {severityOptions.map((severity) => (
                  <option key={severity} value={severity}>
                    {severityLabel(severity)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <span>启用状态</span>
              <label>
                <input defaultChecked={rule?.enabled ?? true} name="enabled" type="checkbox" />
                保存后立即启用
              </label>
            </div>
          </div>
        </div>
      </form>
    </AdaptiveFormOverlay>
  );
}
```

- [ ] **Step 4: Re-run the rule table tests**

Run: `npm test -- --run tests/components/rules-table.test.tsx`

Expected: PASS for the existing filtering/switching tests plus the new adaptive overlay test

- [ ] **Step 5: Commit the rule integration**

```bash
git add components/rule-editor-drawer.tsx tests/components/rules-table.test.tsx
git commit -m "feat: move rule editor into adaptive overlay"
```

## Task 5: Run the focused regression suite for the whole change

**Files:**
- Test: `tests/components/adaptive-form-overlay.test.tsx`
- Test: `tests/components/model-manager.test.tsx`
- Test: `tests/components/rules-table.test.tsx`
- Test: `tests/lib/globals-shell.test.ts`

- [ ] **Step 1: Run the focused component regression suite**

Run: `npm test -- --run tests/components/adaptive-form-overlay.test.tsx tests/components/model-manager.test.tsx tests/components/rules-table.test.tsx tests/lib/globals-shell.test.ts`

Expected: PASS for the new overlay shell tests, both manager-level integrations, and the CSS contract

- [ ] **Step 2: Run the full test suite before handing off**

Run: `npm test`

Expected: PASS with no regressions outside the targeted component tests

- [ ] **Step 3: Commit the final green state**

```bash
git add components/adaptive-form-overlay.tsx components/model-editor-drawer.tsx components/rule-editor-drawer.tsx app/globals.css tests/components/adaptive-form-overlay.test.tsx tests/components/model-manager.test.tsx tests/components/rules-table.test.tsx tests/lib/globals-shell.test.ts
git commit -m "feat: add adaptive overlay for management forms"
```

## Self-Review Notes

- Spec coverage checked:
  - Shared adaptive shell: Task 1
  - Header/body/footer scroll ownership: Task 2
  - Model integration: Task 3
  - Rule integration: Task 4
  - Resize/state-preservation regression coverage: Tasks 1, 3, 4, 5
- Placeholder scan checked:
  - No `TODO`, `TBD`, or “implement later” markers remain
  - Commands and test files are explicit
- Type consistency checked:
  - Shared shell name is `AdaptiveFormOverlay` throughout
  - Layout attribute is `data-overlay-mode`
  - Form ids are `model-editor-form` and `rule-editor-form`
