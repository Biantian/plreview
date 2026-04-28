import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ReviewsPage from "@/app/reviews/page";

function installDesktopApi(overrides: Partial<typeof window.plreview> = {}) {
  window.plreview = {
    pickFiles: vi.fn(),
    getHomeDashboard: vi.fn(),
    getReviewLaunchData: vi.fn(),
    getModelDashboard: vi.fn(),
    getRuleDashboard: vi.fn(),
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
    deleteRule: vi.fn(),
    saveModelProfile: vi.fn(),
    toggleModelProfileEnabled: vi.fn(),
    deleteModelProfile: vi.fn(),
    getRuntimeStatus: vi.fn(),
    subscribeRuntimeStatus: vi.fn(),
    ...overrides,
  } as typeof window.plreview;
}

describe("ReviewsPage", () => {
  it("places the new-batch action in a command row below the page title", async () => {
    installDesktopApi({
      listReviewJobs: vi.fn().mockResolvedValue([]),
    });

    render(<ReviewsPage />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: "评审任务" })).toBeInTheDocument(),
    );

    const panel = screen.getByRole("heading", { level: 1, name: "评审任务" }).closest(".panel");

    expect(panel).toBeTruthy();
    expect((panel as HTMLElement).querySelector(".page-intro-actions")).not.toBeInTheDocument();
    const commandRow = within(panel as HTMLElement).getByRole("region", { name: "批次操作" });
    expect(commandRow).toHaveClass("reviews-command-strip");
    expect(within(commandRow).getByRole("link", { name: "新建批次" })).toHaveAttribute(
      "href",
      "/reviews/new",
    );
    expect(screen.queryByText("默认带入上次批次规则")).not.toBeInTheDocument();
    expect(within(panel as HTMLElement).queryByRole("link", { name: "帮助文档" })).not.toBeInTheDocument();
    expect(within(panel as HTMLElement).queryByRole("link", { name: "返回工作台" })).not.toBeInTheDocument();
  });

  it("renders reviews inside the fixed-shell layout with a non-scrolling header region", async () => {
    installDesktopApi({
      listReviewJobs: vi.fn().mockResolvedValue([]),
    });

    const { container } = render(<ReviewsPage />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: "评审任务" })).toBeInTheDocument(),
    );

    const shell = container.querySelector(".reviews-page-shell");
    const header = container.querySelector(".reviews-page-header");

    expect(shell).not.toBeNull();
    expect(header).not.toBeNull();
    expect(shell).toContainElement(header as HTMLElement);
  });

  it("shows explicit failure state when review loading rejects", async () => {
    installDesktopApi({
      listReviewJobs: vi.fn().mockRejectedValue(new Error("review jobs failed")),
    });

    render(<ReviewsPage />);

    await waitFor(() =>
      expect(screen.getByText("加载失败：review jobs failed")).toBeInTheDocument(),
    );

    expect(screen.queryByText("总任务数")).not.toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "评审任务表格" })).not.toBeInTheDocument();
  });

  it("shows explicit failure state when desktop bridge loader is unavailable", async () => {
    installDesktopApi({
      listReviewJobs: undefined,
    });

    render(<ReviewsPage />);

    await waitFor(() =>
      expect(screen.getByText("加载失败：桌面桥接不可用，请从 Electron 桌面壳启动。")).toBeInTheDocument(),
    );

    expect(screen.queryByText("总任务数")).not.toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "评审任务表格" })).not.toBeInTheDocument();
  });
});
