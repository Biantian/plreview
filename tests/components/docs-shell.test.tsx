import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DocsShell, type DocsDocument } from "@/components/docs-shell";

const documents: DocsDocument[] = [
  {
    id: "getting-started",
    title: "开始使用",
    description: "第一次上手时，先把路径跑通。",
    intro: "先准备模型和规则，再导入文件发起批量评审。",
    sections: [
      {
        id: "launch-review",
        title: "发起评审",
        body: "填写批次信息、选择规则并导入至少一个可提交文件。",
      },
      {
        id: "review-results",
        title: "查看结果",
        body: "任务完成后回到结果页核对命中项和原文证据。",
      },
    ],
  },
  {
    id: "rules",
    title: "规则管理",
    description: "把检查口径写清楚，减少误判。",
    intro: "规则页负责启停规则、整理分类，并控制每次批量评审的检查范围。",
    sections: [
      {
        id: "write-rules",
        title: "编写规则",
        body: "写清楚检查目标、判断标准和建议输出格式。",
      },
      {
        id: "enable-rules",
        title: "启用规则",
        body: "只开启当前真正需要的规则，避免一次塞入太多口径。",
      },
    ],
  },
];

describe("DocsShell", () => {
  it("renders the classic directory, article, and toc layout", () => {
    render(<DocsShell documents={documents} />);

    const directoryRail = screen.getByRole("complementary", { name: "文档目录" });
    const article = screen.getByRole("article", { name: "文档正文" });
    const tocRail = screen.getByRole("complementary", { name: "文章目录" });

    expect(directoryRail).toBeInTheDocument();
    expect(article).toBeInTheDocument();
    expect(tocRail).toBeInTheDocument();
    expect(directoryRail).toHaveClass("desktop-surface", "docs-rail");
    expect(article).toHaveClass("desktop-surface");
    expect(tocRail).toHaveClass("desktop-surface", "docs-rail");
    expect(screen.getByRole("heading", { level: 1, name: "开始使用" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "发起评审" })).toBeInTheDocument();
    expect(screen.queryByText("经典三栏阅读模式")).not.toBeInTheDocument();
  });

  it("switches the active document and refreshes the article toc", async () => {
    const user = userEvent.setup();

    render(<DocsShell documents={documents} />);

    await user.click(screen.getByRole("button", { name: "打开文档 规则管理" }));

    expect(screen.getByRole("heading", { level: 1, name: "规则管理" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "编写规则" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "发起评审" })).not.toBeInTheDocument();
  });

  it("keeps both rails mounted and only collapses them to the edges", async () => {
    const user = userEvent.setup();

    render(<DocsShell documents={documents} />);

    const shell = screen.getByTestId("docs-shell");
    const directoryRail = screen.getByTestId("docs-directory-rail");
    const tocRail = screen.getByTestId("docs-toc-rail");

    await user.click(screen.getByRole("button", { name: "折叠文档目录" }));
    await user.click(screen.getByRole("button", { name: "折叠文章目录" }));

    expect(shell).toHaveAttribute("data-left-collapsed", "true");
    expect(shell).toHaveAttribute("data-right-collapsed", "true");
    expect(directoryRail).toHaveAttribute("data-collapsed", "true");
    expect(tocRail).toHaveAttribute("data-collapsed", "true");
    expect(screen.getByRole("article", { name: "文档正文" })).toBeInTheDocument();
    expect(screen.queryByText("左侧聚合各类操作文档，先选主题，再在正文中连续阅读。")).not.toBeInTheDocument();
    expect(screen.queryByText("右侧只显示当前文档的章节锚点，方便在长文里快速跳转。")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "展开文档目录" }));
    await user.click(screen.getByRole("button", { name: "展开文章目录" }));

    expect(shell).toHaveAttribute("data-left-collapsed", "false");
    expect(shell).toHaveAttribute("data-right-collapsed", "false");
    expect(directoryRail).toHaveAttribute("data-collapsed", "false");
    expect(tocRail).toHaveAttribute("data-collapsed", "false");
    expect(screen.getByText("左侧聚合各类操作文档，先选主题，再在正文中连续阅读。")).toBeInTheDocument();
    expect(screen.getByText("右侧只显示当前文档的章节锚点，方便在长文里快速跳转。")).toBeInTheDocument();
  });
});
