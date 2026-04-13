import { ReviewStatus, type PrismaClient } from "@prisma/client";

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

export async function createReviewBatch(prisma: PrismaClient, input: CreateReviewBatchInput) {
  return prisma.$transaction(async (tx) => {
    const llmProfile = await tx.llmProfile.findUnique({
      where: { id: input.llmProfileId },
    });

    if (!llmProfile) {
      throw new Error("未找到可用的大模型配置。");
    }

    const batchName = input.batchName.trim();
    if (!batchName) {
      throw new Error("批次名称不能为空。");
    }

    const ruleIds = uniqueRuleIds(input.ruleIds);
    if (ruleIds.length === 0) {
      throw new Error("请至少选择一条评审规则。");
    }

    const documentIds = uniqueDocumentIds(input.documents);
    if (documentIds.length === 0) {
      throw new Error("请至少选择一份待评审文档。");
    }

    const selectedRules = await tx.rule.findMany({
      where: {
        id: { in: ruleIds },
      },
    });

    if (selectedRules.length !== ruleIds.length) {
      throw new Error("部分已选择的评审规则不存在。");
    }

    const selectedRuleById = new Map(selectedRules.map((rule) => [rule.id, rule]));
    const orderedRules = ruleIds.map((ruleId) => selectedRuleById.get(ruleId)!);

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

    const modelNameSnapshot = input.modelName?.trim() || llmProfile.defaultModel;

    const batch = await tx.reviewBatch.create({
      data: {
        name: batchName,
        llmProfileId: llmProfile.id,
        providerSnapshot: llmProfile.provider,
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
        llmProfileId: llmProfile.id,
        providerSnapshot: llmProfile.provider,
        modelNameSnapshot,
        status: ReviewStatus.pending,
      })),
    });

    return batch;
  });
}
