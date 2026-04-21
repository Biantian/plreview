import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ReviewsPage from "@/app/reviews/page";

function installDesktopApi(overrides: Partial<typeof window.plreview> = {}) {
  window.plreview = {
    pickFiles: vi.fn(),
    getHomeDashboard: vi.fn(),
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
    saveModelProfile: vi.fn(),
    toggleModelProfileEnabled: vi.fn(),
    deleteModelProfile: vi.fn(),
    getRuntimeStatus: vi.fn(),
    subscribeRuntimeStatus: vi.fn(),
    ...overrides,
  } as typeof window.plreview;
}

describe("ReviewsPage", () => {
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
