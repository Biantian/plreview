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
        body: "任务完成后回到结果详情页核对命中项和原文证据。",
      },
    ],
  },
  {
    id: "rules",
    title: "规则库",
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
  it("renders directory, article, and toc panes with pane headers", () => {
    render(<DocsShell documents={documents} />);

    const complementaryPanes = screen.getAllByRole("complementary");
    const directoryPane = screen.getByRole("complementary", { name: "文档目录" });
    const article = screen.getByRole("article", { name: "文档正文" });
    const tocPane = screen.getByRole("complementary", { name: "文章目录" });
    const paneHeaders = screen.getAllByText(/^(DIRECTORY|DOCS|ARTICLE TOC)$/);

    expect(complementaryPanes).toHaveLength(2);
    expect(directoryPane).toBeInTheDocument();
    expect(article).toBeInTheDocument();
    expect(tocPane).toBeInTheDocument();
    expect(paneHeaders).toHaveLength(3);
    expect(screen.getByRole("heading", { level: 1, name: "开始使用" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "发起评审" })).toBeInTheDocument();
    expect(screen.queryByText("经典三栏阅读模式")).not.toBeInTheDocument();
  });

  it("switches the active document and refreshes the article toc", async () => {
    const user = userEvent.setup();

    render(<DocsShell documents={documents} />);

    await user.click(screen.getByRole("button", { name: "打开文档 规则库" }));

    expect(screen.getByRole("heading", { level: 1, name: "规则库" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "编写规则" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "发起评审" })).not.toBeInTheDocument();
  });

  it("renders a fixed three-pane docs workspace with pane headers", () => {
    render(<DocsShell documents={documents} />);

    const directoryPane = screen.getByRole("complementary", { name: "文档目录" });
    const article = screen.getByRole("article", { name: "文档正文" });
    const tocPane = screen.getByRole("complementary", { name: "文章目录" });
    const directoryScroll = directoryPane.querySelector(".docs-pane-scroll");
    const articleScroll = article.querySelector(".docs-pane-scroll");
    const tocScroll = tocPane.querySelector(".docs-pane-scroll");

    expect(screen.getByText("DIRECTORY")).toBeInTheDocument();
    expect(screen.getByText("DOCS")).toBeInTheDocument();
    expect(screen.getByText("ARTICLE TOC")).toBeInTheDocument();
    expect(directoryPane).toContainElement(screen.getByText("DIRECTORY"));
    expect(tocPane).toContainElement(screen.getByText("ARTICLE TOC"));
    expect(article).toContainElement(screen.getByText("DOCS"));
    expect(directoryScroll).not.toBeNull();
    expect(articleScroll).not.toBeNull();
    expect(tocScroll).not.toBeNull();
    expect(directoryScroll).not.toContainElement(screen.getByText("DIRECTORY"));
    expect(articleScroll).not.toContainElement(screen.getByText("DOCS"));
    expect(tocScroll).not.toContainElement(screen.getByText("ARTICLE TOC"));
    expect(article.querySelector(".docs-document-stream")).not.toBeNull();
    expect(article.querySelectorAll(".docs-document-block")).toHaveLength(2);
    expect(article.querySelector(".inline-actions")).toBeNull();
    expect(screen.queryByText("2 个章节")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开文档 开始使用" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看结果" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "展开文档目录" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "折叠文档目录" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "展开文章目录" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "折叠文章目录" })).not.toBeInTheDocument();
  });
});
