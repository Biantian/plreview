import type { PrismaClient, Severity } from "@prisma/client";

export type DesktopRuleRow = {
  id: string;
  enabled: boolean;
  name: string;
  category: string;
  severity: Severity;
  description: string;
  promptTemplate: string;
  updatedAtLabel: string;
};

function formatUpdatedAt(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export async function listRules(prisma: PrismaClient) {
  const rules = await prisma.rule.findMany({
    where: { deletedAt: null },
    orderBy: [{ enabled: "desc" }, { category: "asc" }, { updatedAt: "desc" }],
  });

  return rules.map<DesktopRuleRow>((rule) => ({
    id: rule.id,
    enabled: rule.enabled,
    name: rule.name,
    category: rule.category,
    severity: rule.severity,
    description: rule.description,
    promptTemplate: rule.promptTemplate,
    updatedAtLabel: formatUpdatedAt(rule.updatedAt),
  }));
}
