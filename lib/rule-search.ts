import { severityLabel } from "@/lib/utils";

export type SearchableRule = {
  name: string;
  category: string;
  description: string;
  severity: string;
};

export function normalizeRuleSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildRuleFields(rule: SearchableRule) {
  return {
    category: normalizeRuleSearchText(rule.category),
    description: normalizeRuleSearchText(rule.description),
    name: normalizeRuleSearchText(rule.name),
    severity: normalizeRuleSearchText(severityLabel(rule.severity)),
  };
}

type RankedRuleMatch = {
  matchedTokenCount: number;
  queryFieldRank: number;
  tokenFieldRank: number;
};

function scoreRuleMatch(rule: SearchableRule, normalizedQuery: string): RankedRuleMatch | null {
  const tokens = normalizedQuery.split(" ");
  const fields = buildRuleFields(rule);
  let matchedTokenCount = 0;
  let tokenFieldRank = 0;

  for (const token of tokens) {
    if (fields.name.includes(token)) {
      matchedTokenCount += 1;
      tokenFieldRank += fields.name === token ? 5 : 4;
      continue;
    }

    if (fields.category.includes(token)) {
      matchedTokenCount += 1;
      tokenFieldRank += 3;
      continue;
    }

    if (fields.description.includes(token)) {
      matchedTokenCount += 1;
      tokenFieldRank += 2;
      continue;
    }

    if (fields.severity.includes(token)) {
      matchedTokenCount += 1;
      tokenFieldRank += 1;
    }
  }

  if (matchedTokenCount === 0) {
    return null;
  }

  let queryFieldRank = 0;

  if (fields.name === normalizedQuery) {
    queryFieldRank = 5;
  } else if (fields.name.includes(normalizedQuery)) {
    queryFieldRank = 4;
  } else if (fields.category.includes(normalizedQuery)) {
    queryFieldRank = 3;
  } else if (fields.description.includes(normalizedQuery)) {
    queryFieldRank = 2;
  } else if (fields.severity.includes(normalizedQuery)) {
    queryFieldRank = 1;
  }

  return {
    matchedTokenCount,
    queryFieldRank,
    tokenFieldRank,
  };
}

export function rankRuleSearchResults<T extends SearchableRule>(rules: T[], query: string) {
  const normalizedQuery = normalizeRuleSearchText(query);

  if (!normalizedQuery) {
    return rules;
  }

  return rules
    .map((rule, index) => ({
      index,
      rule,
      score: scoreRuleMatch(rule, normalizedQuery),
    }))
    .filter((entry) => entry.score !== null)
    .sort((left, right) => {
      const leftScore = left.score;
      const rightScore = right.score;

      if (leftScore.matchedTokenCount !== rightScore.matchedTokenCount) {
        return rightScore.matchedTokenCount - leftScore.matchedTokenCount;
      }

      if (leftScore.tokenFieldRank !== rightScore.tokenFieldRank) {
        return rightScore.tokenFieldRank - leftScore.tokenFieldRank;
      }

      if (leftScore.queryFieldRank !== rightScore.queryFieldRank) {
        return rightScore.queryFieldRank - leftScore.queryFieldRank;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.rule);
}
