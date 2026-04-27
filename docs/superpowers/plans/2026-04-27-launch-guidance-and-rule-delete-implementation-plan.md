# Launch Guidance And Rule Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver three approved desktop optimizations: top hidden draggable edge, launch-page missing-field guidance with focus + highlight motion, and rule deletion with soft/hard policy plus low-visibility deleted filter.

**Architecture:** Keep the current Electron + preload bridge + React client architecture, and implement behavior in narrow slices: data-layer deletion semantics first, then IPC bridge, then rules UI, then launch-page interaction, then shell drag-edge styling. Every slice is independently testable and commit-ready.

**Tech Stack:** Next.js App Router, React 19 client components, TypeScript, Electron IPC bridge, Prisma + SQLite, Vitest + Testing Library, global CSS in `app/globals.css`.

---

## File Structure

- Modify: `prisma/schema.prisma`
  - Add `Rule.deletedAt` soft-delete marker.
- Modify: `lib/rules.ts`
  - Add deletion strategy (`soft` vs `hard`) and dashboard query option `includeDeleted`.
- Modify: `desktop/core/reviews/create-review-batch.ts`
  - Enforce non-deleted + enabled rule guard for new batch creation.
- Modify: `desktop/core/rules/list-rules.ts`
  - Hide soft-deleted rules from worker list/search defaults.
- Modify: `desktop/worker/protocol.ts`
  - Add `rulesDelete` request channel and query payload support for rules dashboard.
- Modify: `electron/channels.ts`
  - Register `rulesDelete` channel.
- Modify: `desktop/bridge/desktop-api.ts`
  - Add `deleteRule(id)` bridge API and `getRuleDashboard({ includeDeleted })`.
- Modify: `electron/preload.ts`
  - Bridge `deleteRule`.
- Modify: `electron/preload.cjs`
  - Bridge `deleteRule`.
- Modify: `electron/main.ts`
  - Route `rulesDelete` and pass `includeDeleted` to dashboard handler.
- Modify: `electron/desktop-data-bridge.ts`
  - Export `deleteRule`.
- Modify: `components/rules-table.tsx`
  - Add delete confirmation, deleted-row rendering, and collapsed “更多筛选 -> 显示已删除”.
- Modify: `app/globals.css`
  - Add deleted-row/filter styles, launch missing-field highlight animation, and top drag-edge styles.
- Modify: `components/intake-workbench.tsx`
  - Replace passive missing-copy with proactive missing-field jump/focus/highlight flow.
- Modify: `app/layout.tsx`
  - Add hidden global drag-edge element.
- Modify: `tests/lib/rules.test.ts` (new)
  - Add data-layer tests for soft/hard delete behavior and dashboard filtering.
- Modify: `tests/desktop/create-review-batch.test.ts`
  - Verify new-batch rule query includes `enabled: true` and `deletedAt: null`.
- Modify: `tests/desktop/desktop-api.test.ts`
  - Verify `deleteRule` and `getRuleDashboard({ includeDeleted })` routing.
- Modify: `tests/desktop/worker-protocol.test.ts`
  - Verify `rulesDelete` constant.
- Modify: `tests/components/rules-table.test.tsx`
  - Verify confirmation delete flow, deleted filter toggle, and feedback modes.
- Modify: `tests/components/intake-workbench.test.tsx`
  - Verify submit-time missing guidance: full highlight + jump + focus.
- Modify: `tests/app/layout-shell.test.tsx`
  - Verify drag-edge markup exists in root shell.
- Modify: `tests/lib/globals-shell.test.ts`
  - Verify drag-edge CSS and missing-field animation hooks.
- Modify: test fixture files assigning `window.plreview` (file list generated in Task 2 Step 4 command output)
  - Add `deleteRule: vi.fn()` to keep type surface complete.

## Task 1: Add Rule Soft-Delete Data Semantics

**Files:**
- Create: `tests/lib/rules.test.ts`
- Modify: `prisma/schema.prisma`
- Modify: `lib/rules.ts`
- Modify: `desktop/core/reviews/create-review-batch.ts`
- Modify: `desktop/core/rules/list-rules.ts`
- Test: `tests/desktop/create-review-batch.test.ts`

- [ ] **Step 1: Write failing data-layer tests**

Create `tests/lib/rules.test.ts` with:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ruleFindMany,
  ruleUpdate,
  ruleDelete,
  annotationCount,
  reviewBatchRuleCount,
} = vi.hoisted(() => ({
  ruleFindMany: vi.fn(),
  ruleUpdate: vi.fn(),
  ruleDelete: vi.fn(),
  annotationCount: vi.fn(),
  reviewBatchRuleCount: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    rule: {
      findMany: ruleFindMany,
      update: ruleUpdate,
      delete: ruleDelete,
    },
    annotation: {
      count: annotationCount,
    },
    reviewBatchRule: {
      count: reviewBatchRuleCount,
    },
  },
}));

import { deleteRule, getRuleDashboardData } from "@/lib/rules";

describe("rules data layer", () => {
  beforeEach(() => {
    ruleFindMany.mockReset();
    ruleUpdate.mockReset();
    ruleDelete.mockReset();
    annotationCount.mockReset();
    reviewBatchRuleCount.mockReset();
  });

  it("filters out soft-deleted rules by default", async () => {
    ruleFindMany.mockResolvedValue([]);
    await getRuleDashboardData();
    expect(ruleFindMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      orderBy: [{ enabled: "desc" }, { category: "asc" }, { updatedAt: "desc" }],
    });
  });

  it("keeps deleted rows when includeDeleted is true", async () => {
    ruleFindMany.mockResolvedValue([]);
    await getRuleDashboardData({ includeDeleted: true });
    expect(ruleFindMany).toHaveBeenCalledWith({
      orderBy: [{ enabled: "desc" }, { category: "asc" }, { updatedAt: "desc" }],
    });
  });

  it("soft-deletes when rule has historical associations", async () => {
    annotationCount.mockResolvedValue(1);
    reviewBatchRuleCount.mockResolvedValue(0);
    ruleUpdate.mockResolvedValue({});

    await expect(deleteRule("rule_1")).resolves.toMatchObject({ mode: "soft" });
    expect(ruleUpdate).toHaveBeenCalledWith({
      where: { id: "rule_1" },
      data: { deletedAt: expect.any(Date), enabled: false },
    });
    expect(ruleDelete).not.toHaveBeenCalled();
  });

  it("hard-deletes when rule has no historical associations", async () => {
    annotationCount.mockResolvedValue(0);
    reviewBatchRuleCount.mockResolvedValue(0);
    ruleDelete.mockResolvedValue({});

    await expect(deleteRule("rule_2")).resolves.toMatchObject({ mode: "hard" });
    expect(ruleDelete).toHaveBeenCalledWith({ where: { id: "rule_2" } });
    expect(ruleUpdate).not.toHaveBeenCalled();
  });
});
```

In `tests/desktop/create-review-batch.test.ts`, add:

```ts
expect(tx.rule.findMany).toHaveBeenCalledWith({
  where: {
    id: { in: ["rule_a", "rule_b"] },
    enabled: true,
    deletedAt: null,
  },
});
```

- [ ] **Step 2: Run focused tests and verify failure**

Run:

```bash
npm test -- --run tests/lib/rules.test.ts tests/desktop/create-review-batch.test.ts
```

Expected: FAIL with missing `deleteRule` export and/or mismatched Prisma `where` conditions.

- [ ] **Step 3: Implement soft-delete semantics and query guards**

In `prisma/schema.prisma`, update `Rule`:

```prisma
model Rule {
  id             String        @id @default(cuid())
  name           String
  category       String
  description    String
  promptTemplate String
  severity       Severity
  enabled        Boolean       @default(true)
  deletedAt      DateTime?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  versions       RuleVersion[]
  annotations    Annotation[]
}
```

In `lib/rules.ts`, add:

```ts
type RuleDashboardQuery = {
  includeDeleted?: boolean;
};

export async function getRuleDashboardData(query: RuleDashboardQuery = {}) {
  const rules = await prisma.rule.findMany({
    ...(query.includeDeleted ? {} : { where: { deletedAt: null } }),
    orderBy: [{ enabled: "desc" }, { category: "asc" }, { updatedAt: "desc" }],
  });
  const latestUpdatedAt = rules.reduce<Date | null>(
    (latest, rule) => (!latest || rule.updatedAt > latest ? rule.updatedAt : latest),
    null,
  );

  return {
    enabledCount: rules.filter((rule) => rule.enabled && !rule.deletedAt).length,
    categoryCount: new Set(rules.map((rule) => rule.category)).size,
    latestUpdatedAtLabel: latestUpdatedAt ? formatDate(latestUpdatedAt).slice(5, 16) : "--",
    items: rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      category: rule.category,
      description: rule.description,
      promptTemplate: rule.promptTemplate,
      severity: rule.severity,
      enabled: rule.enabled,
      isDeleted: Boolean(rule.deletedAt),
      updatedAtLabel: formatDate(rule.updatedAt),
    })),
    totalCount: rules.length,
  };
}

export async function deleteRule(id: string) {
  const normalizedId = id.trim();
  if (!normalizedId) {
    throw new Error("缺少规则 ID。");
  }

  const [annotationRefCount, batchRuleRefCount] = await Promise.all([
    prisma.annotation.count({ where: { ruleId: normalizedId } }),
    prisma.reviewBatchRule.count({ where: { ruleVersion: { ruleId: normalizedId } } }),
  ]);

  if (annotationRefCount > 0 || batchRuleRefCount > 0) {
    await prisma.rule.update({
      where: { id: normalizedId },
      data: { deletedAt: new Date(), enabled: false },
    });
    return { mode: "soft" as const };
  }

  await prisma.rule.delete({ where: { id: normalizedId } });
  return { mode: "hard" as const };
}
```

In `desktop/core/reviews/create-review-batch.ts`, restrict rule query:

```ts
const selectedRules = await tx.rule.findMany({
  where: {
    id: { in: ruleIds },
    enabled: true,
    deletedAt: null,
  },
});
```

In `desktop/core/rules/list-rules.ts`, restrict worker list:

```ts
const rules = await prisma.rule.findMany({
  where: { deletedAt: null },
  orderBy: [{ enabled: "desc" }, { category: "asc" }, { updatedAt: "desc" }],
});
```

- [ ] **Step 4: Regenerate Prisma client and rerun tests**

Run:

```bash
npm run db:generate
npm test -- --run tests/lib/rules.test.ts tests/desktop/create-review-batch.test.ts
```

Expected: PASS for both files and Prisma client generation succeeds.

- [ ] **Step 5: Commit data-layer slice**

```bash
git add prisma/schema.prisma lib/rules.ts desktop/core/reviews/create-review-batch.ts desktop/core/rules/list-rules.ts tests/lib/rules.test.ts tests/desktop/create-review-batch.test.ts
git commit -m "feat: add rule soft-delete strategy and rule selection guards"
```

## Task 2: Wire Delete Rule Through Desktop Bridge And IPC

**Files:**
- Modify: `desktop/worker/protocol.ts`
- Modify: `electron/channels.ts`
- Modify: `desktop/bridge/desktop-api.ts`
- Modify: `electron/preload.ts`
- Modify: `electron/preload.cjs`
- Modify: `electron/main.ts`
- Modify: `electron/desktop-data-bridge.ts`
- Test: `tests/desktop/desktop-api.test.ts`
- Test: `tests/desktop/worker-protocol.test.ts`
- Test: `tests/app/rules-page.test.tsx`
- Test: `tests/components/rules-table.test.tsx`
- Test: all fixture files reported by Task 2 Step 4 command

- [ ] **Step 1: Add failing bridge tests**

In `tests/desktop/worker-protocol.test.ts`, extend channel constants test:

```ts
expect(DESKTOP_REQUESTS.rulesDelete).toBe("rules:delete");
```

In `tests/desktop/desktop-api.test.ts`, extend “full desktop bridge request surface”:

```ts
await api.getRuleDashboard({ includeDeleted: true });
await api.deleteRule("rule_2");
```

And expected calls:

```ts
[CHANNELS.rulesDashboard, { includeDeleted: true }],
[CHANNELS.rulesDelete, { id: "rule_2" }],
```

- [ ] **Step 2: Run focused bridge tests and verify failure**

Run:

```bash
npm test -- --run tests/desktop/worker-protocol.test.ts tests/desktop/desktop-api.test.ts
```

Expected: FAIL with missing `rulesDelete` channel and missing `api.deleteRule`.

- [ ] **Step 3: Implement IPC/bridge channel wiring**

In `desktop/worker/protocol.ts`:

```ts
rulesDelete: "rules:delete",
```

In `electron/channels.ts`:

```ts
rulesDelete: DESKTOP_REQUESTS.rulesDelete,
```

and register:

```ts
register(CHANNELS.rulesDelete, handlers[CHANNELS.rulesDelete] ?? notImplemented);
```

In `desktop/bridge/desktop-api.ts`, add API shapes:

```ts
export type RuleDashboardQuery = { includeDeleted?: boolean };
export type RuleDeleteResult = { mode: "soft" | "hard" };

getRuleDashboard: (query?: RuleDashboardQuery) => Promise<RuleDashboardData>;
deleteRule: (id: string) => Promise<RuleDeleteResult>;
```

and implementation:

```ts
getRuleDashboard: (query) =>
  invoke<RuleDashboardData>(DESKTOP_REQUESTS.rulesDashboard, query),
deleteRule: (id: string) =>
  invoke<RuleDeleteResult>(DESKTOP_REQUESTS.rulesDelete, { id }),
```

In both `electron/preload.ts` and `electron/preload.cjs`, expose:

```ts
deleteRule: (id) => invoke(DESKTOP_REQUESTS.rulesDelete, { id }),
```

In `electron/desktop-data-bridge.ts`, export:

```ts
deleteRule,
```

In `electron/main.ts`, update handlers:

```ts
[CHANNELS.rulesDashboard]: async (_event, payload) =>
  desktopData.getRuleDashboardData({
    includeDeleted: Boolean((payload as { includeDeleted?: unknown })?.includeDeleted),
  }),
[CHANNELS.rulesDelete]: async (_event, payload) =>
  desktopData.deleteRule(String((payload as { id?: unknown })?.id ?? "")),
```

- [ ] **Step 4: Backfill typed test fixtures with deleteRule mock**

Run:

```bash
rg -l "toggleRuleEnabled: vi\\.fn\\(\\)," tests/app tests/components tests/desktop | xargs perl -0pi -e 's/toggleRuleEnabled: vi\\.fn\\(\\),/toggleRuleEnabled: vi.fn(),\n      deleteRule: vi.fn(),/g'
```

Then verify no fixture misses method:

```bash
rg -n "toggleRuleEnabled: vi\\.fn\\(\\),(?!\\n\\s+deleteRule: vi\\.fn\\(\\),)" tests/app tests/components tests/desktop -U
```

Expected: no output from second command.

- [ ] **Step 5: Rerun bridge test set**

Run:

```bash
npm test -- --run tests/desktop/worker-protocol.test.ts tests/desktop/desktop-api.test.ts tests/app/rules-page.test.tsx tests/components/rules-table.test.tsx
```

Expected: PASS with `rulesDelete` and fixture shape fully wired.

- [ ] **Step 6: Commit bridge slice**

```bash
git add desktop/worker/protocol.ts electron/channels.ts desktop/bridge/desktop-api.ts electron/preload.ts electron/preload.cjs electron/main.ts electron/desktop-data-bridge.ts tests/desktop/worker-protocol.test.ts tests/desktop/desktop-api.test.ts tests/app tests/components
git commit -m "feat: wire rule deletion through desktop bridge"
```

## Task 3: Implement Rule Library Delete UX And Hidden Deleted Filter

**Files:**
- Modify: `components/rules-table.tsx`
- Modify: `app/globals.css`
- Test: `tests/components/rules-table.test.tsx`

- [ ] **Step 1: Add failing component tests for delete + filter**

In `tests/components/rules-table.test.tsx`, add:

```tsx
it("opens confirmation before deleting a rule", async () => {
  const user = userEvent.setup();
  render(
    <RulesTable
      items={[
        {
          id: "rule_1",
          enabled: true,
          name: "目标清晰度",
          category: "基础质量",
          severity: "medium",
          description: "检查目标表达是否清楚",
          promptTemplate: "模板 A",
          updatedAtLabel: "2026-04-27 12:00",
          isDeleted: false,
        },
      ]}
    />,
  );

  await user.click(screen.getByRole("button", { name: "删除 目标清晰度" }));
  expect(screen.getByRole("dialog", { name: "删除规则" })).toBeInTheDocument();
});

it("shows deleted rows only after enabling the hidden filter", async () => {
  const user = userEvent.setup();
  render(
    <RulesTable
      items={[
        {
          id: "rule_2",
          enabled: false,
          name: "历史规则",
          category: "归档",
          severity: "low",
          description: "历史引用规则",
          promptTemplate: "模板 B",
          updatedAtLabel: "2026-04-27 12:01",
          isDeleted: true,
        },
      ]}
    />,
  );

  expect(screen.queryByText("历史规则")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "更多筛选" }));
  await user.click(screen.getByRole("checkbox", { name: "显示已删除" }));
  expect(screen.getByText("历史规则")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run focused rules-table tests and verify failure**

Run:

```bash
npm test -- --run tests/components/rules-table.test.tsx
```

Expected: FAIL with missing delete button label, missing confirm dialog, and missing hidden deleted filter controls.

- [ ] **Step 3: Implement delete flow, hidden filter, and refresh strategy**

In `components/rules-table.tsx`:

```tsx
const [showDeleted, setShowDeleted] = useState(false);
const [deleteTarget, setDeleteTarget] = useState<RuleRow | null>(null);

async function refreshRules(nextShowDeleted = showDeleted) {
  const nextDashboard = await window.plreview.getRuleDashboard({ includeDeleted: nextShowDeleted });
  setRecords(nextDashboard.items);
}

async function handleDeleteRule() {
  if (!deleteTarget) return;
  setIsSaving(true);
  try {
    const result = await window.plreview.deleteRule(deleteTarget.id);
    await refreshRules();
    setFeedback(result.mode === "soft" ? "规则已软删除。" : "规则已删除。");
    setDeleteTarget(null);
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : "规则删除失败。");
  } finally {
    setIsSaving(false);
  }
}
```

Render deleted-filter entry:

```tsx
<div className="desktop-table-toolbar-actions">
  <details className="toolbar-more-filters">
    <summary>
      <button className="table-text-button" type="button">更多筛选</button>
    </summary>
    <label className="toolbar-filter-toggle">
      <input
        type="checkbox"
        aria-label="显示已删除"
        checked={showDeleted}
        onChange={(event) => {
          const next = event.target.checked;
          setShowDeleted(next);
          void refreshRules(next);
        }}
      />
      显示已删除
    </label>
  </details>
</div>
```

Render delete button and deleted state:

```tsx
{item.isDeleted ? <span className="pill">已删除</span> : null}
<button
  className="table-text-button is-danger"
  type="button"
  disabled={isSaving || item.isDeleted}
  aria-label={`删除 ${item.name}`}
  onClick={() => setDeleteTarget(item)}
>
  删除
</button>
```

Render confirmation:

```tsx
<ConfirmDialog
  open={Boolean(deleteTarget)}
  title="删除规则"
  description={`确认删除规则“${deleteTarget?.name ?? ""}”吗？此操作不可撤销。`}
  confirmLabel="确认删除"
  confirmBusyLabel="删除中..."
  confirmDisabled={isSaving}
  destructive
  onClose={() => setDeleteTarget(null)}
  onConfirm={() => void handleDeleteRule()}
/>
```

In `app/globals.css`, add style hooks:

```css
.toolbar-more-filters {
  position: relative;
}

.toolbar-more-filters > summary {
  list-style: none;
}

.toolbar-filter-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.data-table tr[data-rule-deleted="true"] {
  opacity: 0.72;
}
```

- [ ] **Step 4: Rerun rules-table tests**

Run:

```bash
npm test -- --run tests/components/rules-table.test.tsx tests/app/rules-page.test.tsx
```

Expected: PASS, including new delete/hidden-filter behaviors.

- [ ] **Step 5: Commit rules UI slice**

```bash
git add components/rules-table.tsx app/globals.css tests/components/rules-table.test.tsx tests/app/rules-page.test.tsx
git commit -m "feat: add rule delete confirmation and hidden deleted filter"
```

## Task 4: Replace Launch Missing Copy With Jump + Focus + Highlight

**Files:**
- Modify: `components/intake-workbench.tsx`
- Modify: `app/globals.css`
- Test: `tests/components/intake-workbench.test.tsx`

- [ ] **Step 1: Add failing launch-guidance tests**

In `tests/components/intake-workbench.test.tsx`, add:

```tsx
it("highlights all missing launch sections and focuses first missing input on submit", async () => {
  const user = userEvent.setup();
  render(<IntakeWorkbench llmProfiles={defaultProfiles} rules={defaultRules} />);

  await user.click(screen.getByRole("button", { name: "开始评审" }));

  expect(screen.getByLabelText("批次名称")).toHaveFocus();
  expect(screen.getByTestId("launch-section-batch")).toHaveAttribute("data-missing", "true");
  expect(screen.getByTestId("launch-section-documents")).toHaveAttribute("data-missing", "true");
});

it("removes missing highlight after the field becomes ready", async () => {
  const user = userEvent.setup();
  render(<IntakeWorkbench llmProfiles={defaultProfiles} rules={defaultRules} />);

  await user.click(screen.getByRole("button", { name: "开始评审" }));
  await user.type(screen.getByLabelText("批次名称"), "四月策划案");

  expect(screen.getByTestId("launch-section-batch")).toHaveAttribute("data-missing", "false");
});
```

- [ ] **Step 2: Run focused launch tests and verify failure**

Run:

```bash
npm test -- --run tests/components/intake-workbench.test.tsx
```

Expected: FAIL with missing `data-testid`/`data-missing` attributes and missing focus behavior.

- [ ] **Step 3: Implement missing-field guidance state machine**

In `components/intake-workbench.tsx`, add section ids and refs:

```tsx
type LaunchFieldKey = "batch" | "profile" | "rules" | "documents";
const [missingKeys, setMissingKeys] = useState<LaunchFieldKey[]>([]);
const sectionRefs = useRef<Record<LaunchFieldKey, HTMLElement | null>>({
  batch: null,
  profile: null,
  rules: null,
  documents: null,
});
```

Add helpers:

```tsx
function getMissingKeys() {
  return launchChecklist.filter((item) => !item.isReady).map((item) => item.id as LaunchFieldKey);
}

function focusFirstMissing(keys: LaunchFieldKey[]) {
  const target = sectionRefs.current[keys[0]];
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  const focusable = target.querySelector<HTMLElement>(
    'input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),[href],[tabindex]:not([tabindex="-1"])',
  );
  focusable?.focus({ preventScroll: true });
}
```

Gate submit:

```tsx
const missing = getMissingKeys();
if (missing.length > 0) {
  setMissingKeys(missing);
  focusFirstMissing(missing);
  return;
}
setMissingKeys([]);
```

On each section root, add markers:

```tsx
<section
  data-testid="launch-section-batch"
  data-missing={missingKeys.includes("batch") ? "true" : "false"}
  ref={(node) => {
    sectionRefs.current.batch = node;
  }}
>
```

Mirror for `profile`, `rules`, `documents` sections.

In `app/globals.css`, add missing-motion style:

```css
.launch-zone[data-missing="true"],
.launch-submit-zone[data-missing="true"] {
  border-color: rgba(233, 138, 71, 0.58);
  box-shadow: 0 0 0 3px rgba(233, 138, 71, 0.14);
  animation: launch-missing-pulse 900ms ease-out 2;
}

@keyframes launch-missing-pulse {
  0% { box-shadow: 0 0 0 0 rgba(233, 138, 71, 0.25); }
  100% { box-shadow: 0 0 0 8px rgba(233, 138, 71, 0); }
}
```

- [ ] **Step 4: Rerun launch tests**

Run:

```bash
npm test -- --run tests/components/intake-workbench.test.tsx tests/app/reviews-new-page.test.tsx
```

Expected: PASS with focus jump + full missing highlight behavior.

- [ ] **Step 5: Commit launch guidance slice**

```bash
git add components/intake-workbench.tsx app/globals.css tests/components/intake-workbench.test.tsx tests/app/reviews-new-page.test.tsx
git commit -m "feat: guide launch form completion with focus and highlights"
```

## Task 5: Add Hidden Global Top Drag Edge

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Test: `tests/app/layout-shell.test.tsx`
- Test: `tests/lib/globals-shell.test.ts`

- [ ] **Step 1: Add failing shell tests**

In `tests/app/layout-shell.test.tsx`, extend root shell assertion:

```tsx
expect(markup).toContain('class="desktop-drag-edge"');
```

In `tests/lib/globals-shell.test.ts`, add:

```ts
hasRule(".desktop-drag-edge", [
  "position: fixed;",
  "top: 0;",
  "left: 0;",
  "right: 0;",
  "height: var(--titlebar-height);",
  "-webkit-app-region: drag;",
  "background: transparent;",
]);
```

- [ ] **Step 2: Run shell tests and verify failure**

Run:

```bash
npm test -- --run tests/app/layout-shell.test.tsx tests/lib/globals-shell.test.ts
```

Expected: FAIL with missing drag-edge markup/CSS rule.

- [ ] **Step 3: Add drag-edge markup and style**

In `app/layout.tsx`, inside `<body>` and before `.desktop-shell`:

```tsx
<div aria-hidden="true" className="desktop-drag-edge" />
```

In `app/globals.css`, add:

```css
.desktop-drag-edge {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--titlebar-height);
  z-index: 80;
  background: transparent;
  -webkit-app-region: drag;
}

@media (max-width: 960px) {
  .desktop-drag-edge {
    display: none;
  }
}
```

- [ ] **Step 4: Rerun shell tests**

Run:

```bash
npm test -- --run tests/app/layout-shell.test.tsx tests/lib/globals-shell.test.ts tests/desktop/window-chrome.test.ts
```

Expected: PASS with drag-edge assertions and no window chrome regressions.

- [ ] **Step 5: Commit shell drag-edge slice**

```bash
git add app/layout.tsx app/globals.css tests/app/layout-shell.test.tsx tests/lib/globals-shell.test.ts
git commit -m "feat: add hidden top drag edge for desktop shell"
```

## Task 6: Full Regression And Closeout

**Files:**
- Modify: `docs/superpowers/plans/2026-04-27-launch-guidance-and-rule-delete-implementation-plan.md` (checklist updates only)

- [x] **Step 1: Run focused regression suite**

Run:

```bash
npm test -- --run tests/lib/rules.test.ts tests/desktop/create-review-batch.test.ts tests/desktop/desktop-api.test.ts tests/components/rules-table.test.tsx tests/components/intake-workbench.test.tsx tests/app/rules-page.test.tsx tests/app/reviews-new-page.test.tsx tests/app/layout-shell.test.tsx tests/lib/globals-shell.test.ts tests/desktop/window-chrome.test.ts
```

Expected: PASS with zero failing tests.

- [x] **Step 2: Run broad safety net**

Run:

```bash
npm test
```

Expected: PASS for full Vitest suite.

- [x] **Step 3: Mark task checklist completion in plan**

Update this plan by checking completed boxes:

```md
- [x] **Step 1: Run focused regression suite**
- [x] **Step 2: Run broad safety net**
```

- [x] **Step 4: Final commit for verification-only updates**

```bash
git add docs/superpowers/plans/2026-04-27-launch-guidance-and-rule-delete-implementation-plan.md
git commit -m "docs: mark launch guidance and rule delete plan execution status"
```

## Known Follow-Ups

- 顶部透明拖拽区目前仍未在主内容顶边达到预期效果，现阶段只有左侧导航顶部区域能稳定拖拽；后续需重新评估 Electron 窗口 chrome 与 renderer drag region 的组合方案。
- 表单样式仍有一轮统一优化空间，当前只完成了搜索框的全局样式收口，尚未系统梳理其他表单控件视觉一致性。
- “规则选择”缺失引导目前仍会高亮整个选择容器边框；后续应继续收敛到更细粒度的最小交互单元高亮。
