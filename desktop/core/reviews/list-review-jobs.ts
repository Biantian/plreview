import type { PrismaClient } from "@prisma/client";

export type DesktopReviewJobRow = {
  id: string;
  status: string;
  title: string;
  filename: string;
  fileType: string;
  batchName: string | null;
  modelName: string;
  annotationsCount: number;
  overallScore: number | null;
  createdAt: string;
  finishedAt: string | null;
};

export async function listReviewJobs(prisma: PrismaClient, limit = 50) {
  const reviewJobs = await prisma.reviewJob.findMany({
    include: {
      reviewBatch: {
        select: {
          name: true,
        },
      },
      document: {
        select: {
          fileType: true,
          filename: true,
          title: true,
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
    take: limit,
  });

  return reviewJobs.map<DesktopReviewJobRow>((item) => ({
    id: item.id,
    status: item.status,
    title: item.document.title,
    filename: item.document.filename,
    fileType: item.document.fileType,
    batchName: item.reviewBatch?.name ?? null,
    modelName: item.modelNameSnapshot,
    annotationsCount: item._count.annotations,
    overallScore: item.overallScore,
    createdAt: item.createdAt.toISOString(),
    finishedAt: item.finishedAt?.toISOString() ?? null,
  }));
}
