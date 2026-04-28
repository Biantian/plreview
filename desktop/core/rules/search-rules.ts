import type { PrismaClient } from "@prisma/client";

import { listRules } from "@/desktop/core/rules/list-rules";
import { rankRuleSearchResults } from "@/lib/rule-search";

export async function searchRules(prisma: PrismaClient, query: string) {
  const items = await listRules(prisma);
  return rankRuleSearchResults(items, query);
}
