import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import NewReviewPage from "@/app/reviews/new/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("NewReviewPage", () => {
  it("renders the page intro and composed launch workspace structure", async () => {
    window.plreview = {
      pickFiles: vi.fn().mockResolvedValue([]),
      getHomeDashboard: vi.fn(),
      getModelDashboard: vi.fn().mockResolvedValue({
        metrics: {
          totalCount: 1,
          enabledCount: 1,
          liveCount: 1,
          latestUpdatedAtLabel: "2026-04-15 16:00",
        },
        profiles: [
          {
            defaultModel: "qwen-plus",
            id: "profile-1",
            name: "Default",
            provider: "openai",
            vendorKey: "openai_compatible",
            mode: "live",
            baseUrl: "https://example.com",
            modelOptionsText: "qwen-plus",
            enabled: true,
            hasApiKey: true,
            apiKeyLast4: "abcd",
          },
        ],
      }),
      getRuleDashboard: vi.fn().mockResolvedValue({
        enabledCount: 1,
        categoryCount: 1,
        latestUpdatedAtLabel: "2026-04-15 16:00",
        totalCount: 1,
        items: [
          {
            category: "内容",
            description: "保持表达统一",
            enabled: true,
            id: "rule-1",
            name: "Tone",
            promptTemplate: "模板",
            severity: "medium",
            updatedAtLabel: "2026-04-15 16:00",
          },
        ],
      }),
      getReviewDetail: vi.fn(),
      listReviewJobs: vi.fn(),
      searchReviewJobs: vi.fn(),
      listRules: vi.fn(),
      searchRules: vi.fn(),
      createReviewBatch: vi.fn().mockResolvedValue({ id: "batch_1" }),
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
    };

    render(<NewReviewPage />);

    await waitFor(() =>
      expect(screen.getByRole("region", { name: "评审启动工作区" })).toBeInTheDocument(),
    );

    const pageHeading = screen.getByRole("heading", { level: 1, name: "新建批次" });
    const pagePanel = pageHeading.closest(".panel");
    const pageIntro = pageHeading.closest(".page-intro");
    const workspace = screen.getByRole("region", { name: "评审启动工作区" });

    expect(pagePanel).toBeTruthy();
    expect(pageIntro).toBeTruthy();
    expect(within(pageIntro as HTMLElement).queryByRole("link")).not.toBeInTheDocument();
    expect(within(workspace).getByRole("heading", { level: 2, name: "批次配置" })).toBeInTheDocument();
    expect(within(workspace).getByRole("heading", { level: 2, name: "文件工作台" })).toBeInTheDocument();
    expect(within(workspace).getByRole("heading", { level: 3, name: "启动批次" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "启动摘要" })).toBeInTheDocument();
  });

  it("short-circuits to a dedicated failure state when bootstrap loading rejects", async () => {
    window.plreview = {
      pickFiles: vi.fn().mockResolvedValue([]),
      getHomeDashboard: vi.fn(),
      getModelDashboard: vi.fn().mockResolvedValue({
        metrics: {
          totalCount: 1,
          enabledCount: 1,
          liveCount: 1,
          latestUpdatedAtLabel: "2026-04-15 16:00",
        },
        profiles: [],
      }),
      getRuleDashboard: vi.fn().mockRejectedValue(new Error("bootstrap failed")),
      getReviewDetail: vi.fn(),
      listReviewJobs: vi.fn(),
      searchReviewJobs: vi.fn(),
      listRules: vi.fn(),
      searchRules: vi.fn(),
      createReviewBatch: vi.fn().mockResolvedValue({ id: "batch_1" }),
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
    };

    render(<NewReviewPage />);

    await waitFor(() =>
      expect(screen.getByText("加载失败：bootstrap failed")).toBeInTheDocument(),
    );

    expect(screen.queryByRole("region", { name: "评审启动工作区" })).not.toBeInTheDocument();
  });

  it("short-circuits to a dedicated failure state when bridge methods are unavailable", async () => {
    window.plreview = {
      pickFiles: vi.fn().mockResolvedValue([]),
      getHomeDashboard: vi.fn(),
      getModelDashboard: undefined as unknown as typeof window.plreview.getModelDashboard,
      getRuleDashboard: vi.fn(),
      getReviewDetail: vi.fn(),
      listReviewJobs: vi.fn(),
      searchReviewJobs: vi.fn(),
      listRules: vi.fn(),
      searchRules: vi.fn(),
      createReviewBatch: vi.fn().mockResolvedValue({ id: "batch_1" }),
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
    };

    render(<NewReviewPage />);

    await waitFor(() =>
      expect(screen.getByText("加载失败：桌面桥接不可用，请从 Electron 桌面壳启动。")).toBeInTheDocument(),
    );

    expect(screen.queryByRole("region", { name: "评审启动工作区" })).not.toBeInTheDocument();
  });
});
