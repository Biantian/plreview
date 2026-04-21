import { Severity } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

type SaveRuleInput = {
  id?: string;
  name: string;
  category: string;
  description: string;
  promptTemplate: string;
  severity: Severity;
  enabled: boolean;
};

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

export async function saveRule(input: SaveRuleInput) {
  const id = input.id?.trim() ?? "";
  const name = input.name.trim();
  const category = input.category.trim();
  const description = input.description.trim();
  const promptTemplate = input.promptTemplate.trim();

  if (!name || !category || !description || !promptTemplate) {
    throw new Error("规则名称、分类、说明和评审模板均为必填项。");
  }

  if (id) {
    await prisma.rule.update({
      where: { id },
      data: {
        name,
        category,
        description,
        promptTemplate,
        severity: input.severity,
        enabled: input.enabled,
      },
    });
  } else {
    await prisma.rule.create({
      data: {
        name,
        category,
        description,
        promptTemplate,
        severity: input.severity,
        enabled: input.enabled,
      },
    });
  }

  return getRuleDashboardData();
}

export async function toggleRuleEnabled(id: string, enabled: boolean) {
  const normalizedId = id.trim();

  if (!normalizedId) {
    throw new Error("缺少规则 ID。");
  }

  await prisma.rule.update({
    where: { id: normalizedId },
    data: {
      enabled,
    },
  });

  return getRuleDashboardData();
}
