import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageIntro } from "@/components/page-intro";

describe("PageIntro", () => {
  it("renders the eyebrow, title, description, and actions slot", () => {
    render(
      <PageIntro
        actions={<a href="/reviews/new">开始新评审</a>}
        description="从这里进入新评审、查看任务进度，或回到规则与模型设置完成准备工作。"
        eyebrow="Workspace Snapshot"
        title="运行概览"
      />,
    );

    expect(screen.getByText("Workspace Snapshot")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "运行概览" })).toBeInTheDocument();
    expect(
      screen.getByText("从这里进入新评审、查看任务进度，或回到规则与模型设置完成准备工作。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "开始新评审" })).toBeInTheDocument();
  });
});
