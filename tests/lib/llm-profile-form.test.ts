import { describe, expect, it } from "vitest";

import { parseLlmProfileForm } from "../../lib/llm-profile-form";

describe("llm-profile-form", () => {
  it("parseLlmProfileForm normalizes live profiles with a new key", () => {
    const parsed = parseLlmProfileForm({
      name: " 百炼生产 ",
      provider: "DashScope",
      vendorKey: "openai_compatible",
      mode: "live",
      baseUrl: " https://dashscope.aliyuncs.com/compatible-mode/v1 ",
      defaultModel: " qwen-plus ",
      modelOptionsText: "qwen-plus\nqwen-turbo\nqwen-plus",
      apiKey: "sk-live-1234",
      enabled: true,
    });

    expect(parsed.modelOptions).toEqual(["qwen-plus", "qwen-turbo"]);
    expect(parsed.apiKeyLast4).toBe("1234");
    expect(parsed.baseUrl).toBe("https://dashscope.aliyuncs.com/compatible-mode/v1");
    expect(parsed.hasApiKey).toBe(true);
  });

  it("parseLlmProfileForm allows demo profiles without a key", () => {
    const parsed = parseLlmProfileForm({
      name: "本地演示",
      provider: "Demo",
      vendorKey: "openai_compatible",
      mode: "demo",
      baseUrl: "https://example.invalid",
      defaultModel: "demo-model",
      modelOptionsText: "",
      apiKey: "",
      enabled: true,
    });

    expect(parsed.hasApiKey).toBe(false);
    expect(parsed.mode).toBe("demo");
  });

  it("parseLlmProfileForm preserves an existing stored key for live profiles", () => {
    const parsed = parseLlmProfileForm({
      name: "百炼生产",
      provider: "DashScope",
      vendorKey: "openai_compatible",
      mode: "live",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      defaultModel: "qwen-plus",
      modelOptionsText: "qwen-plus",
      apiKey: "   ",
      hasStoredApiKey: true,
      enabled: true,
    });

    expect(parsed.apiKey).toBe("");
    expect(parsed.apiKeyLast4).toBeNull();
    expect(parsed.hasApiKey).toBe(true);
  });

  it("parseLlmProfileForm keeps live profiles without any key source as not ready", () => {
    const parsed = parseLlmProfileForm({
      name: "百炼生产",
      provider: "DashScope",
      vendorKey: "openai_compatible",
      mode: "live",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      defaultModel: "qwen-plus",
      modelOptionsText: "",
      apiKey: "",
      hasStoredApiKey: false,
      enabled: true,
    });

    expect(parsed.mode).toBe("live");
    expect(parsed.apiKey).toBe("");
    expect(parsed.apiKeyLast4).toBeNull();
    expect(parsed.hasApiKey).toBe(false);
  });
});
