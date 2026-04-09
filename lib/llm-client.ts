import { Severity, type Rule } from "@prisma/client";
import OpenAI from "openai";

import { MAX_DOCUMENT_CHARS } from "@/lib/defaults";
import { buildReportMarkdown } from "@/lib/report";
import {
  reviewResponseSchema,
  type ReviewResponse,
} from "@/lib/review-types";

type ReviewInput = {
  documentTitle: string;
  rawText: string;
  paragraphs: Array<{ paragraphIndex: number; text: string }>;
  rules: Rule[];
  provider: string;
  baseUrl: string;
  model: string;
};

function buildReviewPrompt(input: ReviewInput) {
  const paragraphPayload = input.paragraphs
    .map((paragraph) => `[${paragraph.paragraphIndex}] ${paragraph.text}`)
    .join("\n\n");

  const rulesPayload = input.rules
    .map(
      (rule) =>
        `- ruleId: ${rule.id}\n  名称: ${rule.name}\n  分类: ${rule.category}\n  默认严重级别: ${rule.severity}\n  规则说明: ${rule.description}\n  评审指令: ${rule.promptTemplate}`,
    )
    .join("\n");

  return `你是一名资深互联网策划案评审专家。
请仅输出合法 JSON，不要输出 Markdown、解释或额外文字。

你会收到一份策划案和一组规则。请严格基于段落内容评审，每个命中的问题必须引用 paragraphIndex。
如果某条规则没有发现明显问题，可以在该规则下返回空 annotations。

输出 JSON 结构：
{
  "summary": "总体总结",
  "overallScore": 0-100,
  "ruleFindings": [
    {
      "ruleId": "规则ID",
      "conclusion": "该规则的评审结论",
      "annotations": [
        {
          "ruleId": "规则ID",
          "paragraphIndex": 0,
          "issue": "问题描述",
          "suggestion": "修改建议",
          "severity": "low | medium | high | critical",
          "evidenceText": "可选，摘录证据"
        }
      ]
    }
  ]
}

要求：
1. 只允许使用提供的 ruleId。
2. paragraphIndex 必须来自提供的段落列表。
3. 优先指出高价值问题，不要为了凑数量而输出低质量问题。
4. 修改建议必须具体、可执行。

文档标题：${input.documentTitle}

规则列表：
${rulesPayload}

段落列表：
${paragraphPayload}`;
}

function extractJsonPayload(content: string) {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("模型返回中没有找到合法 JSON。");
  }

  return content.slice(start, end + 1);
}

function buildMockReview(input: ReviewInput): ReviewResponse {
  const annotations = input.rules.flatMap((rule) => {
    const lowerName = rule.name.toLowerCase();

    return input.paragraphs
      .filter((paragraph) => {
        const text = paragraph.text;
        if (lowerName.includes("目标")) {
          return !/(目标|用户|成功|指标)/.test(text);
        }
        if (lowerName.includes("风险")) {
          return !/(风险|依赖|预案|异常)/.test(text);
        }
        if (lowerName.includes("执行")) {
          return !/(时间|排期|负责人|资源|里程碑)/.test(text);
        }
        return paragraph.paragraphIndex === 0;
      })
      .slice(0, 2)
      .map((paragraph) => ({
        ruleId: rule.id,
        paragraphIndex: paragraph.paragraphIndex,
        issue: `演示模式判断该段落可能未充分覆盖“${rule.name}”。`,
        suggestion: "建议补充更明确的目标、执行路径或风险说明，并再次进行真实模型评审。",
        severity:
          rule.severity === Severity.critical ? Severity.high : rule.severity,
        evidenceText: paragraph.text.slice(0, 80),
      }));
  });

  return {
    summary:
      "当前未检测到可用的 API Key，系统已使用本地演示模式生成示例评审结果。配置百炼 API Key 后可获得真实评审结果。",
    overallScore: 70,
    ruleFindings: input.rules.map((rule) => ({
      ruleId: rule.id,
      conclusion:
        annotations.filter((annotation) => annotation.ruleId === rule.id).length > 0
          ? `演示模式下识别到与“${rule.name}”相关的改进空间。`
          : `演示模式下未识别到明显问题。`,
      annotations: annotations.filter((annotation) => annotation.ruleId === rule.id),
    })),
  };
}

export async function reviewDocument(input: ReviewInput) {
  if (input.rawText.length > MAX_DOCUMENT_CHARS) {
    throw new Error(
      `文档正文过长，MVP 目前仅支持 ${MAX_DOCUMENT_CHARS} 字符以内的文档。`,
    );
  }

  const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY;

  if (!apiKey) {
    const mock = buildMockReview(input);

    return {
      response: mock,
      reportMarkdown: buildReportMarkdown(input.documentTitle, mock, input.rules),
      mode: "mock" as const,
    };
  }

  const client = new OpenAI({
    apiKey,
    baseURL: input.baseUrl,
  });

  const completion = await client.chat.completions.create({
    model: input.model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "你是一个只输出 JSON 的策划案评审助手。",
      },
      {
        role: "user",
        content: buildReviewPrompt(input),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "";
  const parsed = reviewResponseSchema.parse(JSON.parse(extractJsonPayload(content)));

  return {
    response: parsed,
    reportMarkdown: buildReportMarkdown(input.documentTitle, parsed, input.rules),
    mode: "live" as const,
  };
}
