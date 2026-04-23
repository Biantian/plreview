import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import RulesPage from "@/app/rules/page";

function installDesktopApi(overrides: Partial<typeof window.plreview> = {}) {
  window.plreview = {
    pickFiles: vi.fn(),
    getHomeDashboard: vi.fn(),
    getModelDashboard: vi.fn(),
    getRuleDashboard: vi.fn().mockResolvedValue({
      enabledCount: 0,
      categoryCount: 0,
      latestUpdatedAtLabel: "--",
      items: [],
      totalCount: 0,
    }),
    getReviewDetail: vi.fn(),
    listReviewJobs: vi.fn().mockResolvedValue([]),
    searchReviewJobs: vi.fn().mockResolvedValue([]),
    listRules: vi.fn().mockResolvedValue([]),
    searchRules: vi.fn().mockResolvedValue([]),
    createReviewBatch: vi.fn(),
    deleteReviewJobs: vi.fn().mockResolvedValue({ deletedCount: 0 }),
    retryReviewJob: vi.fn().mockResolvedValue({ queued: true }),
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
  } as typeof window.plreview;
}

describe("RulesPage", () => {
  it("renders rules inside the fixed-shell layout with a non-scrolling header region", async () => {
    installDesktopApi();

    const { container } = render(<RulesPage />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: "规则库" })).toBeInTheDocument(),
    );

    const shell = container.querySelector(".management-page-shell");
    const header = container.querySelector(".management-page-header");

    expect(shell).not.toBeNull();
    expect(header).not.toBeNull();
    expect(shell).toContainElement(header as HTMLElement);
  });

  it("shows explicit failure state when rule loading rejects", async () => {
    installDesktopApi({
      getRuleDashboard: vi.fn().mockRejectedValue(new Error("rules failed")),
    });

    render(<RulesPage />);

    await waitFor(() =>
      expect(screen.getByText("加载失败：rules failed")).toBeInTheDocument(),
    );

    expect(screen.queryByText("规则总数")).not.toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "规则表格" })).not.toBeInTheDocument();
  });

  it("shows explicit failure state when desktop bridge loader is unavailable", async () => {
    installDesktopApi({
      getRuleDashboard: undefined,
    });

    render(<RulesPage />);

    await waitFor(() =>
      expect(screen.getByText("加载失败：桌面桥接不可用，请从 Electron 桌面壳启动。")).toBeInTheDocument(),
    );

    expect(screen.queryByText("规则总数")).not.toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "规则表格" })).not.toBeInTheDocument();
  });
});
