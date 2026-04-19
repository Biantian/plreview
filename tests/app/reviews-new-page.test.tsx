import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import NewReviewPage from "@/app/reviews/new/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    llmProfile: {
      findMany: vi.fn(),
    },
    rule: {
      findMany: vi.fn(),
    },
  },
}));

describe("NewReviewPage", () => {
  it("renders the page intro and composed launch workspace structure", async () => {
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.rule.findMany).mockResolvedValue([
      {
        category: "内容",
        description: "保持表达统一",
        id: "rule-1",
        name: "Tone",
      },
    ]);
    vi.mocked(prisma.llmProfile.findMany).mockResolvedValue([
      {
        defaultModel: "qwen-plus",
        id: "profile-1",
        name: "Default",
        provider: "openai",
      },
    ]);

    render(await NewReviewPage());

    const pageHeading = screen.getByRole("heading", { level: 1, name: "新建评审" });
    const pagePanel = pageHeading.closest(".panel");
    const workspace = screen.getByRole("region", { name: "评审启动工作区" });

    expect(pagePanel).toBeTruthy();
    expect(within(pagePanel as HTMLElement).getByRole("link", { name: "返回任务中心" })).toBeInTheDocument();
    expect(within(pagePanel as HTMLElement).getByRole("link", { name: "管理规则" })).toBeInTheDocument();
    expect(within(workspace).getByRole("heading", { level: 2, name: "批次配置" })).toBeInTheDocument();
    expect(within(workspace).getByRole("heading", { level: 3, name: "启动批次" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "启动准备概览" })).toBeInTheDocument();
  });
});
