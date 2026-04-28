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

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

function installDesktopApi(overrides: Partial<DesktopApi> = {}) {
  window.plreview = {
    pickFiles: vi.fn(),
    getHomeDashboard: vi.fn().mockResolvedValue(DASHBOARD_FIXTURE),
    getReviewLaunchData: vi.fn(),
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
    deleteRule: vi.fn(),
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
  it("loads dashboard data into a focused workspace with one primary action", async () => {
    const desktopApi = installDesktopApi();

    render(<HomePage />);

    await waitFor(() => expect(screen.getByText("四月活动复盘")).toBeInTheDocument());

    expect(desktopApi.getHomeDashboard).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { level: 1, name: "评审工作台" })).toBeInTheDocument();

    const cockpit = screen.getByTestId("home-desktop-cockpit");
    const header = screen.getByTestId("home-command-header");
    const actionPanel = screen.getByTestId("home-primary-action-panel");
    const snapshotPane = screen.getByTestId("home-snapshot-pane");
    const recentPane = screen.getByTestId("home-recent-reviews-pane");

    expect(cockpit).toHaveClass("home-command-center");
    expect(header).toHaveClass("home-command-header");
    expect(snapshotPane).toHaveClass("home-snapshot-pane");
    expect(recentPane).toHaveClass("home-recent-pane");
    expect(within(recentPane).getByTestId("home-recent-scroll")).toHaveClass("home-pane-scroll");

    const launchLink = screen.getByRole("link", { name: "开始新批次" });
    expect(launchLink).toHaveAttribute("href", "/reviews/new");
    expect(actionPanel).toContainElement(launchLink);
    expect(header).not.toContainElement(launchLink);
    expect(screen.queryByRole("link", { name: "创建评审批次" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "查看评审任务" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "维护规则库" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "管理模型配置" })).not.toBeInTheDocument();

    expect(within(snapshotPane).getByText("25 份文档")).toBeInTheDocument();
    expect(within(snapshotPane).getByText("9 个批次，31 个问题标注")).toBeInTheDocument();
    expect(within(snapshotPane).getByText("规则库只负责维护资产，批次配置在新建批次页完成。")).toBeInTheDocument();

    const recentReviewLink = within(recentPane).getByText("四月活动复盘").closest("a");
    expect(recentReviewLink).toHaveAttribute("href", "/reviews/detail?id=review_home_1");

    expect(within(snapshotPane).getByText("8/12 条规则启用")).toBeInTheDocument();
    expect(within(snapshotPane).getByText("百炼生产")).toBeInTheDocument();
    expect(within(snapshotPane).getByText("qwen-plus")).toBeInTheDocument();
  });

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
    const snapshotPane = screen.getByTestId("home-snapshot-pane");

    expect(within(recentPane).getByText("还没有评审记录")).toBeInTheDocument();
    expect(within(recentPane).getByText("创建新评审后，这里会显示结果。")).toBeInTheDocument();
    expect(within(snapshotPane).getByText("当前没有启用模型配置")).toBeInTheDocument();
    expect(
      within(snapshotPane).getByText("先在侧边栏进入模型配置启用一个配置。"),
    ).toBeInTheDocument();
  });

  it("shows explicit loading copy in the command rail and readiness pane before dashboard facts resolve", async () => {
    const deferredDashboard = createDeferred<HomeDashboardData>();

    installDesktopApi({
      getHomeDashboard: vi.fn().mockReturnValue(deferredDashboard.promise),
    });

    render(<HomePage />);

    const snapshotPane = screen.getByTestId("home-snapshot-pane");

    expect(within(snapshotPane).getByText("正在读取工作台状态")).toBeInTheDocument();
    expect(
      within(snapshotPane).getByText("桌面工作台正在同步规则、模型和本地资料。"),
    ).toBeInTheDocument();
    expect(within(snapshotPane).queryByText("0 份文档")).not.toBeInTheDocument();
    expect(within(snapshotPane).queryByText("0 个批次")).not.toBeInTheDocument();
    expect(within(snapshotPane).queryByText("0/0 条规则启用")).not.toBeInTheDocument();

    deferredDashboard.resolve(DASHBOARD_FIXTURE);

    await waitFor(() => {
      expect(within(snapshotPane).getByText("25 份文档")).toBeInTheDocument();
      expect(within(snapshotPane).getByText("8/12 条规则启用")).toBeInTheDocument();
    });
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
    const snapshotPane = screen.getByTestId("home-snapshot-pane");
    const recentPane = screen.getByTestId("home-recent-reviews-pane");

    expect(cockpit).toHaveClass("home-command-center");
    const launchLink = screen.getByRole("link", { name: "开始新批次" });
    expect(launchLink).toHaveAttribute("href", "/reviews/new");
    expect(screen.getByTestId("home-primary-action-panel")).toContainElement(launchLink);
    expect(screen.queryByRole("link", { name: "创建评审批次" })).not.toBeInTheDocument();
    expect(within(snapshotPane).getByText("工作台状态暂不可用")).toBeInTheDocument();
    expect(
      within(snapshotPane).getByText("桌面桥接恢复后，这里会显示规则、模型和本地资料。"),
    ).toBeInTheDocument();
    expect(within(snapshotPane).queryByText("0 份文档")).not.toBeInTheDocument();
    expect(within(recentPane).getByText("加载失败：dashboard unavailable")).toBeInTheDocument();
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
    expect(screen.getByTestId("home-snapshot-pane")).toBeInTheDocument();
    expect(screen.getByTestId("home-recent-reviews-pane")).toBeInTheDocument();
    expect(screen.getByText("工作台状态暂不可用")).toBeInTheDocument();
    expect(screen.queryByText("0/0 条规则启用")).not.toBeInTheDocument();
  });
});
