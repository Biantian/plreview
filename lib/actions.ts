"use server";

import { ReviewStatus, Severity } from "@prisma/client";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { RULE_TEMPLATE } from "@/lib/defaults";
import { parseLlmProfileForm } from "@/lib/llm-profile-form";
import { encryptSecret } from "@/lib/llm-profile-secrets";
import { parseUploadedDocument } from "@/lib/parse-document";
import { prisma } from "@/lib/prisma";
import { executeReviewJob } from "@/lib/review-jobs";

function getSeverity(value: FormDataEntryValue | null) {
  switch (value) {
    case Severity.low:
    case Severity.medium:
    case Severity.high:
    case Severity.critical:
      return value;
    default:
      return Severity.medium;
  }
}

export async function saveRuleAction(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const promptTemplate = String(formData.get("promptTemplate") || "").trim();
  const severity = getSeverity(formData.get("severity"));
  const enabled = formData.get("enabled") === "on";

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
        severity,
        enabled,
      },
    });
  } else {
    await prisma.rule.create({
      data: {
        name,
        category,
        description,
        promptTemplate,
        severity,
        enabled,
      },
    });
  }

  revalidatePath("/rules");
  revalidatePath("/");
}

export async function toggleRuleEnabledAction(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const enabled = formData.get("enabled") === "true";

  if (!id) {
    throw new Error("缺少规则 ID。");
  }

  await prisma.rule.update({
    where: { id },
    data: {
      enabled,
    },
  });

  revalidatePath("/rules");
  revalidatePath("/reviews/new");
  revalidatePath("/");
}

export async function saveLlmProfileAction(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const existingProfile = id
    ? await prisma.llmProfile.findUnique({
        where: { id },
      })
    : null;

  const parsed = parseLlmProfileForm({
    name: String(formData.get("name") || ""),
    provider: String(formData.get("provider") || ""),
    vendorKey: String(formData.get("vendorKey") || "openai_compatible"),
    mode: String(formData.get("mode") || "live") as "live" | "demo",
    baseUrl: String(formData.get("baseUrl") || ""),
    defaultModel: String(formData.get("defaultModel") || ""),
    modelOptionsText: String(formData.get("modelOptionsText") || ""),
    apiKey: String(formData.get("apiKey") || ""),
    hasStoredApiKey: existingProfile?.hasApiKey,
    enabled: formData.has("enabled")
      ? formData.get("enabled") === "on"
      : existingProfile?.enabled ?? false,
  });

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

  if (id) {
    await prisma.llmProfile.update({ where: { id }, data });
  } else {
    await prisma.llmProfile.create({ data });
  }

  revalidatePath("/models");
  revalidatePath("/reviews/new");
  revalidatePath("/");
}

export async function toggleLlmProfileEnabledAction(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const enabled = formData.get("enabled") === "true";

  if (!id) {
    throw new Error("缺少模型配置 ID。");
  }

  await prisma.llmProfile.update({ where: { id }, data: { enabled } });

  revalidatePath("/models");
  revalidatePath("/reviews/new");
  revalidatePath("/");
}

export async function deleteLlmProfileAction(formData: FormData) {
  const id = String(formData.get("id") || "").trim();

  if (!id) {
    throw new Error("缺少模型配置 ID。");
  }

  await prisma.llmProfile.delete({
    where: { id },
  });

  revalidatePath("/models");
  revalidatePath("/reviews/new");
  revalidatePath("/");
}

export async function createReviewAction(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const llmProfileId = String(formData.get("llmProfileId") || "").trim();
  const modelName = String(formData.get("modelName") || "").trim();
  const ruleIds = formData
    .getAll("ruleIds")
    .map((value) => String(value))
    .filter(Boolean);
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("请先上传策划案文件。");
  }

  if (ruleIds.length === 0) {
    throw new Error("请至少选择一条评审规则。");
  }

  const [rules, llmProfile] = await Promise.all([
    prisma.rule.findMany({
      where: {
        id: { in: ruleIds },
      },
      orderBy: [{ category: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.llmProfile.findUnique({
      where: { id: llmProfileId },
    }),
  ]);

  if (!llmProfile) {
    throw new Error("未找到可用的大模型配置。");
  }

  if (llmProfile.mode === "live" && !llmProfile.hasApiKey) {
    throw new Error("当前模型配置缺少 API Key。");
  }

  const parsedDocument = await parseUploadedDocument(file);
  const finalTitle = title || parsedDocument.title;
  const resolvedModelName = modelName || llmProfile.defaultModel;

  const document = await prisma.document.create({
    data: {
      title: finalTitle,
      filename: parsedDocument.filename,
      fileType: parsedDocument.fileType,
      rawText: parsedDocument.rawText,
      paragraphCount: parsedDocument.paragraphs.length,
      blockCount: parsedDocument.blocks.length,
      blocks: {
        createMany: {
          data: parsedDocument.blocks,
        },
      },
      paragraphs: {
        createMany: {
          data: parsedDocument.paragraphs,
        },
      },
    },
  });

  const reviewJob = await prisma.reviewJob.create({
    data: {
      documentId: document.id,
      llmProfileId: llmProfile.id,
      profileNameSnapshot: llmProfile.name,
      providerSnapshot: llmProfile.provider,
      baseUrlSnapshot: llmProfile.baseUrl,
      modelNameSnapshot: resolvedModelName,
      status: ReviewStatus.pending,
    },
  });

  after(async () => {
    await executeReviewJob({
      reviewJobId: reviewJob.id,
      documentTitle: finalTitle,
      modelName: resolvedModelName,
      llmProfile,
      parsedDocument,
      rules,
    });
  });

  revalidatePath("/");
  revalidatePath("/reviews");
  revalidatePath("/reviews/new");
  redirect("/reviews");
}

export async function ensureDefaultTemplateAction() {
  return RULE_TEMPLATE;
}
