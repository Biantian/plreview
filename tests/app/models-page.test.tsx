import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ModelsPage from "@/app/models/page";

vi.mock("@/lib/llm-profiles", () => ({
  getModelDashboardData: vi.fn(),
}));

describe("ModelsPage", () => {
  it("renders the page intro, page-level KPI strip, and management surface shell", async () => {
    const { getModelDashboardData } = await import("@/lib/llm-profiles");

    vi.mocked(getModelDashboardData).mockResolvedValue({
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
    });

    render(await ModelsPage());

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
    expect(screen.getByText("模型总数").closest(".desktop-table-card")).toBeNull();
  });
});
