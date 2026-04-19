import { ReviewStatus } from "@prisma/client";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReviewDetailViewer } from "@/components/review-detail-viewer";

const blocks = [
  {
    blockIndex: 0,
    blockType: "heading" as const,
    level: 1,
    listKind: null,
    text: "项目概览",
  },
  {
    blockIndex: 1,
    blockType: "paragraph" as const,
    level: null,
    listKind: null,
    text: "该段落包含需要进一步核对的结论表达。",
  },
  {
    blockIndex: 2,
    blockType: "paragraph" as const,
    level: null,
    listKind: null,
    text: "这里还有第二个问题需要切换查看。",
  },
];

const annotations = [
  {
    blockIndex: 1,
    evidenceText: "建议补充数据来源和时间范围。",
    id: "annotation-1",
    issue: "缺少来源说明，导致结论可信度不足。",
    ruleName: "证据完整性",
    severity: "high" as const,
    suggestion: "补充指标来源并说明统计口径。",
  },
  {
    blockIndex: 2,
    evidenceText: "建议明确负责人和截止时间。",
    id: "annotation-2",
    issue: "行动项没有责任归属。",
    ruleName: "执行闭环",
    severity: "medium" as const,
    suggestion: "为行动项补齐 owner 与交付日期。",
  },
];

describe("ReviewDetailViewer", () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("renders a desktop investigation workspace with a dedicated inspector rail", () => {
    render(
      <ReviewDetailViewer
        annotations={annotations}
        blocks={blocks}
        status={ReviewStatus.completed}
      />,
    );

    const workspace = screen.getByRole("region", { name: "评审调查工作区" });
    const sourcePane = within(workspace).getByRole("region", { name: "原文定位区" });
    const inspector = screen.getByRole("complementary", { name: "问题检查器" });
    const detailPane = within(inspector).getByLabelText("当前问题详情");

    expect(within(sourcePane).getByRole("heading", { level: 2, name: "原文定位" })).toBeInTheDocument();
    expect(within(inspector).getByRole("heading", { level: 2, name: "问题导航" })).toBeInTheDocument();
    expect(within(inspector).getByRole("heading", { level: 2, name: "问题详情" })).toBeInTheDocument();
    expect(within(inspector).getByRole("navigation", { name: "问题导航列表" })).toBeInTheDocument();
    expect(within(detailPane).getByText("缺少来源说明，导致结论可信度不足。")).toBeInTheDocument();
  });

  it("keeps inspector detail and source chips linked when changing the active issue", async () => {
    const user = userEvent.setup();

    render(
      <ReviewDetailViewer
        annotations={annotations}
        blocks={blocks}
        status={ReviewStatus.completed}
      />,
    );

    const inspector = screen.getByRole("complementary", { name: "问题检查器" });
    const sourcePane = screen.getByRole("region", { name: "原文定位区" });
    const detailPane = within(inspector).getByLabelText("当前问题详情");

    await user.click(within(inspector).getByRole("button", { name: /执行闭环/ }));

    expect(within(detailPane).getByText("行动项没有责任归属。")).toBeInTheDocument();
    expect(within(detailPane).getByText("为行动项补齐 owner 与交付日期。")).toBeInTheDocument();

    await user.click(within(sourcePane).getByRole("button", { name: /证据完整性/ }));

    expect(within(detailPane).getByText("缺少来源说明，导致结论可信度不足。")).toBeInTheDocument();
    expect(within(detailPane).getByText("补充指标来源并说明统计口径。")).toBeInTheDocument();
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
