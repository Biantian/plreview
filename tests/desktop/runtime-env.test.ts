import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolveDesktopRuntimeEnv } from "@/electron/runtime-env";
import { DEFAULT_APP_ENCRYPTION_KEY } from "@/lib/dev-env";

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

  it("provisions packaged runtime env from app data instead of falling back to local dev defaults", () => {
    const packagedRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "plreview-desktop-packaged-runtime-env-"),
    );
    tempDirs.push(packagedRoot);

    const userDataPath = path.join(packagedRoot, "user-data");
    const bootstrapDatabasePath = path.join(packagedRoot, "bootstrap", "plreview.db");

    fs.mkdirSync(path.dirname(bootstrapDatabasePath), { recursive: true });
    fs.writeFileSync(bootstrapDatabasePath, "bootstrap-db");

    const resolved = resolveDesktopRuntimeEnv({
      currentDir: path.join(packagedRoot, ".desktop-runtime", "electron"),
      env: {
        NODE_ENV: "production",
      },
      mode: "packaged",
      userDataPath,
      bootstrapDatabasePath,
    } as Parameters<typeof resolveDesktopRuntimeEnv>[0]);

    expect(resolved.DATABASE_URL).toBe(`file:${path.join(userDataPath, "plreview.db")}`);
    expect(resolved.APP_ENCRYPTION_KEY).toBeTruthy();
    expect(resolved.APP_ENCRYPTION_KEY).not.toBe(DEFAULT_APP_ENCRYPTION_KEY);
    expect(fs.readFileSync(path.join(userDataPath, "plreview.db"), "utf8")).toBe(
      "bootstrap-db",
    );
    expect(
      fs.readFileSync(path.join(userDataPath, "app-encryption.key"), "utf8").trim(),
    ).toBe(resolved.APP_ENCRYPTION_KEY);
  });

  it("repairs an existing empty packaged database by restoring the bootstrap copy", () => {
    const packagedRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "plreview-desktop-packaged-runtime-env-"),
    );
    tempDirs.push(packagedRoot);

    const userDataPath = path.join(packagedRoot, "user-data");
    const bootstrapDatabasePath = path.join(packagedRoot, "bootstrap", "plreview.db");
    const existingDatabasePath = path.join(userDataPath, "plreview.db");

    fs.mkdirSync(path.dirname(bootstrapDatabasePath), { recursive: true });
    fs.mkdirSync(userDataPath, { recursive: true });
    fs.writeFileSync(bootstrapDatabasePath, "bootstrap-db");
    fs.writeFileSync(existingDatabasePath, "");

    const resolved = resolveDesktopRuntimeEnv({
      currentDir: path.join(packagedRoot, ".desktop-runtime", "electron"),
      env: {
        NODE_ENV: "production",
      },
      mode: "packaged",
      userDataPath,
      bootstrapDatabasePath,
    } as Parameters<typeof resolveDesktopRuntimeEnv>[0]);

    expect(resolved.DATABASE_URL).toBe(`file:${existingDatabasePath}`);
    expect(fs.readFileSync(existingDatabasePath, "utf8")).toBe("bootstrap-db");
  });
});
