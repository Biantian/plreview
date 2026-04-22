import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppSidebar } from "@/components/app-sidebar";
import { usePathname } from "next/navigation";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const mockedUsePathname = vi.mocked(usePathname);

describe("AppSidebar", () => {
  beforeEach(() => {
    mockedUsePathname.mockReset();
  });

  it("renders the sidebar landmark, brand block, and navigation", () => {
    mockedUsePathname.mockReturnValue("/");

    render(<AppSidebar />);

    expect(screen.getByRole("complementary", { name: "应用侧边栏" })).toBeInTheDocument();
    expect(screen.getByText("PL Review")).toBeInTheDocument();
    expect(screen.getByText("Desktop Workspace")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "主导航" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "工作台" })).toHaveAttribute("aria-current", "page");
  });

  it("keeps the sidebar focused on route navigation only", () => {
    mockedUsePathname.mockReturnValue("/docs");

    render(<AppSidebar />);

    const primaryNav = screen.getByRole("navigation", { name: "主导航" });

    expect(screen.queryByRole("contentinfo", { name: "侧边栏页脚操作" })).not.toBeInTheDocument();
    expect(within(primaryNav).queryByRole("link", { name: "新建批次" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "返回评审任务" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "评审任务" })).toHaveAttribute("href", "/reviews");
  });
});
