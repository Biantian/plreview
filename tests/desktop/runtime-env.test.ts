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
    const bootstrapDatabase = createMockSqliteDatabase(["Rule", "RuleVersion", "LlmProfile"]);

    fs.mkdirSync(path.dirname(bootstrapDatabasePath), { recursive: true });
    fs.writeFileSync(bootstrapDatabasePath, bootstrapDatabase);

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
      bootstrapDatabase,
    );
    expect(
      fs.readFileSync(path.join(userDataPath, "app-encryption.key"), "utf8").trim(),
    ).toBe(resolved.APP_ENCRYPTION_KEY);
  });

  it("prefers packaged runtime provisioning even when the packaged app lives under a source checkout", () => {
    const sourceRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "plreview-desktop-runtime-env-source-root-"),
    );
    tempDirs.push(sourceRoot);

    const packagedCurrentDir = path.join(
      sourceRoot,
      "release",
      "mac-arm64",
      "PLReview.app",
      "Contents",
      "Resources",
      "app.asar",
      ".desktop-runtime",
      "electron",
    );
    const resourcesPath = path.join(
      sourceRoot,
      "release",
      "mac-arm64",
      "PLReview.app",
      "Contents",
      "Resources",
    );
    const userDataPath = path.join(sourceRoot, "tmp", "user-data");
    const bootstrapDatabasePath = path.join(sourceRoot, "tmp", "bootstrap", "plreview.db");
    const bootstrapDatabase = createMockSqliteDatabase(["Rule", "RuleVersion", "LlmProfile"]);

    fs.mkdirSync(path.join(sourceRoot, "prisma"), { recursive: true });
    fs.writeFileSync(path.join(sourceRoot, "prisma", "schema.prisma"), "// schema");
    fs.writeFileSync(path.join(sourceRoot, ".env"), 'DATABASE_URL="file:./dev.db"\n');
    fs.mkdirSync(path.dirname(bootstrapDatabasePath), { recursive: true });
    fs.writeFileSync(bootstrapDatabasePath, bootstrapDatabase);

    const resolved = resolveDesktopRuntimeEnv({
      currentDir: packagedCurrentDir,
      env: {
        NODE_ENV: "production",
      },
      mode: "packaged",
      userDataPath,
      bootstrapDatabasePath,
      resourcesPath,
    } as Parameters<typeof resolveDesktopRuntimeEnv>[0]);

    expect(resolved.DATABASE_URL).toBe(`file:${path.join(userDataPath, "plreview.db")}`);
    expect(fs.readFileSync(path.join(userDataPath, "plreview.db"), "utf8")).toBe(
      bootstrapDatabase,
    );
  });

  it("repairs an existing empty packaged database by restoring the bootstrap copy", () => {
    const packagedRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "plreview-desktop-packaged-runtime-env-"),
    );
    tempDirs.push(packagedRoot);

    const userDataPath = path.join(packagedRoot, "user-data");
    const bootstrapDatabasePath = path.join(packagedRoot, "bootstrap", "plreview.db");
    const existingDatabasePath = path.join(userDataPath, "plreview.db");
    const bootstrapDatabase = createMockSqliteDatabase(["Rule", "RuleVersion", "LlmProfile"]);

    fs.mkdirSync(path.dirname(bootstrapDatabasePath), { recursive: true });
    fs.mkdirSync(userDataPath, { recursive: true });
    fs.writeFileSync(bootstrapDatabasePath, bootstrapDatabase);
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
    expect(fs.readFileSync(existingDatabasePath, "utf8")).toBe(bootstrapDatabase);
  });

  it("repairs a packaged database that is missing required application tables", () => {
    const packagedRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "plreview-desktop-packaged-runtime-env-"),
    );
    tempDirs.push(packagedRoot);

    const userDataPath = path.join(packagedRoot, "user-data");
    const bootstrapDatabasePath = path.join(packagedRoot, "bootstrap", "plreview.db");
    const existingDatabasePath = path.join(userDataPath, "plreview.db");
    const bootstrapDatabase = createMockSqliteDatabase(["Rule", "RuleVersion", "LlmProfile"]);
    const invalidDatabase = createMockSqliteDatabase(["Document"]);

    fs.mkdirSync(path.dirname(bootstrapDatabasePath), { recursive: true });
    fs.mkdirSync(userDataPath, { recursive: true });
    fs.writeFileSync(bootstrapDatabasePath, bootstrapDatabase);
    fs.writeFileSync(existingDatabasePath, invalidDatabase);

    resolveDesktopRuntimeEnv({
      currentDir: path.join(packagedRoot, ".desktop-runtime", "electron"),
      env: {
        NODE_ENV: "production",
      },
      mode: "packaged",
      userDataPath,
      bootstrapDatabasePath,
    } as Parameters<typeof resolveDesktopRuntimeEnv>[0]);

    expect(fs.readFileSync(existingDatabasePath, "utf8")).toBe(bootstrapDatabase);
    expect(
      fs.readdirSync(userDataPath).some((entry) => /^plreview\.db\.invalid-/u.test(entry)),
    ).toBe(true);
  });
});

function createMockSqliteDatabase(tableNames: string[]) {
  return `SQLite format 3\u0000\n${tableNames.map((tableName) => `CREATE TABLE "${tableName}"`).join("\n")}\n`;
}
