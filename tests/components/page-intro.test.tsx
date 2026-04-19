import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageIntro } from "@/components/page-intro";

describe("PageIntro", () => {
  it("renders the eyebrow, title, description, and actions slot", () => {
    render(
      <PageIntro
        actions={<a href="/reviews/new">开始新批次</a>}
        description="从这里进入新批次、查看任务进度，或回到规则库与模型配置完成准备工作。"
        eyebrow="Workspace Snapshot"
        title="运行概览"
      />,
    );

    expect(screen.getByText("Workspace Snapshot")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "运行概览" })).toBeInTheDocument();
    expect(
      screen.getByText("从这里进入新批次、查看任务进度，或回到规则库与模型配置完成准备工作。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "开始新批次" })).toBeInTheDocument();
  });

  it("supports reuse without actions and preserves custom class names", () => {
    const { container } = render(
      <PageIntro
        className="hero-intro"
        description="这里统一查看、搜索和维护模型配置。"
        eyebrow="Model Settings"
        title="模型配置"
      />,
    );

    expect(container.firstElementChild).toHaveClass("page-intro", "hero-intro");
    expect(screen.getByRole("heading", { level: 1, name: "模型配置" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
