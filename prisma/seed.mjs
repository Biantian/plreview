import { PrismaClient, Severity } from "@prisma/client";

const prisma = new PrismaClient();

const defaultRules = [
  {
    name: "目标清晰度",
    category: "基础质量",
    description: "检查策划案是否清楚表达业务目标、目标用户和成功判定标准。",
    promptTemplate:
      "请重点检查目标、对象、预期结果是否清晰。如果缺失或表述模糊，请指出具体段落，并给出更明确的改写建议。",
    severity: Severity.high,
  },
  {
    name: "执行可落地性",
    category: "执行风险",
    description: "检查方案是否包含可执行步骤、资源前提、时间安排和责任归属。",
    promptTemplate:
      "请判断方案是否具备落地条件。若缺少关键前置条件、里程碑、负责人或资源约束，请列出问题并建议补充内容。",
    severity: Severity.medium,
  },
  {
    name: "风险识别",
    category: "执行风险",
    description: "检查策划案是否识别了主要业务风险、依赖风险和验证风险。",
    promptTemplate:
      "请从业务、协作、资源、数据验证等角度识别潜在风险。如果文档缺少风险识别或应对措施，请结合段落输出建议。",
    severity: Severity.medium,
  },
];

const LEGACY_DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const LEGACY_DEFAULT_MODEL = "qwen-plus";

async function main() {
  const defaultBaseUrl =
    process.env.OPENAI_COMPATIBLE_BASE_URL ??
    LEGACY_DEFAULT_BASE_URL;
  const defaultModel = process.env.OPENAI_COMPATIBLE_DEFAULT_MODEL ?? LEGACY_DEFAULT_MODEL;
  const defaultModelOptionsJson = JSON.stringify(["qwen-plus", "qwen-turbo"]);
  const existingDefaultProfile = await prisma.llmProfile.findUnique({
    where: { id: "dashscope-default-profile" },
  });
  const matchesLegacyProvider =
    existingDefaultProfile?.provider === "dashscope" ||
    existingDefaultProfile?.provider === "DashScope";
  const matchesLegacyModelOptions =
    existingDefaultProfile?.modelOptionsJson === null ||
    existingDefaultProfile?.modelOptionsJson === defaultModelOptionsJson;
  const shouldNormalizeLegacyDefaultProfile =
    existingDefaultProfile?.name === "百炼默认配置" &&
    matchesLegacyProvider &&
    existingDefaultProfile.vendorKey === "openai_compatible" &&
    existingDefaultProfile.mode === "live" &&
    existingDefaultProfile.apiStyle === "openai_compatible" &&
    existingDefaultProfile.baseUrl === LEGACY_DEFAULT_BASE_URL &&
    existingDefaultProfile.defaultModel === LEGACY_DEFAULT_MODEL &&
    matchesLegacyModelOptions &&
    existingDefaultProfile.hasApiKey === false &&
    !existingDefaultProfile.apiKeyEncrypted &&
    !existingDefaultProfile.apiKeyLast4;

  if (!existingDefaultProfile) {
    await prisma.llmProfile.create({
      data: {
        id: "dashscope-default-profile",
        name: "百炼默认配置",
        provider: "DashScope",
        vendorKey: "openai_compatible",
        mode: "demo",
        apiStyle: "openai_compatible",
        baseUrl: defaultBaseUrl,
        defaultModel,
        modelOptionsJson: defaultModelOptionsJson,
        hasApiKey: false,
      },
    });
  } else if (shouldNormalizeLegacyDefaultProfile) {
    await prisma.llmProfile.update({
      where: { id: "dashscope-default-profile" },
      data: {
        name: "百炼默认配置",
        provider: "DashScope",
        vendorKey: "openai_compatible",
        mode: "demo",
        apiStyle: "openai_compatible",
        baseUrl: defaultBaseUrl,
        defaultModel,
        modelOptionsJson: defaultModelOptionsJson,
        hasApiKey: false,
      },
    });
  }

  for (const rule of defaultRules) {
    const existing = await prisma.rule.findFirst({
      where: { name: rule.name },
    });

    if (!existing) {
      await prisma.rule.create({
        data: rule,
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
