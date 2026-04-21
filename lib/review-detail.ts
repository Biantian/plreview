import { prisma } from "@/lib/prisma";

export async function getReviewDetailData(reviewId: string) {
  const normalizedReviewId = reviewId.trim();

  if (!normalizedReviewId) {
    throw new Error("缺少评审任务 ID。");
  }

  const review = await prisma.reviewJob.findUnique({
    where: { id: normalizedReviewId },
    include: {
      document: {
        include: {
          blocks: {
            orderBy: { blockIndex: "asc" },
          },
          paragraphs: {
            orderBy: { paragraphIndex: "asc" },
          },
        },
      },
      annotations: {
        include: {
          rule: true,
        },
        orderBy: [{ blockIndex: "asc" }, { paragraphIndex: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!review) {
    throw new Error("未找到对应的评审任务。");
  }

  const blocks =
    review.document.blocks.length > 0
      ? review.document.blocks.map((block) => ({
          blockIndex: block.blockIndex,
          blockType: block.blockType,
          text: block.text,
          level: block.level,
          listKind: block.listKind,
        }))
      : review.document.paragraphs.map((paragraph) => ({
          blockIndex: paragraph.paragraphIndex,
          blockType: "paragraph" as const,
          text: paragraph.text,
          level: null,
          listKind: null,
        }));

  const annotations = review.annotations
    .map((annotation) => {
      const blockIndex = annotation.blockIndex ?? annotation.paragraphIndex;

      if (typeof blockIndex !== "number") {
        return null;
      }

      return {
        id: annotation.id,
        blockIndex,
        issue: annotation.issue,
        suggestion: annotation.suggestion,
        severity: annotation.severity,
        evidenceText: annotation.evidenceText,
        ruleName: annotation.rule.name,
      };
    })
    .filter((annotation): annotation is NonNullable<typeof annotation> => annotation !== null);

  const hitBlockCount = new Set(
    annotations
      .map((annotation) => annotation.blockIndex)
  ).size;

  return {
    id: review.id,
    title: review.document.title,
    filename: review.document.filename,
    providerSnapshot: review.providerSnapshot,
    modelNameSnapshot: review.modelNameSnapshot,
    createdAt: review.createdAt.toISOString(),
    status: review.status,
    summary: review.summary,
    errorMessage: review.errorMessage,
    overallScore: review.overallScore,
    annotationsCount: annotations.length,
    hitBlockCount,
    highPriorityCount: annotations.filter((annotation) =>
      ["high", "critical"].includes(annotation.severity),
    ).length,
    reportMarkdown: review.reportMarkdown,
    blocks,
    annotations,
  };
}
