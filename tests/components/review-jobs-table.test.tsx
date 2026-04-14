import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ReviewJobsTable } from "@/components/review-jobs-table";

describe("ReviewJobsTable", () => {
  it("filters rows by filename, title, batch name and model", async () => {
    const user = userEvent.setup();

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
});
