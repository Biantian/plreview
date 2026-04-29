import { DocsShell, type DocsDocument } from "@/components/docs-shell";

const documents: DocsDocument[] = [
  {
    id: "getting-started",
    title: "快速开始",
    description: "完成首次评审。",
    intro:
      "确认模型、规则和运行模式后，导入文件并发起评审。",
    sections: [
      {
        id: "prepare-config",
        title: "准备模型与规则",
        body: "先在模型配置里确认这次要用演示模式还是实时模式，再检查供应商连接、默认模型和启用状态；然后回到规则库，只保留本次真正需要的规则。",
      },
      {
        id: "launch-batch",
        title: "发起批量评审",
        body: "进入新建批次页后，系统会优先带入上次批次的规则；你可以继续调整规则、导入 docx、txt、md、xlsx，并通过解析摘要确认标题、结构和来源。",
      },
      {
        id: "review-output",
        title: "复核评审结果",
        body: "创建批次后先去评审任务页看排队与执行状态；任务完成后再进入详情页，逐条核对摘要、命中项、原文证据和 Markdown 报告。",
      },
    ],
  },
  {
    id: "models",
    title: "模型配置",
    description: "管理供应商、模型、运行模式和密钥。",
    intro:
      "在这里查看、新增、编辑和启停模型配置。",
    sections: [
      {
        id: "choose-provider",
        title: "选择供应商与地址",
        body: "如果接入的是兼容 OpenAI 风格的服务，先把 Base URL 填对，再检查供应商名称、接口格式和默认模型是否一致。",
      },
      {
        id: "manage-profiles",
        title: "通过列表管理配置",
        body: "可按名称、供应商、模式和默认模型搜索配置，并在列表里继续新增、编辑、启停或删除。",
      },
      {
        id: "verify-mode",
        title: "区分演示模式与实时模式",
        body: "演示模式不要求 API Key，会生成示例评审结果；实时模式才会调用真实模型，因此提交前要确认启用状态、Key 尾号和默认模型都符合预期。",
      },
    ],
  },
  {
    id: "rules",
    title: "规则库",
    description: "管理评审规则。",
    intro:
      "在这里查看、启用和编辑规则。",
    sections: [
      {
        id: "define-goal",
        title: "先写检查目标",
        body: "明确这条规则到底在看什么，例如一致性、缺失项、越权表述、数字错误或格式偏差。",
      },
      {
        id: "define-criteria",
        title: "再写判断标准",
        body: "避免只写抽象要求，而是清楚说明什么情况算命中、什么情况算通过，并尽量给出可观察的判断条件。",
      },
      {
        id: "set-severity",
        title: "定义输出与严重程度",
        body: "建议补齐问题摘要、命中依据、修正建议和风险等级，让结果详情页里的问题更容易被复核和处理。",
      },
    ],
  },
  {
    id: "review-jobs",
    title: "评审任务",
    description: "管理队列、失败项和导出。",
    intro:
      "批次创建后，先在这里处理任务队列，再进入详情页看结果。",
    sections: [
      {
        id: "track-progress",
        title: "先看队列状态",
        body: "创建批次后先到评审任务页，按标题、文件名、批次名、模型名和状态筛选，并在需要时手动刷新列表。",
      },
      {
        id: "handle-failures",
        title: "处理失败或部分完成",
        body: "failed 与 partial 任务可直接重试；pending 和 running 仍在后台处理中，等结果落库后再进入详情页核对内容。",
      },
      {
        id: "bulk-ops",
        title: "使用批量操作",
        body: "选中任务后可批量导出评审清单、批量删除；单条任务也支持删除，适合在回归或重复导入后清理队列。",
      },
    ],
  },
  {
    id: "results",
    title: "结果阅读",
    description: "核对状态、问题和原文位置。",
    intro:
      "在这里查看任务状态、问题列表和正文定位。",
    sections: [
      {
        id: "check-status",
        title: "先看整体状态",
        body: "如果任务是 completed，可以直接进入核对；如果是 partial 或 failed，先查看错误信息，再回到评审任务页决定是否重试。",
      },
      {
        id: "inspect-evidence",
        title: "再看命中与证据",
        body: "每个问题都应该能对应回原文位置，优先检查证据片段是否完整，是否真的支持当前结论，并结合 Markdown 报告核对整体判断。",
      },
      {
        id: "decide-next-step",
        title: "最后决定下一步",
        body: "如果是规则问题，回到规则库调整描述；如果想把演示结果换成真实结果，回到模型配置切到实时模式；如果是文档问题，重新导入再跑一次。",
      },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="desktop-management-page docs-page stack-lg">
      <DocsShell documents={documents} />
    </div>
  );
}
