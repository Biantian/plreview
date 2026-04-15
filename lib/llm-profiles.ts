import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export async function getModelDashboardData() {
  const profiles = await prisma.llmProfile.findMany({
    orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
  });

  const enabledCount = profiles.filter((profile) => profile.enabled).length;
  const liveCount = profiles.filter((profile) => profile.mode === "live").length;
  const latestUpdatedAt = profiles.reduce<Date | null>(
    (latest, profile) => (!latest || profile.updatedAt > latest ? profile.updatedAt : latest),
    null,
  );

  return {
    metrics: {
      totalCount: profiles.length,
      enabledCount,
      liveCount,
      latestUpdatedAtLabel: latestUpdatedAt ? formatDate(latestUpdatedAt).slice(5, 16) : "--",
    },
    profiles: profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      provider: profile.provider,
      vendorKey: profile.vendorKey,
      mode: profile.mode,
      baseUrl: profile.baseUrl,
      defaultModel: profile.defaultModel,
      modelOptionsText: JSON.parse(profile.modelOptionsJson ?? "[]").join("\n"),
      enabled: profile.enabled,
      hasApiKey: profile.hasApiKey,
      apiKeyLast4: profile.apiKeyLast4,
    })),
  };
}
