import test from "node:test";
import assert from "node:assert/strict";

import {
  decryptSecret,
  encryptSecret,
  maskSecretTail,
} from "../../lib/llm-profile-secrets";

test("encryptSecret round-trips with the configured master key", () => {
  const masterKey = "0123456789abcdef0123456789abcdef";
  const cipherText = encryptSecret("sk-example-1234", masterKey);

  assert.notEqual(cipherText, "sk-example-1234");
  assert.equal(decryptSecret(cipherText, masterKey), "sk-example-1234");
});

test("maskSecretTail only keeps the last four characters", () => {
  assert.equal(maskSecretTail("sk-example-1234"), "1234");
  assert.equal(maskSecretTail("abcd"), "abcd");
});

test("encryptSecret rejects a blank master key", () => {
  assert.throws(() => encryptSecret("sk-example-1234", ""), /master key/i);
  assert.throws(() => encryptSecret("sk-example-1234", "   "), /master key/i);
});

test("decryptSecret rejects a blank master key", () => {
  const masterKey = "0123456789abcdef0123456789abcdef";
  const cipherText = encryptSecret("sk-example-1234", masterKey);

  assert.throws(() => decryptSecret(cipherText, ""), /master key/i);
  assert.throws(() => decryptSecret(cipherText, "   "), /master key/i);
});
