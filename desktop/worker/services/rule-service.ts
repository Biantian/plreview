import type { PrismaClient } from "@prisma/client";

import { listRules } from "@/desktop/core/rules/list-rules";
import { searchRules } from "@/desktop/core/rules/search-rules";

export function createRuleService(prisma: PrismaClient) {
  return {
    listRules: () => listRules(prisma),
    searchRules: (query: string) => searchRules(prisma, query),
  };
}
