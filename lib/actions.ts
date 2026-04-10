"use server";

import { ReviewStatus, Severity } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { RULE_TEMPLATE } from "@/lib/defaults";
import { reviewDocument } from "@/lib/llm-client";
import { parseUploadedDocument } from "@/lib/parse-document";
import { prisma } from "@/lib/prisma";

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

  const parsedDocument = await parseUploadedDocument(file);
  const finalTitle = title || parsedDocument.title;

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
      providerSnapshot: llmProfile.provider,
      modelNameSnapshot: modelName || llmProfile.defaultModel,
      status: ReviewStatus.running,
    },
  });

  try {
    const ruleVersions = await Promise.all(
      rules.map(async (rule) => {
        const latest = await prisma.ruleVersion.findFirst({
          where: { ruleId: rule.id },
          orderBy: { version: "desc" },
        });

        return prisma.ruleVersion.create({
          data: {
            ruleId: rule.id,
            version: (latest?.version ?? 0) + 1,
            nameSnapshot: rule.name,
            descriptionSnapshot: rule.description,
            promptTemplateSnapshot: rule.promptTemplate,
            severitySnapshot: rule.severity,
          },
        });
      }),
    );

    const { response, reportMarkdown, mode } = await reviewDocument({
      documentTitle: finalTitle,
      rawText: parsedDocument.rawText,
      blocks: parsedDocument.blocks.map(({ blockIndex, blockType, text, level, listKind }) => ({
        blockIndex,
        blockType,
        text,
        level,
        listKind,
      })),
      rules,
      provider: llmProfile.provider,
      baseUrl: llmProfile.baseUrl,
      model: modelName || llmProfile.defaultModel,
    });

    const versionMap = new Map(ruleVersions.map((version) => [version.ruleId, version]));
    const blockSet = new Set(parsedDocument.blocks.map((item) => item.blockIndex));
    const validAnnotations = response.ruleFindings.flatMap((finding) =>
      finding.annotations
        .filter(
          (annotation) =>
            blockSet.has(annotation.blockIndex) &&
            versionMap.has(annotation.ruleId),
        )
        .map((annotation) => {
          const version = versionMap.get(annotation.ruleId);

          if (!version) {
            return null;
          }

          return {
            reviewJobId: reviewJob.id,
            ruleId: annotation.ruleId,
            ruleVersionId: version.id,
            paragraphIndex: annotation.paragraphIndex ?? annotation.blockIndex,
            blockIndex: annotation.blockIndex,
            issue: annotation.issue,
            suggestion: annotation.suggestion,
            severity: annotation.severity,
            evidenceText: annotation.evidenceText ?? null,
          };
        })
        .filter(Boolean),
    );

    await prisma.$transaction(async (tx) => {
      if (validAnnotations.length > 0) {
        await tx.annotation.createMany({
          data: validAnnotations as Array<{
            reviewJobId: string;
            ruleId: string;
            ruleVersionId: string;
            paragraphIndex: number;
            blockIndex: number;
            issue: string;
            suggestion: string;
            severity: Severity;
            evidenceText: string | null;
          }>,
        });
      }

      await tx.reviewJob.update({
        where: { id: reviewJob.id },
        data: {
          status:
            validAnnotations.length < response.ruleFindings.flatMap((item) => item.annotations).length
              ? ReviewStatus.partial
              : ReviewStatus.completed,
          summary:
            mode === "mock" ? `[演示模式] ${response.summary}` : response.summary,
          overallScore: response.overallScore,
          reportMarkdown,
          errorMessage: null,
          finishedAt: new Date(),
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "评审失败，请稍后重试。";

    await prisma.reviewJob.update({
      where: { id: reviewJob.id },
      data: {
        status: ReviewStatus.failed,
        errorMessage: message,
        finishedAt: new Date(),
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/reviews/new");
  redirect(`/reviews/${reviewJob.id}`);
}

export async function ensureDefaultTemplateAction() {
  return RULE_TEMPLATE;
}
