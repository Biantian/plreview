import {
  ReviewStatus,
  Severity,
  type LlmProfile,
  type ReviewJob,
  type Rule,
} from "@prisma/client";

import { reviewDocument } from "@/lib/llm-client";
import type { ParsedDocument } from "@/lib/parse-document";
import { prisma } from "@/lib/prisma";
import { resolveReviewRuntime } from "@/lib/review-runtime";

type ExecuteReviewJobInput = {
  reviewJobId: string;
  documentTitle: string;
  modelName: string;
  llmProfile: LlmProfile;
  parsedDocument: ParsedDocument;
  rules: Rule[];
};

export type ReviewListItem = {
  id: string;
  title: string;
  filename: string;
  fileType: string;
  batchName: string | null;
  status: ReviewJob["status"];
  provider: string;
  modelName: string;
  summary: string | null;
  overallScore: number | null;
  annotationsCount: number;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string | null;
};

function mapReviewListItem(
  review: ReviewJob & {
    reviewBatch: {
      name: string;
    } | null;
    document: {
      fileType: string;
      title: string;
      filename: string;
    };
    _count: {
      annotations: number;
    };
  },
): ReviewListItem {
  return {
    id: review.id,
    title: review.document.title,
    filename: review.document.filename,
    fileType: review.document.fileType,
    batchName: review.reviewBatch?.name ?? null,
    status: review.status,
    provider: review.providerSnapshot,
    modelName: review.modelNameSnapshot,
    summary: review.summary,
    overallScore: review.overallScore,
    annotationsCount: review._count.annotations,
    errorMessage: review.errorMessage,
    createdAt: review.createdAt.toISOString(),
    finishedAt: review.finishedAt?.toISOString() ?? null,
  };
}

export async function getReviewListItems(limit?: number) {
  const reviews = await prisma.reviewJob.findMany({
    include: {
      reviewBatch: {
        select: {
          name: true,
        },
      },
      document: {
        select: {
          fileType: true,
          title: true,
          filename: true,
        },
      },
      _count: {
        select: {
          annotations: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    ...(typeof limit === "number" ? { take: limit } : {}),
  });

  return reviews.map(mapReviewListItem);
}

export async function getReviewDashboardData(limit?: number) {
  const items = await getReviewListItems(limit);

  return {
    items,
    totalCount: items.length,
    runningCount: items.filter(
      (review) => review.status === ReviewStatus.pending || review.status === ReviewStatus.running,
    ).length,
    completedCount: items.filter(
      (review) => review.status === ReviewStatus.completed || review.status === ReviewStatus.partial,
    ).length,
    failedCount: items.filter((review) => review.status === ReviewStatus.failed).length,
  };
}

export async function executeReviewJob(input: ExecuteReviewJobInput) {
  const { documentTitle, llmProfile, modelName, parsedDocument, reviewJobId, rules } = input;

  try {
    await prisma.reviewJob.update({
      where: { id: reviewJobId },
      data: {
        status: ReviewStatus.running,
        errorMessage: null,
        finishedAt: null,
      },
    });

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

    const runtime = resolveReviewRuntime({
      mode: llmProfile.mode,
      apiKeyEncrypted: llmProfile.apiKeyEncrypted,
      encryptionKey: process.env.APP_ENCRYPTION_KEY ?? null,
    });

    const { response, reportMarkdown, mode } = await reviewDocument({
      documentTitle,
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
      model: modelName,
      mode: runtime.mode,
      apiKey: runtime.apiKey,
    });

    const versionMap = new Map(ruleVersions.map((version) => [version.ruleId, version]));
    const blockSet = new Set(parsedDocument.blocks.map((item) => item.blockIndex));
    const rawAnnotationCount = response.ruleFindings.flatMap((item) => item.annotations).length;
    const validAnnotations = response.ruleFindings.flatMap((finding) =>
      finding.annotations
        .filter(
          (annotation) => blockSet.has(annotation.blockIndex) && versionMap.has(annotation.ruleId),
        )
        .map((annotation) => {
          const version = versionMap.get(annotation.ruleId);

          if (!version) {
            return null;
          }

          return {
            reviewJobId,
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
        where: { id: reviewJobId },
        data: {
          status: validAnnotations.length < rawAnnotationCount ? ReviewStatus.partial : ReviewStatus.completed,
          summary: mode === "mock" ? `[演示模式] ${response.summary}` : response.summary,
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
      where: { id: reviewJobId },
      data: {
        status: ReviewStatus.failed,
        errorMessage: message,
        finishedAt: new Date(),
      },
    });
  }
}
