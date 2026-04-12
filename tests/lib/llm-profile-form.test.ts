import test from "node:test";
import assert from "node:assert/strict";

import { parseLlmProfileForm } from "../../lib/llm-profile-form";

test("parseLlmProfileForm normalizes live profiles with a new key", () => {
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
  assert.equal(parsed.hasApiKey, true);
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

test("parseLlmProfileForm preserves an existing stored key for live profiles", () => {
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

  assert.equal(parsed.apiKey, "");
  assert.equal(parsed.apiKeyLast4, null);
  assert.equal(parsed.hasApiKey, true);
});

test("parseLlmProfileForm keeps live profiles without any key source as not ready", () => {
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

  assert.equal(parsed.mode, "live");
  assert.equal(parsed.apiKey, "");
  assert.equal(parsed.apiKeyLast4, null);
  assert.equal(parsed.hasApiKey, false);
});
