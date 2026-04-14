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

  it("renders the empty state and exposes the file input by label", () => {
    render(
      <IntakeWorkbench
        llmProfiles={[
          { defaultModel: "qwen-plus", id: "profile-1", name: "Default", provider: "openai" },
        ]}
        rules={[{ category: "内容", description: "保持表达统一", id: "rule-1", name: "Tone" }]}
      />,
    );

    expect(screen.getByText("尚未导入文件，文件解析结果会在这里逐行呈现。")).toBeInTheDocument();
    expect(screen.getByLabelText("选择待导入文件")).toBeInTheDocument();
  });

  it("renders imported files as table rows", () => {
    render(
      <IntakeWorkbench
        importedFiles={[
          {
            id: "file-1",
            fileType: "docx",
            name: "brand-guidelines.docx",
            status: "已导入",
          },
          {
            id: "file-2",
            fileType: "md",
            name: "launch-plan.md",
            note: "等待批量提交",
            status: "排队中",
          },
        ]}
        llmProfiles={[
          { defaultModel: "qwen-plus", id: "profile-1", name: "Default", provider: "openai" },
        ]}
        rules={[{ category: "内容", description: "保持表达统一", id: "rule-1", name: "Tone" }]}
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
          { defaultModel: "qwen-plus", id: "profile-1", name: "Default", provider: "openai" },
          { defaultModel: "qwen-max", id: "profile-2", name: "Premium", provider: "openai" },
        ]}
        rules={[{ category: "内容", description: "保持表达统一", id: "rule-1", name: "Tone" }]}
      />,
    );

    const profileSelect = screen.getByLabelText("模型配置");
    const modelNameInput = screen.getByLabelText("模型名称") as HTMLInputElement;

    expect(modelNameInput.value).toBe("qwen-plus");

    await user.selectOptions(profileSelect, "profile-2");

    expect(modelNameInput.value).toBe("qwen-max");
  });

  it("shows the selected file count after uploading multiple files", async () => {
    const user = userEvent.setup();

    render(
      <IntakeWorkbench
        llmProfiles={[
          { defaultModel: "qwen-plus", id: "profile-1", name: "Default", provider: "openai" },
        ]}
        rules={[{ category: "内容", description: "保持表达统一", id: "rule-1", name: "Tone" }]}
      />,
    );

    const fileInput = screen.getByLabelText("选择待导入文件");

    await user.upload(fileInput, [
      new File(["a"], "launch-plan.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
      new File(["b"], "pricing.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    ]);

    expect(screen.getByText("当前选择：已选择 2 个文件")).toBeInTheDocument();
  });

  it("adds browser fallback selections to the workbench but keeps batch submission disabled", async () => {
    const user = userEvent.setup();

    render(
      <IntakeWorkbench
        llmProfiles={[
          { defaultModel: "qwen-plus", id: "profile-1", name: "Default", provider: "openai" },
        ]}
        rules={[{ category: "内容", description: "保持表达统一", id: "rule-1", name: "Tone" }]}
      />,
    );

    const fileInput = screen.getByLabelText("选择待导入文件");

    await user.upload(fileInput, [
      new File(["a"], "launch-plan.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    ]);

    expect(screen.getByRole("rowheader", { name: "launch-plan.docx" })).toBeInTheDocument();
    expect(
      screen.getByText("网页回退入口已记录，请使用“导入本地文件”完成本地解析。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始批量评审" })).toBeDisabled();
  });

  it("removes a workbench row from the table", async () => {
    const user = userEvent.setup();

    render(
      <IntakeWorkbench
        importedFiles={[
          {
            id: "doc_1",
            name: "schedule.xlsx",
            fileType: "xlsx",
            status: "已导入",
            note: "标题：四月活动排期 · 1 个文档块",
          },
        ]}
        llmProfiles={[
          { defaultModel: "qwen-plus", id: "profile-1", name: "Default", provider: "openai" },
        ]}
        rules={[{ category: "内容", description: "保持表达统一", id: "rule-1", name: "Tone" }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "移除 schedule.xlsx" }));

    expect(screen.queryByRole("rowheader", { name: "schedule.xlsx" })).not.toBeInTheDocument();
    expect(screen.getByText("尚未导入文件，文件解析结果会在这里逐行呈现。")).toBeInTheDocument();
  });

  it("opens a parse summary panel for a selected row", async () => {
    const user = userEvent.setup();

    render(
      <IntakeWorkbench
        importedFiles={[
          {
            id: "doc_1",
            name: "schedule.xlsx",
            fileType: "xlsx",
            status: "已导入",
            note: "标题：四月活动排期 · 1 个文档块",
          },
        ]}
        llmProfiles={[
          { defaultModel: "qwen-plus", id: "profile-1", name: "Default", provider: "openai" },
        ]}
        rules={[{ category: "内容", description: "保持表达统一", id: "rule-1", name: "Tone" }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "查看摘要 schedule.xlsx" }));

    const summaryPanel = screen.getByRole("region", { name: "解析摘要面板" });

    expect(within(summaryPanel).getByRole("heading", { name: "解析摘要" })).toBeInTheDocument();
    expect(within(summaryPanel).getByText("schedule.xlsx")).toBeInTheDocument();
    expect(within(summaryPanel).getByText("标题：四月活动排期 · 1 个文档块")).toBeInTheDocument();
  });

  it("imports local files through the desktop bridge and renders them in the table", async () => {
    const user = userEvent.setup();
    const pickFiles = vi.fn().mockResolvedValue([
      {
        id: "doc_1",
        name: "schedule.xlsx",
        fileType: "xlsx",
        status: "已导入",
        note: "标题：四月活动排期 · 1 个文档块",
      },
    ]);

    window.plreview.pickFiles = pickFiles;

    render(
      <IntakeWorkbench
        llmProfiles={[
          { defaultModel: "qwen-plus", id: "profile-1", name: "Default", provider: "openai" },
        ]}
        rules={[{ category: "内容", description: "保持表达统一", id: "rule-1", name: "Tone" }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "导入本地文件" }));

    expect(pickFiles).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("rowheader", { name: "schedule.xlsx" })).toBeInTheDocument();
    expect(screen.getByText("标题：四月活动排期 · 1 个文档块")).toBeInTheDocument();
  });

  it("retries desktop import for a browser fallback row and replaces the placeholder", async () => {
    const user = userEvent.setup();
    const pickFiles = vi.fn().mockResolvedValue([
      {
        id: "doc_1",
        name: "launch-plan.docx",
        fileType: "docx",
        status: "已导入",
        note: "标题：四月活动玩法 · 3 个文档块",
      },
    ]);

    window.plreview.pickFiles = pickFiles;

    render(
      <IntakeWorkbench
        llmProfiles={[
          { defaultModel: "qwen-plus", id: "profile-1", name: "Default", provider: "openai" },
        ]}
        rules={[{ category: "内容", description: "保持表达统一", id: "rule-1", name: "Tone" }]}
      />,
    );

    await user.upload(screen.getByLabelText("选择待导入文件"), [
      new File(["a"], "launch-plan.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    ]);

    await user.click(screen.getByRole("button", { name: "重新导入 launch-plan.docx" }));

    expect(pickFiles).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("rowheader", { name: "launch-plan.docx" })).toHaveLength(1);
    expect(screen.getByText("标题：四月活动玩法 · 3 个文档块")).toBeInTheDocument();
    expect(screen.queryByText("网页回退入口已记录，请使用“导入本地文件”完成本地解析。")).not.toBeInTheDocument();
  });

  it("keeps a browser fallback row when retry import is cancelled", async () => {
    const user = userEvent.setup();

    window.plreview.pickFiles = vi.fn().mockResolvedValue([]);

    render(
      <IntakeWorkbench
        llmProfiles={[
          { defaultModel: "qwen-plus", id: "profile-1", name: "Default", provider: "openai" },
        ]}
        rules={[{ category: "内容", description: "保持表达统一", id: "rule-1", name: "Tone" }]}
      />,
    );

    await user.upload(screen.getByLabelText("选择待导入文件"), [
      new File(["a"], "launch-plan.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    ]);

    await user.click(screen.getByRole("button", { name: "重新导入 launch-plan.docx" }));

    expect(screen.getByRole("rowheader", { name: "launch-plan.docx" })).toBeInTheDocument();
    expect(screen.getByText("网页回退入口已记录，请使用“导入本地文件”完成本地解析。")).toBeInTheDocument();
  });

  it("shows an error message when desktop import fails", async () => {
    const user = userEvent.setup();

    window.plreview.pickFiles = vi.fn().mockRejectedValue(new Error("boom"));

    render(
      <IntakeWorkbench
        llmProfiles={[
          { defaultModel: "qwen-plus", id: "profile-1", name: "Default", provider: "openai" },
        ]}
        rules={[{ category: "内容", description: "保持表达统一", id: "rule-1", name: "Tone" }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "导入本地文件" }));

    expect(screen.getByText("本地文件导入失败，请重试。")).toBeInTheDocument();
  });

  it("creates a review batch from imported desktop documents", async () => {
    const user = userEvent.setup();
    const createReviewBatch = vi.fn().mockResolvedValue({ id: "batch_1" });

    window.plreview.pickFiles = vi.fn().mockResolvedValue([
      {
        id: "doc_1",
        name: "schedule.xlsx",
        fileType: "xlsx",
        status: "已导入",
        note: "标题：四月活动排期 · 1 个文档块",
      },
    ]);
    window.plreview.createReviewBatch = createReviewBatch;

    render(
      <IntakeWorkbench
        llmProfiles={[
          { defaultModel: "qwen-plus", id: "profile-1", name: "Default", provider: "openai" },
        ]}
        rules={[{ category: "内容", description: "保持表达统一", id: "rule-1", name: "Tone" }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "导入本地文件" }));
    await user.type(screen.getByLabelText("批次名称"), "四月策划案");
    await user.click(screen.getByRole("button", { name: "开始批量评审" }));

    expect(createReviewBatch).toHaveBeenCalledWith({
      batchName: "四月策划案",
      llmProfileId: "profile-1",
      modelName: "qwen-plus",
      ruleIds: ["rule-1"],
      documents: [{ documentId: "doc_1" }],
    });
    expect(push).toHaveBeenCalledWith("/reviews");
  });

  it("shows an error message when review batch creation fails", async () => {
    const user = userEvent.setup();

    window.plreview.pickFiles = vi.fn().mockResolvedValue([
      {
        id: "doc_1",
        name: "schedule.xlsx",
        fileType: "xlsx",
        status: "已导入",
        note: "标题：四月活动排期 · 1 个文档块",
      },
    ]);
    window.plreview.createReviewBatch = vi.fn().mockRejectedValue(new Error("boom"));

    render(
      <IntakeWorkbench
        llmProfiles={[
          { defaultModel: "qwen-plus", id: "profile-1", name: "Default", provider: "openai" },
        ]}
        rules={[{ category: "内容", description: "保持表达统一", id: "rule-1", name: "Tone" }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "导入本地文件" }));
    await user.type(screen.getByLabelText("批次名称"), "四月策划案");
    await user.click(screen.getByRole("button", { name: "开始批量评审" }));

    expect(screen.getByText("批量评审创建失败，请重试。")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
