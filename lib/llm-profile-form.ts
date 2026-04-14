type LlmProfileFormInput = {
  name: string;
  provider: string;
  vendorKey: string;
  mode: "live" | "demo";
  baseUrl: string;
  defaultModel: string;
  modelOptionsText: string;
  apiKey: string;
  hasStoredApiKey?: boolean;
  enabled: boolean;
};

export function parseLlmProfileForm(input: LlmProfileFormInput) {
  const normalizedApiKey = input.apiKey.trim();
  const modelOptions = Array.from(
    new Set(
      input.modelOptionsText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

  const parsed = {
    name: input.name.trim(),
    provider: input.provider.trim(),
    vendorKey: input.vendorKey.trim(),
    mode: input.mode,
    baseUrl: input.baseUrl.trim(),
    defaultModel: input.defaultModel.trim(),
    modelOptions,
    enabled: input.enabled,
    hasApiKey: normalizedApiKey.length > 0 || Boolean(input.hasStoredApiKey),
    apiKey: normalizedApiKey,
    apiKeyLast4: normalizedApiKey.slice(-4) || null,
  };

  if (!parsed.name || !parsed.provider || !parsed.baseUrl || !parsed.defaultModel) {
    throw new Error("模型配置名称、供应商、Base URL 和默认模型均为必填项。");
  }

  return parsed;
}
