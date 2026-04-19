import { DocsShell, type DocsDocument } from "@/components/docs-shell";

const documents: DocsDocument[] = [
  {
    id: "getting-started",
    title: "快速开始",
    description: "完成首次评审。",
    intro:
      "确认模型和规则后，导入文件并发起评审。",
    sections: [
      {
        id: "prepare-config",
        title: "准备模型与规则",
        body: "先在模型配置里确认供应商连接、默认模型和 API Key，再到规则库里只保留本次真正需要的规则。",
      },
      {
        id: "launch-batch",
        title: "发起批量评审",
        body: "进入新建批次页后，按顺序填写批次信息、勾选规则、导入本地文件，确认出现可提交文件后再创建批次。",
      },
      {
        id: "review-output",
        title: "复核评审结果",
        body: "任务完成后回到结果详情页，先看摘要和状态，再逐条核对命中项与原文证据，确认结论是否成立。",
      },
    ],
  },
  {
    id: "models",
    title: "模型配置",
    description: "管理供应商、模型和密钥。",
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
        body: "可搜索模型配置并打开详情编辑。",
      },
      {
        id: "verify-key",
        title: "确认密钥可用性",
        body: "只要 API Key 无效，后台任务就会失败；提交前最好确认密钥尾号和启用状态都符合预期。",
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
    id: "results",
    title: "结果阅读",
    description: "核对状态、问题和原文位置。",
    intro:
      "在这里查看任务状态、问题列表和正文定位。",
    sections: [
      {
        id: "check-status",
        title: "先看整体状态",
        body: "如果任务是 completed，可以直接进入核对；如果是 partial 或 failed，先查看错误信息和可恢复的任务片段。",
      },
      {
        id: "inspect-evidence",
        title: "再看命中与证据",
        body: "每个问题都应该能对应回原文位置，优先检查证据片段是否完整，是否真的支持当前结论。",
      },
      {
        id: "decide-next-step",
        title: "最后决定下一步",
        body: "如果是规则问题，回到规则库调整描述；如果是模型问题，回到模型配置切换配置；如果是文档问题，重新导入再跑一次。",
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
