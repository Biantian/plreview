import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("loads dashboard data through the desktop bridge and links recent reviews to the static detail route", async () => {
    const getHomeDashboard = vi.fn().mockResolvedValue({
      rulesCount: 12,
      enabledRulesCount: 8,
      documentsCount: 25,
      reviewJobsCount: 9,
      annotationsCount: 31,
      recentReviews: [
        {
          id: "review_home_1",
          title: "四月活动复盘",
          status: "completed" as const,
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
    });

    window.plreview = {
      pickFiles: vi.fn(),
      getHomeDashboard,
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
    };

    render(<HomePage />);

    await waitFor(() => expect(screen.getByText("四月活动复盘")).toBeInTheDocument());

    expect(getHomeDashboard).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { level: 1, name: "评审工作台" })).toBeInTheDocument();
    expect(screen.getByText("已导入文档").nextElementSibling).toHaveTextContent("25");
    expect(screen.getAllByText("评审任务")[0].nextElementSibling).toHaveTextContent("9");
    expect(screen.getByText("启用规则").nextElementSibling).toHaveTextContent("8");
    expect(screen.getByText("问题标注").nextElementSibling).toHaveTextContent("31");

    const recentReviewLink = screen.getByText("四月活动复盘").closest("a");
    expect(recentReviewLink).toHaveAttribute("href", "/reviews/detail?id=review_home_1");

    const panel = screen.getByRole("heading", { level: 1, name: "评审工作台" }).closest(".panel");
    expect(panel).toBeTruthy();
    expect(within(panel as HTMLElement).getByRole("link", { name: "开始新批次" })).toHaveAttribute(
      "href",
      "/reviews/new",
    );
    expect(within(panel as HTMLElement).getByRole("link", { name: "打开评审任务" })).toHaveAttribute(
      "href",
      "/reviews",
    );
  });

  it("short-circuits to a clear failure state when dashboard loading fails", async () => {
    window.plreview = {
      pickFiles: vi.fn(),
      getHomeDashboard: vi.fn().mockRejectedValue(new Error("dashboard unavailable")),
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
    };

    render(<HomePage />);

    await waitFor(() =>
      expect(screen.getByText("加载失败：dashboard unavailable")).toBeInTheDocument(),
    );

    expect(screen.queryByText("已导入文档")).not.toBeInTheDocument();
    expect(screen.queryByText("最近评审")).not.toBeInTheDocument();
  });
});
