import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const bannedCopyByFile = {
  "components/app-sidebar.tsx": [
    "规则、批次、结果和文档都固定停靠在这条桌面导航轨道里。",
  ],
  "app/page.tsx": [
    "查看当前任务负载、配置准备度和最近产出，直接回到下一步要处理的评审工作。",
    "文档导入、规则快照和 OpenAI 兼容模型配置都从这套桌面工作区进入。",
    "先从最近任务继续，避免在不同页面间来回切换。",
  ],
  "app/models/page.tsx": [
    "统一查看供应商连接、默认模型和启用状态，在桌面管理界面里完成搜索、启停、新增和维护。",
  ],
  "app/rules/page.tsx": [
    "按规则名称、分类与严重级别维护规则目录，先浏览筛选，再通过抽屉更新内容和启用状态。",
  ],
  "app/reviews/new/page.tsx": [
    "在桌面工作区里完成批次配置、规则勾选与本地文件导入，然后直接发起新的评审批次。",
  ],
  "components/review-detail-viewer.tsx": [
    "正文与问题联动阅读，详细使用说明可在文档页查看。",
    "点击问题项或正文中的提示标签，右侧详情和原文位置会同步聚焦。",
  ],
  "components/intake-workbench.tsx": [
    "先定义本次评审批次的命名与模型配置，右侧侧栏会实时告诉你是否已经达到发起条件。",
    "导入后的策划案标题会显示在这里，方便确认是否读对内容。",
    "这里会保留当前文件的解析说明，方便行级排查。",
    "右侧侧栏只负责显示准备状态与提交概览，真正的发起动作已经放回主工作区，方便连续完成规则、文件检查与提交。",
  ],
  "components/review-jobs-table.tsx": [
    "从新建批次页发起第一份文档后，这里会成为你的评审任务工作区。",
  ],
  "app/docs/page.tsx": [
    "模型配置页已经改成列表 + 抽屉流程，适合先浏览现有配置，再按需新增、编辑或启停。",
    "规则页现在聚焦于列表浏览和弹窗编辑，帮助你先整理规则库，再决定这次批量评审具体启用哪些条目。",
    "结果详情页不是只看总数，而是要结合任务状态、问题列表和正文定位，判断这次评审是否可靠、哪里需要回头调整。",
  ],
} as const;

describe("user-facing copy", () => {
  it("does not ship internal design-rationale descriptions in the UI source", () => {
    for (const [relativePath, bannedCopy] of Object.entries(bannedCopyByFile)) {
      const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");

      for (const phrase of bannedCopy) {
        expect(source).not.toContain(phrase);
      }
    }
  });
});
