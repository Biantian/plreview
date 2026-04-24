import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ModelManager } from "@/components/model-manager";

describe("ModelManager", () => {
  const profiles = [
    {
      id: "profile_1",
      name: "百炼生产",
      provider: "DashScope",
      vendorKey: "openai_compatible",
      mode: "live" as const,
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      defaultModel: "qwen-plus",
      modelOptionsText: "qwen-plus\nqwen-max",
      enabled: true,
      hasApiKey: true,
      apiKeyLast4: "abcd",
    },
    {
      id: "profile_2",
      name: "演示配置",
      provider: "Demo",
      vendorKey: "openai_compatible",
      mode: "demo" as const,
      baseUrl: "https://demo.invalid/v1",
      defaultModel: "mock-model",
      modelOptionsText: "mock-model",
      enabled: false,
      hasApiKey: false,
      apiKeyLast4: null,
    },
  ];

  beforeEach(() => {
    window.plreview = {
      pickFiles: vi.fn(),
      getHomeDashboard: vi.fn(),
      getModelDashboard: vi.fn().mockResolvedValue({
        metrics: {
          totalCount: profiles.length,
          enabledCount: 1,
          liveCount: 1,
          latestUpdatedAtLabel: "2026-04-15 16:00",
        },
        profiles,
      }),
      getRuleDashboard: vi.fn(),
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
      saveRule: vi.fn(),
      toggleRuleEnabled: vi.fn(),
      saveModelProfile: vi.fn().mockResolvedValue({
        metrics: {
          totalCount: profiles.length + 1,
          enabledCount: 2,
          liveCount: 2,
          latestUpdatedAtLabel: "2026-04-15 16:00",
        },
        profiles,
      }),
      toggleModelProfileEnabled: vi.fn().mockResolvedValue({
        metrics: {
          totalCount: profiles.length,
          enabledCount: 1,
          liveCount: 1,
          latestUpdatedAtLabel: "2026-04-15 16:00",
        },
        profiles,
      }),
      deleteModelProfile: vi.fn().mockResolvedValue({
        metrics: {
          totalCount: 1,
          enabledCount: 1,
          liveCount: 1,
          latestUpdatedAtLabel: "2026-04-15 16:00",
        },
        profiles: [profiles[0]],
      }),
      getRuntimeStatus: vi.fn(),
      subscribeRuntimeStatus: vi.fn(),
    };
  });

  it("renders the desktop model shell with toolbar summary", () => {
    render(<ModelManager profiles={profiles} />);

    expect(screen.getByText("模型配置矩阵")).toBeInTheDocument();
    expect(screen.getByText("共 2 条配置 · 当前显示 2 条")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "模型表格" }).closest(".desktop-table-card")).toBeTruthy();
    expect(screen.getByRole("table", { name: "模型表格" }).closest(".management-table-scroll-region")).toBeTruthy();
    expect(screen.getByRole("button", { name: "编辑 百炼生产" })).toHaveClass("table-text-button");
    expect(screen.getByRole("button", { name: "停用" })).toHaveClass("table-text-button");
    expect(screen.getAllByRole("button", { name: "删除" })[0]).toHaveClass("table-text-button");
  });

  it("filters rows and opens the drawer for editing", async () => {
    const user = userEvent.setup();

    render(<ModelManager profiles={profiles} />);

    await user.type(screen.getByRole("searchbox", { name: "搜索模型" }), "演示");
    await user.click(screen.getByRole("button", { name: "编辑 演示配置" }));

    expect(screen.getByText("演示配置")).toBeInTheDocument();
    expect(screen.queryByText("百炼生产")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "模型编辑" })).toBeInTheDocument();
  });

  it("opens the create drawer from the toolbar", async () => {
    const user = userEvent.setup();

    render(<ModelManager profiles={[]} />);

    await user.click(screen.getByRole("button", { name: "新增模型" }));

    expect(screen.getByRole("dialog", { name: "新增模型配置" })).toBeInTheDocument();
    expect(screen.getByText("新增模型配置")).toBeInTheDocument();
  });

  it("uses centered dialog mode and keeps typed values on resize", async () => {
    const user = userEvent.setup();
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;

    try {
      window.innerWidth = 1440;
      window.innerHeight = 900;

      render(<ModelManager profiles={[]} />);

      await user.click(screen.getByRole("button", { name: "新增模型" }));

      const overlay = screen.getByRole("dialog", { name: "新增模型配置" });
      const nameField = screen.getByLabelText("配置名称");

      expect(overlay).toHaveAttribute("data-overlay-mode", "dialog");

      await user.type(nameField, "测试模型");

      window.innerWidth = 1024;
      window.innerHeight = 720;
      fireEvent(window, new Event("resize"));

      await waitFor(() => {
        expect(screen.getByRole("dialog", { name: "新增模型配置" })).toHaveAttribute(
          "data-overlay-mode",
          "dialog",
        );
      });

      expect(screen.getByLabelText("配置名称")).toHaveValue("测试模型");
      expect(screen.getByRole("button", { name: "保存配置" })).toBeInTheDocument();
    } finally {
      window.innerWidth = originalInnerWidth;
      window.innerHeight = originalInnerHeight;
    }
  });

  it("submits create payload from the footer button outside the form", async () => {
    const user = userEvent.setup();

    render(<ModelManager profiles={[]} />);

    await user.click(screen.getByRole("button", { name: "新增模型" }));
    await user.type(screen.getByLabelText("配置名称"), "新模型");
    await user.type(screen.getByLabelText("供应商显示名"), "OpenAI Compatible");
    await user.type(screen.getByLabelText("默认模型"), "qwen-plus");
    await user.type(screen.getByLabelText("Base URL"), "https://example.com/v1");
    await user.type(screen.getByLabelText("常用模型"), "qwen-plus");

    await user.click(screen.getByRole("button", { name: "保存配置" }));

    await waitFor(() => {
      expect(window.plreview.saveModelProfile).toHaveBeenCalledWith({
        id: undefined,
        name: "新模型",
        provider: "OpenAI Compatible",
        vendorKey: "openai_compatible",
        mode: "live",
        baseUrl: "https://example.com/v1",
        defaultModel: "qwen-plus",
        modelOptionsText: "qwen-plus",
        apiKey: "",
        enabled: true,
      });
    });
  });

  it("keeps unsaved create model values after closing and reopening", async () => {
    const user = userEvent.setup();

    render(<ModelManager profiles={[]} />);

    await user.click(screen.getByRole("button", { name: "新增模型" }));
    await user.type(screen.getByLabelText("配置名称"), "新增模型草稿");
    await user.type(screen.getByLabelText("供应商显示名"), "OpenAI Compatible");
    await user.type(screen.getByLabelText("默认模型"), "qwen-plus");
    await user.type(screen.getByLabelText("Base URL"), "https://example.com/v1");
    await user.type(screen.getByLabelText("API Key"), "sk-draft");

    await user.click(screen.getByRole("button", { name: "取消" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "新增模型配置" })).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "新增模型" }));

    expect(screen.getByLabelText("配置名称")).toHaveValue("新增模型草稿");
    expect(screen.getByLabelText("供应商显示名")).toHaveValue("OpenAI Compatible");
    expect(screen.getByLabelText("默认模型")).toHaveValue("qwen-plus");
    expect(screen.getByLabelText("Base URL")).toHaveValue("https://example.com/v1");
    expect(screen.getByLabelText("API Key")).toHaveValue("sk-draft");
  });

  it("keeps the create model draft after header close dismissal", async () => {
    const user = userEvent.setup();

    render(<ModelManager profiles={[]} />);

    await user.click(screen.getByRole("button", { name: "新增模型" }));
    await user.type(screen.getByLabelText("配置名称"), "关闭按钮模型草稿");
    await user.type(screen.getByLabelText("供应商显示名"), "Header Close Provider");
    await user.type(screen.getByLabelText("默认模型"), "header-close-model");
    await user.type(screen.getByLabelText("Base URL"), "https://example.com/header-close");
    await user.type(screen.getByLabelText("API Key"), "sk-header-close");

    await user.click(screen.getByRole("button", { name: "Close overlay" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "新增模型配置" })).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "新增模型" }));

    expect(screen.getByLabelText("配置名称")).toHaveValue("关闭按钮模型草稿");
    expect(screen.getByLabelText("供应商显示名")).toHaveValue("Header Close Provider");
    expect(screen.getByLabelText("默认模型")).toHaveValue("header-close-model");
    expect(screen.getByLabelText("Base URL")).toHaveValue("https://example.com/header-close");
    expect(screen.getByLabelText("API Key")).toHaveValue("sk-header-close");
  });

  it("resets edit form values when switching to another model profile", async () => {
    const user = userEvent.setup();

    render(<ModelManager profiles={profiles} />);

    await user.click(screen.getByRole("button", { name: "编辑 百炼生产" }));
    await user.clear(screen.getByLabelText("配置名称"));
    await user.type(screen.getByLabelText("配置名称"), "临时修改的模型");
    await user.selectOptions(screen.getByLabelText("运行模式"), "demo");
    await user.click(screen.getByLabelText("保存后立即启用"));
    await user.click(screen.getByRole("button", { name: "编辑 演示配置" }));

    expect(screen.getByLabelText("配置名称")).toHaveValue("演示配置");
    expect(screen.getByLabelText("供应商显示名")).toHaveValue("Demo");
    expect(screen.getByLabelText("运行模式")).toHaveValue("demo");
    expect(screen.getByLabelText("默认模型")).toHaveValue("mock-model");
    expect(screen.getByLabelText("保存后立即启用")).not.toBeChecked();
  });

  it("keeps the create model draft after Escape dismissal and clears stale feedback on reopen", async () => {
    const user = userEvent.setup();
    window.plreview.saveModelProfile = vi.fn().mockRejectedValue(new Error("模型保存失败"));

    render(<ModelManager profiles={[]} />);

    await user.click(screen.getByRole("button", { name: "新增模型" }));
    await user.type(screen.getByLabelText("配置名称"), "Esc 模型草稿");
    await user.type(screen.getByLabelText("供应商显示名"), "Provider");
    await user.type(screen.getByLabelText("默认模型"), "model-a");
    await user.type(screen.getByLabelText("Base URL"), "https://example.com/v1");
    await user.type(screen.getByLabelText("API Key"), "sk-esc");
    await user.click(screen.getByRole("button", { name: "保存配置" }));

    expect(await screen.findByText("模型保存失败")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("dialog", { name: "新增模型配置" }), { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "新增模型配置" })).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "新增模型" }));

    expect(screen.getByLabelText("配置名称")).toHaveValue("Esc 模型草稿");
    expect(screen.getByLabelText("供应商显示名")).toHaveValue("Provider");
    expect(screen.getByLabelText("默认模型")).toHaveValue("model-a");
    expect(screen.getByLabelText("Base URL")).toHaveValue("https://example.com/v1");
    expect(screen.getByLabelText("API Key")).toHaveValue("sk-esc");
    expect(screen.queryByText("模型保存失败")).not.toBeInTheDocument();
  });

  it("keeps the create model overlay open when a save is busy and Escape is pressed", async () => {
    const user = userEvent.setup();
    let resolveSave:
      | ((value: {
          metrics: {
            totalCount: number;
            enabledCount: number;
            liveCount: number;
            latestUpdatedAtLabel: string;
          };
          profiles: typeof profiles;
        }) => void)
      | undefined;
    window.plreview.saveModelProfile = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );

    render(<ModelManager profiles={[]} />);

    await user.click(screen.getByRole("button", { name: "新增模型" }));
    await user.type(screen.getByLabelText("配置名称"), "忙碌模型");
    await user.type(screen.getByLabelText("供应商显示名"), "Provider");
    await user.type(screen.getByLabelText("默认模型"), "busy-model");
    await user.type(screen.getByLabelText("Base URL"), "https://example.com/busy");

    await user.click(screen.getByRole("button", { name: "保存配置" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "保存中..." })).toBeDisabled();
    });

    fireEvent.keyDown(screen.getByRole("dialog", { name: "新增模型配置" }), { key: "Escape" });

    expect(screen.getByRole("dialog", { name: "新增模型配置" })).toBeInTheDocument();
    expect(screen.getByLabelText("配置名称")).toHaveValue("忙碌模型");

    resolveSave?.({
      metrics: {
        totalCount: profiles.length + 1,
        enabledCount: 2,
        liveCount: 2,
        latestUpdatedAtLabel: "2026-04-15 16:00",
      },
      profiles,
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "新增模型配置" })).not.toBeInTheDocument();
    });
  });

  it("clears the create model draft only when the user clicks clear", async () => {
    const user = userEvent.setup();

    render(<ModelManager profiles={[]} />);

    await user.click(screen.getByRole("button", { name: "新增模型" }));
    await user.type(screen.getByLabelText("配置名称"), "待清空模型");
    await user.type(screen.getByLabelText("供应商显示名"), "Provider");
    await user.type(screen.getByLabelText("默认模型"), "model-a");
    await user.type(screen.getByLabelText("Base URL"), "https://example.com/v1");
    await user.type(screen.getByLabelText("API Key"), "sk-clear");

    await user.click(screen.getByRole("button", { name: "清空" }));

    expect(screen.getByLabelText("配置名称")).toHaveValue("");
    expect(screen.getByLabelText("供应商显示名")).toHaveValue("");
    expect(screen.getByLabelText("运行模式")).toHaveValue("live");
    expect(screen.getByLabelText("默认模型")).toHaveValue("");
    expect(screen.getByLabelText("Base URL")).toHaveValue("");
    expect(screen.getByLabelText("常用模型")).toHaveValue("");
    expect(screen.getByLabelText("API Key")).toHaveValue("");
    expect(screen.getByLabelText("保存后立即启用")).toBeChecked();
  });

  it("clears stale create feedback when the user clears the model draft", async () => {
    const user = userEvent.setup();
    window.plreview.saveModelProfile = vi.fn().mockRejectedValue(new Error("模型保存失败"));

    render(<ModelManager profiles={[]} />);

    await user.click(screen.getByRole("button", { name: "新增模型" }));
    await user.type(screen.getByLabelText("配置名称"), "待清空模型错误");
    await user.type(screen.getByLabelText("供应商显示名"), "Provider");
    await user.type(screen.getByLabelText("默认模型"), "model-a");
    await user.type(screen.getByLabelText("Base URL"), "https://example.com/v1");
    await user.type(screen.getByLabelText("API Key"), "sk-clear-error");
    await user.click(screen.getByRole("button", { name: "保存配置" }));

    expect(await screen.findByText("模型保存失败")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "清空" }));

    expect(screen.queryByText("模型保存失败")).not.toBeInTheDocument();
    expect(screen.getByLabelText("配置名称")).toHaveValue("");
    expect(screen.getByLabelText("供应商显示名")).toHaveValue("");
    expect(screen.getByLabelText("默认模型")).toHaveValue("");
    expect(screen.getByLabelText("Base URL")).toHaveValue("");
    expect(screen.getByLabelText("API Key")).toHaveValue("");
  });

  it("clears the create model draft after a successful create save", async () => {
    const user = userEvent.setup();

    render(<ModelManager profiles={[]} />);

    await user.click(screen.getByRole("button", { name: "新增模型" }));
    await user.type(screen.getByLabelText("配置名称"), "保存后清空模型");
    await user.type(screen.getByLabelText("供应商显示名"), "OpenAI Compatible");
    await user.type(screen.getByLabelText("默认模型"), "qwen-plus");
    await user.type(screen.getByLabelText("Base URL"), "https://example.com/v1");
    await user.type(screen.getByLabelText("API Key"), "sk-created");

    await user.click(screen.getByRole("button", { name: "保存配置" }));

    await waitFor(() => {
      expect(window.plreview.saveModelProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          id: undefined,
          name: "保存后清空模型",
          provider: "OpenAI Compatible",
          defaultModel: "qwen-plus",
          baseUrl: "https://example.com/v1",
          apiKey: "sk-created",
        }),
      );
    });

    await user.click(screen.getByRole("button", { name: "新增模型" }));

    expect(screen.getByLabelText("配置名称")).toHaveValue("");
    expect(screen.getByLabelText("供应商显示名")).toHaveValue("");
    expect(screen.getByLabelText("默认模型")).toHaveValue("");
    expect(screen.getByLabelText("Base URL")).toHaveValue("");
    expect(screen.getByLabelText("API Key")).toHaveValue("");
    expect(screen.queryByText("模型配置已创建。")).not.toBeInTheDocument();
  });

  it("keeps the create model draft when create save fails", async () => {
    const user = userEvent.setup();
    window.plreview.saveModelProfile = vi.fn().mockRejectedValue(new Error("模型保存失败"));

    render(<ModelManager profiles={[]} />);

    await user.click(screen.getByRole("button", { name: "新增模型" }));
    await user.type(screen.getByLabelText("配置名称"), "失败模型");
    await user.type(screen.getByLabelText("供应商显示名"), "Provider");
    await user.type(screen.getByLabelText("默认模型"), "model-a");
    await user.type(screen.getByLabelText("Base URL"), "https://example.com/v1");
    await user.type(screen.getByLabelText("API Key"), "sk-failed");

    await user.click(screen.getByRole("button", { name: "保存配置" }));

    expect(await screen.findByText("模型保存失败")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "新增模型配置" })).toBeInTheDocument();
    expect(screen.getByLabelText("配置名称")).toHaveValue("失败模型");
    expect(screen.getByLabelText("供应商显示名")).toHaveValue("Provider");
    expect(screen.getByLabelText("API Key")).toHaveValue("sk-failed");
  });
});
