import { ReviewStatus, type PrismaClient } from "@prisma/client";

import { executeReviewJob } from "@/lib/review-jobs";

export type CreateReviewBatchInput = {
  batchName: string;
  llmProfileId: string;
  modelName?: string;
  ruleIds: string[];
  documents: Array<{
    documentId: string;
  }>;
};

function uniqueRuleIds(ruleIds: string[]) {
  return [...new Set(ruleIds.map((ruleId) => ruleId.trim()).filter(Boolean))];
}

function uniqueDocumentIds(documents: Array<{ documentId: string }>) {
  return [...new Set(documents.map((document) => document.documentId.trim()).filter(Boolean))];
}

function toParsedDocument(document: {
  title: string;
  filename: string;
  fileType: string;
  rawText: string;
  blocks: Array<{
    blockIndex: number;
    blockType: "heading" | "paragraph" | "list_item";
    text: string;
    level: number | null;
    listKind: "unordered" | "ordered" | null;
    charStart: number;
    charEnd: number;
  }>;
  paragraphs: Array<{
    paragraphIndex: number;
    text: string;
    charStart: number;
    charEnd: number;
  }>;
}): Parameters<typeof executeReviewJob>[0]["parsedDocument"] {
  return {
    title: document.title,
    filename: document.filename,
    fileType: document.fileType,
    rawText: document.rawText,
    blocks: document.blocks.map((block) => ({
      blockIndex: block.blockIndex,
      blockType: block.blockType,
      text: block.text,
      level: block.level,
      listKind: block.listKind,
      charStart: block.charStart,
      charEnd: block.charEnd,
    })),
    paragraphs: document.paragraphs.map((paragraph) => ({
      paragraphIndex: paragraph.paragraphIndex,
      text: paragraph.text,
      charStart: paragraph.charStart,
      charEnd: paragraph.charEnd,
    })),
  };
}

export type ReviewJobExecutor = (input: {
  reviewJobId: string;
  documentTitle: string;
  modelName: string;
  llmProfile: Parameters<typeof executeReviewJob>[0]["llmProfile"];
  parsedDocument: Parameters<typeof executeReviewJob>[0]["parsedDocument"];
  rules: Parameters<typeof executeReviewJob>[0]["rules"];
}) => Promise<unknown>;

export async function createReviewBatch(
  prisma: PrismaClient,
  input: CreateReviewBatchInput,
  executeJob: ReviewJobExecutor = executeReviewJob,
) {
  const documentIds = uniqueDocumentIds(input.documents);
  let llmProfile: Parameters<typeof executeReviewJob>[0]["llmProfile"] | null = null;
  let modelNameSnapshot = "";
  let orderedRules: Parameters<typeof executeReviewJob>[0]["rules"] = [];
  let reviewJobsToExecute: Array<{
    id: string;
    documentId: string;
    document: Parameters<typeof executeReviewJob>[0]["parsedDocument"];
  }> = [];

  const batch = await prisma.$transaction(async (tx) => {
    const llmProfileRecord = await tx.llmProfile.findUnique({
      where: { id: input.llmProfileId },
    });

    if (!llmProfileRecord) {
      throw new Error("未找到可用的大模型配置。");
    }

    llmProfile = llmProfileRecord;

    const batchName = input.batchName.trim();
    if (!batchName) {
      throw new Error("批次名称不能为空。");
    }

    const ruleIds = uniqueRuleIds(input.ruleIds);
    if (ruleIds.length === 0) {
      throw new Error("请至少选择一条评审规则。");
    }

    if (documentIds.length === 0) {
      throw new Error("请至少选择一份待评审文档。");
    }

    const selectedRules = await tx.rule.findMany({
      where: {
        id: { in: ruleIds },
        enabled: true,
        deletedAt: null,
      },
    });

    if (selectedRules.length !== ruleIds.length) {
      throw new Error("部分已选择的评审规则不存在。");
    }

    const selectedRuleById = new Map(selectedRules.map((rule) => [rule.id, rule]));
    orderedRules = ruleIds.map((ruleId) => selectedRuleById.get(ruleId)!);

    const ruleVersions: Array<{ id: string }> = [];

    for (const rule of orderedRules) {
      const latestRuleVersion = await tx.ruleVersion.findFirst({
        where: { ruleId: rule.id },
        orderBy: { version: "desc" },
      });

      if (latestRuleVersion) {
        ruleVersions.push(latestRuleVersion);
        continue;
      }

      const createdRuleVersion = await tx.ruleVersion.create({
        data: {
          ruleId: rule.id,
          version: 1,
          nameSnapshot: rule.name,
          descriptionSnapshot: rule.description,
          promptTemplateSnapshot: rule.promptTemplate,
          severitySnapshot: rule.severity,
        },
      });

      ruleVersions.push(createdRuleVersion);
    }

    modelNameSnapshot = input.modelName?.trim() || llmProfileRecord.defaultModel;

    const batch = await tx.reviewBatch.create({
      data: {
        name: batchName,
        llmProfileId: llmProfileRecord.id,
        providerSnapshot: llmProfileRecord.provider,
        modelNameSnapshot,
      },
    });

    await tx.reviewBatchRule.createMany({
      data: ruleVersions.map((ruleVersion) => ({
        reviewBatchId: batch.id,
        ruleVersionId: ruleVersion.id,
      })),
    });

    await tx.reviewJob.createMany({
      data: documentIds.map((documentId) => ({
        batchId: batch.id,
        documentId,
        llmProfileId: llmProfileRecord.id,
        providerSnapshot: llmProfileRecord.provider,
        modelNameSnapshot,
        status: ReviewStatus.pending,
      })),
    });

    reviewJobsToExecute = await tx.reviewJob.findMany({
      where: {
        batchId: batch.id,
        documentId: {
          in: documentIds,
        },
      },
      select: {
        id: true,
        documentId: true,
        document: {
          select: {
            title: true,
            filename: true,
            fileType: true,
            rawText: true,
            blocks: {
              orderBy: {
                blockIndex: "asc",
              },
              select: {
                blockIndex: true,
                blockType: true,
                text: true,
                level: true,
                listKind: true,
                charStart: true,
                charEnd: true,
              },
            },
            paragraphs: {
              orderBy: {
                paragraphIndex: "asc",
              },
              select: {
                paragraphIndex: true,
                text: true,
                charStart: true,
                charEnd: true,
              },
            },
          },
        },
      },
    });

    if (reviewJobsToExecute.length !== documentIds.length) {
      throw new Error("评审任务初始化失败，请重试。");
    }

    return batch;
  });

  const reviewJobByDocumentId = new Map(reviewJobsToExecute.map((job) => [job.documentId, job]));

  const reviewJobs = documentIds
    .map((documentId) => reviewJobByDocumentId.get(documentId))
    .filter((job): job is NonNullable<typeof job> => Boolean(job))
    .map((job) => ({
      reviewJobId: job.id,
      documentTitle: job.document.title,
      modelName: modelNameSnapshot,
      llmProfile: llmProfile!,
      parsedDocument: toParsedDocument(job.document),
      rules: orderedRules,
    }));

  void Promise.allSettled(reviewJobs.map((job) => executeJob(job)));

  return batch;
}
