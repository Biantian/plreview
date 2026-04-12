import test from "node:test";
import assert from "node:assert/strict";

import { parseLlmProfileForm } from "../../lib/llm-profile-form";

test("parseLlmProfileForm normalizes live profiles", () => {
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

  assert.deepEqual(parsed.modelOptions, ["qwen-plus", "qwen-turbo"]);
  assert.equal(parsed.apiKeyLast4, "1234");
  assert.equal(parsed.baseUrl, "https://dashscope.aliyuncs.com/compatible-mode/v1");
});

test("parseLlmProfileForm allows demo profiles without a key", () => {
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

  assert.equal(parsed.hasApiKey, false);
  assert.equal(parsed.mode, "demo");
});
