import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ModelManager } from "@/components/model-manager";

describe("ModelManager", () => {
  const profiles = [
    {
      id: "profile_1",
      name: "百炼生产",
      provider: "DashScope",
      vendorKey: "openai_compatible",
      mode: "live" as const,
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      defaultModel: "qwen-plus",
      modelOptionsText: "qwen-plus\nqwen-max",
      enabled: true,
      hasApiKey: true,
      apiKeyLast4: "abcd",
    },
    {
      id: "profile_2",
      name: "演示配置",
      provider: "Demo",
      vendorKey: "openai_compatible",
      mode: "demo" as const,
      baseUrl: "https://demo.invalid/v1",
      defaultModel: "mock-model",
      modelOptionsText: "mock-model",
      enabled: false,
      hasApiKey: false,
      apiKeyLast4: null,
    },
  ];

  beforeEach(() => {
    window.plreview = {
      pickFiles: vi.fn(),
      getHomeDashboard: vi.fn(),
      getModelDashboard: vi.fn().mockResolvedValue({
        metrics: {
          totalCount: profiles.length,
          enabledCount: 1,
          liveCount: 1,
          latestUpdatedAtLabel: "2026-04-15 16:00",
        },
        profiles,
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
      saveModelProfile: vi.fn().mockResolvedValue({
        metrics: {
          totalCount: profiles.length + 1,
          enabledCount: 2,
          liveCount: 2,
          latestUpdatedAtLabel: "2026-04-15 16:00",
        },
        profiles,
      }),
      toggleModelProfileEnabled: vi.fn().mockResolvedValue({
        metrics: {
          totalCount: profiles.length,
          enabledCount: 1,
          liveCount: 1,
          latestUpdatedAtLabel: "2026-04-15 16:00",
        },
        profiles,
      }),
      deleteModelProfile: vi.fn().mockResolvedValue({
        metrics: {
          totalCount: 1,
          enabledCount: 1,
          liveCount: 1,
          latestUpdatedAtLabel: "2026-04-15 16:00",
        },
        profiles: [profiles[0]],
      }),
      getRuntimeStatus: vi.fn(),
      subscribeRuntimeStatus: vi.fn(),
    };
  });

  it("renders the desktop model shell with toolbar summary", () => {
    render(<ModelManager profiles={profiles} />);

    expect(screen.getByText("模型配置矩阵")).toBeInTheDocument();
    expect(screen.getByText("共 2 条配置 · 当前显示 2 条")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "模型表格" }).closest(".desktop-table-card")).toBeTruthy();
  });

  it("filters rows and opens the drawer for editing", async () => {
    const user = userEvent.setup();

    render(<ModelManager profiles={profiles} />);

    await user.type(screen.getByRole("searchbox", { name: "搜索模型" }), "演示");
    await user.click(screen.getByRole("button", { name: "编辑 演示配置" }));

    expect(screen.getByText("演示配置")).toBeInTheDocument();
    expect(screen.queryByText("百炼生产")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "模型编辑抽屉" })).toBeInTheDocument();
  });

  it("opens the create drawer from the toolbar", async () => {
    const user = userEvent.setup();

    render(<ModelManager profiles={[]} />);

    await user.click(screen.getByRole("button", { name: "新增模型" }));

    expect(screen.getByRole("dialog", { name: "模型编辑抽屉" })).toBeInTheDocument();
    expect(screen.getByText("新增模型配置")).toBeInTheDocument();
  });
});
