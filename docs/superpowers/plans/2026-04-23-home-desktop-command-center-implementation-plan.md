# Home Desktop Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the PLReview home page into a desktop-native three-column command center with no whole-page scrolling on normal desktop windows.

**Architecture:** Keep the existing `HomeDashboardData` bridge flow and refactor `app/page.tsx` into small local view components: command rail, recent reviews pane, and readiness pane. Add scoped CSS classes for a fixed-height cockpit layout with internal scroll regions, and update app tests to lock the new structure and error behavior.

**Tech Stack:** Next.js App Router, React client component, Electron preload bridge via `window.plreview`, CSS in `app/globals.css`, Vitest with Testing Library.

---

## Scope Check

This plan implements one approved spec: `docs/superpowers/specs/2026-04-23-home-desktop-command-center-design.md`.

It covers one subsystem, the home page. It does not change desktop bridge methods, Prisma models, review detail routing, sidebar routing, or background workers.

## File Structure

- Modify `tests/app/home-page.test.tsx`
  - Owns regression coverage for the home bridge load, command cockpit structure, preserved links, internal-pane markers, error state, and missing bridge state.
- Modify `app/page.tsx`
  - Owns home dashboard data loading and page composition.
  - Defines focused local components in the same file: `HomeCommandRail`, `HomeRecentReviewsPane`, `HomeReadinessPane`, and tiny row helpers.
- Modify `app/globals.css`
  - Owns the desktop cockpit grid, command rail, pane scroll regions, and responsive fallback.

No new source files are required for this pass. Keeping local components in `app/page.tsx` avoids over-structuring the page before reuse exists.

---

### Task 1: Lock The New Home Behavior With Tests

**Files:**
- Modify: `tests/app/home-page.test.tsx`

- [ ] **Step 1: Replace the home page tests with cockpit-focused failing tests**

Replace the entire contents of `tests/app/home-page.test.tsx` with:

```tsx
import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomePage from "@/app/page";
import type { DesktopApi, HomeDashboardData } from "@/desktop/bridge/desktop-api";

const DASHBOARD_FIXTURE: HomeDashboardData = {
  rulesCount: 12,
  enabledRulesCount: 8,
  documentsCount: 25,
  reviewJobsCount: 9,
  annotationsCount: 31,
  recentReviews: [
    {
      id: "review_home_1",
      title: "四月活动复盘",
      status: "completed",
      modelName: "qwen-plus",
      createdAt: "2026-04-15T10:00:00.000Z",
    },
  ],
  llmProfiles: [
    {
      id: "profile_1",
      name: "百炼生产",
      provider: "DashScope",
      defaultModel: "qwen-plus",
    },
  ],
};

function installDesktopApi(overrides: Partial<DesktopApi> = {}) {
  window.plreview = {
    pickFiles: vi.fn(),
    getHomeDashboard: vi.fn().mockResolvedValue(DASHBOARD_FIXTURE),
    getModelDashboard: vi.fn(),
    getRuleDashboard: vi.fn(),
    getReviewDetail: vi.fn(),
    listReviewJobs: vi.fn(),
    searchReviewJobs: vi.fn(),
    listRules: vi.fn(),
    searchRules: vi.fn(),
    createReviewBatch: vi.fn(),
    deleteReviewJobs: vi.fn(),
    retryReviewJob: vi.fn(),
    exportReviewList: vi.fn(),
    exportReviewReport: vi.fn(),
    saveRule: vi.fn(),
    toggleRuleEnabled: vi.fn(),
    saveModelProfile: vi.fn(),
    toggleModelProfileEnabled: vi.fn(),
    deleteModelProfile: vi.fn(),
    getRuntimeStatus: vi.fn(),
    subscribeRuntimeStatus: vi.fn(),
    ...overrides,
  };

  return window.plreview;
}

describe("HomePage", () => {
  it("loads dashboard data into the desktop command center and preserves key links", async () => {
    const desktopApi = installDesktopApi();

    render(<HomePage />);

    await waitFor(() => expect(screen.getByText("四月活动复盘")).toBeInTheDocument());

    expect(desktopApi.getHomeDashboard).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { level: 1, name: "评审工作台" })).toBeInTheDocument();

    const cockpit = screen.getByTestId("home-desktop-cockpit");
    const header = screen.getByTestId("home-command-header");
    const commandRail = screen.getByTestId("home-command-rail");
    const recentPane = screen.getByTestId("home-recent-reviews-pane");
    const readinessPane = screen.getByTestId("home-readiness-pane");

    expect(cockpit).toHaveClass("home-command-center");
    expect(header).toHaveClass("home-command-header");
    expect(commandRail).toHaveClass("home-command-rail");
    expect(recentPane).toHaveClass("home-recent-pane");
    expect(readinessPane).toHaveClass("home-readiness-pane");
    expect(within(recentPane).getByTestId("home-recent-scroll")).toHaveClass("home-pane-scroll");
    expect(within(readinessPane).getByTestId("home-readiness-scroll")).toHaveClass("home-pane-scroll");

    expect(within(header).getByRole("link", { name: "开始新批次" })).toHaveAttribute(
      "href",
      "/reviews/new",
    );
    expect(within(commandRail).getByRole("link", { name: "创建评审批次" })).toHaveAttribute(
      "href",
      "/reviews/new",
    );
    expect(within(commandRail).getByRole("link", { name: "查看评审任务" })).toHaveAttribute(
      "href",
      "/reviews",
    );
    expect(within(commandRail).getByRole("link", { name: "维护规则库" })).toHaveAttribute(
      "href",
      "/rules",
    );
    expect(within(commandRail).getByRole("link", { name: "管理模型配置" })).toHaveAttribute(
      "href",
      "/models",
    );

    expect(within(commandRail).getByText("已导入文档").nextElementSibling).toHaveTextContent("25");
    expect(within(commandRail).getByText("评审任务").nextElementSibling).toHaveTextContent("9");
    expect(within(commandRail).getByText("启用规则").nextElementSibling).toHaveTextContent("8");
    expect(within(commandRail).getByText("问题标注").nextElementSibling).toHaveTextContent("31");

    const recentReviewLink = within(recentPane).getByText("四月活动复盘").closest("a");
    expect(recentReviewLink).toHaveAttribute("href", "/reviews/detail?id=review_home_1");

    expect(within(readinessPane).getByText("12 条规则已建档")).toBeInTheDocument();
    expect(within(readinessPane).getByText("8 条规则已启用")).toBeInTheDocument();
    expect(within(readinessPane).getByText("百炼生产")).toBeInTheDocument();
    expect(within(readinessPane).getByText("qwen-plus")).toBeInTheDocument();
  });

  it("keeps the cockpit frame visible when dashboard loading fails", async () => {
    installDesktopApi({
      getHomeDashboard: vi.fn().mockRejectedValue(new Error("dashboard unavailable")),
    });

    render(<HomePage />);

    await waitFor(() =>
      expect(screen.getByText("加载失败：dashboard unavailable")).toBeInTheDocument(),
    );

    const cockpit = screen.getByTestId("home-desktop-cockpit");
    const commandRail = screen.getByTestId("home-command-rail");
    const recentPane = screen.getByTestId("home-recent-reviews-pane");
    const readinessPane = screen.getByTestId("home-readiness-pane");

    expect(cockpit).toHaveClass("home-command-center");
    expect(within(commandRail).getByRole("link", { name: "创建评审批次" })).toHaveAttribute(
      "href",
      "/reviews/new",
    );
    expect(within(recentPane).getByText("加载失败：dashboard unavailable")).toBeInTheDocument();
    expect(within(readinessPane).getByText("桌面桥接不可用")).toBeInTheDocument();
    expect(within(readinessPane).getByText("无法读取规则、模型和结果状态。")).toBeInTheDocument();
  });

  it("shows the cockpit bridge warning when launched without the desktop API", async () => {
    window.plreview = undefined as unknown as DesktopApi;

    render(<HomePage />);

    await waitFor(() =>
      expect(
        screen.getByText("加载失败：桌面桥接不可用，请从 Electron 桌面壳启动。"),
      ).toBeInTheDocument(),
    );

    expect(screen.getByTestId("home-desktop-cockpit")).toHaveClass("home-command-center");
    expect(screen.getByTestId("home-command-rail")).toBeInTheDocument();
    expect(screen.getByTestId("home-recent-reviews-pane")).toBeInTheDocument();
    expect(screen.getByTestId("home-readiness-pane")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the home page test and verify it fails for the current web-style layout**

Run:

```bash
npm test -- tests/app/home-page.test.tsx
```

Expected: FAIL. The failure should mention missing elements such as `home-desktop-cockpit`, `home-command-rail`, or the expectation that the error state keeps the cockpit visible.

- [ ] **Step 3: Commit the failing tests**

Run:

```bash
git add tests/app/home-page.test.tsx
git commit -m "test: specify desktop home command center"
```

Expected: a commit containing only the updated home page tests.

---

### Task 2: Refactor Home Markup Into A Three-Column Cockpit

**Files:**
- Modify: `app/page.tsx`
- Test: `tests/app/home-page.test.tsx`

- [ ] **Step 1: Replace `app/page.tsx` with the cockpit component structure**

Replace the entire contents of `app/page.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";

import { PageIntro } from "@/components/page-intro";
import { StatusBadge } from "@/components/status-badge";
import type { HomeDashboardData } from "@/desktop/bridge/desktop-api";
import { formatDate } from "@/lib/utils";

const EMPTY_HOME_DASHBOARD: HomeDashboardData = {
  rulesCount: 0,
  enabledRulesCount: 0,
  documentsCount: 0,
  reviewJobsCount: 0,
  annotationsCount: 0,
  recentReviews: [],
  llmProfiles: [],
};

type HomeDashboardViewState = {
  dashboard: HomeDashboardData;
  errorMessage: string | null;
  isLoading: boolean;
};

type MetricItem = {
  label: string;
  value: number;
};

const QUICK_LINKS = [
  {
    description: "查看任务列表、进度和结果。",
    href: "/reviews",
    label: "查看评审任务",
    tag: "任务",
  },
  {
    description: "导入文档并启动评审。",
    href: "/reviews/new",
    label: "创建评审批次",
    tag: "新建",
  },
  {
    description: "维护规则和提示词模板。",
    href: "/rules",
    label: "维护规则库",
    tag: "规则",
  },
  {
    description: "管理可用于评审的模型。",
    href: "/models",
    label: "管理模型配置",
    tag: "模型",
  },
] as const;

export default function HomePage() {
  const [dashboard, setDashboard] = useState<HomeDashboardData>(EMPTY_HOME_DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (!window.plreview?.getHomeDashboard) {
        setErrorMessage("桌面桥接不可用，请从 Electron 桌面壳启动。");
        setIsLoading(false);
        return;
      }

      try {
        const nextDashboard = await window.plreview.getHomeDashboard();

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setDashboard(nextDashboard);
          setErrorMessage(null);
        });
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "工作台加载失败。");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const viewState = { dashboard, errorMessage, isLoading };

  return (
    <div className="home-command-center" data-testid="home-desktop-cockpit">
      <header className="home-command-header" data-testid="home-command-header">
        <PageIntro
          actions={
            <Link className="button" href="/reviews/new">
              开始新批次
            </Link>
          }
          description="从这里进入任务、规则、模型配置和最近结果。"
          eyebrow="Workspace"
          title="评审工作台"
        />
      </header>

      <section className="home-cockpit-grid" aria-label="工作台概览">
        <HomeCommandRail dashboard={dashboard} />
        <HomeRecentReviewsPane {...viewState} />
        <HomeReadinessPane {...viewState} />
      </section>
    </div>
  );
}

function HomeCommandRail({ dashboard }: Pick<HomeDashboardViewState, "dashboard">) {
  const metrics: MetricItem[] = [
    { label: "已导入文档", value: dashboard.documentsCount },
    { label: "评审任务", value: dashboard.reviewJobsCount },
    { label: "启用规则", value: dashboard.enabledRulesCount },
    { label: "问题标注", value: dashboard.annotationsCount },
  ];

  return (
    <aside
      className="home-command-rail"
      data-testid="home-command-rail"
      aria-label="工作台常用操作"
    >
      <Link className="home-primary-action" href="/reviews/new" aria-label="创建评审批次">
        <span>
          <span className="section-eyebrow">Primary action</span>
          <strong>创建评审批次</strong>
        </span>
        <span className="home-action-arrow" aria-hidden="true">
          →
        </span>
      </Link>

      <div className="home-quick-links" aria-label="常用入口">
        {QUICK_LINKS.map((link) => (
          <Link
            className="home-quick-link"
            href={link.href}
            key={link.href}
            aria-label={link.label}
          >
            <span className="home-quick-link-copy">
              <strong>{link.label}</strong>
              <span>{link.description}</span>
            </span>
            <span className="pill pill-brand">{link.tag}</span>
          </Link>
        ))}
      </div>

      <div className="home-metric-grid" aria-label="工作台指标">
        {metrics.map((metric) => (
          <div className="home-metric-card" key={metric.label}>
            <p className="metric-label">{metric.label}</p>
            <strong className="metric-value">{metric.value}</strong>
          </div>
        ))}
      </div>
    </aside>
  );
}

function HomeRecentReviewsPane({
  dashboard,
  errorMessage,
  isLoading,
}: HomeDashboardViewState) {
  return (
    <section
      className="home-pane home-recent-pane"
      data-testid="home-recent-reviews-pane"
      aria-labelledby="home-recent-reviews-title"
    >
      <PaneHeader
        eyebrow="Recent Reviews"
        title="最近评审"
        id="home-recent-reviews-title"
        description="查看最近完成、进行中或失败的任务。"
      />

      <div className="home-pane-scroll" data-testid="home-recent-scroll">
        <div className="list">
          {errorMessage ? (
            <div className="list-item">
              <div>
                <h3>加载失败：{errorMessage}</h3>
                <p className="muted">请确认桌面桥接可用后重试。</p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="list-item">
              <div>
                <h3>正在读取最近评审</h3>
                <p className="muted">桌面工作台正在从本地数据库同步状态。</p>
              </div>
            </div>
          ) : dashboard.recentReviews.length === 0 ? (
            <div className="list-item">
              <div>
                <h3>还没有评审记录</h3>
                <p className="muted">创建新评审后，这里会显示结果。</p>
              </div>
            </div>
          ) : (
            dashboard.recentReviews.map((review) => (
              <Link
                className="list-item"
                href={`/reviews/detail?id=${encodeURIComponent(review.id)}`}
                key={review.id}
              >
                <div>
                  <h3>{review.title}</h3>
                  <p className="muted">
                    {review.modelName} · {formatDate(review.createdAt)}
                  </p>
                </div>
                <StatusBadge status={review.status} />
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function HomeReadinessPane({ dashboard, errorMessage, isLoading }: HomeDashboardViewState) {
  return (
    <aside
      className="home-pane home-readiness-pane"
      data-testid="home-readiness-pane"
      aria-labelledby="home-readiness-title"
    >
      <PaneHeader
        eyebrow="Readiness"
        title="配置准备度"
        id="home-readiness-title"
        description="确认规则、模型和结果阅读能力。"
      />

      <div className="home-pane-scroll" data-testid="home-readiness-scroll">
        <div className="feature-list">
          {errorMessage ? (
            <FeatureRow
              kicker="桥接"
              title="桌面桥接不可用"
              description="无法读取规则、模型和结果状态。"
            />
          ) : null}

          <FeatureRow
            kicker="规则"
            title={`${dashboard.rulesCount} 条规则已建档`}
            description={`${dashboard.enabledRulesCount} 条规则已启用`}
          />

          {isLoading ? (
            <FeatureRow
              kicker="模型"
              title="正在读取模型配置"
              description="完成后会显示当前启用的桌面模型。"
            />
          ) : dashboard.llmProfiles.length === 0 ? (
            <FeatureRow
              kicker="模型"
              title="当前没有启用模型配置"
              description="先去模型配置页启用一个配置后再开始批次。"
            />
          ) : (
            dashboard.llmProfiles.map((profile) => (
              <FeatureRow
                kicker={profile.provider}
                title={profile.name}
                description={profile.defaultModel}
                key={profile.id}
              />
            ))
          )}

          <FeatureRow
            kicker="结果"
            title="可查看报告、问题和原文位置"
            description="结果页会显示对应内容。"
          />
        </div>
      </div>
    </aside>
  );
}

type PaneHeaderProps = {
  description: string;
  eyebrow: string;
  id: string;
  title: string;
};

function PaneHeader({ description, eyebrow, id, title }: PaneHeaderProps) {
  return (
    <div className="home-pane-header">
      <p className="section-eyebrow">{eyebrow}</p>
      <h2 className="subsection-title" id={id}>
        {title}
      </h2>
      <p className="section-copy">{description}</p>
    </div>
  );
}

type FeatureRowProps = {
  description: string;
  kicker: string;
  title: string;
};

function FeatureRow({ description, kicker, title }: FeatureRowProps) {
  return (
    <div className="feature-row">
      <span className="feature-kicker">{kicker}</span>
      <div>
        <strong>{title}</strong>
        <p className="muted">{description}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run the home page test and verify markup behavior is now present but layout CSS is not finished**

Run:

```bash
npm test -- tests/app/home-page.test.tsx
```

Expected: PASS. These tests assert structure and behavior, not rendered CSS layout.

- [ ] **Step 3: Commit the markup refactor**

Run:

```bash
git add app/page.tsx tests/app/home-page.test.tsx
git commit -m "feat: restructure home as desktop cockpit"
```

Expected: a commit containing the home page markup refactor. The test file may already be committed from Task 1; include it only if formatting or TypeScript adjustments were needed.

---

### Task 3: Add The Fixed Desktop Cockpit CSS

**Files:**
- Modify: `app/globals.css`
- Test: `tests/app/home-page.test.tsx`

- [ ] **Step 1: Add scoped home cockpit styles near the existing desktop dashboard styles**

In `app/globals.css`, add this block after the existing `.desktop-dashboard` / `.desktop-surface` desktop rules and before the table-management rules:

```css
.workspace.page:has(.home-command-center) {
  overflow: hidden;
}

.home-command-center {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  width: 100%;
  gap: 16px;
  overflow: hidden;
}

.home-command-header {
  flex: 0 0 auto;
  padding: 18px 0 16px;
  border-bottom: 1px solid var(--line);
}

.home-cockpit-grid {
  display: grid;
  min-height: 0;
  gap: 16px;
  grid-template-columns: minmax(260px, 300px) minmax(0, 1fr) minmax(280px, 320px);
  overflow: hidden;
}

.home-command-rail,
.home-pane {
  min-width: 0;
  min-height: 0;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
}

.home-command-rail {
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
  padding: 14px;
}

.home-primary-action {
  display: flex;
  min-height: 76px;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px;
  border: 1px solid rgba(221, 107, 32, 0.28);
  border-radius: 10px;
  background: #fff7ed;
  color: var(--ink);
}

.home-primary-action strong {
  display: block;
  margin-top: 7px;
  font-size: 17px;
  line-height: 1.2;
}

.home-action-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: var(--brand);
  color: #ffffff;
  font-weight: 800;
}

.home-primary-action:hover,
.home-primary-action:focus-visible {
  border-color: var(--brand);
  background: #ffedd5;
  outline: none;
}

.home-quick-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.home-quick-link {
  display: flex;
  min-height: 62px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #ffffff;
}

.home-quick-link:hover,
.home-quick-link:focus-visible {
  border-color: var(--line-strong);
  background: #f8fafc;
  outline: none;
}

.home-quick-link-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.home-quick-link-copy strong {
  font-size: 14px;
  line-height: 1.25;
}

.home-quick-link-copy span {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
}

.home-metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: auto;
}

.home-metric-card {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #ffffff;
}

.home-metric-card .metric-value {
  font-size: 26px;
}

.home-pane {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.home-pane-header {
  flex: 0 0 auto;
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--line);
}

.home-pane-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 12px 16px 16px;
}

.home-recent-pane .list,
.home-readiness-pane .feature-list {
  gap: 10px;
}

.home-recent-pane .list-item {
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #ffffff;
}

.home-readiness-pane .feature-row {
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #ffffff;
}
```

- [ ] **Step 2: Add the responsive fallback**

In the same responsive section that currently handles `@media (max-width: 1180px)`, add these rules:

```css
@media (max-width: 1180px) {
  .workspace.page:has(.home-command-center) {
    overflow-y: auto;
  }

  .home-command-center {
    height: auto;
    overflow: visible;
  }

  .home-cockpit-grid {
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .home-command-rail,
  .home-pane {
    overflow: visible;
  }

  .home-pane-scroll {
    overflow: visible;
  }
}
```

- [ ] **Step 3: Run the home page test after CSS changes**

Run:

```bash
npm test -- tests/app/home-page.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit the CSS**

Run:

```bash
git add app/globals.css
git commit -m "style: add desktop home cockpit layout"
```

Expected: a commit containing only the scoped home cockpit CSS.

---

### Task 4: Verify Error And Empty States In The Cockpit

**Files:**
- Modify: `tests/app/home-page.test.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Add an empty-state regression test**

Append this test inside the existing `describe("HomePage", () => { ... })` block in `tests/app/home-page.test.tsx`:

```tsx
  it("keeps empty recent reviews and empty model state inside their panes", async () => {
    installDesktopApi({
      getHomeDashboard: vi.fn().mockResolvedValue({
        ...DASHBOARD_FIXTURE,
        recentReviews: [],
        llmProfiles: [],
      }),
    });

    render(<HomePage />);

    await waitFor(() => expect(screen.getByText("还没有评审记录")).toBeInTheDocument());

    const recentPane = screen.getByTestId("home-recent-reviews-pane");
    const readinessPane = screen.getByTestId("home-readiness-pane");

    expect(within(recentPane).getByText("还没有评审记录")).toBeInTheDocument();
    expect(within(recentPane).getByText("创建新评审后，这里会显示结果。")).toBeInTheDocument();
    expect(within(readinessPane).getByText("当前没有启用模型配置")).toBeInTheDocument();
    expect(
      within(readinessPane).getByText("先去模型配置页启用一个配置后再开始批次。"),
    ).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the empty-state test**

Run:

```bash
npm test -- tests/app/home-page.test.tsx
```

Expected: PASS. If it fails because the test was placed outside the `describe` block, move the test above the final closing `});` and rerun.

- [ ] **Step 3: Confirm no old whole-page failure branch remains**

Run:

```bash
rg -n "short-circuits|desktop-dashboard stack-lg|请确认桌面桥接可用后重试" app/page.tsx tests/app/home-page.test.tsx
```

Expected: no `short-circuits` match and no `desktop-dashboard stack-lg` match. A match for `请确认桌面桥接可用后重试` in `app/page.tsx` is acceptable only inside `HomeRecentReviewsPane`.

- [ ] **Step 4: Commit empty/error state coverage**

Run:

```bash
git add tests/app/home-page.test.tsx app/page.tsx
git commit -m "test: cover home cockpit empty states"
```

Expected: a commit containing the added test. `app/page.tsx` is included only if a small state-copy or placement fix was required.

---

### Task 5: Run Full Verification And Manual Desktop Review

**Files:**
- Read: `docs/superpowers/specs/2026-04-23-home-desktop-command-center-design.md`
- Read: `app/page.tsx`
- Read: `app/globals.css`
- Test: `tests/app/home-page.test.tsx`

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- tests/app/home-page.test.tsx tests/components/app-sidebar.test.tsx
```

Expected: PASS for both test files.

- [ ] **Step 2: Run the full Vitest suite**

Run:

```bash
npm test
```

Expected: PASS for the full suite.

- [ ] **Step 3: Build the renderer**

Run:

```bash
npm run desktop:build:renderer
```

Expected: Next.js build completes successfully.

- [ ] **Step 4: Perform desktop viewport review**

Run:

```bash
npm run dev
```

Expected: Next dev server starts on `http://localhost:3000`.

Open `http://localhost:3000` in the desktop shell or browser with a desktop-sized viewport around 1440x900 and verify:

- The home page shows a fixed header and three columns.
- The full workspace does not require vertical browsing at that size.
- The recent reviews pane owns the vertical scroll when many rows exist.
- The readiness pane owns vertical scroll when many model profiles exist.
- The command rail remains visible and does not scroll under normal desktop dimensions.
- Header action, command rail links, recent review links, and focus rings are usable with keyboard tabbing.

Stop the dev server after review.

- [ ] **Step 5: Inspect git state**

Run:

```bash
git status --short
git log --oneline -5
```

Expected: working tree is clean. Recent commits include the test, markup, CSS, and empty-state commits from this plan.

---

## Self-Review Checklist

- Spec coverage:
  - Fixed cockpit layout: Task 3.
  - Three columns: Task 2 and Task 3.
  - Internal scroll panes: Task 1 assertions and Task 3 CSS.
  - Existing bridge data flow: Task 2 preserves `getHomeDashboard()`.
  - Error state remains in cockpit: Task 1 and Task 2.
  - Empty states remain in panes: Task 4.
  - Existing routes preserved: Task 1 and Task 2.
  - Verification: Task 5.
- Placeholder scan: no placeholder markers or underspecified implementation steps are present.
- Type consistency:
  - `HomeDashboardData` and `DesktopApi` match `desktop/bridge/desktop-api.ts`.
  - Test IDs match the component markup in Task 2.
  - CSS class names match the component markup in Task 2.
