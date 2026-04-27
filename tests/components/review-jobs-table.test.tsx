import { useState } from "react";
import { isInaccessible, render, screen, within } from "@testing-library/react";
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
    deleteRule: vi.fn(),
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
    await user.click(screen.getByRole("button", { name: "批量导出" }));

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

  it("floats contextual bulk actions without reserving static prompt space", async () => {
    const user = userEvent.setup();

    const { container } = render(<ReviewJobsTable items={[createReview()]} />);

    const bulkToolbar = container.querySelector(".review-bulk-toolbar-shell");

    expect(bulkToolbar).not.toBeNull();
    expect(bulkToolbar).toHaveAttribute("data-active", "false");
    expect(bulkToolbar).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByText("选择任务后可批量导出或删除。")).not.toBeInTheDocument();
    expect(screen.queryByRole("toolbar", { name: "批量操作" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "选择评审任务 玩法复盘" }));

    expect(bulkToolbar).toHaveAttribute("data-active", "true");
    expect(bulkToolbar).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByRole("toolbar", { name: "批量操作" })).toBeInTheDocument();
    expect(screen.getByText("已选 1 项")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "批量导出" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "批量删除" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取消" })).toBeInTheDocument();
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

  it("keeps the empty state informational without a duplicate new-batch action", () => {
    render(<ReviewJobsTable items={[]} />);

    expect(screen.getByText("还没有评审任务")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "去新建批次" })).not.toBeInTheDocument();
  });

  it("renders a bounded reviews table while keeping key fields in separate scan columns", () => {
    const review = createReview({
      annotationsCount: 5,
      batchName: "四月批次",
      fileType: "PDF",
      filename: "玩法说明.docx",
      modelName: "gpt-4.1",
      overallScore: 92,
      title: "玩法复盘",
    });

    render(<ReviewJobsTable items={[review]} />);

    const table = screen.getByRole("table", { name: "评审任务表格" });
    const headers = within(table)
      .getAllByRole("columnheader")
      .filter((header) => !isInaccessible(header))
      .map((header) => header.textContent?.replace(/\s+/g, " ").trim() ?? "");

    expect(headers).toEqual(["", "状态", "任务", "文件", "评审信息", "创建时间", "操作"]);

    const reviewRow = within(table)
      .getAllByRole("row")
      .find((row) => within(row).queryByText("玩法复盘"));

    expect(reviewRow).toBeDefined();
    expect(within(reviewRow as HTMLElement).getByText("玩法复盘")).toBeVisible();
    expect(within(reviewRow as HTMLElement).getByText("玩法说明.docx")).toBeVisible();
    expect(within(reviewRow as HTMLElement).getByText("PDF")).toBeVisible();
    expect(within(reviewRow as HTMLElement).getByText("四月批次")).toBeVisible();
    expect(within(reviewRow as HTMLElement).getByText("gpt-4.1")).toBeVisible();
    expect(within(reviewRow as HTMLElement).getByText(/5\s*个问题/u)).toBeVisible();
    expect(within(reviewRow as HTMLElement).getByText(/评分\s*92\s*分/u)).toBeVisible();
    expect(
      within(reviewRow as HTMLElement).getByRole("button", { name: "删除评审任务 玩法复盘" }),
    ).toBeVisible();
  });

  it("renders the required review-table hook classes in row markup", () => {
    render(<ReviewJobsTable items={[createReview()]} />);

    const table = screen.getByRole("table", { name: "评审任务表格" });
    const columnClasses = Array.from(table.querySelectorAll("col")).map((column) =>
      column.getAttribute("class"),
    );
    const reviewTableRegion = table.closest(".review-jobs-table");
    const reviewRow = within(table)
      .getAllByRole("row")
      .find((row) => within(row).queryByText("玩法复盘"));

    expect(columnClasses).toEqual([
      "review-job-selection-col",
      "review-job-status-col",
      "review-job-title-col",
      "review-job-file-col",
      "review-job-meta-col",
      "review-job-created-col",
      "review-job-action-col",
    ]);
    expect(reviewTableRegion).not.toBeNull();
    expect(reviewRow).toBeDefined();
    const rowHeader = within(reviewRow as HTMLElement).getByRole("rowheader", { name: /玩法复盘/u });
    const rowCells = within(reviewRow as HTMLElement).getAllByRole("cell");
    const mainInfoCell = rowHeader.classList.contains("review-job-title-cell") ? rowHeader : null;
    const fileCell = rowCells.find((cell) => cell.classList.contains("review-job-file-cell"));
    const metaCell = rowCells.find((cell) => cell.classList.contains("review-job-meta-cell"));
    const createdCell = rowCells.find((cell) => cell.classList.contains("review-job-created-cell"));
    const actionCell = rowCells.find((cell) => cell.classList.contains("review-job-action-cell"));
    const actionRow = actionCell?.querySelector(".table-row-actions");
    expect(mainInfoCell).not.toBeNull();
    expect(fileCell).not.toBeNull();
    expect(fileCell).toHaveTextContent("docx");
    expect(metaCell).not.toBeNull();
    expect(metaCell).toHaveTextContent("qwen-plus");
    expect(createdCell).not.toBeNull();
    expect(actionCell).not.toBeNull();
    expect(actionCell).toHaveClass("table-action-cell", "table-nowrap");
    expect(actionRow).not.toBeNull();
    expect(
      within(actionCell as HTMLElement).getByRole("button", { name: "删除评审任务 玩法复盘" }),
    ).toBeVisible();
  });

  it("renders a dedicated internal scroll region for the review rows", () => {
    render(<ReviewJobsTable items={[createReview()]} />);

    const table = screen.getByRole("table", { name: "评审任务表格" });
    const scrollRegion = table.closest(".review-jobs-scroll-region");
    const listShell = table.closest(".review-jobs-list-shell");

    expect(scrollRegion).not.toBeNull();
    expect(listShell).not.toBeNull();
    expect(scrollRegion).toContainElement(table);
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
