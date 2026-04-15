import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ModelManager } from "@/components/model-manager";

vi.mock("@/lib/actions", () => ({
  deleteLlmProfileAction: vi.fn(),
  saveLlmProfileAction: vi.fn(),
  toggleLlmProfileEnabledAction: vi.fn(),
}));

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

  it("filters rows and opens the drawer for editing", async () => {
    const user = userEvent.setup();

    render(
      <ModelManager
        metrics={{
          totalCount: 2,
          enabledCount: 1,
          liveCount: 1,
          latestUpdatedAtLabel: "2026-04-15 16:00",
        }}
        profiles={profiles}
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: "搜索模型" }), "演示");
    await user.click(screen.getByRole("button", { name: "编辑 演示配置" }));

    expect(screen.getByText("演示配置")).toBeInTheDocument();
    expect(screen.queryByText("百炼生产")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "模型编辑抽屉" })).toBeInTheDocument();
  });

  it("opens the create drawer from the toolbar", async () => {
    const user = userEvent.setup();

    render(
      <ModelManager
        metrics={{
          totalCount: 0,
          enabledCount: 0,
          liveCount: 0,
          latestUpdatedAtLabel: "--",
        }}
        profiles={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "新增模型" }));

    expect(screen.getByRole("dialog", { name: "模型编辑抽屉" })).toBeInTheDocument();
    expect(screen.getByText("新增模型配置")).toBeInTheDocument();
  });
});
