import { decryptSecret } from "@/lib/llm-profile-secrets";

export function resolveReviewRuntime(input: {
  mode: "live" | "demo";
  apiKeyEncrypted: string | null;
  encryptionKey: string | null;
}) {
  if (input.mode === "demo") {
    return { mode: "demo" as const, apiKey: null };
  }

  if (!input.encryptionKey) {
    throw new Error("缺少 APP_ENCRYPTION_KEY，无法解密模型配置。");
  }

  if (!input.apiKeyEncrypted) {
    throw new Error("当前模型配置缺少 API Key。");
  }

  return {
    mode: "live" as const,
    apiKey: decryptSecret(input.apiKeyEncrypted, input.encryptionKey),
  };
}
