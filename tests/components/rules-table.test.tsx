import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RulesTable } from "@/components/rules-table";
import { RULE_TEMPLATE } from "@/lib/defaults";

let originalShowModalDescriptor: PropertyDescriptor | undefined;
let originalCloseDescriptor: PropertyDescriptor | undefined;

function createRule(overrides: Partial<Parameters<typeof RulesTable>[0]["items"][number]> = {}) {
  return {
    category: "基础质量",
    description: "检查目标表达是否清楚",
    enabled: true,
    id: "1",
    name: "目标清晰度",
    promptTemplate: "模板 A",
    severity: "medium" as const,
    updatedAtLabel: "2026-04-13 10:00",
    ...overrides,
  };
}

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
      getReviewLaunchData: vi.fn(),
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
      deleteRule: vi.fn(),
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
    expect(screen.getByRole("button", { name: "更多筛选" })).toHaveClass("icon-button");
    expect(screen.getByRole("searchbox", { name: "搜索规则" })).toHaveAttribute(
      "placeholder",
      "搜索规则名称、分类、说明和严重级别",
    );
    expect(screen.queryByText("支持按规则名称、分类、说明和严重级别筛选。")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增规则" }).closest(".table-toolbar-primary-actions")).toHaveClass(
      "table-toolbar-primary-actions",
    );
    expect(screen.getByRole("button", { name: "更多筛选" }).closest(".table-toolbar-primary-actions")).toHaveClass(
      "table-toolbar-primary-actions",
    );
  });

  it("hides deleted rows by default", () => {
    render(
      <RulesTable
        items={[
          createRule(),
          createRule({
            enabled: false,
            id: "2",
            isDeleted: true,
            name: "历史规则",
          }),
        ]}
      />,
    );

    expect(screen.getByText("目标清晰度")).toBeInTheDocument();
    expect(screen.queryByText("历史规则")).not.toBeInTheDocument();
  });

  it("keeps ranked search results stable for name-priority matches", async () => {
    const user = userEvent.setup();

    render(
      <RulesTable
        items={[
          createRule({
            id: "1",
            name: "风险总览",
            description: "这里提到目标但不是规则名称重点",
          }),
          createRule({
            id: "2",
            name: "目标清晰度",
            description: "检查目标表达是否清楚",
          }),
        ]}
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: "搜索规则" }), "目标");

    expect(screen.getAllByRole("row")[1]).toHaveTextContent("目标清晰度");
  });

  it("reloads dashboard with includeDeleted toggle and reflects deleted rows", async () => {
    const user = userEvent.setup();
    const activeRule = createRule();
    const deletedRule = createRule({
      enabled: false,
      id: "2",
      isDeleted: true,
      name: "历史规则",
    });
    const getRuleDashboardMock = vi.fn().mockImplementation(
      async (query?: { includeDeleted?: boolean }) => ({
        enabledCount: 1,
        categoryCount: 1,
        latestUpdatedAtLabel: "2026-04-13 11:00",
        items: query?.includeDeleted ? [activeRule, deletedRule] : [activeRule],
        totalCount: query?.includeDeleted ? 2 : 1,
      }),
    );

    window.plreview.getRuleDashboard = getRuleDashboardMock;

    render(<RulesTable items={[activeRule]} />);

    await user.type(screen.getByRole("searchbox", { name: "搜索规则" }), "历史");
    expect(screen.queryByText("历史规则")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "更多筛选" }));
    await user.click(screen.getByRole("checkbox", { name: "显示已删除" }));

    await waitFor(() => {
      expect(getRuleDashboardMock).toHaveBeenCalledWith({ includeDeleted: true });
    });
    expect(screen.getByText("历史规则")).toBeInTheDocument();
    expect(screen.getAllByText("已删除").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "编辑 历史规则" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "显示已删除" }));

    await waitFor(() => {
      expect(getRuleDashboardMock).toHaveBeenCalledWith({ includeDeleted: false });
    });
    expect(screen.queryByText("历史规则")).not.toBeInTheDocument();
  });

  it("opens a confirmation dialog before deleting a rule", async () => {
    const user = userEvent.setup();

    render(<RulesTable items={[createRule()]} />);

    await user.click(screen.getByRole("button", { name: "删除 目标清晰度" }));

    expect(window.plreview.deleteRule).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "删除规则" })).toBeInTheDocument();
  });

  it("calls deleteRule without rendering delete success feedback after confirmation", async () => {
    const user = userEvent.setup();
    const deleteRuleMock = vi.fn().mockResolvedValue({ mode: "soft" as const });
    const getRuleDashboardMock = vi.fn().mockResolvedValue({
      enabledCount: 0,
      categoryCount: 1,
      latestUpdatedAtLabel: "2026-04-13 11:00",
      items: [
        createRule({
          enabled: false,
          id: "1",
          isDeleted: true,
        }),
      ],
      totalCount: 1,
    });

    window.plreview.deleteRule = deleteRuleMock;
    window.plreview.getRuleDashboard = getRuleDashboardMock;

    render(<RulesTable items={[createRule()]} />);

    await user.click(screen.getByRole("button", { name: "删除 目标清晰度" }));
    await user.click(screen.getByRole("button", { name: "仍要删除" }));

    await waitFor(() => {
      expect(deleteRuleMock).toHaveBeenCalledWith("1");
    });
    await waitFor(() => {
      expect(getRuleDashboardMock).toHaveBeenCalled();
    });

    expect(screen.queryByText(/规则已删除/)).not.toBeInTheDocument();
  });

  it("closes confirm dialog and shows refresh failure feedback when delete succeeds but refresh fails", async () => {
    const user = userEvent.setup();
    const deleteRuleMock = vi.fn().mockResolvedValue({ mode: "soft" as const });
    const getRuleDashboardMock = vi.fn().mockRejectedValue(new Error("刷新失败"));

    window.plreview.deleteRule = deleteRuleMock;
    window.plreview.getRuleDashboard = getRuleDashboardMock;

    render(<RulesTable items={[createRule()]} />);

    await user.click(screen.getByRole("button", { name: "删除 目标清晰度" }));
    await user.click(screen.getByRole("button", { name: "仍要删除" }));

    await waitFor(() => {
      expect(deleteRuleMock).toHaveBeenCalledWith("1");
    });
    await waitFor(() => {
      expect(getRuleDashboardMock).toHaveBeenCalledWith({ includeDeleted: false });
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "删除规则" })).not.toBeInTheDocument();
    });
    expect(screen.getByText("规则列表刷新失败：刷新失败")).toBeInTheDocument();
  });

  it("reverts deleted toggle state when reload fails", async () => {
    const user = userEvent.setup();
    const activeRule = createRule();
    const getRuleDashboardMock = vi.fn().mockRejectedValue(new Error("筛选刷新失败"));

    window.plreview.getRuleDashboard = getRuleDashboardMock;

    render(<RulesTable items={[activeRule]} />);

    await user.click(screen.getByRole("button", { name: "更多筛选" }));
    const showDeletedCheckbox = screen.getByRole("checkbox", { name: "显示已删除" });

    expect(showDeletedCheckbox).not.toBeChecked();

    await user.click(showDeletedCheckbox);

    await waitFor(() => {
      expect(getRuleDashboardMock).toHaveBeenCalledWith({ includeDeleted: true });
    });
    await waitFor(() => {
      expect(showDeletedCheckbox).not.toBeChecked();
    });
    expect(screen.getByText("筛选刷新失败")).toBeInTheDocument();
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

  it("prioritizes stronger rule-name matches when filtering", async () => {
    const user = userEvent.setup();

    render(
      <RulesTable
        items={[
          {
            category: "执行保障",
            description: "覆盖风险沟通与执行跟踪",
            enabled: true,
            id: "1",
            name: "流程校验",
            promptTemplate: RULE_TEMPLATE,
            severity: "medium",
            updatedAtLabel: "2026-04-13 10:00",
          },
          {
            category: "风险治理",
            description: "识别潜在风险并建立应对方案",
            enabled: true,
            id: "2",
            name: "风险识别",
            promptTemplate: RULE_TEMPLATE,
            severity: "high",
            updatedAtLabel: "2026-04-13 11:00",
          },
        ]}
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: "搜索规则" }), "风险");

    const rows = screen.getAllByRole("row");

    expect(rows[1]).toHaveTextContent("风险识别");
    expect(rows[2]).toHaveTextContent("流程校验");
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

  it("keeps the create rule overlay open when a save is busy and a header close is attempted", async () => {
    const user = userEvent.setup();
    let rejectSave: ((reason?: unknown) => void) | undefined;
    window.plreview.saveRule = vi.fn(
      () =>
        new Promise((_, reject) => {
          rejectSave = reject;
        }),
    );

    render(<RulesTable items={[]} />);

    await user.click(screen.getByRole("button", { name: "新增规则" }));
    await user.type(screen.getByLabelText("规则名称"), "忙碌中的规则");
    await user.type(screen.getByLabelText("分类"), "保存中");
    await user.type(screen.getByLabelText("规则说明"), "请求未返回前不能关闭");

    await user.click(screen.getByRole("button", { name: "保存规则" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "保存中..." })).toBeDisabled();
    });

    await user.click(screen.getByRole("button", { name: "Close overlay" }));

    expect(screen.getByRole("dialog", { name: "新增规则" })).toBeInTheDocument();
    expect(screen.getByLabelText("规则名称")).toHaveValue("忙碌中的规则");

    rejectSave?.(new Error("保存失败"));

    expect(await screen.findByText("保存失败")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "新增规则" })).toBeInTheDocument();
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
