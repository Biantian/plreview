import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DocsPage from "@/app/docs/page";

describe("DocsPage", () => {
  it("renders the docs workspace directly without a page intro shell", async () => {
    render(await DocsPage());

    expect(screen.queryByRole("heading", { level: 1, name: "帮助文档" })).not.toBeInTheDocument();
    expect(screen.getByTestId("docs-shell")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "文档目录" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "文档正文" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "文章目录" })).toBeInTheDocument();
  });
});
