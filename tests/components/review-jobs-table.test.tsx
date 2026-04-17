import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { ReviewJobsTable } from "@/components/review-jobs-table";

describe("ReviewJobsTable", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ reviews: [] }), { status: 200 })),
    );
  });

  function mockReviewsResponse(
    reviews: Array<{
      annotationsCount: number;
      batchName: string | null;
      createdAt: string;
      fileType: string;
      filename: string;
      finishedAt: string | null;
      id: string;
      modelName: string;
      overallScore: number | null;
      status: string;
      title: string;
    }>,
  ) {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ reviews }), { status: 200 }),
    );
  }

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

    await user.tab();
    expect(screen.getByRole("button", { name: "仍要删除" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "取消" })).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "仍要删除" })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "删除评审任务" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("filters rows by filename, title, batch name and model", async () => {
    const user = userEvent.setup();
    mockReviewsResponse([
      {
        annotationsCount: 3,
        batchName: "四月批次",
        createdAt: "2026-04-13T10:00:00.000Z",
        fileType: "xlsx",
        filename: "玩法.xlsx",
        finishedAt: null,
        id: "1",
        modelName: "qwen-plus",
        overallScore: 80,
        status: "completed",
        title: "玩法复盘",
      },
      {
        annotationsCount: 0,
        batchName: "五月批次",
        createdAt: "2026-04-13T11:00:00.000Z",
        fileType: "docx",
        filename: "包装.docx",
        finishedAt: null,
        id: "2",
        modelName: "qwen-max",
        overallScore: null,
        status: "failed",
        title: "活动包装",
      },
    ]);

    render(
      <ReviewJobsTable
        items={[
          {
            annotationsCount: 3,
            batchName: "四月批次",
            createdAt: "2026-04-13T10:00:00.000Z",
            fileType: "xlsx",
            filename: "玩法.xlsx",
            finishedAt: null,
            id: "1",
            modelName: "qwen-plus",
            overallScore: 80,
            status: "completed",
            title: "玩法复盘",
          },
          {
            annotationsCount: 0,
            batchName: "五月批次",
            createdAt: "2026-04-13T11:00:00.000Z",
            fileType: "docx",
            filename: "包装.docx",
            finishedAt: null,
            id: "2",
            modelName: "qwen-max",
            overallScore: null,
            status: "failed",
            title: "活动包装",
          },
        ]}
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: "搜索评审任务" }), "四月");

    expect(screen.getByText("玩法复盘")).toBeInTheDocument();
    expect(screen.queryByText("活动包装")).not.toBeInTheDocument();
  });

  it("matches localized status labels when filtering", async () => {
    const user = userEvent.setup();
    mockReviewsResponse([
      {
        annotationsCount: 3,
        batchName: "四月批次",
        createdAt: "2026-04-13T10:00:00.000Z",
        fileType: "xlsx",
        filename: "玩法.xlsx",
        finishedAt: "2026-04-13T12:00:00.000Z",
        id: "1",
        modelName: "qwen-plus",
        overallScore: 80,
        status: "completed",
        title: "玩法复盘",
      },
      {
        annotationsCount: 0,
        batchName: "五月批次",
        createdAt: "2026-04-13T11:00:00.000Z",
        fileType: "docx",
        filename: "包装.docx",
        finishedAt: null,
        id: "2",
        modelName: "qwen-max",
        overallScore: null,
        status: "running",
        title: "活动包装",
      },
    ]);

    render(
      <ReviewJobsTable
        items={[
          {
            annotationsCount: 3,
            batchName: "四月批次",
            createdAt: "2026-04-13T10:00:00.000Z",
            fileType: "xlsx",
            filename: "玩法.xlsx",
            finishedAt: "2026-04-13T12:00:00.000Z",
            id: "1",
            modelName: "qwen-plus",
            overallScore: 80,
            status: "completed",
            title: "玩法复盘",
          },
          {
            annotationsCount: 0,
            batchName: "五月批次",
            createdAt: "2026-04-13T11:00:00.000Z",
            fileType: "docx",
            filename: "包装.docx",
            finishedAt: null,
            id: "2",
            modelName: "qwen-max",
            overallScore: null,
            status: "running",
            title: "活动包装",
          },
        ]}
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: "搜索评审任务" }), "已完成");

    expect(screen.getByText("玩法复盘")).toBeInTheDocument();
    expect(screen.queryByText("活动包装")).not.toBeInTheDocument();
  });

  it("shows the bulk toolbar and enables bulk actions when a row is selected", async () => {
    const user = userEvent.setup();
    mockReviewsResponse([
      {
        annotationsCount: 3,
        batchName: "四月批次",
        createdAt: "2026-04-13T10:00:00.000Z",
        fileType: "xlsx",
        filename: "玩法.xlsx",
        finishedAt: "2026-04-13T12:00:00.000Z",
        id: "1",
        modelName: "qwen-plus",
        overallScore: 80,
        status: "completed",
        title: "玩法复盘",
      },
    ]);

    render(
      <ReviewJobsTable
        items={[
          {
            annotationsCount: 3,
            batchName: "四月批次",
            createdAt: "2026-04-13T10:00:00.000Z",
            fileType: "xlsx",
            filename: "玩法.xlsx",
            finishedAt: "2026-04-13T12:00:00.000Z",
            id: "1",
            modelName: "qwen-plus",
            overallScore: 80,
            status: "completed",
            title: "玩法复盘",
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "选择评审任务 玩法复盘" }));

    expect(screen.getByText("已选中 1 条")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出清单" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "导出报告" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "删除" })).toBeEnabled();
  });

  it("sends an all-filtered payload for bulk export actions", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(global.fetch);

    mockReviewsResponse([
      {
        annotationsCount: 3,
        batchName: "四月批次",
        createdAt: "2026-04-13T10:00:00.000Z",
        fileType: "xlsx",
        filename: "玩法.xlsx",
        finishedAt: "2026-04-13T12:00:00.000Z",
        id: "1",
        modelName: "qwen-plus",
        overallScore: 80,
        status: "completed",
        title: "玩法复盘",
      },
      {
        annotationsCount: 0,
        batchName: "五月批次",
        createdAt: "2026-04-13T11:00:00.000Z",
        fileType: "docx",
        filename: "包装.docx",
        finishedAt: null,
        id: "2",
        modelName: "qwen-max",
        overallScore: null,
        status: "failed",
        title: "活动包装",
      },
    ]);
    fetchMock.mockResolvedValueOnce(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: {
          "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        status: 200,
      }),
    );
    mockReviewsResponse([
      {
        annotationsCount: 3,
        batchName: "四月批次",
        createdAt: "2026-04-13T10:00:00.000Z",
        fileType: "xlsx",
        filename: "玩法.xlsx",
        finishedAt: "2026-04-13T12:00:00.000Z",
        id: "1",
        modelName: "qwen-plus",
        overallScore: 80,
        status: "completed",
        title: "玩法复盘",
      },
    ]);

    render(
      <ReviewJobsTable
        items={[
          {
            annotationsCount: 3,
            batchName: "四月批次",
            createdAt: "2026-04-13T10:00:00.000Z",
            fileType: "xlsx",
            filename: "玩法.xlsx",
            finishedAt: "2026-04-13T12:00:00.000Z",
            id: "1",
            modelName: "qwen-plus",
            overallScore: 80,
            status: "completed",
            title: "玩法复盘",
          },
          {
            annotationsCount: 0,
            batchName: "五月批次",
            createdAt: "2026-04-13T11:00:00.000Z",
            fileType: "docx",
            filename: "包装.docx",
            finishedAt: null,
            id: "2",
            modelName: "qwen-max",
            overallScore: null,
            status: "failed",
            title: "活动包装",
          },
        ]}
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: "搜索评审任务" }), "玩法");
    await user.click(screen.getByRole("checkbox", { name: "选择当前筛选结果" }));
    await user.click(screen.getByRole("button", { name: "导出清单" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reviews/export-list",
      expect.objectContaining({
        body: JSON.stringify({
          allMatching: true,
          query: "玩法",
        }),
        method: "POST",
      }),
    );
  });

  it("shows stronger delete confirmation copy for running selections", async () => {
    const user = userEvent.setup();
    mockReviewsResponse([
      {
        annotationsCount: 0,
        batchName: "五月批次",
        createdAt: "2026-04-13T10:00:00.000Z",
        fileType: "docx",
        filename: "包装.docx",
        finishedAt: null,
        id: "2",
        modelName: "qwen-max",
        overallScore: null,
        status: "running",
        title: "活动包装",
      },
    ]);

    render(
      <ReviewJobsTable
        items={[
          {
            annotationsCount: 0,
            batchName: "五月批次",
            createdAt: "2026-04-13T10:00:00.000Z",
            fileType: "docx",
            filename: "包装.docx",
            finishedAt: null,
            id: "2",
            modelName: "qwen-max",
            overallScore: null,
            status: "running",
            title: "活动包装",
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "选择评审任务 活动包装" }));
    await user.click(screen.getByRole("button", { name: "删除" }));

    expect(screen.getByRole("dialog", { name: "删除评审任务" })).toBeInTheDocument();
    expect(
      screen.getByText("你选中了仍在运行或排队中的任务，删除后这些任务会从列表中移除，后台处理不一定会立即停止。"),
    ).toBeInTheDocument();
  });

  it("shows delete success feedback from the server and refreshes afterward", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(global.fetch);

    mockReviewsResponse([
      {
        annotationsCount: 1,
        batchName: null,
        createdAt: "2026-04-13T10:00:00.000Z",
        fileType: "docx",
        filename: "玩法.docx",
        finishedAt: "2026-04-13T12:00:00.000Z",
        id: "1",
        modelName: "qwen-plus",
        overallScore: 80,
        status: "completed",
        title: "玩法复盘",
      },
    ]);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ deletedCount: 1 }), { status: 200 }),
    );
    mockReviewsResponse([]);

    render(
      <ReviewJobsTable
        items={[
          {
            annotationsCount: 1,
            batchName: null,
            createdAt: "2026-04-13T10:00:00.000Z",
            fileType: "docx",
            filename: "玩法.docx",
            finishedAt: "2026-04-13T12:00:00.000Z",
            id: "1",
            modelName: "qwen-plus",
            overallScore: 80,
            status: "completed",
            title: "玩法复盘",
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "选择评审任务 玩法复盘" }));
    await user.click(screen.getByRole("button", { name: "删除" }));
    await user.click(screen.getByRole("button", { name: "仍要删除" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reviews/delete",
      expect.objectContaining({
        body: JSON.stringify({
          allMatching: false,
          selectedIds: ["1"],
        }),
        method: "DELETE",
      }),
    );
    expect(screen.getByText("已删除 1 条评审任务。")).toBeInTheDocument();
  });

  it("calls export-report and shows skipped feedback", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(global.fetch);

    mockReviewsResponse([
      {
        annotationsCount: 1,
        batchName: null,
        createdAt: "2026-04-13T10:00:00.000Z",
        fileType: "docx",
        filename: "玩法.docx",
        finishedAt: "2026-04-13T12:00:00.000Z",
        id: "1",
        modelName: "qwen-plus",
        overallScore: 80,
        status: "completed",
        title: "玩法复盘",
      },
    ]);

    fetchMock.mockResolvedValueOnce(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: {
          "content-type": "application/zip",
          "x-exported-count": "1",
          "x-skipped-count": "1",
        },
        status: 200,
      }),
    );

    render(
      <ReviewJobsTable
        items={[
          {
            annotationsCount: 1,
            batchName: null,
            createdAt: "2026-04-13T10:00:00.000Z",
            fileType: "docx",
            filename: "玩法.docx",
            finishedAt: "2026-04-13T12:00:00.000Z",
            id: "1",
            modelName: "qwen-plus",
            overallScore: 80,
            status: "completed",
            title: "玩法复盘",
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "选择评审任务 玩法复盘" }));
    await user.click(screen.getByRole("button", { name: "导出报告" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reviews/export-report",
      expect.objectContaining({
        body: JSON.stringify({
          allMatching: false,
          selectedIds: ["1"],
        }),
        method: "POST",
      }),
    );
    expect(
      screen.getByText("已导出 1 份报告，已跳过 1 个未生成报告的任务。"),
    ).toBeInTheDocument();
  });
});
