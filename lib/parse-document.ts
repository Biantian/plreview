import mammoth from "mammoth";

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
  paragraphs: ParsedParagraph[];
};

function splitIntoParagraphs(rawText: string) {
  const normalized = rawText.replace(/\r\n/g, "\n").trim();
  const blocks = normalized
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const paragraphs: ParsedParagraph[] = [];
  let searchStart = 0;

  blocks.forEach((text, index) => {
    const charStart = normalized.indexOf(text, searchStart);
    const safeStart = charStart === -1 ? searchStart : charStart;
    const charEnd = safeStart + text.length;
    searchStart = charEnd;

    paragraphs.push({
      paragraphIndex: index,
      text,
      charStart: safeStart,
      charEnd,
    });
  });

  return {
    rawText: normalized,
    paragraphs,
  };
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

  let rawText = "";

  if (fileType === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    rawText = result.value;
  } else {
    rawText = buffer.toString("utf-8");
  }

  const { paragraphs, rawText: normalizedText } = splitIntoParagraphs(rawText);

  if (!normalizedText || paragraphs.length === 0) {
    throw new Error("未能从文档中解析出有效正文。");
  }

  return {
    title: file.name.replace(/\.[^.]+$/, ""),
    filename: file.name,
    fileType,
    rawText: normalizedText,
    paragraphs,
  };
}
