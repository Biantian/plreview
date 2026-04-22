import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SiteNav } from "@/components/site-nav";
import { usePathname } from "next/navigation";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const mockedUsePathname = vi.mocked(usePathname);

describe("SiteNav", () => {
  beforeEach(() => {
    mockedUsePathname.mockReset();
  });

  it("renders the approved navigation labels", () => {
    mockedUsePathname.mockReturnValue("/");

    render(<SiteNav />);

    expect(screen.getByRole("navigation", { name: "主导航" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "工作台" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "评审任务" })).toHaveAttribute("href", "/reviews");
    expect(screen.getByRole("link", { name: "规则库" })).toHaveAttribute("href", "/rules");
    expect(screen.getByRole("link", { name: "模型配置" })).toHaveAttribute("href", "/models");
    expect(screen.getByRole("link", { name: "帮助文档" })).toHaveAttribute("href", "/docs");
    expect(screen.queryByRole("link", { name: "新建批次" })).not.toBeInTheDocument();
  });

  it("marks nested routes using the closest matching section", () => {
    mockedUsePathname.mockReturnValue("/reviews/123");

    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "评审任务" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "评审任务" })).toHaveClass("active");
    expect(screen.queryByRole("link", { name: "工作台" })).not.toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "新建批次" })).not.toBeInTheDocument();
  });
});
