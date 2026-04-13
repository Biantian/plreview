import { parseLocalDocument } from "@/desktop/core/files/parse-local-document";
import type { ParsedDocument } from "@/lib/parse-document";

export async function importDocuments(filePaths: string[]): Promise<ParsedDocument[]> {
  return Promise.all(filePaths.map((filePath) => parseLocalDocument(filePath)));
}
