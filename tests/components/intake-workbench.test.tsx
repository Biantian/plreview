import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IntakeWorkbench } from "@/components/intake-workbench";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

const defaultProfiles = [
  { defaultModel: "qwen-plus", id: "profile-1", name: "Default", provider: "openai" },
];

const defaultRules = [
  { category: "内容", description: "保持表达统一", id: "rule-1", name: "Tone" },
];

describe("IntakeWorkbench", () => {
  beforeEach(() => {
    push.mockReset();
    window.plreview = {
      pickFiles: vi.fn().mockResolvedValue([]),
      listReviewJobs: vi.fn(),
      searchReviewJobs: vi.fn(),
      listRules: vi.fn(),
      searchRules: vi.fn(),
      createReviewBatch: vi.fn().mockResolvedValue({ id: "batch_1" }),
    };
  });

  it("shows a desktop-only blocker instead of browser file input when the bridge is unavailable", () => {
    // @ts-expect-error test-only partial desktop api
    window.plreview.pickFiles = undefined;

    render(<IntakeWorkbench llmProfiles={defaultProfiles} rules={defaultRules} />);

    expect(screen.getByText("请在桌面应用中启动后再导入本地文件。")).toBeInTheDocument();
    expect(screen.queryByLabelText("选择待导入文件")).not.toBeInTheDocument();
    expect(screen.queryByText(/浏览器回退入口/)).not.toBeInTheDocument();
  });

  it("renders imported files as table rows", () => {
    render(
      <IntakeWorkbench
        importedFiles={[
          {
            id: "file-1",
            documentId: "file-1",
            fileType: "docx",
            name: "brand-guidelines.docx",
            status: "已导入",
          },
          {
            id: "file-2",
            documentId: "file-2",
            fileType: "md",
            name: "launch-plan.md",
            note: "等待批量提交",
            status: "排队中",
          },
        ]}
        llmProfiles={defaultProfiles}
        rules={defaultRules}
      />,
    );

    expect(screen.getByRole("table", { name: "已导入文件" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "brand-guidelines.docx" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "launch-plan.md" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("updates the model name when the selected profile changes", async () => {
    const user = userEvent.setup();

    render(
      <IntakeWorkbench
        llmProfiles={[
          ...defaultProfiles,
          { defaultModel: "qwen-max", id: "profile-2", name: "Premium", provider: "openai" },
        ]}
        rules={defaultRules}
      />,
    );

    const profileSelect = screen.getByLabelText("模型配置");
    const modelNameInput = screen.getByLabelText("模型名称") as HTMLInputElement;

    expect(modelNameInput.value).toBe("qwen-plus");

    await user.selectOptions(profileSelect, "profile-2");

    expect(modelNameInput.value).toBe("qwen-max");
  });

  it("renders launch actions without the old split workbench copy", () => {
    render(<IntakeWorkbench llmProfiles={defaultProfiles} rules={defaultRules} />);

    expect(screen.getByRole("region", { name: "评审启动工作区" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "启动摘要" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "文件工作台" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "查看帮助" })).not.toBeInTheDocument();
  });

  it("renders a desktop launch workspace with main zones and a readiness rail", () => {
    render(<IntakeWorkbench llmProfiles={defaultProfiles} rules={defaultRules} />);

    const workspace = screen.getByRole("region", { name: "评审启动工作区" });
    const readinessRail = screen.getByRole("complementary", { name: "启动摘要" });

    expect(within(workspace).getByRole("heading", { level: 2, name: "批次配置" })).toBeInTheDocument();
    expect(within(workspace).getByRole("heading", { level: 2, name: "文件工作台" })).toBeInTheDocument();
    expect(within(workspace).getByRole("heading", { level: 3, name: "规则选择" })).toBeInTheDocument();
    expect(within(workspace).getByRole("heading", { level: 3, name: "文件导入" })).toBeInTheDocument();
    expect(within(workspace).getByRole("heading", { level: 3, name: "导入文件清单" })).toBeInTheDocument();
    expect(within(workspace).getByRole("heading", { level: 3, name: "启动批次" })).toBeInTheDocument();
    expect(within(workspace).getByRole("button", { name: "开始评审" })).toBeInTheDocument();
    expect(within(readinessRail).getByRole("heading", { name: "启动摘要" })).toBeInTheDocument();
    expect(within(readinessRail).queryByRole("button", { name: "开始评审" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "批量配置" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "提交" })).not.toBeInTheDocument();
  });

  it("keeps batch submission disabled until the required launch fields are complete", async () => {
    const user = userEvent.setup();

    render(
      <IntakeWorkbench
        importedFiles={[
          {
            id: "doc_1",
            documentId: "doc_1",
            name: "schedule.xlsx",
            fileType: "xlsx",
            status: "已导入",
          },
        ]}
        llmProfiles={defaultProfiles}
        rules={defaultRules}
      />,
    );

    const workspace = screen.getByRole("region", { name: "评审启动工作区" });
    const readinessRail = screen.getByRole("complementary", { name: "启动摘要" });
    const submitButton = within(workspace).getByRole("button", { name: "开始评审" });

    expect(submitButton).toBeDisabled();
    expect(within(readinessRail).getByText("待补全启动信息")).toBeInTheDocument();

    await user.type(screen.getByLabelText("批次名称"), "四月策划案");

    expect(submitButton).toBeEnabled();
    expect(within(readinessRail).getByText("可创建批次")).toBeInTheDocument();
  });

  it("shows desktop-oriented import counts instead of retry workflow counts", () => {
    render(
      <IntakeWorkbench
        importedFiles={[
          {
            id: "doc_1",
            documentId: "doc_1",
            name: "schedule.xlsx",
            fileType: "xlsx",
            status: "已导入",
            note: "标题：四月活动排期 · 1 个文档块",
          },
        ]}
        llmProfiles={defaultProfiles}
        rules={defaultRules}
      />,
    );

    const fileZone = screen.getByRole("heading", { level: 3, name: "文件导入" }).closest("section");

    expect(fileZone).not.toBeNull();
    expect(within(fileZone as HTMLElement).getByText("已导入 1 条")).toBeInTheDocument();
    expect(within(fileZone as HTMLElement).getByText("待评审 1 条")).toBeInTheDocument();
    expect(screen.queryByText(/可提交/)).not.toBeInTheDocument();
    expect(screen.queryByText(/待重新导入/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("状态筛选")).not.toBeInTheDocument();
  });

  it("keeps the imported files table in a dedicated full-width launch zone", () => {
    render(<IntakeWorkbench llmProfiles={defaultProfiles} rules={defaultRules} />);

    const table = screen.getByRole("table", { name: "已导入文件" });
    const fileBoard = screen.getByRole("heading", { level: 3, name: "导入文件清单" }).closest("section");
    const intakeZone = screen.getByRole("heading", { level: 3, name: "文件导入" }).closest("section");

    expect(fileBoard).not.toBeNull();
    expect(intakeZone).not.toBeNull();
    expect(table.closest("section")).toBe(fileBoard);
    expect(fileBoard).not.toBe(intakeZone);
  });

  it("removes a workbench row from the table", async () => {
    const user = userEvent.setup();

    render(
      <IntakeWorkbench
        importedFiles={[
          {
            id: "doc_1",
            documentId: "doc_1",
            name: "schedule.xlsx",
            fileType: "xlsx",
            status: "已导入",
            note: "标题：四月活动排期 · 1 个文档块",
            summary: {
              title: "四月活动排期",
              blockCount: 1,
              paragraphCount: 1,
              sourceLabel: "本地桌面导入",
            },
          },
        ]}
        llmProfiles={defaultProfiles}
        rules={defaultRules}
      />,
    );

    await user.click(screen.getByRole("button", { name: "移除 schedule.xlsx" }));

    expect(screen.queryByRole("rowheader", { name: "schedule.xlsx" })).not.toBeInTheDocument();
    expect(screen.getByText("尚未导入文件，文件解析结果会在这里逐行呈现。")).toBeInTheDocument();
  });

  it("clears all workbench rows in one action", async () => {
    const user = userEvent.setup();

    render(
      <IntakeWorkbench
        importedFiles={[
          {
            id: "doc_1",
            documentId: "doc_1",
            name: "schedule.xlsx",
            fileType: "xlsx",
            status: "已导入",
            note: "标题：四月活动排期 · 1 个文档块",
          },
          {
            id: "doc_2",
            documentId: "doc_2",
            name: "launch-plan.docx",
            fileType: "docx",
            status: "已导入",
            note: "标题：四月活动玩法 · 3 个文档块",
          },
        ]}
        llmProfiles={defaultProfiles}
        rules={defaultRules}
      />,
    );

    await user.click(screen.getByRole("button", { name: "清空工作台" }));

    expect(screen.queryByRole("rowheader", { name: "schedule.xlsx" })).not.toBeInTheDocument();
    expect(screen.queryByRole("rowheader", { name: "launch-plan.docx" })).not.toBeInTheDocument();
    expect(screen.getByText("尚未导入文件，文件解析结果会在这里逐行呈现。")).toBeInTheDocument();
  });

  it("opens a parse summary panel for a selected row", async () => {
    const user = userEvent.setup();

    render(
      <IntakeWorkbench
        importedFiles={[
          {
            id: "doc_1",
            documentId: "doc_1",
            name: "schedule.xlsx",
            fileType: "xlsx",
            status: "已导入",
            note: "标题：四月活动排期 · 1 个文档块",
            summary: {
              title: "四月活动排期",
              blockCount: 1,
              paragraphCount: 1,
              sourceLabel: "本地桌面导入",
            },
          },
        ]}
        llmProfiles={defaultProfiles}
        rules={defaultRules}
      />,
    );

    await user.click(screen.getByRole("button", { name: "查看摘要 schedule.xlsx" }));

    const summaryPanel = screen.getByRole("region", { name: "解析摘要面板" });

    expect(within(summaryPanel).getByRole("heading", { name: "解析摘要" })).toBeInTheDocument();
    expect(within(summaryPanel).getByText("schedule.xlsx")).toBeInTheDocument();
    expect(within(summaryPanel).getByText("标题：四月活动排期 · 1 个文档块")).toBeInTheDocument();
    expect(within(summaryPanel).getByText("四月活动排期")).toBeInTheDocument();
    expect(summaryPanel).toHaveTextContent("1 个文档块");
    expect(summaryPanel).toHaveTextContent("1 个段落");
    expect(within(summaryPanel).getByText("本地桌面导入")).toBeInTheDocument();
  });

  it("imports local files immediately after choosing them in desktop mode", async () => {
    const user = userEvent.setup();
    const pickFiles = vi.fn().mockResolvedValue([
      {
        id: "doc_1",
        documentId: "doc_1",
        name: "schedule.xlsx",
        fileType: "xlsx",
        status: "已导入",
        note: "标题：四月活动排期 · 1 个文档块",
      },
    ]);

    window.plreview.pickFiles = pickFiles;

    render(<IntakeWorkbench llmProfiles={defaultProfiles} rules={defaultRules} />);

    await user.click(screen.getByRole("button", { name: "选择本地文件" }));

    expect(pickFiles).toHaveBeenCalledTimes(1);
    const fileZone = screen.getByRole("heading", { level: 3, name: "文件导入" }).closest("section");

    expect(fileZone).not.toBeNull();
    expect(screen.getByRole("rowheader", { name: "schedule.xlsx" })).toBeInTheDocument();
    expect(screen.getByText("标题：四月活动排期 · 1 个文档块")).toBeInTheDocument();
    expect(within(fileZone as HTMLElement).getByText("已导入 1 条")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /重新导入/ })).not.toBeInTheDocument();
  });

  it("does not render retry workflow controls for imported files", () => {
    render(
      <IntakeWorkbench
        importedFiles={[
          {
            id: "doc_1",
            documentId: "doc_1",
            name: "launch-plan.docx",
            fileType: "docx",
            status: "已导入",
            note: "标题：四月活动玩法 · 3 个文档块",
          },
        ]}
        llmProfiles={defaultProfiles}
        rules={defaultRules}
      />,
    );

    expect(screen.queryByRole("button", { name: /重新导入/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "清理待重新导入" })).not.toBeInTheDocument();
    expect(screen.queryByText("待从桌面导入")).not.toBeInTheDocument();
  });

  it("shows an error message when desktop import fails", async () => {
    const user = userEvent.setup();

    window.plreview.pickFiles = vi.fn().mockRejectedValue(new Error("boom"));

    render(<IntakeWorkbench llmProfiles={defaultProfiles} rules={defaultRules} />);

    await user.click(screen.getByRole("button", { name: "选择本地文件" }));

    expect(screen.getByText("本地文件导入失败，请重试。")).toBeInTheDocument();
  });

  it("creates a review batch from imported desktop documents", async () => {
    const user = userEvent.setup();
    const createReviewBatch = vi.fn().mockResolvedValue({ id: "batch_1" });

    window.plreview.pickFiles = vi.fn().mockResolvedValue([
      {
        id: "doc_1",
        documentId: "doc_1",
        name: "schedule.xlsx",
        fileType: "xlsx",
        status: "已导入",
        note: "标题：四月活动排期 · 1 个文档块",
      },
    ]);
    window.plreview.createReviewBatch = createReviewBatch;

    render(<IntakeWorkbench llmProfiles={defaultProfiles} rules={defaultRules} />);

    await user.click(screen.getByRole("button", { name: "选择本地文件" }));
    await user.type(screen.getByLabelText("批次名称"), "四月策划案");
    await user.click(screen.getByRole("button", { name: "开始评审" }));

    expect(createReviewBatch).toHaveBeenCalledWith({
      batchName: "四月策划案",
      llmProfileId: "profile-1",
      modelName: "qwen-plus",
      ruleIds: ["rule-1"],
      documents: [{ documentId: "doc_1" }],
    });
    expect(push).toHaveBeenCalledWith("/reviews");
  });

  it("submits a three-document batch through the desktop launch flow", async () => {
    const user = userEvent.setup();
    const createReviewBatch = vi.fn().mockResolvedValue({ id: "batch_3" });

    window.plreview.createReviewBatch = createReviewBatch;

    render(
      <IntakeWorkbench
        importedFiles={[
          {
            id: "doc_1",
            documentId: "doc_1",
            name: "schedule.xlsx",
            fileType: "xlsx",
            status: "已导入",
            note: "标题：四月活动排期 · 1 个文档块",
          },
          {
            id: "doc_2",
            documentId: "doc_2",
            name: "launch-plan.docx",
            fileType: "docx",
            status: "已导入",
            note: "标题：四月活动玩法 · 3 个文档块",
          },
          {
            id: "doc_3",
            documentId: "doc_3",
            name: "announcement.md",
            fileType: "md",
            status: "已导入",
            note: "标题：上线公告 · 2 个文档块",
          },
        ]}
        llmProfiles={defaultProfiles}
        rules={defaultRules}
      />,
    );

    const fileZone = screen.getByRole("heading", { level: 3, name: "文件导入" }).closest("section");

    expect(fileZone).not.toBeNull();
    expect(within(fileZone as HTMLElement).getByText("已导入 3 条")).toBeInTheDocument();
    expect(within(fileZone as HTMLElement).getByText("待评审 3 条")).toBeInTheDocument();

    await user.type(screen.getByLabelText("批次名称"), "四月批量回归");
    await user.click(screen.getByRole("button", { name: "开始评审" }));

    expect(createReviewBatch).toHaveBeenCalledWith({
      batchName: "四月批量回归",
      llmProfileId: "profile-1",
      modelName: "qwen-plus",
      ruleIds: ["rule-1"],
      documents: [{ documentId: "doc_1" }, { documentId: "doc_2" }, { documentId: "doc_3" }],
    });
    expect(push).toHaveBeenCalledWith("/reviews");
  });

  it("shows an error message when review batch creation fails", async () => {
    const user = userEvent.setup();

    window.plreview.pickFiles = vi.fn().mockResolvedValue([
      {
        id: "doc_1",
        documentId: "doc_1",
        name: "schedule.xlsx",
        fileType: "xlsx",
        status: "已导入",
        note: "标题：四月活动排期 · 1 个文档块",
      },
    ]);
    window.plreview.createReviewBatch = vi.fn().mockRejectedValue(new Error("boom"));

    render(<IntakeWorkbench llmProfiles={defaultProfiles} rules={defaultRules} />);

    await user.click(screen.getByRole("button", { name: "选择本地文件" }));
    await user.type(screen.getByLabelText("批次名称"), "四月策划案");
    await user.click(screen.getByRole("button", { name: "开始评审" }));

    expect(screen.getByText("批量评审创建失败，请重试。")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("hides implementation-only environment variable hints from the submit section", () => {
    render(<IntakeWorkbench llmProfiles={defaultProfiles} rules={defaultRules} />);

    expect(screen.queryByText("OPENAI_COMPATIBLE_API_KEY")).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "OPENAI_COMPATIBLE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1",
      ),
    ).not.toBeInTheDocument();
  });
});
