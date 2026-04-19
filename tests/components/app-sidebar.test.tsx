import { render, screen } from "@testing-library/react";
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
    expect(screen.getByText("策划案评审系统")).toBeInTheDocument();
    expect(screen.getByText("Planning Review Workspace")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "主导航" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "工作台" })).toHaveAttribute("aria-current", "page");
  });
});
