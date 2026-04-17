import { describe, expect, it } from "vitest";

import {
  applyLocalDevEnvDefaults,
  DEFAULT_APP_ENCRYPTION_KEY,
  DEFAULT_DATABASE_URL,
} from "../../lib/dev-env";

describe("dev-env", () => {
  it("fills in a default database url when one is missing", () => {
    const env = applyLocalDevEnvDefaults({});

    expect(DEFAULT_DATABASE_URL).toBe("file:./dev.db");
    expect(env.DATABASE_URL).toBe("file:./dev.db");
  });

  it("fills in a default app encryption key when one is missing", () => {
    const env = applyLocalDevEnvDefaults({});

    expect(env.APP_ENCRYPTION_KEY).toBe(DEFAULT_APP_ENCRYPTION_KEY);
  });

  it("preserves an explicitly configured database url", () => {
    const env = applyLocalDevEnvDefaults({
      DATABASE_URL: "file:./custom.db",
    });

    expect(env.DATABASE_URL).toBe("file:./custom.db");
  });

  it("preserves an explicitly configured app encryption key", () => {
    const env = applyLocalDevEnvDefaults({
      APP_ENCRYPTION_KEY: "custom-dev-key",
    });

    expect(env.APP_ENCRYPTION_KEY).toBe("custom-dev-key");
  });
});
