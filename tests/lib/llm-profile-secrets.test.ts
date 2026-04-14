import { describe, expect, it } from "vitest";

import {
  decryptSecret,
  encryptSecret,
  maskSecretTail,
} from "../../lib/llm-profile-secrets";

describe("llm-profile-secrets", () => {
  it("encryptSecret round-trips with the configured master key", () => {
    const masterKey = "0123456789abcdef0123456789abcdef";
    const cipherText = encryptSecret("sk-example-1234", masterKey);

    expect(cipherText).not.toBe("sk-example-1234");
    expect(decryptSecret(cipherText, masterKey)).toBe("sk-example-1234");
  });

  it("maskSecretTail only keeps the last four characters", () => {
    expect(maskSecretTail("sk-example-1234")).toBe("1234");
    expect(maskSecretTail("abcd")).toBe("abcd");
  });

  it("encryptSecret rejects a blank master key", () => {
    expect(() => encryptSecret("sk-example-1234", "")).toThrow(/master key/i);
    expect(() => encryptSecret("sk-example-1234", "   ")).toThrow(/master key/i);
  });

  it("decryptSecret rejects a blank master key", () => {
    const masterKey = "0123456789abcdef0123456789abcdef";
    const cipherText = encryptSecret("sk-example-1234", masterKey);

    expect(() => decryptSecret(cipherText, "")).toThrow(/master key/i);
    expect(() => decryptSecret(cipherText, "   ")).toThrow(/master key/i);
  });
});
