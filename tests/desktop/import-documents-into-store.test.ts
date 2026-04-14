import { describe, expect, it, vi } from "vitest";

import { importDocumentsIntoStore } from "@/desktop/core/files/import-documents-into-store";

vi.mock("@/desktop/core/files/import-documents", () => ({
  importDocuments: vi.fn(),
}));

describe("importDocumentsIntoStore", () => {
  it("parses local files, persists documents, and returns workbench rows", async () => {
    const { importDocuments } = await import("@/desktop/core/files/import-documents");

    vi.mocked(importDocuments).mockResolvedValue([
      {
        title: "四月活动排期",
        filename: "schedule.xlsx",
        fileType: "xlsx",
        rawText: "活动排期正文",
        blocks: [
          {
            blockIndex: 0,
            blockType: "heading",
            text: "总览",
            level: 2,
            listKind: null,
            charStart: 0,
            charEnd: 2,
          },
        ],
        paragraphs: [
          {
            paragraphIndex: 0,
            text: "活动排期正文",
            charStart: 0,
            charEnd: 6,
          },
        ],
      },
    ]);

    const tx = {
      document: {
        create: vi.fn().mockResolvedValue({
          id: "doc_1",
          title: "四月活动排期",
          filename: "schedule.xlsx",
          fileType: "xlsx",
          blockCount: 1,
        }),
      },
    };

    const prisma = {
      $transaction: vi.fn(async (callback) => callback(tx as never)),
    };

    const result = await importDocumentsIntoStore(prisma as never, ["/tmp/schedule.xlsx"]);

    expect(importDocuments).toHaveBeenCalledWith(["/tmp/schedule.xlsx"]);
    expect(tx.document.create).toHaveBeenCalledWith({
      data: {
        title: "四月活动排期",
        filename: "schedule.xlsx",
        fileType: "xlsx",
        rawText: "活动排期正文",
        paragraphCount: 1,
        blockCount: 1,
        blocks: {
          createMany: {
            data: [
              {
                blockIndex: 0,
                blockType: "heading",
                text: "总览",
                level: 2,
                listKind: null,
                charStart: 0,
                charEnd: 2,
              },
            ],
          },
        },
        paragraphs: {
          createMany: {
            data: [
              {
                paragraphIndex: 0,
                text: "活动排期正文",
                charStart: 0,
                charEnd: 6,
              },
            ],
          },
        },
      },
    });
    expect(result).toEqual([
      {
        id: "doc_1",
        name: "schedule.xlsx",
        fileType: "xlsx",
        note: "标题：四月活动排期 · 1 个文档块",
        summary: {
          blockCount: 1,
          paragraphCount: 1,
          sourceLabel: "本地桌面导入",
          title: "四月活动排期",
        },
        status: "已导入",
      },
    ]);
  });
});
