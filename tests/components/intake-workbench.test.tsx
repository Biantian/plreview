import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { IntakeWorkbench } from "@/components/intake-workbench";

describe("IntakeWorkbench", () => {
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
});
