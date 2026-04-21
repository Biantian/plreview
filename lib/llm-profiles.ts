import type { LlmProfile } from "@prisma/client";

import { parseLlmProfileForm } from "@/lib/llm-profile-form";
import { encryptSecret } from "@/lib/llm-profile-secrets";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

type SaveLlmProfileInput = {
  id?: string;
  name: string;
  provider: string;
  vendorKey: string;
  mode: "live" | "demo";
  baseUrl: string;
  defaultModel: string;
  modelOptionsText: string;
  apiKey: string;
  enabled: boolean;
};

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

async function findExistingProfile(id: string) {
  if (!id) {
    return null;
  }

  return prisma.llmProfile.findUnique({
    where: { id },
  });
}

function buildLlmProfileWriteData(
  parsed: ReturnType<typeof parseLlmProfileForm>,
  existingProfile: LlmProfile | null,
) {
  const data: {
    name: string;
    provider: string;
    vendorKey: string;
    mode: "live" | "demo";
    apiStyle: string;
    baseUrl: string;
    defaultModel: string;
    modelOptionsJson: string;
    enabled: boolean;
    hasApiKey: boolean;
    apiKeyLast4: string | null;
    apiKeyEncrypted?: string;
  } = {
    name: parsed.name,
    provider: parsed.provider,
    vendorKey: parsed.vendorKey,
    mode: parsed.mode,
    apiStyle: "openai_compatible",
    baseUrl: parsed.baseUrl,
    defaultModel: parsed.defaultModel,
    modelOptionsJson: JSON.stringify(parsed.modelOptions),
    enabled: parsed.enabled,
    hasApiKey: parsed.hasApiKey,
    apiKeyLast4: parsed.apiKeyLast4 ?? existingProfile?.apiKeyLast4 ?? null,
  };

  if (parsed.apiKey) {
    const encryptionKey = process.env.APP_ENCRYPTION_KEY;

    if (!encryptionKey) {
      throw new Error("缺少 APP_ENCRYPTION_KEY，无法保存模型密钥。");
    }

    data.apiKeyEncrypted = encryptSecret(parsed.apiKey, encryptionKey);
  }

  return data;
}

export async function saveLlmProfile(input: SaveLlmProfileInput) {
  const id = input.id?.trim() ?? "";
  const existingProfile = await findExistingProfile(id);
  const parsed = parseLlmProfileForm({
    name: input.name,
    provider: input.provider,
    vendorKey: input.vendorKey,
    mode: input.mode,
    baseUrl: input.baseUrl,
    defaultModel: input.defaultModel,
    modelOptionsText: input.modelOptionsText,
    apiKey: input.apiKey,
    hasStoredApiKey: existingProfile?.hasApiKey,
    enabled: input.enabled,
  });
  const data = buildLlmProfileWriteData(parsed, existingProfile);

  if (id) {
    await prisma.llmProfile.update({ where: { id }, data });
  } else {
    await prisma.llmProfile.create({ data });
  }

  return getModelDashboardData();
}

export async function toggleLlmProfileEnabled(id: string, enabled: boolean) {
  const normalizedId = id.trim();

  if (!normalizedId) {
    throw new Error("缺少模型配置 ID。");
  }

  await prisma.llmProfile.update({ where: { id: normalizedId }, data: { enabled } });

  return getModelDashboardData();
}

export async function deleteLlmProfile(id: string) {
  const normalizedId = id.trim();

  if (!normalizedId) {
    throw new Error("缺少模型配置 ID。");
  }

  await prisma.llmProfile.delete({
    where: { id: normalizedId },
  });

  return getModelDashboardData();
}
