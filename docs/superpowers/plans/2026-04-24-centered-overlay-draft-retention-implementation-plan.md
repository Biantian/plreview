# Centered Overlay Draft Retention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the rule/model create overlays centered and wider, while preserving unsaved create drafts until the user clears them, saves successfully, or exits the app.

**Architecture:** Keep `AdaptiveFormOverlay` as the shared shell, but make its current sizing strategy always resolve to centered dialog mode. Store create drafts in `RulesTable` and `ModelManager`; pass those drafts into the editor components, where create mode is controlled and edit mode keeps the existing per-record uncontrolled reset behavior.

**Tech Stack:** Next.js App Router, React 19 client components, TypeScript, Vitest, Testing Library, CSS in `app/globals.css`.

---

## File Structure

- Modify: `components/adaptive-form-overlay.tsx`
  - Responsibility: shared modal shell, mode selection, focus trap, body scroll locking, dialog dismissal.
  - Change: make `getOverlayMode()` return `dialog` for all viewport sizes so rule/model forms no longer dock right.
- Modify: `app/globals.css`
  - Responsibility: app-wide visual styling.
  - Change: widen `.form-overlay[data-overlay-mode="dialog"] .form-overlay-panel` and keep it centered with responsive max width.
- Modify: `components/rule-editor-drawer.tsx`
  - Responsibility: render rule editor fields and submit `RuleSaveInput`.
  - Change: export a create-draft type, accept create draft props, control fields only in create mode, and add a `清空` footer action in create mode.
- Modify: `components/rules-table.tsx`
  - Responsibility: rule list state and rule editor open/close/save orchestration.
  - Change: own the create-rule draft, preserve it across close/reopen, clear it on explicit clear or successful create save.
- Modify: `components/model-editor-drawer.tsx`
  - Responsibility: render model profile editor fields and submit `ModelSaveInput`.
  - Change: export a create-draft type, accept create draft props, control fields only in create mode, and add a `清空` footer action in create mode.
- Modify: `components/model-manager.tsx`
  - Responsibility: model profile list state and model editor open/close/save orchestration.
  - Change: own the create-model draft, preserve it across close/reopen, clear it on explicit clear or successful create save.
- Modify: `tests/components/adaptive-form-overlay.test.tsx`
  - Responsibility: overlay shell behavior tests.
  - Change: update mode expectations from drawer-to-dialog switching to stable centered dialog mode.
- Modify: `tests/components/rules-table.test.tsx`
  - Responsibility: rule manager interaction tests.
  - Change: add tests for create draft retention, explicit clear, save-success clearing, save-failure retention, and centered mode.
- Modify: `tests/components/model-manager.test.tsx`
  - Responsibility: model manager interaction tests.
  - Change: add tests for create draft retention, explicit clear, save-success clearing, save-failure retention, API key in-memory behavior, and centered mode.

## Task 1: Center The Shared Overlay

**Files:**
- Modify: `components/adaptive-form-overlay.tsx`
- Modify: `app/globals.css`
- Test: `tests/components/adaptive-form-overlay.test.tsx`
- Test: `tests/components/rules-table.test.tsx`
- Test: `tests/components/model-manager.test.tsx`

- [ ] **Step 1: Update failing overlay mode tests**

In `tests/components/adaptive-form-overlay.test.tsx`, replace the boundary test with:

```tsx
  it("keeps overlay mode centered across viewport sizes", () => {
    expect(getOverlayMode(1179, 759)).toBe("dialog");
    expect(getOverlayMode(1180, 759)).toBe("dialog");
    expect(getOverlayMode(1179, 760)).toBe("dialog");
    expect(getOverlayMode(1180, 760)).toBe("dialog");
    expect(getOverlayMode(1440, 900)).toBe("dialog");
  });
```

In the last test in the same file, change the name and expectations to:

```tsx
  it("keeps dialog mode on resize without remounting typed form state", async () => {
    const user = userEvent.setup();
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;

    try {
      window.innerWidth = 1280;
      window.innerHeight = 900;

      render(<OverlayHarness />);

      await user.click(screen.getByRole("button", { name: "Open overlay" }));

      const overlay = screen.getByRole("dialog");
      const input = screen.getByLabelText("名称") as HTMLInputElement;

      expect(overlay.tagName).toBe("DIALOG");
      expect(overlay).toHaveAttribute("data-overlay-mode", "dialog");

      await user.type(input, "已填写的内容");
      expect(input.value).toBe("已填写的内容");

      window.innerWidth = 1024;
      window.innerHeight = 700;
      fireEvent(window, new Event("resize"));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toHaveAttribute("data-overlay-mode", "dialog");
      });

      expect(screen.getByLabelText("名称")).toHaveValue("已填写的内容");
    } finally {
      window.innerWidth = originalInnerWidth;
      window.innerHeight = originalInnerHeight;
    }
  });
```

In `tests/components/rules-table.test.tsx`, rename `starts in drawer mode on large screens, switches to dialog on resize, and keeps typed values` to `uses centered dialog mode on large screens and keeps typed values on resize`. Change its mode expectations:

```tsx
      expect(overlay).toHaveAttribute("data-overlay-mode", "dialog");
```

and:

```tsx
      await waitFor(() => {
        expect(screen.getByRole("dialog", { name: "规则编辑" })).toHaveAttribute(
          "data-overlay-mode",
          "dialog",
        );
      });
```

In `tests/components/model-manager.test.tsx`, rename `keeps typed values when the create overlay switches modes on resize` to `uses centered dialog mode and keeps typed values on resize`. Change its mode expectations:

```tsx
      expect(overlay).toHaveAttribute("data-overlay-mode", "dialog");
```

and:

```tsx
      await waitFor(() => {
        expect(screen.getByRole("dialog", { name: "新增模型配置" })).toHaveAttribute(
          "data-overlay-mode",
          "dialog",
        );
      });
```

- [ ] **Step 2: Run focused tests to verify they fail**

Run:

```bash
npm test -- --run tests/components/adaptive-form-overlay.test.tsx tests/components/rules-table.test.tsx tests/components/model-manager.test.tsx
```

Expected: FAIL. At least one failure should show `data-overlay-mode` expected `"dialog"` but received `"drawer"`, or `getOverlayMode(1180, 760)` expected `"dialog"` but received `"drawer"`.

- [ ] **Step 3: Implement stable dialog mode**

In `components/adaptive-form-overlay.tsx`, replace `getOverlayMode` with:

```tsx
export function getOverlayMode(_width: number, _height: number): OverlayMode {
  return "dialog";
}
```

Keep the resize listener and `data-overlay-mode` attribute unchanged. They remain useful for state-preservation tests and future form-overlay modes.

- [ ] **Step 4: Widen the centered panel**

In `app/globals.css`, change the dialog panel rule from:

```css
.form-overlay[data-overlay-mode="dialog"] .form-overlay-panel {
  width: min(640px, 100%);
}
```

to:

```css
.form-overlay[data-overlay-mode="dialog"] .form-overlay-panel {
  width: min(820px, 100%);
}
```

Keep the existing `.form-overlay-panel` `max-width: 100%` and `.form-overlay` padding so small windows cannot overflow horizontally.

- [ ] **Step 5: Run focused tests to verify they pass**

Run:

```bash
npm test -- --run tests/components/adaptive-form-overlay.test.tsx tests/components/rules-table.test.tsx tests/components/model-manager.test.tsx
```

Expected: PASS for all three test files.

- [ ] **Step 6: Commit overlay centering**

```bash
git add components/adaptive-form-overlay.tsx app/globals.css tests/components/adaptive-form-overlay.test.tsx tests/components/rules-table.test.tsx tests/components/model-manager.test.tsx
git commit -m "fix: center form overlay"
```

## Task 2: Preserve Rule Create Drafts

**Files:**
- Modify: `components/rule-editor-drawer.tsx`
- Modify: `components/rules-table.tsx`
- Test: `tests/components/rules-table.test.tsx`

- [ ] **Step 1: Add failing rule create-draft tests**

Append these tests inside `describe("RulesTable", () => { ... })` in `tests/components/rules-table.test.tsx`:

```tsx
  it("keeps unsaved create rule values after closing and reopening", async () => {
    const user = userEvent.setup();

    render(<RulesTable items={[]} />);

    await user.click(screen.getByRole("button", { name: "新增规则" }));
    await user.type(screen.getByLabelText("规则名称"), "新增草稿规则");
    await user.type(screen.getByLabelText("分类"), "体验");
    await user.type(screen.getByLabelText("规则说明"), "不要在关闭后消失");

    await user.click(screen.getByRole("button", { name: "取消" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "新增规则" })).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "新增规则" }));

    expect(screen.getByLabelText("规则名称")).toHaveValue("新增草稿规则");
    expect(screen.getByLabelText("分类")).toHaveValue("体验");
    expect(screen.getByLabelText("规则说明")).toHaveValue("不要在关闭后消失");
  });

  it("clears the create rule draft only when the user clicks clear", async () => {
    const user = userEvent.setup();

    render(<RulesTable items={[]} />);

    await user.click(screen.getByRole("button", { name: "新增规则" }));
    await user.type(screen.getByLabelText("规则名称"), "待清空规则");
    await user.type(screen.getByLabelText("分类"), "草稿");
    await user.clear(screen.getByLabelText("评审模板"));
    await user.type(screen.getByLabelText("评审模板"), "临时模板");

    await user.click(screen.getByRole("button", { name: "清空" }));

    expect(screen.getByLabelText("规则名称")).toHaveValue("");
    expect(screen.getByLabelText("分类")).toHaveValue("");
    expect(screen.getByLabelText("规则说明")).toHaveValue("");
    expect(screen.getByLabelText("评审模板")).toHaveValue(expect.stringContaining("评审目标"));
    expect(screen.getByLabelText("默认严重级别")).toHaveValue("medium");
    expect(screen.getByLabelText("保存后立即启用")).toBeChecked();
  });

  it("clears the create rule draft after a successful create save", async () => {
    const user = userEvent.setup();
    const saveRuleMock = vi.fn().mockResolvedValue({
      enabledCount: 1,
      categoryCount: 1,
      latestUpdatedAtLabel: "2026-04-24 12:00",
      items: [],
      totalCount: 1,
    });

    window.plreview.saveRule = saveRuleMock;

    render(<RulesTable items={[]} />);

    await user.click(screen.getByRole("button", { name: "新增规则" }));
    await user.type(screen.getByLabelText("规则名称"), "保存后清空");
    await user.type(screen.getByLabelText("分类"), "规则");
    await user.type(screen.getByLabelText("规则说明"), "保存成功后不应留在下一次新增");

    await user.click(screen.getByRole("button", { name: "保存规则" }));

    await waitFor(() => {
      expect(saveRuleMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: undefined,
          name: "保存后清空",
          category: "规则",
          description: "保存成功后不应留在下一次新增",
        }),
      );
    });

    await user.click(screen.getByRole("button", { name: "新增规则" }));

    expect(screen.getByLabelText("规则名称")).toHaveValue("");
    expect(screen.getByLabelText("分类")).toHaveValue("");
    expect(screen.getByLabelText("规则说明")).toHaveValue("");
  });

  it("keeps the create rule draft when create save fails", async () => {
    const user = userEvent.setup();
    window.plreview.saveRule = vi.fn().mockRejectedValue(new Error("保存失败"));

    render(<RulesTable items={[]} />);

    await user.click(screen.getByRole("button", { name: "新增规则" }));
    await user.type(screen.getByLabelText("规则名称"), "失败保留");
    await user.type(screen.getByLabelText("分类"), "错误");
    await user.type(screen.getByLabelText("规则说明"), "失败后还在");

    await user.click(screen.getByRole("button", { name: "保存规则" }));

    expect(await screen.findByText("保存失败")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "新增规则" })).toBeInTheDocument();
    expect(screen.getByLabelText("规则名称")).toHaveValue("失败保留");
    expect(screen.getByLabelText("分类")).toHaveValue("错误");
    expect(screen.getByLabelText("规则说明")).toHaveValue("失败后还在");
  });
```

- [ ] **Step 2: Run rule tests to verify they fail**

Run:

```bash
npm test -- --run tests/components/rules-table.test.tsx
```

Expected: FAIL. Failures should mention missing `清空` button and create fields not retaining values after close/reopen.

- [ ] **Step 3: Add create draft props to the rule editor**

In `components/rule-editor-drawer.tsx`, add this exported type after `RuleEditorRecord`:

```tsx
export type RuleCreateDraft = {
  name: string;
  category: string;
  description: string;
  promptTemplate: string;
  severity: Severity;
  enabled: boolean;
};
```

Change the function props to include draft controls:

```tsx
export function RuleEditorDrawer({
  open,
  rule,
  createDraft,
  busy,
  errorMessage,
  onChangeCreateDraft,
  onClearCreateDraft,
  onClose,
  onSave,
}: {
  open: boolean;
  rule: RuleEditorRecord | null;
  createDraft: RuleCreateDraft;
  busy: boolean;
  errorMessage: string | null;
  onChangeCreateDraft: (draft: RuleCreateDraft) => void;
  onClearCreateDraft: () => void;
  onClose: () => void;
  onSave: (payload: RuleSaveInput) => Promise<void>;
}) {
```

Add helper functions after `const title = ...`:

```tsx
  const updateCreateDraft = <Field extends keyof RuleCreateDraft>(
    field: Field,
    value: RuleCreateDraft[Field],
  ) => {
    onChangeCreateDraft({ ...createDraft, [field]: value });
  };

  const textFieldProps = (
    field: "name" | "category" | "description" | "promptTemplate",
    fallback: string,
  ) =>
    isCreateMode
      ? {
          value: createDraft[field],
          onChange: (
            event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
          ) => updateCreateDraft(field, event.target.value),
        }
      : {
          defaultValue: fallback,
        };
```

Also add this import at the top:

```tsx
import type { ChangeEvent } from "react";
```

and use `ChangeEvent<HTMLInputElement | HTMLTextAreaElement>` in the helper instead of `React.ChangeEvent<...>` if preferred:

```tsx
            event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
```

- [ ] **Step 4: Wire controlled create fields and clear action**

In `components/rule-editor-drawer.tsx`, add the clear button before the save button in the footer:

```tsx
          {isCreateMode ? (
            <button className="button-ghost" disabled={busy} onClick={onClearCreateDraft} type="button">
              清空
            </button>
          ) : null}
```

Replace the field props:

```tsx
              <input
                id="rule-name"
                name="name"
                required
                {...textFieldProps("name", rule?.name ?? "")}
              />
```

```tsx
              <input
                id="rule-category"
                name="category"
                required
                {...textFieldProps("category", rule?.category ?? "")}
              />
```

```tsx
            <textarea
              id="rule-description"
              name="description"
              required
              {...textFieldProps("description", rule?.description ?? "")}
            />
```

```tsx
            <textarea
              id="rule-template"
              name="promptTemplate"
              required
              {...textFieldProps("promptTemplate", rule?.promptTemplate ?? RULE_TEMPLATE)}
            />
```

Replace the severity select with:

```tsx
              <select
                id="rule-severity"
                name="severity"
                {...(isCreateMode
                  ? {
                      value: createDraft.severity,
                      onChange: (event) =>
                        updateCreateDraft("severity", event.target.value as Severity),
                    }
                  : {
                      defaultValue: rule?.severity ?? Severity.medium,
                    })}
              >
```

Replace the enabled checkbox with:

```tsx
                <input
                  name="enabled"
                  type="checkbox"
                  {...(isCreateMode
                    ? {
                        checked: createDraft.enabled,
                        onChange: (event) => updateCreateDraft("enabled", event.target.checked),
                      }
                    : {
                        defaultChecked: rule?.enabled ?? true,
                      })}
                />
```

- [ ] **Step 5: Own the rule create draft in `RulesTable`**

In `components/rules-table.tsx`, change the imports:

```tsx
import { RuleEditorDrawer, type RuleCreateDraft } from "@/components/rule-editor-drawer";
import { RULE_TEMPLATE } from "@/lib/defaults";
```

Add this helper above `RulesTable`:

```tsx
function createDefaultRuleDraft(): RuleCreateDraft {
  return {
    name: "",
    category: "",
    description: "",
    promptTemplate: RULE_TEMPLATE,
    severity: "medium",
    enabled: true,
  };
}
```

Add state inside `RulesTable`:

```tsx
  const [createDraft, setCreateDraft] = useState<RuleCreateDraft>(() => createDefaultRuleDraft());
```

Update `updateRules` so callers can tell whether the save succeeded. Change its signature from:

```tsx
  async function updateRules(action: () => Promise<RuleDashboardData>, successMessage: string) {
```

with:

```tsx
  async function updateRules(
    action: () => Promise<RuleDashboardData>,
    successMessage: string,
  ): Promise<boolean> {
```

Inside the bridge-unavailable branch, add `return false;`:

```tsx
    if (!window.plreview?.getRuleDashboard) {
      setFeedback("桌面桥接不可用，请从 Electron 桌面壳启动。");
      return false;
    }
```

Inside the `try` block, return `true` after closing the editor:

```tsx
      setRecords(nextDashboard.items);
      setFeedback(successMessage);
      setEditingId(null);
      setIsCreateOpen(false);
      return true;
```

Inside the `catch` block, return `false` after setting feedback:

```tsx
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "规则操作失败。");
      return false;
    } finally {
      setIsSaving(false);
    }
```

Then update the `onSave` prop to clear only after a successful create save:

```tsx
        onSave={async (payload: RuleSaveInput) => {
          const saved = await updateRules(
            () => window.plreview.saveRule(payload),
            payload.id ? "规则已更新。" : "规则已创建。",
          );

          if (saved && !payload.id) {
            setCreateDraft(createDefaultRuleDraft());
          }
        }}
```

Pass the draft props:

```tsx
        createDraft={createDraft}
        onChangeCreateDraft={setCreateDraft}
        onClearCreateDraft={() => setCreateDraft(createDefaultRuleDraft())}
```

Keep the existing editor key:

```tsx
        key={isCreateOpen ? "create" : editingRule?.id ?? "closed"}
```

The key can stay because the draft now lives in the parent and survives unmounts.

- [ ] **Step 6: Run rule tests to verify they pass**

Run:

```bash
npm test -- --run tests/components/rules-table.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit rule draft retention**

```bash
git add components/rule-editor-drawer.tsx components/rules-table.tsx tests/components/rules-table.test.tsx
git commit -m "fix: preserve rule create drafts"
```

## Task 3: Preserve Model Create Drafts

**Files:**
- Modify: `components/model-editor-drawer.tsx`
- Modify: `components/model-manager.tsx`
- Test: `tests/components/model-manager.test.tsx`

- [ ] **Step 1: Add failing model create-draft tests**

Append these tests inside `describe("ModelManager", () => { ... })` in `tests/components/model-manager.test.tsx`:

```tsx
  it("keeps unsaved create model values after closing and reopening", async () => {
    const user = userEvent.setup();

    render(<ModelManager profiles={[]} />);

    await user.click(screen.getByRole("button", { name: "新增模型" }));
    await user.type(screen.getByLabelText("配置名称"), "新增模型草稿");
    await user.type(screen.getByLabelText("供应商显示名"), "OpenAI Compatible");
    await user.type(screen.getByLabelText("默认模型"), "qwen-plus");
    await user.type(screen.getByLabelText("Base URL"), "https://example.com/v1");
    await user.type(screen.getByLabelText("API Key"), "sk-draft");

    await user.click(screen.getByRole("button", { name: "取消" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "新增模型配置" })).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "新增模型" }));

    expect(screen.getByLabelText("配置名称")).toHaveValue("新增模型草稿");
    expect(screen.getByLabelText("供应商显示名")).toHaveValue("OpenAI Compatible");
    expect(screen.getByLabelText("默认模型")).toHaveValue("qwen-plus");
    expect(screen.getByLabelText("Base URL")).toHaveValue("https://example.com/v1");
    expect(screen.getByLabelText("API Key")).toHaveValue("sk-draft");
  });

  it("clears the create model draft only when the user clicks clear", async () => {
    const user = userEvent.setup();

    render(<ModelManager profiles={[]} />);

    await user.click(screen.getByRole("button", { name: "新增模型" }));
    await user.type(screen.getByLabelText("配置名称"), "待清空模型");
    await user.type(screen.getByLabelText("供应商显示名"), "Provider");
    await user.type(screen.getByLabelText("默认模型"), "model-a");
    await user.type(screen.getByLabelText("Base URL"), "https://example.com/v1");
    await user.type(screen.getByLabelText("API Key"), "sk-clear");

    await user.click(screen.getByRole("button", { name: "清空" }));

    expect(screen.getByLabelText("配置名称")).toHaveValue("");
    expect(screen.getByLabelText("供应商显示名")).toHaveValue("");
    expect(screen.getByLabelText("运行模式")).toHaveValue("live");
    expect(screen.getByLabelText("默认模型")).toHaveValue("");
    expect(screen.getByLabelText("Base URL")).toHaveValue("");
    expect(screen.getByLabelText("常用模型")).toHaveValue("");
    expect(screen.getByLabelText("API Key")).toHaveValue("");
    expect(screen.getByLabelText("保存后立即启用")).toBeChecked();
  });

  it("clears the create model draft after a successful create save", async () => {
    const user = userEvent.setup();

    render(<ModelManager profiles={[]} />);

    await user.click(screen.getByRole("button", { name: "新增模型" }));
    await user.type(screen.getByLabelText("配置名称"), "保存后清空模型");
    await user.type(screen.getByLabelText("供应商显示名"), "OpenAI Compatible");
    await user.type(screen.getByLabelText("默认模型"), "qwen-plus");
    await user.type(screen.getByLabelText("Base URL"), "https://example.com/v1");
    await user.type(screen.getByLabelText("API Key"), "sk-created");

    await user.click(screen.getByRole("button", { name: "保存配置" }));

    await waitFor(() => {
      expect(window.plreview.saveModelProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          id: undefined,
          name: "保存后清空模型",
          provider: "OpenAI Compatible",
          defaultModel: "qwen-plus",
          baseUrl: "https://example.com/v1",
          apiKey: "sk-created",
        }),
      );
    });

    await user.click(screen.getByRole("button", { name: "新增模型" }));

    expect(screen.getByLabelText("配置名称")).toHaveValue("");
    expect(screen.getByLabelText("供应商显示名")).toHaveValue("");
    expect(screen.getByLabelText("默认模型")).toHaveValue("");
    expect(screen.getByLabelText("Base URL")).toHaveValue("");
    expect(screen.getByLabelText("API Key")).toHaveValue("");
  });

  it("keeps the create model draft when create save fails", async () => {
    const user = userEvent.setup();
    window.plreview.saveModelProfile = vi.fn().mockRejectedValue(new Error("模型保存失败"));

    render(<ModelManager profiles={[]} />);

    await user.click(screen.getByRole("button", { name: "新增模型" }));
    await user.type(screen.getByLabelText("配置名称"), "失败模型");
    await user.type(screen.getByLabelText("供应商显示名"), "Provider");
    await user.type(screen.getByLabelText("默认模型"), "model-a");
    await user.type(screen.getByLabelText("Base URL"), "https://example.com/v1");
    await user.type(screen.getByLabelText("API Key"), "sk-failed");

    await user.click(screen.getByRole("button", { name: "保存配置" }));

    expect(await screen.findByText("模型保存失败")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "新增模型配置" })).toBeInTheDocument();
    expect(screen.getByLabelText("配置名称")).toHaveValue("失败模型");
    expect(screen.getByLabelText("供应商显示名")).toHaveValue("Provider");
    expect(screen.getByLabelText("API Key")).toHaveValue("sk-failed");
  });
```

- [ ] **Step 2: Run model tests to verify they fail**

Run:

```bash
npm test -- --run tests/components/model-manager.test.tsx
```

Expected: FAIL. Failures should mention missing `清空` button and create fields not retaining values after close/reopen.

- [ ] **Step 3: Add create draft props to the model editor**

In `components/model-editor-drawer.tsx`, add this import:

```tsx
import type { ChangeEvent } from "react";
```

Add this exported type after `ModelEditorProfile`:

```tsx
export type ModelCreateDraft = {
  name: string;
  provider: string;
  vendorKey: string;
  mode: "live" | "demo";
  baseUrl: string;
  defaultModel: string;
  modelOptionsText: string;
  apiKey: string;
  enabled: boolean;
};
```

Change the function props:

```tsx
export function ModelEditorDrawer({
  open,
  profile,
  createDraft,
  busy,
  errorMessage,
  onChangeCreateDraft,
  onClearCreateDraft,
  onClose,
  onSave,
}: {
  open: boolean;
  profile: ModelEditorProfile | null;
  createDraft: ModelCreateDraft;
  busy: boolean;
  errorMessage: string | null;
  onChangeCreateDraft: (draft: ModelCreateDraft) => void;
  onClearCreateDraft: () => void;
  onClose: () => void;
  onSave: (payload: ModelSaveInput) => Promise<void>;
}) {
```

Add helpers after `const title = ...`:

```tsx
  const updateCreateDraft = <Field extends keyof ModelCreateDraft>(
    field: Field,
    value: ModelCreateDraft[Field],
  ) => {
    onChangeCreateDraft({ ...createDraft, [field]: value });
  };

  const textFieldProps = (
    field: "name" | "provider" | "baseUrl" | "defaultModel" | "modelOptionsText" | "apiKey",
    fallback: string,
  ) =>
    isCreateMode
      ? {
          value: createDraft[field],
          onChange: (
            event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
          ) => updateCreateDraft(field, event.target.value),
        }
      : {
          defaultValue: fallback,
        };
```

- [ ] **Step 4: Wire controlled create fields and clear action**

In `components/model-editor-drawer.tsx`, add the clear button before the save button:

```tsx
          {isCreateMode ? (
            <button className="button-ghost" disabled={busy} onClick={onClearCreateDraft} type="button">
              清空
            </button>
          ) : null}
```

Replace the hidden vendor key value with:

```tsx
        <input
          name="vendorKey"
          type="hidden"
          value={isCreateMode ? createDraft.vendorKey : profile?.vendorKey ?? "openai_compatible"}
        />
```

Replace each create-capable field with the controlled/uncontrolled spread:

```tsx
              <input
                id="model-name"
                name="name"
                required
                {...textFieldProps("name", profile?.name ?? "")}
              />
```

```tsx
              <input
                id="provider"
                name="provider"
                required
                {...textFieldProps("provider", profile?.provider ?? "")}
              />
```

```tsx
              <select
                id="mode"
                name="mode"
                {...(isCreateMode
                  ? {
                      value: createDraft.mode,
                      onChange: (event) =>
                        updateCreateDraft("mode", event.target.value as "live" | "demo"),
                    }
                  : {
                      defaultValue: profile?.mode ?? "live",
                    })}
              >
```

```tsx
              <input
                id="defaultModel"
                name="defaultModel"
                placeholder="例如：qwen-plus"
                required
                {...textFieldProps("defaultModel", profile?.defaultModel ?? "")}
              />
```

```tsx
            <input
              id="baseUrl"
              name="baseUrl"
              required
              {...textFieldProps("baseUrl", profile?.baseUrl ?? "")}
            />
```

```tsx
            <textarea
              id="modelOptionsText"
              name="modelOptionsText"
              placeholder={"qwen-plus\nqwen-turbo"}
              {...textFieldProps("modelOptionsText", profile?.modelOptionsText ?? "")}
            />
```

```tsx
            <input
              id="apiKey"
              name="apiKey"
              type="password"
              {...textFieldProps("apiKey", "")}
            />
```

Replace the enabled checkbox with:

```tsx
            <label>
              <input
                name="enabled"
                type="checkbox"
                {...(isCreateMode
                  ? {
                      checked: createDraft.enabled,
                      onChange: (event) => updateCreateDraft("enabled", event.target.checked),
                    }
                  : {
                      defaultChecked: profile?.enabled ?? true,
                    })}
              />{" "}
              保存后立即启用
            </label>
```

- [ ] **Step 5: Own the model create draft in `ModelManager`**

In `components/model-manager.tsx`, change the editor import:

```tsx
import { ModelEditorDrawer, type ModelCreateDraft } from "@/components/model-editor-drawer";
```

Add this helper above `ModelManager`:

```tsx
function createDefaultModelDraft(): ModelCreateDraft {
  return {
    name: "",
    provider: "",
    vendorKey: "openai_compatible",
    mode: "live",
    baseUrl: "",
    defaultModel: "",
    modelOptionsText: "",
    apiKey: "",
    enabled: true,
  };
}
```

Add state inside `ModelManager`:

```tsx
  const [createDraft, setCreateDraft] = useState<ModelCreateDraft>(() => createDefaultModelDraft());
```

Update `updateProfiles` so callers can tell whether the save succeeded. Change its signature from:

```tsx
  async function updateProfiles(
    action: () => Promise<ModelDashboardData>,
    successMessage: string,
  ) {
```

to:

```tsx
  async function updateProfiles(
    action: () => Promise<ModelDashboardData>,
    successMessage: string,
  ): Promise<boolean> {
```

Inside the bridge-unavailable branch, add `return false;`:

```tsx
    if (!window.plreview?.getModelDashboard) {
      setFeedback("桌面桥接不可用，请从 Electron 桌面壳启动。");
      return false;
    }
```

Inside the `try` block, return `true` after closing the editor:

```tsx
      setRecords(nextDashboard.profiles);
      setFeedback(successMessage);
      setEditingId(null);
      setIsCreateOpen(false);
      return true;
```

Inside the `catch` block, return `false` after setting feedback:

```tsx
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "模型配置操作失败。");
      return false;
    } finally {
      setIsSaving(false);
    }
```

Then update the `ModelEditorDrawer` props:

```tsx
        createDraft={createDraft}
        onChangeCreateDraft={setCreateDraft}
        onClearCreateDraft={() => setCreateDraft(createDefaultModelDraft())}
        onSave={async (payload: ModelSaveInput) => {
          const saved = await updateProfiles(
            () => window.plreview.saveModelProfile(payload),
            payload.id ? "模型配置已更新。" : "模型配置已创建。",
          );

          if (saved && !payload.id) {
            setCreateDraft(createDefaultModelDraft());
          }
        }}
```

- [ ] **Step 6: Run model tests to verify they pass**

Run:

```bash
npm test -- --run tests/components/model-manager.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit model draft retention**

```bash
git add components/model-editor-drawer.tsx components/model-manager.tsx tests/components/model-manager.test.tsx
git commit -m "fix: preserve model create drafts"
```

## Task 4: Final Verification

**Files:**
- Verify only; no planned code changes.

- [ ] **Step 1: Run the focused component suite**

Run:

```bash
npm test -- --run tests/components/adaptive-form-overlay.test.tsx tests/components/rules-table.test.tsx tests/components/model-manager.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run the broader related app suite**

Run:

```bash
npm test -- --run tests/app/rules-page.test.tsx tests/app/models-page.test.tsx tests/components/adaptive-form-overlay.test.tsx tests/components/rules-table.test.tsx tests/components/model-manager.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run TypeScript check**

Run:

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git status --short
git diff --stat HEAD
```

Expected: clean working tree if all task commits were made. If there are uncommitted changes, inspect them and either commit intentional changes or remove generated artifacts that are not part of the implementation.

## Self-Review

### Spec Coverage

- Centered overlay: Task 1 changes `getOverlayMode()` and CSS width, with tests updated in overlay/rule/model suites.
- Wider window: Task 1 sets dialog panel width to `min(820px, 100%)`.
- Header/body/footer scrolling preserved: Task 1 only changes width and mode, leaving the existing three-zone structure untouched.
- Create rule draft retention: Task 2 owns `RuleCreateDraft` in `RulesTable`, controls create fields, and tests close/reopen behavior.
- Create model draft retention: Task 3 owns `ModelCreateDraft` in `ModelManager`, controls create fields including API Key in memory, and tests close/reopen behavior.
- Explicit clear button: Tasks 2 and 3 add `清空` buttons and tests.
- Save success clears draft: Tasks 2 and 3 reset create drafts only after successful create saves and test this.
- Save failure preserves draft: Tasks 2 and 3 add failure tests.
- Editing existing records does not inherit drafts: existing rule switching test remains; model edit switching is indirectly protected by keeping edit mode uncontrolled per profile and can be extended if a regression appears during execution.

### Placeholder Scan

The plan contains no unresolved markers or unspecified test steps. Each task includes exact files, code snippets, commands, and expected outcomes.

### Type Consistency

- `RuleCreateDraft` is exported from `components/rule-editor-drawer.tsx` and imported by `components/rules-table.tsx`.
- `ModelCreateDraft` is exported from `components/model-editor-drawer.tsx` and imported by `components/model-manager.tsx`.
- `onChangeCreateDraft` and `onClearCreateDraft` prop names are consistent between parent and editor components.
- `severity` uses Prisma `Severity`; the default `"medium"` matches current enum string usage in existing tests.
