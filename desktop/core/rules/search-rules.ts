import type { PrismaClient } from "@prisma/client";

import { listRules } from "@/desktop/core/rules/list-rules";
import { severityLabel } from "@/lib/utils";

export async function searchRules(prisma: PrismaClient, query: string) {
  const keyword = query.trim().toLowerCase();
  const items = await listRules(prisma);

  if (!keyword) {
    return items;
  }

  return items.filter((item) =>
    [item.name, item.category, item.description, item.severity, severityLabel(item.severity)]
      .join(" ")
      .toLowerCase()
      .includes(keyword),
  );
}
