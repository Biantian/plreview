import { describe, expect, it } from "vitest";

import { encryptSecret } from "../../lib/llm-profile-secrets";
import { resolveReviewRuntime } from "../../lib/review-runtime";

describe("review-runtime", () => {
  it("resolveReviewRuntime returns demo mode without a key", () => {
    const runtime = resolveReviewRuntime({
      mode: "demo",
      apiKeyEncrypted: null,
      encryptionKey: null,
    });

    expect(runtime).toEqual({ mode: "demo", apiKey: null });
  });

  it("resolveReviewRuntime decrypts live credentials", () => {
    const encryptionKey = "0123456789abcdef0123456789abcdef";
    const apiKeyEncrypted = encryptSecret("sk-live-1234", encryptionKey);
    const runtime = resolveReviewRuntime({
      mode: "live",
      apiKeyEncrypted,
      encryptionKey,
    });

    expect(runtime).toEqual({ mode: "live", apiKey: "sk-live-1234" });
  });
});
