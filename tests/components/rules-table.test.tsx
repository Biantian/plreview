import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RulesTable } from "@/components/rules-table";
import { RULE_TEMPLATE } from "@/lib/defaults";

let originalShowModalDescriptor: PropertyDescriptor | undefined;
let originalCloseDescriptor: PropertyDescriptor | undefined;

describe("RulesTable", () => {
  beforeEach(() => {
    originalShowModalDescriptor = Object.getOwnPropertyDescriptor(
      HTMLDialogElement.prototype,
      "showModal",
    );
    originalCloseDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");

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

  afterEach(() => {
    Object.defineProperty(
      HTMLDialogElement.prototype,
      "showModal",
      originalShowModalDescriptor ?? {
        configurable: true,
        value: undefined,
      },
    );
    Object.defineProperty(
      HTMLDialogElement.prototype,
      "close",
      originalCloseDescriptor ?? {
        configurable: true,
        value: undefined,
      },
    );
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

  it("submits saveRule through the footer button and preserves the expected payload", async () => {
    const user = userEvent.setup();
    const saveRuleMock = vi.fn().mockResolvedValue({
      enabledCount: 1,
      categoryCount: 2,
      latestUpdatedAtLabel: "2026-04-13 11:00",
      items: [],
      totalCount: 2,
    });

    window.plreview.saveRule = saveRuleMock;

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
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "编辑 目标清晰度" }));
    await user.type(screen.getByLabelText("规则说明"), " - 已调整");

    const saveButton = screen.getByRole("button", { name: "保存修改" });
    expect(saveButton).toHaveAttribute("form", "rule-editor-form");

    await user.click(saveButton);

    await waitFor(() => {
      expect(saveRuleMock).toHaveBeenCalledWith({
        id: "1",
        name: "目标清晰度",
        category: "基础质量",
        description: "检查目标表达是否清楚 - 已调整",
        promptTemplate: "模板 A",
        severity: "medium",
        enabled: true,
      });
    });
  });

  it("uses centered dialog mode on large screens and keeps typed values on resize", async () => {
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

      expect(overlay).toHaveAttribute("data-overlay-mode", "dialog");

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

  it("keeps unsaved create rule values after closing and reopening", async () => {
    const user = userEvent.setup();

    render(<RulesTable items={[]} />);

    await user.click(screen.getByRole("button", { name: "新增规则" }));
    await user.type(screen.getByLabelText("规则名称"), "新增草稿规则");
    await user.type(screen.getByLabelText("分类"), "体验");
    await user.type(screen.getByLabelText("规则说明"), "不要在关闭后消失");

    await user.click(screen.getByRole("button", { name: "取消" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "新增规则" })).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "新增规则" }));

    expect(screen.getByLabelText("规则名称")).toHaveValue("新增草稿规则");
    expect(screen.getByLabelText("分类")).toHaveValue("体验");
    expect(screen.getByLabelText("规则说明")).toHaveValue("不要在关闭后消失");
  });

  it("keeps the create rule draft after header close dismissal", async () => {
    const user = userEvent.setup();

    render(<RulesTable items={[]} />);

    await user.click(screen.getByRole("button", { name: "新增规则" }));
    await user.type(screen.getByLabelText("规则名称"), "关闭按钮规则草稿");
    await user.type(screen.getByLabelText("分类"), "关闭按钮");
    await user.type(screen.getByLabelText("规则说明"), "头部关闭后也要保留");

    await user.click(screen.getByRole("button", { name: "Close overlay" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "新增规则" })).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "新增规则" }));

    expect(screen.getByLabelText("规则名称")).toHaveValue("关闭按钮规则草稿");
    expect(screen.getByLabelText("分类")).toHaveValue("关闭按钮");
    expect(screen.getByLabelText("规则说明")).toHaveValue("头部关闭后也要保留");
  });

  it("keeps the create rule draft after Escape dismissal and clears stale feedback on reopen", async () => {
    const user = userEvent.setup();
    window.plreview.saveRule = vi.fn().mockRejectedValue(new Error("保存失败"));

    render(<RulesTable items={[]} />);

    await user.click(screen.getByRole("button", { name: "新增规则" }));
    await user.type(screen.getByLabelText("规则名称"), "Esc 保留");
    await user.type(screen.getByLabelText("分类"), "键盘");
    await user.type(screen.getByLabelText("规则说明"), "关闭后继续保留");
    await user.click(screen.getByRole("button", { name: "保存规则" }));

    expect(await screen.findByText("保存失败")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("dialog", { name: "新增规则" }), { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "新增规则" })).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "新增规则" }));

    expect(screen.getByLabelText("规则名称")).toHaveValue("Esc 保留");
    expect(screen.getByLabelText("分类")).toHaveValue("键盘");
    expect(screen.getByLabelText("规则说明")).toHaveValue("关闭后继续保留");
    expect(screen.queryByText("保存失败")).not.toBeInTheDocument();
  });

  it("clears the create rule draft only when the user clicks clear", async () => {
    const user = userEvent.setup();

    render(<RulesTable items={[]} />);

    await user.click(screen.getByRole("button", { name: "新增规则" }));
    await user.type(screen.getByLabelText("规则名称"), "待清空规则");
    await user.type(screen.getByLabelText("分类"), "草稿");
    await user.clear(screen.getByLabelText("评审模板"));
    await user.type(screen.getByLabelText("评审模板"), "临时模板");

    await user.click(screen.getByRole("button", { name: "清空" }));

    expect(screen.getByLabelText("规则名称")).toHaveValue("");
    expect(screen.getByLabelText("分类")).toHaveValue("");
    expect(screen.getByLabelText("规则说明")).toHaveValue("");
    expect(screen.getByLabelText("评审模板")).toHaveValue(RULE_TEMPLATE);
    expect(screen.getByLabelText("默认严重级别")).toHaveValue("medium");
    expect(screen.getByLabelText("保存后立即启用")).toBeChecked();
  });

  it("clears stale create feedback when the user clears the rule draft", async () => {
    const user = userEvent.setup();
    window.plreview.saveRule = vi.fn().mockRejectedValue(new Error("保存失败"));

    render(<RulesTable items={[]} />);

    await user.click(screen.getByRole("button", { name: "新增规则" }));
    await user.type(screen.getByLabelText("规则名称"), "待清空错误");
    await user.type(screen.getByLabelText("分类"), "错误");
    await user.type(screen.getByLabelText("规则说明"), "清空时不应保留错误");
    await user.click(screen.getByRole("button", { name: "保存规则" }));

    expect(await screen.findByText("保存失败")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "清空" }));

    expect(screen.queryByText("保存失败")).not.toBeInTheDocument();
    expect(screen.getByLabelText("规则名称")).toHaveValue("");
    expect(screen.getByLabelText("分类")).toHaveValue("");
    expect(screen.getByLabelText("规则说明")).toHaveValue("");
  });

  it("clears the create rule draft after a successful create save", async () => {
    const user = userEvent.setup();
    const saveRuleMock = vi.fn().mockResolvedValue({
      enabledCount: 1,
      categoryCount: 1,
      latestUpdatedAtLabel: "2026-04-24 12:00",
      items: [],
      totalCount: 1,
    });

    window.plreview.saveRule = saveRuleMock;

    render(<RulesTable items={[]} />);

    await user.click(screen.getByRole("button", { name: "新增规则" }));
    await user.type(screen.getByLabelText("规则名称"), "保存后清空");
    await user.type(screen.getByLabelText("分类"), "规则");
    await user.type(screen.getByLabelText("规则说明"), "保存成功后不应留在下一次新增");

    await user.click(screen.getByRole("button", { name: "保存规则" }));

    await waitFor(() => {
      expect(saveRuleMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: undefined,
          name: "保存后清空",
          category: "规则",
          description: "保存成功后不应留在下一次新增",
        }),
      );
    });

    await user.click(screen.getByRole("button", { name: "新增规则" }));

    expect(screen.getByLabelText("规则名称")).toHaveValue("");
    expect(screen.getByLabelText("分类")).toHaveValue("");
    expect(screen.getByLabelText("规则说明")).toHaveValue("");
    expect(screen.queryByText("规则已创建。")).not.toBeInTheDocument();
  });

  it("keeps the create rule draft when create save fails", async () => {
    const user = userEvent.setup();
    window.plreview.saveRule = vi.fn().mockRejectedValue(new Error("保存失败"));

    render(<RulesTable items={[]} />);

    await user.click(screen.getByRole("button", { name: "新增规则" }));
    await user.type(screen.getByLabelText("规则名称"), "失败保留");
    await user.type(screen.getByLabelText("分类"), "错误");
    await user.type(screen.getByLabelText("规则说明"), "失败后还在");

    await user.click(screen.getByRole("button", { name: "保存规则" }));

    expect(await screen.findByText("保存失败")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "新增规则" })).toBeInTheDocument();
    expect(screen.getByLabelText("规则名称")).toHaveValue("失败保留");
    expect(screen.getByLabelText("分类")).toHaveValue("错误");
    expect(screen.getByLabelText("规则说明")).toHaveValue("失败后还在");
  });
});
