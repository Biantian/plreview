import type { ReviewResponse } from "@/lib/review-types";

export function buildReportMarkdown(
  documentTitle: string,
  response: ReviewResponse,
  rules: Array<{ id: string; name: string }>,
) {
  const ruleNameMap = new Map(rules.map((rule) => [rule.id, rule.name]));

  const lines = [
    `# ${documentTitle} 评审报告`,
    "",
    "## 总体结论",
    response.summary,
    "",
    `总体评分：${response.overallScore ?? "未提供"}`,
    "",
    "## 规则明细",
    "",
  ];

  for (const finding of response.ruleFindings) {
    lines.push(`### ${ruleNameMap.get(finding.ruleId) ?? finding.ruleId}`);
    lines.push(finding.conclusion);
    lines.push("");

    if (finding.annotations.length === 0) {
      lines.push("- 未命中明显问题");
      lines.push("");
      continue;
    }

    finding.annotations.forEach((annotation, index) => {
      const blockIndex = annotation.blockIndex ?? annotation.paragraphIndex ?? 0;
      lines.push(`${index + 1}. 文档块 ${blockIndex + 1}：${annotation.issue}`);
      lines.push(`建议：${annotation.suggestion}`);
      lines.push("");
    });
  }

  return lines.join("\n");
}
