import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RulesTable } from "@/components/rules-table";

describe("RulesTable", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.open = true;
      }),
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.open = false;
      }),
    });

    window.plreview = {
      pickFiles: vi.fn(),
      getHomeDashboard: vi.fn(),
      getModelDashboard: vi.fn(),
      getRuleDashboard: vi.fn().mockResolvedValue({
        enabledCount: 1,
        categoryCount: 2,
        latestUpdatedAtLabel: "2026-04-13 11:00",
        items: [],
        totalCount: 2,
      }),
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
      saveRule: vi.fn().mockResolvedValue({
        enabledCount: 1,
        categoryCount: 2,
        latestUpdatedAtLabel: "2026-04-13 11:00",
        items: [],
        totalCount: 2,
      }),
      toggleRuleEnabled: vi.fn().mockResolvedValue({
        enabledCount: 1,
        categoryCount: 2,
        latestUpdatedAtLabel: "2026-04-13 11:00",
        items: [],
        totalCount: 2,
      }),
      saveModelProfile: vi.fn(),
      toggleModelProfileEnabled: vi.fn(),
      deleteModelProfile: vi.fn(),
      getRuntimeStatus: vi.fn(),
      subscribeRuntimeStatus: vi.fn(),
    };
  });

  it("renders the desktop rules shell with toolbar summary", () => {
    render(
      <RulesTable
        items={[
          {
            category: "基础质量",
            description: "检查目标表达是否清楚",
            enabled: true,
            id: "1",
            name: "目标清晰度",
            promptTemplate: "模板 A",
            severity: "medium",
            updatedAtLabel: "2026-04-13 10:00",
          },
          {
            category: "商业化",
            description: "检查付费路径",
            enabled: false,
            id: "2",
            name: "商业闭环",
            promptTemplate: "模板 B",
            severity: "high",
            updatedAtLabel: "2026-04-13 11:00",
          },
        ]}
      />,
    );

    expect(screen.getByText("规则库")).toBeInTheDocument();
    expect(screen.getByText("共 2 条规则 · 当前显示 2 条")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "规则表格" }).closest(".desktop-table-card")).toBeTruthy();
    expect(screen.getByRole("table", { name: "规则表格" }).closest(".management-table-scroll-region")).toBeTruthy();
    expect(screen.getByRole("button", { name: "编辑 目标清晰度" })).toHaveClass("table-text-button");
    expect(screen.getAllByRole("button", { name: "停用" })[0]).toHaveClass("table-text-button");
  });

  it("filters rows locally and opens the editor drawer from the row action", async () => {
    const user = userEvent.setup();

    render(
      <RulesTable
        items={[
          {
            category: "基础质量",
            description: "检查目标表达是否清楚",
            enabled: true,
            id: "1",
            name: "目标清晰度",
            promptTemplate: "模板 A",
            severity: "medium",
            updatedAtLabel: "2026-04-13 10:00",
          },
          {
            category: "商业化",
            description: "检查付费路径",
            enabled: false,
            id: "2",
            name: "商业闭环",
            promptTemplate: "模板 B",
            severity: "high",
            updatedAtLabel: "2026-04-13 11:00",
          },
        ]}
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: "搜索规则" }), "商业");
    await user.click(screen.getByRole("button", { name: "编辑 商业闭环" }));

    expect(screen.getByText("商业闭环")).toBeInTheDocument();
    expect(screen.queryByText("目标清晰度")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "规则编辑" })).toBeInTheDocument();
  });

  it("matches localized severity labels when filtering", async () => {
    const user = userEvent.setup();

    render(
      <RulesTable
        items={[
          {
            category: "基础质量",
            description: "检查目标表达是否清楚",
            enabled: true,
            id: "1",
            name: "目标清晰度",
            promptTemplate: "模板 A",
            severity: "medium",
            updatedAtLabel: "2026-04-13 10:00",
          },
          {
            category: "商业化",
            description: "检查付费路径",
            enabled: false,
            id: "2",
            name: "商业闭环",
            promptTemplate: "模板 B",
            severity: "high",
            updatedAtLabel: "2026-04-13 11:00",
          },
        ]}
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: "搜索规则" }), "高");

    expect(screen.getByText("商业闭环")).toBeInTheDocument();
    expect(screen.queryByText("目标清晰度")).not.toBeInTheDocument();
  });

  it("resets drawer form values when switching to another rule", async () => {
    const user = userEvent.setup();

    render(
      <RulesTable
        items={[
          {
            category: "基础质量",
            description: "检查目标表达是否清楚",
            enabled: true,
            id: "1",
            name: "目标清晰度",
            promptTemplate: "模板 A",
            severity: "medium",
            updatedAtLabel: "2026-04-13 10:00",
          },
          {
            category: "商业化",
            description: "检查付费路径",
            enabled: false,
            id: "2",
            name: "商业闭环",
            promptTemplate: "模板 B",
            severity: "high",
            updatedAtLabel: "2026-04-13 11:00",
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "编辑 目标清晰度" }));
    await user.type(screen.getByLabelText("规则名称"), " 临时修改");
    await user.click(screen.getByRole("button", { name: "编辑 商业闭环" }));

    expect(screen.getByLabelText("规则名称")).toHaveValue("商业闭环");
    expect(screen.getByLabelText("规则说明")).toHaveValue("检查付费路径");
  });

  it("starts in drawer mode on large screens, switches to dialog on resize, and keeps typed values", async () => {
    const user = userEvent.setup();
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;

    try {
      window.innerWidth = 1440;
      window.innerHeight = 900;

      render(
        <RulesTable
          items={[
            {
              category: "基础质量",
              description: "检查目标表达是否清楚",
              enabled: true,
              id: "1",
              name: "目标清晰度",
              promptTemplate: "模板 A",
              severity: "medium",
              updatedAtLabel: "2026-04-13 10:00",
            },
            {
              category: "商业化",
              description: "检查付费路径",
              enabled: false,
              id: "2",
              name: "商业闭环",
              promptTemplate: "模板 B",
              severity: "high",
              updatedAtLabel: "2026-04-13 11:00",
            },
          ]}
        />,
      );

      await user.click(screen.getByRole("button", { name: "编辑 目标清晰度" }));

      const overlay = screen.getByRole("dialog", { name: "规则编辑" });
      const descriptionField = screen.getByLabelText("规则说明");

      expect(overlay).toHaveAttribute("data-overlay-mode", "drawer");

      await user.type(descriptionField, " - 已修改");
      expect(descriptionField).toHaveValue("检查目标表达是否清楚 - 已修改");

      window.innerWidth = 1024;
      window.innerHeight = 720;
      fireEvent(window, new Event("resize"));

      await waitFor(() => {
        expect(screen.getByRole("dialog", { name: "规则编辑" })).toHaveAttribute(
          "data-overlay-mode",
          "dialog",
        );
      });

      expect(screen.getByLabelText("规则说明")).toHaveValue("检查目标表达是否清楚 - 已修改");
      expect(screen.getByRole("button", { name: "保存修改" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "取消" })).toBeInTheDocument();
    } finally {
      window.innerWidth = originalInnerWidth;
      window.innerHeight = originalInnerHeight;
    }
  });
});
