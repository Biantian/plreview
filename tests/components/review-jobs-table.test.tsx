import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DesktopBinaryPayload } from "@/desktop/bridge/desktop-api";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ReviewJobsTable } from "@/components/review-jobs-table";

function createReview(overrides: Partial<Parameters<typeof ReviewJobsTable>[0]["items"][number]> = {}) {
  return {
    annotationsCount: 1,
    batchName: null,
    createdAt: "2026-04-13T10:00:00.000Z",
    fileType: "docx",
    filename: "玩法.docx",
    finishedAt: "2026-04-13T12:00:00.000Z",
    id: "review_1",
    modelName: "qwen-plus",
    overallScore: 80,
    status: "completed" as const,
    title: "玩法复盘",
    ...overrides,
  };
}

function createDesktopBinary(filename: string): DesktopBinaryPayload {
  return {
    filename,
    bytes: new Uint8Array([1, 2, 3]),
  };
}

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
    deleteReviewJobs: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    retryReviewJob: vi.fn().mockResolvedValue({ queued: true }),
    exportReviewList: vi.fn().mockResolvedValue(createDesktopBinary("review-list.xlsx")),
    exportReviewReport: vi.fn().mockResolvedValue({
      ...createDesktopBinary("review-reports.zip"),
      exportedCount: 1,
      skippedCount: 0,
    }),
    saveRule: vi.fn(),
    toggleRuleEnabled: vi.fn(),
    saveModelProfile: vi.fn(),
    toggleModelProfileEnabled: vi.fn(),
    deleteModelProfile: vi.fn(),
    getRuntimeStatus: vi.fn(),
    subscribeRuntimeStatus: vi.fn(),
    ...overrides,
  };
}

describe("ReviewJobsTable", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installDesktopApi();
  });

  it("traps focus in the confirm dialog and restores the trigger on close", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);

      return (
        <>
          <button onClick={() => setOpen(true)} type="button">
            打开确认框
          </button>
          <ConfirmDialog
            confirmLabel="仍要删除"
            description="确认删除这些任务吗？"
            open={open}
            onClose={() => setOpen(false)}
            onConfirm={() => setOpen(false)}
            title="删除评审任务"
          />
        </>
      );
    }

    render(<Harness />);

    const trigger = screen.getByRole("button", { name: "打开确认框" });
    trigger.focus();

    await user.click(trigger);

    expect(screen.getByRole("dialog", { name: "删除评审任务" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取消" })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "删除评审任务" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("filters rows by localized status and title", async () => {
    const user = userEvent.setup();
    const reviews = [
      createReview({
        id: "review_1",
        batchName: "四月批次",
        filename: "玩法.xlsx",
        fileType: "xlsx",
        status: "completed",
        title: "玩法复盘",
      }),
      createReview({
        id: "review_2",
        batchName: "五月批次",
        filename: "包装.docx",
        modelName: "qwen-max",
        overallScore: null,
        status: "running",
        title: "活动包装",
      }),
    ];

    installDesktopApi({
      listReviewJobs: vi.fn().mockResolvedValue(reviews),
    });

    render(<ReviewJobsTable items={reviews} />);

    await user.type(screen.getByRole("searchbox", { name: "搜索评审任务" }), "已完成");

    expect(screen.getByText("玩法复盘")).toBeInTheDocument();
    expect(screen.queryByText("活动包装")).not.toBeInTheDocument();
  });

  it("uses the desktop export bridge for all-filtered export actions", async () => {
    const user = userEvent.setup();
    const exportReviewList = vi.fn().mockResolvedValue(createDesktopBinary("review-list.xlsx"));
    const listReviewJobs = vi.fn().mockResolvedValue([createReview()]);

    installDesktopApi({
      exportReviewList,
      listReviewJobs,
    });

    render(<ReviewJobsTable items={[createReview()]} />);

    await user.type(screen.getByRole("searchbox", { name: "搜索评审任务" }), "玩法");
    await user.click(screen.getByRole("checkbox", { name: "选择当前筛选结果" }));
    await user.click(screen.getByRole("button", { name: "导出清单" }));

    expect(exportReviewList).toHaveBeenCalledWith({
      allMatching: true,
      query: "玩法",
    });
    expect(listReviewJobs).toHaveBeenCalled();
  });

  it("uses page-provided items as the initial source of truth without an immediate duplicate fetch", () => {
    const listReviewJobs = vi.fn().mockResolvedValue([createReview()]);

    installDesktopApi({
      listReviewJobs,
    });

    render(<ReviewJobsTable items={[createReview()]} />);

    expect(listReviewJobs).not.toHaveBeenCalled();
    expect(screen.getByText("玩法复盘")).toBeInTheDocument();
  });

  it("keeps the bulk toolbar mounted so selection actions do not cause layout reflow", async () => {
    const user = userEvent.setup();

    render(<ReviewJobsTable items={[createReview()]} />);

    const bulkToolbar = screen.getByRole("toolbar", { name: "批量操作" });

    expect(bulkToolbar).toHaveAttribute("data-active", "false");
    expect(screen.getByText("选择任务后可批量导出或删除。")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "选择评审任务 玩法复盘" }));

    expect(bulkToolbar).toHaveAttribute("data-active", "true");
    expect(screen.getByText("已选中 1 条")).toBeInTheDocument();
  });

  it("uses compact refresh and row action affordances instead of heavy outline buttons", () => {
    render(<ReviewJobsTable items={[createReview()]} />);

    expect(screen.getByRole("button", { name: "刷新任务列表" })).toHaveClass("icon-button");
    expect(screen.queryByRole("button", { name: "立即刷新" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看详情" })).toHaveClass("table-text-link");
    expect(screen.getByRole("button", { name: "删除评审任务 玩法复盘" })).toHaveClass(
      "table-text-button",
    );
  });

  it("deletes a single review through the desktop bridge", async () => {
    const user = userEvent.setup();
    const deleteReviewJobs = vi.fn().mockResolvedValue({ deletedCount: 1 });
    const listReviewJobs = vi
      .fn()
      .mockResolvedValueOnce([createReview()])
      .mockResolvedValueOnce([]);

    installDesktopApi({
      deleteReviewJobs,
      listReviewJobs,
    });

    render(<ReviewJobsTable items={[createReview()]} />);

    await user.click(screen.getByRole("button", { name: "删除评审任务 玩法复盘" }));
    await user.click(screen.getByRole("button", { name: "仍要删除" }));

    expect(deleteReviewJobs).toHaveBeenCalledWith({
      allMatching: false,
      selectedIds: ["review_1"],
    });
    expect(screen.getByText("已删除 1 条评审任务。")).toBeInTheDocument();
  });

  it("retries failed reviews through the desktop bridge and links to the static detail route", async () => {
    const user = userEvent.setup();
    const retryReviewJob = vi.fn().mockResolvedValue({ queued: true });
    const failedReview = createReview({
      id: "review_failed",
      status: "failed",
      title: "失败任务",
    });

    installDesktopApi({
      retryReviewJob,
      listReviewJobs: vi.fn().mockResolvedValue([failedReview]),
    });

    render(<ReviewJobsTable items={[failedReview]} />);

    await user.click(screen.getByRole("button", { name: "重试评审任务 失败任务" }));

    expect(retryReviewJob).toHaveBeenCalledWith("review_failed");
    expect(screen.getByRole("link", { name: "查看详情" })).toHaveAttribute(
      "href",
      "/reviews/detail?id=review_failed",
    );
  });
});
