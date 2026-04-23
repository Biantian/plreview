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
    const createBatchLinks = within(commandRail).getAllByRole("link", { name: "创建评审批次" });
    expect(createBatchLinks).toHaveLength(2);
    expect(createBatchLinks[0]).toHaveAttribute("href", "/reviews/new");
    expect(createBatchLinks[1]).toHaveAttribute("href", "/reviews/new");
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
    const createBatchLinks = within(commandRail).getAllByRole("link", { name: "创建评审批次" });
    expect(createBatchLinks).toHaveLength(2);
    expect(createBatchLinks[0]).toHaveAttribute("href", "/reviews/new");
    expect(createBatchLinks[1]).toHaveAttribute("href", "/reviews/new");
    expect(within(commandRail).getByText("工作台指标暂不可用")).toBeInTheDocument();
    expect(
      within(commandRail).getByText("桌面桥接恢复后，这里会显示文档、任务、规则和标注概览。"),
    ).toBeInTheDocument();
    expect(within(commandRail).queryByText("已导入文档")).not.toBeInTheDocument();
    expect(within(commandRail).queryByText("评审任务")).not.toBeInTheDocument();
    expect(within(commandRail).queryByText("启用规则")).not.toBeInTheDocument();
    expect(within(commandRail).queryByText("问题标注")).not.toBeInTheDocument();
    expect(within(recentPane).getByText("加载失败：dashboard unavailable")).toBeInTheDocument();
    expect(within(readinessPane).getByText("桌面桥接不可用")).toBeInTheDocument();
    expect(within(readinessPane).getByText("无法读取规则、模型和结果状态。")).toBeInTheDocument();
    expect(within(readinessPane).queryByText("0 条规则已建档")).not.toBeInTheDocument();
    expect(within(readinessPane).queryByText("0 条规则已启用")).not.toBeInTheDocument();
    expect(within(readinessPane).queryByText("可查看报告、问题和原文位置")).not.toBeInTheDocument();
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
    expect(screen.getByText("工作台指标暂不可用")).toBeInTheDocument();
    expect(screen.queryByText("0 条规则已建档")).not.toBeInTheDocument();
  });
});
