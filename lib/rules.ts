import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export async function getRuleDashboardData() {
  const rules = await prisma.rule.findMany({
    orderBy: [{ enabled: "desc" }, { category: "asc" }, { updatedAt: "desc" }],
  });

  const enabledCount = rules.filter((rule) => rule.enabled).length;
  const categoryCount = new Set(rules.map((rule) => rule.category)).size;
  const latestUpdatedAt = rules.reduce<Date | null>(
    (latest, rule) => (!latest || rule.updatedAt > latest ? rule.updatedAt : latest),
    null,
  );

  return {
    enabledCount,
    categoryCount,
    latestUpdatedAtLabel: latestUpdatedAt ? formatDate(latestUpdatedAt).slice(5, 16) : "--",
    items: rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      category: rule.category,
      description: rule.description,
      promptTemplate: rule.promptTemplate,
      severity: rule.severity,
      enabled: rule.enabled,
      updatedAtLabel: formatDate(rule.updatedAt),
    })),
    totalCount: rules.length,
  };
}
