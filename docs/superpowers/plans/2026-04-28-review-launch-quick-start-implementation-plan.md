# Review Launch Quick Start Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the “新建批次” flow into a single quick-start page with default last-batch rules, a searchable rule-selection drawer, lighter workspace/home responsibilities, and no cross-page batch-configuration leakage into the rule library.

**Architecture:** Add a dedicated review-launch bootstrap data path so `/reviews/new` no longer assembles launch state from unrelated dashboard APIs. Keep rule-library asset management separate by introducing shared pure rule-ranking helpers used by both the rule table and the launch drawer, while the launch page owns temporary selection state, one-time default-rule messaging, and the final commit back into batch creation.

**Tech Stack:** Next.js App Router, React 19 client components, TypeScript, Electron IPC bridge, Prisma + SQLite, Vitest + Testing Library, global CSS in `app/globals.css`.

---

## File Structure

- Create: `lib/review-launch.ts`
  - Build a page-specific bootstrap payload for `/reviews/new`, including enabled models, enabled rules, and the last batch rule ids.
- Create: `lib/rule-search.ts`
  - Hold shared normalization and ranking logic for fuzzy-ish rule search.
- Create: `components/review-launch-rule-drawer.tsx`
  - Implement the launch-only rule drawer with temporary selection state and search results.
- Modify: `desktop/worker/protocol.ts`
  - Add a dedicated `reviewLaunch` request channel.
- Modify: `electron/channels.ts`
  - Register the new `reviewLaunch` desktop channel.
- Modify: `desktop/bridge/desktop-api.ts`
  - Add `ReviewLaunchData`, `ReviewLaunchRuleItem`, and `getReviewLaunchData()`.
- Modify: `electron/preload.cjs`
  - Expose `getReviewLaunchData`.
- Modify: `electron/main.ts`
  - Route the new `reviewLaunch` request to the desktop data bridge.
- Modify: `electron/desktop-data-bridge.ts`
  - Export `getReviewLaunchData`.
- Modify: `components/intake-workbench.tsx`
  - Replace the current control-panel layout with the single-column quick-start flow, summary rule cards, one-time notice, file upload emphasis, and drawer integration.
- Modify: `app/reviews/new/page.tsx`
  - Load review-launch bootstrap data instead of stitching separate rule/model dashboards.
- Modify: `app/page.tsx`
  - Simplify the home page to status + primary “开始新批次” CTA, without pre-configuring launch details.
- Modify: `app/models/page.tsx`
  - Tighten copy and empty-state CTA so the page remains maintenance-only with a light return path to launch.
- Modify: `app/reviews/page.tsx`
  - Keep the launch action simple and avoid adding pre-launch controls.
- Modify: `components/rules-table.tsx`
  - Switch rule-library search to the shared ranking helper without changing its asset-management role.
- Modify: `app/globals.css`
  - Remove the current launch control-panel styling, add quick-start page layout, summary-card, ephemeral notice, and drawer styles.
- Modify: `desktop/core/reviews/create-review-batch.ts`
  - Accept stable ordered rule ids from the new launch flow without changing the rules-page ownership boundary.
- Modify: `tests/app/reviews-new-page.test.tsx`
  - Update page bootstrap expectations around `getReviewLaunchData`.
- Modify: `tests/components/intake-workbench.test.tsx`
  - Replace control-panel expectations with quick-start flow, drawer behavior, summary cards, and one-time notice tests.
- Modify: `tests/app/home-page.test.tsx`
  - Update expectations for the simplified home page launch CTA and status copy.
- Modify: `tests/app/models-page.test.tsx`
  - Update expectations for the light “go start a batch” maintenance CTA.
- Modify: `tests/app/reviews-page.test.tsx`
  - Keep task page launch action expectations aligned with the simplified role.
- Modify: `tests/components/rules-table.test.tsx`
  - Verify ranked rule search still works in the asset-management page.
- Modify: `tests/desktop/desktop-api.test.ts`
  - Verify the new `reviewLaunch` bridge request.
- Modify: `tests/desktop/background-router.test.ts`
  - Verify worker routing for `reviewLaunch`.
- Create: `tests/lib/review-launch.test.ts`
  - Verify bootstrap payload generation and last-batch rule defaults.
- Create: `tests/lib/rule-search.test.ts`
  - Verify normalization and ranking behavior.
- Modify: test fixture files assigning `window.plreview`
  - Add `getReviewLaunchData: vi.fn()` anywhere the desktop API surface is mocked directly.

## Task 1: Add Review Launch Bootstrap Data

**Files:**
- Create: `lib/review-launch.ts`
- Modify: `electron/desktop-data-bridge.ts`
- Modify: `desktop/worker/protocol.ts`
- Modify: `electron/channels.ts`
- Modify: `desktop/bridge/desktop-api.ts`
- Modify: `electron/preload.cjs`
- Modify: `electron/main.ts`
- Modify: `tests/desktop/desktop-api.test.ts`
- Modify: `tests/desktop/background-router.test.ts`
- Create: `tests/lib/review-launch.test.ts`

- [ ] **Step 1: Write the failing bootstrap tests**

Create `tests/lib/review-launch.test.ts` with:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { llmProfileFindMany, ruleFindMany, reviewBatchFindFirst } = vi.hoisted(() => ({
  llmProfileFindMany: vi.fn(),
  ruleFindMany: vi.fn(),
  reviewBatchFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    llmProfile: { findMany: llmProfileFindMany },
    rule: { findMany: ruleFindMany },
    reviewBatch: { findFirst: reviewBatchFindFirst },
  },
}));

import { getReviewLaunchData } from "@/lib/review-launch";

describe("getReviewLaunchData", () => {
  beforeEach(() => {
    llmProfileFindMany.mockReset();
    ruleFindMany.mockReset();
    reviewBatchFindFirst.mockReset();
  });

  it("returns enabled models, enabled rules, and last batch rule ids", async () => {
    llmProfileFindMany.mockResolvedValue([
      {
        id: "profile_1",
        name: "默认配置",
        provider: "DashScope",
        defaultModel: "qwen3.6-flash",
        enabled: true,
        updatedAt: new Date("2026-04-28T10:00:00.000Z"),
      },
    ]);
    ruleFindMany.mockResolvedValue([
      {
        id: "rule_1",
        name: "目标清晰度",
        category: "基础质量",
        description: "检查业务目标与成功标准是否清楚。",
        severity: "medium",
        enabled: true,
        deletedAt: null,
        updatedAt: new Date("2026-04-28T10:00:00.000Z"),
      },
    ]);
    reviewBatchFindFirst.mockResolvedValue({
      id: "batch_latest",
      reviewBatchRules: [
        { ruleVersion: { ruleId: "rule_1" } },
        { ruleVersion: { ruleId: "rule_1" } },
      ],
    });

    await expect(getReviewLaunchData()).resolves.toEqual({
      llmProfiles: [
        {
          id: "profile_1",
          name: "默认配置",
          provider: "DashScope",
          defaultModel: "qwen3.6-flash",
        },
      ],
      rules: [
        {
          id: "rule_1",
          name: "目标清晰度",
          category: "基础质量",
          description: "检查业务目标与成功标准是否清楚。",
          severity: "medium",
        },
      ],
      lastBatchRuleIds: ["rule_1"],
    });
  });

  it("returns no defaults when there is no historical batch", async () => {
    llmProfileFindMany.mockResolvedValue([]);
    ruleFindMany.mockResolvedValue([]);
    reviewBatchFindFirst.mockResolvedValue(null);

    await expect(getReviewLaunchData()).resolves.toEqual({
      llmProfiles: [],
      rules: [],
      lastBatchRuleIds: [],
    });
  });
});
```

In `tests/desktop/desktop-api.test.ts`, add:

```ts
await api.getReviewLaunchData();
```

and expected call:

```ts
[CHANNELS.reviewLaunch, undefined],
```

In `tests/desktop/background-router.test.ts`, add:

```ts
reviewLaunch: vi.fn().mockResolvedValue({ llmProfiles: [], rules: [], lastBatchRuleIds: [] }),
```

and expectation:

```ts
await expect(
  router.handle(createWorkerEnvelope(DESKTOP_REQUESTS.reviewLaunch)),
).resolves.toEqual({ llmProfiles: [], rules: [], lastBatchRuleIds: [] });
expect(services.reviews.getReviewLaunchData).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run:

```bash
npm test -- --run tests/lib/review-launch.test.ts tests/desktop/desktop-api.test.ts tests/desktop/background-router.test.ts
```

Expected: FAIL with missing `getReviewLaunchData`, missing `reviewLaunch` channel, and missing worker routing.

- [ ] **Step 3: Implement the bootstrap data module**

Create `lib/review-launch.ts` with:

```ts
import { prisma } from "@/lib/prisma";

export async function getReviewLaunchData() {
  const [profiles, rules, lastBatch] = await Promise.all([
    prisma.llmProfile.findMany({
      where: { enabled: true },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        provider: true,
        defaultModel: true,
      },
    }),
    prisma.rule.findMany({
      where: { enabled: true, deletedAt: null },
      orderBy: [{ category: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        severity: true,
      },
    }),
    prisma.reviewBatch.findFirst({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reviewBatchRules: {
          select: {
            ruleVersion: {
              select: {
                ruleId: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const lastBatchRuleIds = Array.from(
    new Set(lastBatch?.reviewBatchRules.map((item) => item.ruleVersion.ruleId) ?? []),
  );

  return {
    llmProfiles: profiles,
    rules,
    lastBatchRuleIds,
  };
}
```

Update `electron/desktop-data-bridge.ts`:

```ts
export { getReviewLaunchData } from "@/lib/review-launch";
```

Update `desktop/worker/protocol.ts`:

```ts
reviewLaunch: "review-launch:get",
```

Update `electron/channels.ts`:

```ts
  reviewLaunch: DESKTOP_REQUESTS.reviewLaunch,
```

and register it:

```ts
  register(CHANNELS.reviewLaunch, handlers[CHANNELS.reviewLaunch] ?? notImplemented);
```

Update `desktop/bridge/desktop-api.ts`:

```ts
export type ReviewLaunchRuleItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  severity: Severity;
};

export type ReviewLaunchData = {
  llmProfiles: Array<{
    id: string;
    name: string;
    provider: string;
    defaultModel: string;
  }>;
  rules: ReviewLaunchRuleItem[];
  lastBatchRuleIds: string[];
};
```

and:

```ts
  getReviewLaunchData: () => Promise<ReviewLaunchData>;
```

plus implementation:

```ts
    getReviewLaunchData: () => invoke<ReviewLaunchData>(DESKTOP_REQUESTS.reviewLaunch),
```

Update `electron/preload.cjs`:

```js
  getReviewLaunchData: () => invoke(DESKTOP_REQUESTS.reviewLaunch),
```

Update `electron/main.ts`:

```ts
      [CHANNELS.reviewLaunch]: async () => desktopData.getReviewLaunchData(),
```

Update `desktop/worker/background-router.ts` `BackgroundServices`:

```ts
    getReviewLaunchData: () => Promise<unknown>;
```

and route it:

```ts
        case DESKTOP_REQUESTS.reviewLaunch:
          return services.reviews.getReviewLaunchData();
```

- [ ] **Step 4: Rerun the focused tests and verify they pass**

Run:

```bash
npm test -- --run tests/lib/review-launch.test.ts tests/desktop/desktop-api.test.ts tests/desktop/background-router.test.ts
```

Expected: PASS for the new bootstrap module, desktop bridge, and worker routing.

- [ ] **Step 5: Commit the bootstrap slice**

```bash
git add lib/review-launch.ts electron/desktop-data-bridge.ts desktop/worker/protocol.ts electron/channels.ts desktop/bridge/desktop-api.ts electron/preload.cjs electron/main.ts desktop/worker/background-router.ts tests/lib/review-launch.test.ts tests/desktop/desktop-api.test.ts tests/desktop/background-router.test.ts
git commit -m "feat: add review launch bootstrap data"
```

## Task 2: Add Shared Rule Ranking Helpers

**Files:**
- Create: `lib/rule-search.ts`
- Modify: `components/rules-table.tsx`
- Modify: `desktop/core/rules/search-rules.ts`
- Create: `tests/lib/rule-search.test.ts`
- Modify: `tests/components/rules-table.test.tsx`

- [ ] **Step 1: Write the failing ranking tests**

Create `tests/lib/rule-search.test.ts` with:

```ts
import { describe, expect, it } from "vitest";

import { normalizeRuleSearchText, rankRuleSearchResults } from "@/lib/rule-search";

const rules = [
  {
    id: "rule_1",
    name: "目标清晰度",
    category: "基础质量",
    description: "检查业务目标、目标用户和成功标准是否清楚。",
    severity: "medium",
  },
  {
    id: "rule_2",
    name: "执行可落地性",
    category: "执行风险",
    description: "检查步骤、资源和时间安排是否可执行。",
    severity: "high",
  },
  {
    id: "rule_3",
    name: "风险识别",
    category: "执行风险",
    description: "检查主要风险、依赖风险和验证风险是否完整。",
    severity: "high",
  },
];

describe("rule search ranking", () => {
  it("normalizes whitespace and casing", () => {
    expect(normalizeRuleSearchText("  风险   识别  ")).toBe("风险 识别");
  });

  it("prioritizes exact name hits over description hits", () => {
    const result = rankRuleSearchResults(rules, "风险");
    expect(result.map((item) => item.id)).toEqual(["rule_3", "rule_2"]);
  });

  it("prioritizes rules that match all query tokens", () => {
    const result = rankRuleSearchResults(rules, "执行 风险");
    expect(result.map((item) => item.id)).toEqual(["rule_2", "rule_3"]);
  });
});
```

In `tests/components/rules-table.test.tsx`, replace the current simple contains assertion with:

```tsx
await user.type(screen.getByRole("searchbox", { name: "搜索规则" }), "风险");
const rows = screen.getAllByRole("row").map((row) => row.textContent ?? "");
expect(rows[1]).toContain("风险识别");
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run:

```bash
npm test -- --run tests/lib/rule-search.test.ts tests/components/rules-table.test.tsx
```

Expected: FAIL with missing helper exports and current rules table leaving the old unranked order intact.

- [ ] **Step 3: Implement the ranking helpers and adopt them**

Create `lib/rule-search.ts` with:

```ts
import { severityLabel } from "@/lib/utils";

type SearchableRule = {
  id: string;
  name: string;
  category: string;
  description: string;
  severity: string;
};

export function normalizeRuleSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildHaystack(rule: SearchableRule) {
  return {
    name: normalizeRuleSearchText(rule.name),
    category: normalizeRuleSearchText(rule.category),
    description: normalizeRuleSearchText(rule.description),
    severity: normalizeRuleSearchText(
      `${rule.severity} ${severityLabel(rule.severity as never)}`,
    ),
  };
}

function scoreRule(rule: SearchableRule, query: string) {
  const normalized = normalizeRuleSearchText(query);
  if (!normalized) {
    return 0;
  }

  const tokens = normalized.split(" ");
  const haystack = buildHaystack(rule);
  const matchedTokenCount = tokens.filter(
    (token) =>
      haystack.name.includes(token) ||
      haystack.category.includes(token) ||
      haystack.description.includes(token) ||
      haystack.severity.includes(token),
  ).length;

  if (matchedTokenCount === 0) {
    return -1;
  }

  let score = matchedTokenCount * 100;
  if (haystack.name === normalized) score += 1000;
  if (haystack.name.includes(normalized)) score += 600;
  if (haystack.category.includes(normalized)) score += 300;
  if (haystack.description.includes(normalized)) score += 200;
  if (haystack.severity.includes(normalized)) score += 100;

  return score;
}

export function rankRuleSearchResults<T extends SearchableRule>(rules: T[], query: string) {
  const normalized = normalizeRuleSearchText(query);
  if (!normalized) {
    return rules;
  }

  return rules
    .map((rule, index) => ({ rule, index, score: scoreRule(rule, normalized) }))
    .filter((item) => item.score >= 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((item) => item.rule);
}
```

Update `components/rules-table.tsx`:

```ts
import { normalizeRuleSearchText, rankRuleSearchResults } from "@/lib/rule-search";
```

replace:

```ts
const keyword = deferredQuery.trim().toLowerCase();
const filteredItems = visibleRecords.filter((item) => matchesQuery(item, keyword));
```

with:

```ts
const keyword = normalizeRuleSearchText(deferredQuery);
const filteredItems = rankRuleSearchResults(visibleRecords, keyword);
```

Delete the local `matchesQuery` helper.

Update `desktop/core/rules/search-rules.ts`:

```ts
import { rankRuleSearchResults } from "@/lib/rule-search";
```

and:

```ts
  return rankRuleSearchResults(items, query);
```

- [ ] **Step 4: Rerun the focused tests and verify they pass**

Run:

```bash
npm test -- --run tests/lib/rule-search.test.ts tests/components/rules-table.test.tsx
```

Expected: PASS with deterministic ranking and normalized query handling.

- [ ] **Step 5: Commit the search slice**

```bash
git add lib/rule-search.ts components/rules-table.tsx desktop/core/rules/search-rules.ts tests/lib/rule-search.test.ts tests/components/rules-table.test.tsx
git commit -m "feat: add ranked rule search helpers"
```

## Task 3: Rebuild IntakeWorkbench Into A Quick-Start Flow

**Files:**
- Modify: `components/intake-workbench.tsx`
- Modify: `app/reviews/new/page.tsx`
- Modify: `tests/app/reviews-new-page.test.tsx`
- Modify: `tests/components/intake-workbench.test.tsx`
- Modify: window `plreview` mocks in:
  - `tests/app/reviews-new-page.test.tsx`
  - `tests/components/intake-workbench.test.tsx`
  - `tests/app/home-page.test.tsx`
  - `tests/app/models-page.test.tsx`
  - `tests/app/reviews-page.test.tsx`

- [ ] **Step 1: Write the failing page and component tests**

In `tests/app/reviews-new-page.test.tsx`, replace the rule/model bootstrap setup:

```tsx
      getReviewLaunchData: vi.fn().mockResolvedValue({
        llmProfiles: [
          {
            id: "profile-1",
            name: "Default",
            provider: "openai",
            defaultModel: "qwen-plus",
          },
        ],
        rules: [
          {
            id: "rule-1",
            name: "Tone",
            category: "内容",
            description: "保持表达统一",
            severity: "medium",
          },
        ],
        lastBatchRuleIds: ["rule-1"],
      }),
```

and assert:

```tsx
expect(within(workspace).getByRole("heading", { level: 2, name: "规则摘要" })).toBeInTheDocument();
expect(within(workspace).queryByRole("heading", { level: 2, name: "文件工作台" })).not.toBeInTheDocument();
expect(within(workspace).queryByRole("complementary", { name: "启动摘要" })).not.toBeInTheDocument();
```

In `tests/components/intake-workbench.test.tsx`, add:

```tsx
it("shows a one-time default-rules notice on first render", () => {
  render(
    <IntakeWorkbench
      llmProfiles={defaultProfiles}
      rules={[
        {
          id: "rule-1",
          name: "Tone",
          category: "内容",
          description: "保持表达统一",
          severity: "medium",
        },
      ]}
      initialRuleIds={["rule-1"]}
    />,
  );

  expect(screen.getByText("已带入上次批次规则")).toBeInTheDocument();
});

it("renders selected rules as summary cards instead of the old checkbox zone", () => {
  render(
    <IntakeWorkbench
      llmProfiles={defaultProfiles}
      rules={[
        {
          id: "rule-1",
          name: "Tone",
          category: "内容",
          description: "保持表达统一",
          severity: "medium",
        },
      ]}
      initialRuleIds={["rule-1"]}
    />,
  );

  expect(screen.getByRole("heading", { name: "规则摘要" })).toBeInTheDocument();
  expect(screen.getByText("Tone")).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "规则选择" })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run:

```bash
npm test -- --run tests/app/reviews-new-page.test.tsx tests/components/intake-workbench.test.tsx
```

Expected: FAIL because `getReviewLaunchData` is not used yet, and the component still renders the old control-panel layout.

- [ ] **Step 3: Replace the page bootstrap and component props**

In `desktop/bridge/desktop-api.ts`, extend the workbench input shape:

```ts
type LaunchWorkbenchRule = ReviewLaunchRuleItem;
```

Update `IntakeWorkbenchProps` in `components/intake-workbench.tsx`:

```ts
type Rule = {
  id: string;
  name: string;
  category: string;
  description: string;
  severity: string;
};

type IntakeWorkbenchProps = {
  llmProfiles: LlmProfile[];
  rules: Rule[];
  importedFiles?: ImportedFile[];
  initialRuleIds?: string[];
};
```

Update `app/reviews/new/page.tsx` loading path:

```tsx
  const [launchData, setLaunchData] = useState<ReviewLaunchData>({
    llmProfiles: [],
    rules: [],
    lastBatchRuleIds: [],
  });
```

replace the dual dashboard load with:

```tsx
      if (!window.plreview?.getReviewLaunchData) {
        setErrorMessage("桌面桥接不可用，请从 Electron 桌面壳启动。");
        setIsLoading(false);
        return;
      }

      try {
        const nextLaunchData = await window.plreview.getReviewLaunchData();
        if (cancelled) {
          return;
        }
        startTransition(() => {
          setLaunchData(nextLaunchData);
          setErrorMessage(null);
        });
      } catch (error) {
```

and render:

```tsx
          <IntakeWorkbench
            llmProfiles={launchData.llmProfiles}
            rules={launchData.rules}
            initialRuleIds={launchData.lastBatchRuleIds}
          />
```

In `components/intake-workbench.tsx`, replace the current `selectedRuleIds` initialization with:

```ts
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>(() => initialRuleIds ?? []);
```

and adjust the initialization effect:

```ts
  useEffect(() => {
    const nextRuleIds = rules.map((rule) => rule.id);
    const filteredInitialRuleIds = (initialRuleIds ?? []).filter((ruleId) => nextRuleIds.includes(ruleId));

    if (nextRuleIds.length === 0) {
      setSelectedRuleIds([]);
      return;
    }

    setSelectedRuleIds((current) => {
      const filteredCurrent = current.filter((ruleId) => nextRuleIds.includes(ruleId));
      if (filteredCurrent.length > 0) {
        return filteredCurrent;
      }
      return filteredInitialRuleIds;
    });
  }, [initialRuleIds, rules]);
```

- [ ] **Step 4: Rebuild the launch layout and summary rendering**

In `components/intake-workbench.tsx`, replace the old “文件工作台 / 启动摘要” structure with the new block order:

```tsx
    <section aria-label="评审启动工作区" className="launch-quickstart">
      <section className="desktop-surface stack-lg" aria-labelledby="launch-config-heading">
        <div>
          <p className="section-eyebrow">Launch Setup</p>
          <h2 className="subsection-title" id="launch-config-heading">
            基础信息
          </h2>
          <p className="section-copy">填写批次名称并确认本次模型配置。</p>
        </div>
        {/* batch name + model select form */}
      </section>

      <section className="desktop-surface stack-lg" aria-labelledby="launch-rules-heading">
        <div className="inline-actions">
          <div>
            <p className="section-eyebrow">Selected Rules</p>
            <h2 className="subsection-title" id="launch-rules-heading">
              规则摘要
            </h2>
          </div>
          <div className="actions">
            <button className="button" type="button">选择规则</button>
            <button className="button-ghost" type="button">一键清空</button>
          </div>
        </div>
        {/* selected rule summary cards */}
      </section>

      <section className="desktop-surface stack-lg" aria-labelledby="launch-files-heading">
        {/* simplified upload callout and imported list */}
      </section>

      <section className="desktop-surface stack-lg" aria-labelledby="launch-submit-heading">
        {/* short readiness copy + single primary button */}
      </section>
    </section>
```

Add one-time notice state:

```ts
  const [showInitialRuleNotice, setShowInitialRuleNotice] = useState(
    () => (initialRuleIds?.length ?? 0) > 0,
  );
```

and auto-hide effect:

```ts
  useEffect(() => {
    if (!showInitialRuleNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowInitialRuleNotice(false);
    }, 3200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showInitialRuleNotice]);
```

Render:

```tsx
      {showInitialRuleNotice ? (
        <div className="launch-inline-notice" role="status">
          <span>已带入上次批次规则</span>
          <button
            aria-label="关闭带入规则提示"
            className="button-ghost button-inline"
            onClick={() => setShowInitialRuleNotice(false)}
            type="button"
          >
            知道了
          </button>
        </div>
      ) : null}
```

- [ ] **Step 5: Rerun the focused tests and verify they pass**

Run:

```bash
npm test -- --run tests/app/reviews-new-page.test.tsx tests/components/intake-workbench.test.tsx
```

Expected: PASS with the new bootstrap API, one-time notice, and summary-first quick-start layout.

- [ ] **Step 6: Commit the launch shell slice**

```bash
git add app/reviews/new/page.tsx components/intake-workbench.tsx tests/app/reviews-new-page.test.tsx tests/components/intake-workbench.test.tsx tests/app/home-page.test.tsx tests/app/models-page.test.tsx tests/app/reviews-page.test.tsx
git commit -m "feat: rebuild review launch as a quick-start flow"
```

## Task 4: Add The Rule Selection Drawer

**Files:**
- Create: `components/review-launch-rule-drawer.tsx`
- Modify: `components/intake-workbench.tsx`
- Modify: `app/globals.css`
- Modify: `tests/components/intake-workbench.test.tsx`

- [ ] **Step 1: Write the failing drawer interaction tests**

In `tests/components/intake-workbench.test.tsx`, add:

```tsx
it("opens the rule drawer, allows temporary edits, and commits on confirm", async () => {
  const user = userEvent.setup();

  render(
    <IntakeWorkbench
      llmProfiles={defaultProfiles}
      rules={[
        {
          id: "rule-1",
          name: "目标清晰度",
          category: "基础质量",
          description: "检查业务目标是否清楚",
          severity: "medium",
        },
        {
          id: "rule-2",
          name: "风险识别",
          category: "执行风险",
          description: "检查主要风险是否完整",
          severity: "high",
        },
      ]}
      initialRuleIds={["rule-1"]}
    />,
  );

  await user.click(screen.getByRole("button", { name: "选择规则" }));
  expect(screen.getByRole("dialog", { name: "选择规则" })).toBeInTheDocument();

  await user.click(screen.getByRole("checkbox", { name: /风险识别/ }));
  await user.click(screen.getByRole("button", { name: "确认带回" }));

  expect(screen.getByText("风险识别")).toBeInTheDocument();
});

it("clears temporary rules and restores last batch defaults from the drawer", async () => {
  const user = userEvent.setup();

  render(
    <IntakeWorkbench
      llmProfiles={defaultProfiles}
      rules={[
        {
          id: "rule-1",
          name: "目标清晰度",
          category: "基础质量",
          description: "检查业务目标是否清楚",
          severity: "medium",
        },
      ]}
      initialRuleIds={["rule-1"]}
    />,
  );

  await user.click(screen.getByRole("button", { name: "选择规则" }));
  await user.click(screen.getByRole("button", { name: "一键清空" }));
  expect(screen.getByText("当前未选择规则")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "恢复上次" }));
  expect(screen.getByRole("checkbox", { name: /目标清晰度/ })).toBeChecked();
});
```

- [ ] **Step 2: Run the focused drawer tests and verify failure**

Run:

```bash
npm test -- --run tests/components/intake-workbench.test.tsx
```

Expected: FAIL with missing rule drawer component and missing temporary-selection workflow.

- [ ] **Step 3: Implement the drawer component**

Create `components/review-launch-rule-drawer.tsx` with:

```tsx
"use client";

import { useDeferredValue, useEffect, useState } from "react";

import { AdaptiveFormOverlay } from "@/components/adaptive-form-overlay";
import { TableSearchInput } from "@/components/table-search-input";
import { normalizeRuleSearchText, rankRuleSearchResults } from "@/lib/rule-search";
import { severityLabel } from "@/lib/utils";

export function ReviewLaunchRuleDrawer({
  open,
  rules,
  initialRuleIds,
  selectedRuleIds,
  onClose,
  onConfirm,
}: {
  open: boolean;
  rules: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    severity: string;
  }>;
  initialRuleIds: string[];
  selectedRuleIds: string[];
  onClose: () => void;
  onConfirm: (ruleIds: string[]) => void;
}) {
  const [draftRuleIds, setDraftRuleIds] = useState<string[]>(selectedRuleIds);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = normalizeRuleSearchText(deferredQuery);

  useEffect(() => {
    if (open) {
      setDraftRuleIds(selectedRuleIds);
      setQuery("");
    }
  }, [open, selectedRuleIds]);

  if (!open) {
    return null;
  }

  const visibleRules = rankRuleSearchResults(rules, normalizedQuery);

  return (
    <AdaptiveFormOverlay
      footer={
        <div className="actions">
          <span className="muted">已选 {draftRuleIds.length} 条规则</span>
          <button className="button-ghost" onClick={onClose} type="button">
            取消
          </button>
          <button className="button" onClick={() => onConfirm(draftRuleIds)} type="button">
            确认带回
          </button>
        </div>
      }
      onClose={onClose}
      open={open}
      title="选择规则"
    >
      <div className="stack">
        <div className="inline-actions">
          <TableSearchInput
            label="搜索规则"
            onChange={setQuery}
            placeholder="搜索规则名称、分类、说明和严重级别"
            value={query}
          />
          <div className="actions">
            <button className="button-ghost" onClick={() => setDraftRuleIds([])} type="button">
              一键清空
            </button>
            <button className="button-ghost" onClick={() => setDraftRuleIds(initialRuleIds)} type="button">
              恢复上次
            </button>
          </div>
        </div>

        <div className="launch-rule-drawer-list">
          {visibleRules.length === 0 ? (
            <p className="muted">没有匹配的规则，换个关键词试试</p>
          ) : (
            visibleRules.map((rule) => {
              const checked = draftRuleIds.includes(rule.id);
              return (
                <label className="launch-rule-option" key={rule.id}>
                  <input
                    checked={checked}
                    onChange={(event) => {
                      setDraftRuleIds((current) =>
                        event.target.checked
                          ? [...current, rule.id]
                          : current.filter((ruleId) => ruleId !== rule.id),
                      );
                    }}
                    type="checkbox"
                  />
                  <div>
                    <strong>{rule.name}</strong>
                    <p className="muted">{rule.description}</p>
                    <p className="muted">
                      {rule.category} · {severityLabel(rule.severity as never)}
                    </p>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>
    </AdaptiveFormOverlay>
  );
}
```

- [ ] **Step 4: Integrate the drawer into the workbench and add styles**

In `components/intake-workbench.tsx`, add:

```ts
  const [isRuleDrawerOpen, setIsRuleDrawerOpen] = useState(false);
```

Replace the summary action buttons:

```tsx
            <button className="button" onClick={() => setIsRuleDrawerOpen(true)} type="button">
              选择规则
            </button>
            <button className="button-ghost" onClick={() => setSelectedRuleIds([])} type="button">
              一键清空
            </button>
```

Render the empty state and summary cards:

```tsx
          {selectedRules.length === 0 ? (
            <p className="muted">当前未选择规则</p>
          ) : (
            <div className="launch-rule-summary-grid">
              {visibleSummaryRules.map((rule) => (
                <article className="launch-rule-summary-card" key={rule.id}>
                  <div className="inline-actions">
                    <strong>{rule.name}</strong>
                    <button
                      aria-label={`移除规则 ${rule.name}`}
                      className="table-text-button is-danger"
                      onClick={() =>
                        setSelectedRuleIds((current) => current.filter((ruleId) => ruleId !== rule.id))
                      }
                      type="button"
                    >
                      移除
                    </button>
                  </div>
                  <p className="muted">{rule.description}</p>
                  <p className="muted">
                    {rule.category} · {severityLabel(rule.severity as never)}
                  </p>
                </article>
              ))}
            </div>
          )}
```

Mount the drawer:

```tsx
      <ReviewLaunchRuleDrawer
        open={isRuleDrawerOpen}
        rules={rules}
        initialRuleIds={initialRuleIds ?? []}
        selectedRuleIds={selectedRuleIds}
        onClose={() => setIsRuleDrawerOpen(false)}
        onConfirm={(nextRuleIds) => {
          setSelectedRuleIds(nextRuleIds);
          setIsRuleDrawerOpen(false);
        }}
      />
```

In `app/globals.css`, add:

```css
.launch-quickstart {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.launch-inline-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}

.launch-rule-summary-grid {
  display: grid;
  gap: 12px;
}

.launch-rule-summary-card,
.launch-rule-option {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
}

.launch-rule-drawer-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: min(56vh, 520px);
  overflow-y: auto;
}
```

- [ ] **Step 5: Rerun the focused drawer tests and verify they pass**

Run:

```bash
npm test -- --run tests/components/intake-workbench.test.tsx
```

Expected: PASS with temporary-selection behavior, clear/restore actions, and committed summary cards.

- [ ] **Step 6: Commit the drawer slice**

```bash
git add components/review-launch-rule-drawer.tsx components/intake-workbench.tsx app/globals.css tests/components/intake-workbench.test.tsx
git commit -m "feat: add launch rule selection drawer"
```

## Task 5: Simplify Supporting Pages And Final Verification

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/models/page.tsx`
- Modify: `app/reviews/page.tsx`
- Modify: `tests/app/home-page.test.tsx`
- Modify: `tests/app/models-page.test.tsx`
- Modify: `tests/app/reviews-page.test.tsx`
- Test: `tests/components/rules-table.test.tsx`

- [ ] **Step 1: Write the failing supporting-page tests**

In `tests/app/home-page.test.tsx`, add:

```tsx
expect(screen.getByRole("link", { name: "开始新批次" })).toHaveAttribute("href", "/reviews/new");
expect(screen.queryByText("创建评审批次")).not.toBeInTheDocument();
```

In `tests/app/models-page.test.tsx`, add:

```tsx
expect(screen.getByRole("link", { name: "去新建批次" })).toHaveAttribute("href", "/reviews/new");
```

In `tests/app/reviews-page.test.tsx`, keep the launch action narrow:

```tsx
expect(screen.getByRole("link", { name: "新建批次" })).toHaveAttribute("href", "/reviews/new");
expect(screen.queryByText("默认带入上次批次规则")).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the focused page tests and verify failure**

Run:

```bash
npm test -- --run tests/app/home-page.test.tsx tests/app/models-page.test.tsx tests/app/reviews-page.test.tsx
```

Expected: FAIL where the current copy or CTA naming still reflects the old command-center behavior.

- [ ] **Step 3: Implement the supporting-page simplifications**

In `app/page.tsx`, add the primary CTA next to the intro:

```tsx
        <PageIntro
          actions={
            <Link className="button" href="/reviews/new">
              开始新批次
            </Link>
          }
          description="确认规则和模型已就绪，然后直接开始一个新的评审批次。"
          eyebrow="Workspace"
          title="评审工作台"
        />
```

Adjust the snapshot copy:

```tsx
          <SnapshotRow
            label="规则"
            title={`${dashboard.enabledRulesCount}/${dashboard.rulesCount} 条规则启用`}
            description="规则库只负责维护资产，批次配置在新建批次页完成。"
          />
```

In `app/models/page.tsx`, add a light CTA under the intro:

```tsx
        <div className="actions">
          <Link className="button-ghost" href="/reviews/new">
            去新建批次
          </Link>
        </div>
```

In `app/reviews/page.tsx`, keep the command strip as a single CTA and do not add any pre-launch summary.

In `tests/components/rules-table.test.tsx`, add one ranked-search regression:

```tsx
await user.type(screen.getByRole("searchbox", { name: "搜索规则" }), "目标");
expect(screen.getAllByRole("row")[1]).toHaveTextContent("目标清晰度");
```

- [ ] **Step 4: Run the final verification suite**

Run:

```bash
npm test -- --run tests/lib/review-launch.test.ts tests/lib/rule-search.test.ts tests/app/home-page.test.tsx tests/app/models-page.test.tsx tests/app/reviews-page.test.tsx tests/app/reviews-new-page.test.tsx tests/components/intake-workbench.test.tsx tests/components/rules-table.test.tsx tests/desktop/desktop-api.test.ts tests/desktop/background-router.test.ts tests/desktop/create-review-batch.test.ts
```

Expected: PASS across bootstrap data, ranked search, launch quick-start UI, supporting pages, and unchanged batch-creation persistence.

- [ ] **Step 5: Commit the supporting-page and verification slice**

```bash
git add app/page.tsx app/models/page.tsx app/reviews/page.tsx tests/app/home-page.test.tsx tests/app/models-page.test.tsx tests/app/reviews-page.test.tsx tests/components/rules-table.test.tsx
git commit -m "feat: align launch entry pages with quick-start flow"
```

## Self-Review

- Spec coverage:
  - Page responsibility reset is covered by Task 5.
  - Dedicated quick-start launch page is covered by Task 3.
  - Rule drawer, one-time notice, clear/restore actions are covered by Task 4.
  - Default last-batch rule carry-over is covered by Task 1 and Task 3.
  - Ranked rule search is covered by Task 2 and reused by both rules page and launch drawer.
- Placeholder scan:
  - No `TODO`, `TBD`, or “implement later” markers remain.
  - Each code-changing step contains concrete snippets and commands.
- Type consistency:
  - `ReviewLaunchData`, `ReviewLaunchRuleItem`, `getReviewLaunchData`, `normalizeRuleSearchText`, and `rankRuleSearchResults` are defined once and reused consistently across later tasks.

