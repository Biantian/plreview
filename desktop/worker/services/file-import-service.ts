import type { PrismaClient } from "@prisma/client";

import { importDocumentsIntoStore } from "@/desktop/core/files/import-documents-into-store";

export function createFileImportService(prisma: PrismaClient) {
  return {
    importDocumentsIntoStore: (paths: string[]) =>
      importDocumentsIntoStore(prisma, paths),
  };
}
