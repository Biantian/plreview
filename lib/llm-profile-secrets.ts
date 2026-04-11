import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

function buildKey(masterKey: string) {
  return createHash("sha256").update(masterKey).digest();
}

export function encryptSecret(secret: string, masterKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", buildKey(masterKey), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string, masterKey: string) {
  const [iv, tag, encrypted] = payload.split(":");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    buildKey(masterKey),
    Buffer.from(iv, "base64"),
  );

  decipher.setAuthTag(Buffer.from(tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function maskSecretTail(secret: string) {
  return secret.slice(-4);
}
