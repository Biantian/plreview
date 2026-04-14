import type { PrismaClient } from "@prisma/client";

import { importDocuments } from "@/desktop/core/files/import-documents";

export type ImportedDocumentSummary = {
  title: string;
  blockCount: number;
  paragraphCount: number;
  sourceLabel: string;
};

export type ImportedDocumentRecord = {
  id: string;
  name: string;
  fileType: string;
  status: string;
  note: string;
  summary: ImportedDocumentSummary;
};

export async function importDocumentsIntoStore(
  prisma: PrismaClient,
  filePaths: string[],
): Promise<ImportedDocumentRecord[]> {
  const parsedDocuments = await importDocuments(filePaths);

  return prisma.$transaction(async (tx) =>
    Promise.all(
      parsedDocuments.map(async (parsedDocument) => {
        const document = await tx.document.create({
          data: {
            title: parsedDocument.title,
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

        return {
          id: document.id,
          name: document.filename,
          fileType: document.fileType,
          status: "已导入",
          note: `标题：${document.title} · ${document.blockCount} 个文档块`,
          summary: {
            title: parsedDocument.title,
            blockCount: parsedDocument.blocks.length,
            paragraphCount: parsedDocument.paragraphs.length,
            sourceLabel: "本地桌面导入",
          },
        };
      }),
    ),
  );
}
