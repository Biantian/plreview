import { prisma } from "@/lib/prisma";

export async function getReviewLaunchData() {
  const [llmProfiles, rules, latestReviewBatch] = await Promise.all([
    prisma.llmProfile.findMany({
      where: { enabled: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        provider: true,
        defaultModel: true,
      },
    }),
    prisma.rule.findMany({
      where: {
        enabled: true,
        deletedAt: null,
      },
      orderBy: [{ category: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        severity: true,
      },
    }),
    prisma.reviewBatch.findFirst({
      orderBy: { createdAt: "desc" },
      select: {
        batchRules: {
          select: {
            ruleVersion: {
              select: {
                ruleId: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    llmProfiles,
    rules,
    lastBatchRuleIds: Array.from(
      new Set(
        (latestReviewBatch?.batchRules ?? []).map(
          (reviewBatchRule) => reviewBatchRule.ruleVersion.ruleId,
        ),
      ),
    ),
  };
}
