import assert from "node:assert/strict";
import test from "node:test";

import { encryptSecret } from "../../lib/llm-profile-secrets";
import { resolveReviewRuntime } from "../../lib/review-runtime";

test("resolveReviewRuntime returns demo mode without a key", () => {
  const runtime = resolveReviewRuntime({
    mode: "demo",
    apiKeyEncrypted: null,
    encryptionKey: null,
  });

  assert.deepEqual(runtime, { mode: "demo", apiKey: null });
});

test("resolveReviewRuntime decrypts live credentials", () => {
  const encryptionKey = "0123456789abcdef0123456789abcdef";
  const apiKeyEncrypted = encryptSecret("sk-live-1234", encryptionKey);
  const runtime = resolveReviewRuntime({
    mode: "live",
    apiKeyEncrypted,
    encryptionKey,
  });

  assert.deepEqual(runtime, { mode: "live", apiKey: "sk-live-1234" });
});
