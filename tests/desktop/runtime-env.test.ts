import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolveDesktopRuntimeEnv } from "@/electron/runtime-env";

describe("resolveDesktopRuntimeEnv", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const tempDir of tempDirs) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("loads desktop runtime env from the source root and absolutizes sqlite database paths", () => {
    const sourceRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "plreview-desktop-runtime-env-"),
    );
    tempDirs.push(sourceRoot);

    fs.mkdirSync(path.join(sourceRoot, "prisma"), { recursive: true });
    fs.writeFileSync(path.join(sourceRoot, "prisma", "schema.prisma"), "// schema");
    fs.writeFileSync(
      path.join(sourceRoot, ".env"),
      'DATABASE_URL="file:./dev.db"\nAPP_ENCRYPTION_KEY="test-encryption-key"\n',
    );

    const resolved = resolveDesktopRuntimeEnv({
      currentDir: path.join(sourceRoot, ".desktop-runtime", "electron"),
      env: {
        NODE_ENV: "production",
      },
    });

    expect(resolved.DATABASE_URL).toBe(
      `file:${path.join(sourceRoot, "prisma", "dev.db")}`,
    );
    expect(resolved.APP_ENCRYPTION_KEY).toBe("test-encryption-key");
  });

  it("preserves explicit runtime env overrides", () => {
    const sourceRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "plreview-desktop-runtime-env-"),
    );
    tempDirs.push(sourceRoot);

    fs.mkdirSync(path.join(sourceRoot, "prisma"), { recursive: true });
    fs.writeFileSync(path.join(sourceRoot, "prisma", "schema.prisma"), "// schema");
    fs.writeFileSync(
      path.join(sourceRoot, ".env"),
      'DATABASE_URL="file:./dev.db"\nAPP_ENCRYPTION_KEY="test-encryption-key"\n',
    );

    const resolved = resolveDesktopRuntimeEnv({
      currentDir: path.join(sourceRoot, ".desktop-runtime", "electron"),
      env: {
        NODE_ENV: "production",
        DATABASE_URL: "file:/tmp/custom.db",
        APP_ENCRYPTION_KEY: "custom-key",
      },
    });

    expect(resolved.DATABASE_URL).toBe("file:/tmp/custom.db");
    expect(resolved.APP_ENCRYPTION_KEY).toBe("custom-key");
  });
});
