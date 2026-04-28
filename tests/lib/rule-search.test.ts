import { describe, expect, it } from "vitest";

import { normalizeRuleSearchText, rankRuleSearchResults } from "@/lib/rule-search";

type TestRule = {
  id: string;
  name: string;
  category: string;
  description: string;
  severity: string;
};

function createRule(overrides: Partial<TestRule> = {}): TestRule {
  return {
    id: "1",
    name: "目标清晰度",
    category: "基础质量",
    description: "检查目标表达是否清楚",
    severity: "medium",
    ...overrides,
  };
}

describe("rule-search helpers", () => {
  it("normalizes whitespace and casing", () => {
    expect(normalizeRuleSearchText("  Risk   IDENTIFICATION  ")).toBe("risk identification");
    expect(normalizeRuleSearchText("  风险   识别  ")).toBe("风险 识别");
  });

  it("prioritizes name matches over description-only matches", () => {
    const rules = [
      createRule({
        id: "1",
        name: "目标清晰度",
        description: "这里强调风险控制与范围管理",
      }),
      createRule({
        id: "2",
        name: "风险识别",
        description: "识别潜在风险并建立跟踪清单",
      }),
    ];

    const result = rankRuleSearchResults(rules, "风险");

    expect(result.map((rule) => rule.id)).toEqual(["2", "1"]);
  });

  it("prioritizes rules matching more query tokens", () => {
    const rules = [
      createRule({
        id: "1",
        name: "执行检查",
        description: "覆盖执行阶段的风险与依赖",
      }),
      createRule({
        id: "2",
        name: "执行风险",
        description: "识别执行风险并给出缓解建议",
      }),
      createRule({
        id: "3",
        name: "风险识别",
        description: "聚焦风险清单",
      }),
    ];

    const result = rankRuleSearchResults(rules, "执行 风险");

    expect(result.map((rule) => rule.id)).toEqual(["2", "1", "3"]);
  });

  it("always ranks more matched tokens ahead of stronger single-field phrase matches", () => {
    const rules = [
      createRule({
        id: "1",
        name: "执行 风险",
        description: "单条规则名称完整匹配查询短语",
      }),
      createRule({
        id: "2",
        name: "执行检查",
        category: "风险治理",
        description: "通过不同字段同时覆盖两个 token",
      }),
    ];

    const result = rankRuleSearchResults(rules, "执行 风险 治理");

    expect(result.map((rule) => rule.id)).toEqual(["2", "1"]);
  });

  it("matches severity by localized label only", () => {
    const rules = [
      createRule({
        id: "1",
        name: "文案一致性",
        category: "体验规范",
        description: "检查术语是否统一",
        severity: "high",
      }),
      createRule({
        id: "2",
        name: "视觉对齐",
        category: "界面规范",
        description: "检查间距与边界",
        severity: "medium",
      }),
    ];

    expect(rankRuleSearchResults(rules, "高").map((rule) => rule.id)).toEqual(["1"]);
    expect(rankRuleSearchResults(rules, "high")).toEqual([]);
  });

  it("prefers higher-priority token field matches over lower-priority phrase matches", () => {
    const rules = [
      createRule({
        id: "1",
        name: "name foo baz bar",
        category: "misc",
        description: "alpha",
        severity: "medium",
      }),
      createRule({
        id: "2",
        name: "other",
        category: "foo bar",
        description: "beta",
        severity: "medium",
      }),
    ];

    const result = rankRuleSearchResults(rules, "foo bar");

    expect(result.map((rule) => rule.id)).toEqual(["1", "2"]);
  });
});
