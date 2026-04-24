import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SiteNav } from "@/components/site-nav";
import { usePathname } from "next/navigation";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, onClick, ...props }: any) => (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));

const mockedUsePathname = vi.mocked(usePathname);

describe("SiteNav", () => {
  beforeEach(() => {
    mockedUsePathname.mockReset();
    window.history.pushState({}, "", "/");
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

  it("moves the active highlight to the clicked section before pathname catches up", async () => {
    const user = userEvent.setup();
    mockedUsePathname.mockReturnValue("/");

    render(<SiteNav />);

    await user.click(screen.getByRole("link", { name: "评审任务" }));

    expect(screen.getByRole("link", { name: "评审任务" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "评审任务" })).toHaveClass("active");
    expect(screen.getByRole("link", { name: "工作台" })).not.toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "工作台" })).not.toHaveClass("active");
  });

  it("uses the browser pathname when Next reports the home route after static desktop navigation", () => {
    window.history.pushState({}, "", "/reviews.html");
    mockedUsePathname.mockReturnValue("/");

    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "评审任务" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "评审任务" })).toHaveClass("active");
    expect(screen.getByRole("link", { name: "工作台" })).not.toHaveAttribute("aria-current", "page");
  });
});
