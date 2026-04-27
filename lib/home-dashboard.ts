import { prisma } from "@/lib/prisma";

export async function getHomeDashboardData() {
  const [
    rulesCount,
    enabledRulesCount,
    documentsCount,
    reviewJobsCount,
    annotationsCount,
    recentReviews,
    llmProfiles,
  ] = await Promise.all([
    prisma.rule.count({ where: { deletedAt: null } }),
    prisma.rule.count({ where: { enabled: true, deletedAt: null } }),
    prisma.document.count(),
    prisma.reviewJob.count(),
    prisma.annotation.count(),
    prisma.reviewJob.findMany({
      include: {
        document: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
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
  ]);

  return {
    rulesCount,
    enabledRulesCount,
    documentsCount,
    reviewJobsCount,
    annotationsCount,
    recentReviews: recentReviews.map((review) => ({
      id: review.id,
      title: review.document.title,
      status: review.status,
      modelName: review.modelNameSnapshot,
      createdAt: review.createdAt.toISOString(),
    })),
    llmProfiles,
  };
}
