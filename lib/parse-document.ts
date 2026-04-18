export type ParsedBlock = {
  blockIndex: number;
  blockType: "heading" | "paragraph" | "list_item";
  text: string;
  level: number | null;
  listKind: "unordered" | "ordered" | null;
  charStart: number;
  charEnd: number;
};

type ParsedParagraph = {
  paragraphIndex: number;
  text: string;
  charStart: number;
  charEnd: number;
};

export type ParsedDocument = {
  title: string;
  filename: string;
  fileType: string;
  rawText: string;
  blocks: ParsedBlock[];
  paragraphs: ParsedParagraph[];
};

type PendingBlock = {
  blockType: ParsedBlock["blockType"];
  text: string;
  level: number | null;
  listKind: ParsedBlock["listKind"];
};

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeWhitespace(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function finalizeBlocks(items: PendingBlock[]) {
  const blocks: ParsedBlock[] = [];
  const rawParts: string[] = [];
  let cursor = 0;

  items.forEach((item, index) => {
    const normalizedText = item.text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

    if (!normalizedText) {
      return;
    }

    let printable = normalizedText;
    if (item.blockType === "heading") {
      const hashes = "#".repeat(Math.max(1, item.level ?? 1));
      printable = `${hashes} ${normalizedText}`;
    }

    if (item.blockType === "list_item") {
      printable =
        item.listKind === "ordered"
          ? `${index + 1}. ${normalizedText}`
          : `- ${normalizedText}`;
    }

    const charStart = cursor;
    const charEnd = charStart + printable.length;

    blocks.push({
      blockIndex: blocks.length,
      blockType: item.blockType,
      text: normalizedText,
      level: item.level,
      listKind: item.listKind,
      charStart,
      charEnd,
    });

    rawParts.push(printable);
    cursor = charEnd + 2;
  });

  const rawText = rawParts.join("\n\n");

  return {
    rawText,
    blocks,
  };
}

function blocksToLegacyParagraphs(blocks: ParsedBlock[]): ParsedParagraph[] {
  return blocks.map((block) => ({
    paragraphIndex: block.blockIndex,
    text: block.text,
    charStart: block.charStart,
    charEnd: block.charEnd,
  }));
}

export function createParsedDocument({
  title,
  filename,
  fileType,
  rawText,
  blocks,
}: {
  title: string;
  filename: string;
  fileType: string;
  rawText: string;
  blocks: ParsedBlock[];
}): ParsedDocument {
  return {
    title,
    filename,
    fileType,
    rawText,
    blocks,
    paragraphs: blocksToLegacyParagraphs(blocks),
  };
}

function looksLikeHeading(line: string, nextLine: string | undefined, previousBlank: boolean) {
  const compact = line.trim();

  if (!compact || compact.length > 40) {
    return false;
  }

  if (/[。！？.!?]/.test(compact)) {
    return false;
  }

  if (/[:：]$/.test(compact)) {
    return true;
  }

  return previousBlank && Boolean(nextLine && nextLine.trim());
}

function parsePlainTextToPendingBlocks(rawText: string, fileType: string) {
  const normalized = normalizeWhitespace(rawText);
  const lines = normalized.split("\n");
  const items: PendingBlock[] = [];
  let buffer: string[] = [];

  function flushParagraph() {
    const text = buffer.join("\n").trim();
    if (!text) {
      buffer = [];
      return;
    }

    items.push({
      blockType: "paragraph",
      text,
      level: null,
      listKind: null,
    });
    buffer = [];
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const nextLine = lines[index + 1];
    const previousLine = index > 0 ? lines[index - 1] : "";
    const previousBlank = previousLine.trim() === "";

    if (!trimmed) {
      flushParagraph();
      return;
    }

    const markdownHeading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (markdownHeading) {
      flushParagraph();
      items.push({
        blockType: "heading",
        text: markdownHeading[2].trim(),
        level: markdownHeading[1].length,
        listKind: null,
      });
      return;
    }

    const unorderedList = trimmed.match(/^[-*+]\s+(.+)$/);
    if (unorderedList) {
      flushParagraph();
      items.push({
        blockType: "list_item",
        text: unorderedList[1].trim(),
        level: 1,
        listKind: "unordered",
      });
      return;
    }

    const orderedList = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (orderedList) {
      flushParagraph();
      items.push({
        blockType: "list_item",
        text: orderedList[2].trim(),
        level: 1,
        listKind: "ordered",
      });
      return;
    }

    if (fileType === "txt" && looksLikeHeading(trimmed, nextLine, previousBlank)) {
      flushParagraph();
      items.push({
        blockType: "heading",
        text: trimmed.replace(/[:：]$/, "").trim(),
        level: 2,
        listKind: null,
      });
      return;
    }

    buffer.push(trimmed);
  });

  flushParagraph();

  return finalizeBlocks(items);
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).trim();
}

function parseDocxHtmlToPendingBlocks(html: string) {
  const normalized = html.replace(/\r\n/g, "\n");
  const tokenPattern = /<(\/?)([a-z0-9]+)(?:\s[^>]*)?>|([^<]+)/gi;
  const listStack: Array<"unordered" | "ordered"> = [];
  const items: PendingBlock[] = [];
  let currentTag: "heading" | "paragraph" | "list_item" | null = null;
  let currentText = "";
  let currentLevel: number | null = null;
  let currentListKind: "unordered" | "ordered" | null = null;

  function openBlock(
    tag: "heading" | "paragraph" | "list_item",
    level: number | null,
    listKind: "unordered" | "ordered" | null,
  ) {
    currentTag = tag;
    currentText = "";
    currentLevel = level;
    currentListKind = listKind;
  }

  function closeBlock() {
    if (!currentTag) {
      return;
    }

    const text = stripHtml(currentText);
    if (text) {
      items.push({
        blockType: currentTag,
        text,
        level: currentLevel,
        listKind: currentListKind,
      });
    }

    currentTag = null;
    currentText = "";
    currentLevel = null;
    currentListKind = null;
  }

  let match = tokenPattern.exec(normalized);
  while (match) {
    const [, closing, rawTag, textNode] = match;
    const tag = rawTag?.toLowerCase();

    if (textNode && currentTag) {
      currentText += textNode;
      match = tokenPattern.exec(normalized);
      continue;
    }

    if (!tag) {
      match = tokenPattern.exec(normalized);
      continue;
    }

    if (!closing) {
      if (tag === "ol") {
        listStack.push("ordered");
      } else if (tag === "ul") {
        listStack.push("unordered");
      } else if (tag === "p") {
        openBlock("paragraph", null, null);
      } else if (/^h[1-6]$/.test(tag)) {
        openBlock("heading", Number(tag.slice(1)), null);
      } else if (tag === "li") {
        openBlock("list_item", listStack.length || 1, listStack[listStack.length - 1] ?? "unordered");
      } else if (tag === "br" && currentTag) {
        currentText += "\n";
      }
    } else {
      if (tag === "ol" || tag === "ul") {
        listStack.pop();
      } else if (
        (tag === "p" && currentTag === "paragraph") ||
        (/^h[1-6]$/.test(tag) && currentTag === "heading") ||
        (tag === "li" && currentTag === "list_item")
      ) {
        closeBlock();
      }
    }

    match = tokenPattern.exec(normalized);
  }

  closeBlock();

  return finalizeBlocks(items);
}

function inferFileType(fileName: string) {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith(".docx")) return "docx";
  if (lowerName.endsWith(".md")) return "md";
  if (lowerName.endsWith(".txt")) return "txt";

  return "unknown";
}

export async function parseUploadedDocument(file: File): Promise<ParsedDocument> {
  const fileType = inferFileType(file.name);

  if (!["docx", "md", "txt"].includes(fileType)) {
    throw new Error("当前仅支持 docx、md、txt 文件。");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let parsed: { rawText: string; blocks: ParsedBlock[] };

  if (fileType === "docx") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.convertToHtml({ buffer });
    parsed = parseDocxHtmlToPendingBlocks(value);
  } else {
    parsed = parsePlainTextToPendingBlocks(buffer.toString("utf-8"), fileType);
  }

  if (!parsed.rawText || parsed.blocks.length === 0) {
    throw new Error("未能从文档中解析出有效正文。");
  }

  return createParsedDocument({
    title: file.name.replace(/\.[^.]+$/, ""),
    filename: file.name,
    fileType,
    rawText: parsed.rawText,
    blocks: parsed.blocks,
  });
}
