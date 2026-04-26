import path from "node:path";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  resolveNotarizeCredentials,
} = require(path.resolve("scripts/notarize.cjs")) as {
  resolveNotarizeCredentials: (env: NodeJS.ProcessEnv) => Record<string, string> | null;
};

describe("mac notarization credentials", () => {
  it("prefers a keychain profile when one is configured", () => {
    expect(
      resolveNotarizeCredentials({
        APPLE_KEYCHAIN_PROFILE: "plreview-notary",
        APPLE_ID: "ignored@example.com",
        APPLE_APP_SPECIFIC_PASSWORD: "ignored",
        APPLE_TEAM_ID: "IGNOREDTEAM",
      }),
    ).toEqual({
      keychainProfile: "plreview-notary",
    });
  });

  it("accepts App Store Connect API key credentials", () => {
    expect(
      resolveNotarizeCredentials({
        APPLE_API_KEY: "/tmp/AuthKey_TEST123456.p8",
        APPLE_API_KEY_ID: "TEST123456",
        APPLE_API_ISSUER: "123e4567-e89b-12d3-a456-426614174000",
      }),
    ).toEqual({
      appleApiKey: "/tmp/AuthKey_TEST123456.p8",
      appleApiKeyId: "TEST123456",
      appleApiIssuer: "123e4567-e89b-12d3-a456-426614174000",
    });
  });

  it("accepts Apple ID credentials", () => {
    expect(
      resolveNotarizeCredentials({
        APPLE_ID: "dev@example.com",
        APPLE_APP_SPECIFIC_PASSWORD: "app-password",
        APPLE_TEAM_ID: "TEAM123456",
      }),
    ).toEqual({
      appleId: "dev@example.com",
      appleIdPassword: "app-password",
      teamId: "TEAM123456",
    });
  });

  it("throws when a credential strategy is only partially configured", () => {
    expect(() =>
      resolveNotarizeCredentials({
        APPLE_API_KEY: "/tmp/AuthKey_TEST123456.p8",
      }),
    ).toThrowError(/Missing mac notarization environment variables: APPLE_API_KEY_ID, APPLE_API_ISSUER/u);
  });
});
