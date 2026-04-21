import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ReviewDetailPage from "@/app/reviews/detail/page";
import { useSearchParams } from "next/navigation";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

const mockedUseSearchParams = vi.mocked(useSearchParams);

function installDesktopApi(overrides: Partial<typeof window.plreview> = {}) {
  window.plreview = {
    pickFiles: vi.fn(),
    getHomeDashboard: vi.fn(),
    getModelDashboard: vi.fn(),
    getRuleDashboard: vi.fn(),
    getReviewDetail: vi.fn(),
    listReviewJobs: vi.fn(),
    searchReviewJobs: vi.fn(),
    listRules: vi.fn(),
    searchRules: vi.fn(),
    createReviewBatch: vi.fn(),
    deleteReviewJobs: vi.fn(),
    retryReviewJob: vi.fn(),
    exportReviewList: vi.fn(),
    exportReviewReport: vi.fn(),
    saveRule: vi.fn(),
    toggleRuleEnabled: vi.fn(),
    saveModelProfile: vi.fn(),
    toggleModelProfileEnabled: vi.fn(),
    deleteModelProfile: vi.fn(),
    getRuntimeStatus: vi.fn(),
    subscribeRuntimeStatus: vi.fn(),
    ...overrides,
  };
}

describe("ReviewDetailPage", () => {
  beforeEach(() => {
    mockedUseSearchParams.mockReset();
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("loads detail data through the desktop bridge and renders the investigation workspace", async () => {
    const getReviewDetail = vi.fn().mockResolvedValue({
      id: "review_detail_1",
      title: "活动方案复盘",
      filename: "campaign.docx",
      providerSnapshot: "DashScope",
      modelNameSnapshot: "qwen-plus",
      createdAt: "2026-04-16T10:00:00.000Z",
      status: "completed" as const,
      summary: "整体方向可行，但执行细节需要补充。",
      errorMessage: null,
      overallScore: 84,
      annotationsCount: 2,
      hitBlockCount: 2,
      highPriorityCount: 1,
      reportMarkdown: "## 总结\n\n建议补齐数据来源与负责人。",
      blocks: [
        {
          blockIndex: 0,
          blockType: "paragraph" as const,
          text: "第一段",
          level: null,
          listKind: null,
        },
      ],
      annotations: [
        {
          id: "annotation_1",
          blockIndex: 0,
          issue: "结论缺少数据来源。",
          suggestion: "补充来源说明。",
          severity: "high" as const,
          evidenceText: "来源缺失",
          ruleName: "证据完整性",
        },
      ],
    });

    mockedUseSearchParams.mockReturnValue(new URLSearchParams("id=review_detail_1"));
    installDesktopApi({ getReviewDetail });

    render(<ReviewDetailPage />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: "活动方案复盘" })).toBeInTheDocument(),
    );

    expect(getReviewDetail).toHaveBeenCalledWith("review_detail_1");
    expect(screen.getByRole("region", { name: "评审调查工作区" })).toBeInTheDocument();
    expect(screen.getByText("总体评分").nextElementSibling).toHaveTextContent("84");
    expect(screen.getByText("建议补齐数据来源与负责人。")).toBeInTheDocument();
  });

  it("shows a recoverable empty state when the review id is missing", async () => {
    const getReviewDetail = vi.fn();

    mockedUseSearchParams.mockReturnValue(new URLSearchParams());
    installDesktopApi({ getReviewDetail });

    render(<ReviewDetailPage />);

    await waitFor(() =>
      expect(screen.getByText("缺少评审任务 ID。")).toBeInTheDocument(),
    );

    expect(getReviewDetail).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "返回评审任务" })).toHaveAttribute("href", "/reviews");
  });
});
