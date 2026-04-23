import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ModelsPage from "@/app/models/page";

describe("ModelsPage", () => {
  it("renders the page intro, page-level KPI strip, and management surface shell", async () => {
    window.plreview = {
      pickFiles: vi.fn(),
      getHomeDashboard: vi.fn(),
      getModelDashboard: vi.fn().mockResolvedValue({
        metrics: {
          totalCount: 2,
          enabledCount: 1,
          liveCount: 1,
          latestUpdatedAtLabel: "2026-04-15 16:00",
        },
        profiles: [
          {
            apiKeyLast4: "abcd",
            baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
            defaultModel: "qwen-plus",
            enabled: true,
            hasApiKey: true,
            id: "profile_1",
            mode: "live" as const,
            modelOptionsText: "qwen-plus\nqwen-max",
            name: "百炼生产",
            provider: "DashScope",
            vendorKey: "openai_compatible",
          },
        ],
      }),
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

    render(<ModelsPage />);

    await waitFor(() =>
      expect(screen.getByRole("table", { name: "模型表格" })).toBeInTheDocument(),
    );

    const pageHeading = screen.getByRole("heading", {
      level: 1,
      name: "模型配置",
    });
    const pagePanel = pageHeading.closest(".panel");

    expect(pageHeading).toBeInTheDocument();
    expect(pagePanel).toBeTruthy();
    expect(within(pagePanel as HTMLElement).getByText("模型总数")).toBeInTheDocument();
    expect(within(pagePanel as HTMLElement).getByText("启用中")).toBeInTheDocument();
    expect(within(pagePanel as HTMLElement).getByText("实时模式")).toBeInTheDocument();
    expect(within(pagePanel as HTMLElement).getByText("最近更新")).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "模型表格" }).closest(".desktop-table-card"),
    ).toBeTruthy();
    expect(screen.getByRole("table", { name: "模型表格" }).closest(".management-table-scroll-region")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "模型配置" }).closest(".management-page-header")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "模型配置" }).closest(".management-page-shell")).toBeTruthy();
    expect(screen.getByText("模型总数").closest(".desktop-table-card")).toBeNull();
  });

  it("short-circuits to a clear failure state when model loading fails", async () => {
    window.plreview = {
      pickFiles: vi.fn(),
      getHomeDashboard: vi.fn(),
      getModelDashboard: vi.fn().mockRejectedValue(new Error("model dashboard failed")),
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

    render(<ModelsPage />);

    await waitFor(() =>
      expect(screen.getByText("加载失败：model dashboard failed")).toBeInTheDocument(),
    );

    expect(screen.queryByRole("table", { name: "模型表格" })).not.toBeInTheDocument();
    expect(screen.queryByText("模型总数")).not.toBeInTheDocument();
  });
});
