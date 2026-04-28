import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { ensurePackagedDatabaseSchema } from "@/electron/packaged-database-schema";

describe("ensurePackagedDatabaseSchema", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const tempDir of tempDirs) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("adds the missing Rule.deletedAt column in place for packaged sqlite databases", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "plreview-packaged-schema-"));
    const databasePath = path.join(tempDir, "plreview.db");
    tempDirs.push(tempDir);

    runSqlite(
      databasePath,
      [
        'CREATE TABLE "Rule" (',
        '"id" TEXT NOT NULL PRIMARY KEY,',
        '"name" TEXT NOT NULL,',
        '"category" TEXT NOT NULL,',
        '"description" TEXT NOT NULL,',
        '"promptTemplate" TEXT NOT NULL,',
        '"severity" TEXT NOT NULL,',
        '"enabled" BOOLEAN NOT NULL DEFAULT true,',
        '"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,',
        '"updatedAt" DATETIME NOT NULL',
        ");",
        "INSERT INTO \"Rule\" (\"id\", \"name\", \"category\", \"description\", \"promptTemplate\", \"severity\", \"enabled\", \"updatedAt\") VALUES ('rule_1', 'Legacy rule', '文案', '旧规则', '模板', 'medium', 1, CURRENT_TIMESTAMP);",
      ].join("\n"),
    );

    await ensurePackagedDatabaseSchema({
      databaseUrl: `file:${databasePath}`,
    });

    expect(runSqlite(databasePath, 'PRAGMA table_info("Rule");')).toContain("|deletedAt|");
    expect(runSqlite(databasePath, 'SELECT "id", "name", "enabled", "deletedAt" FROM "Rule";')).toContain(
      "rule_1|Legacy rule|1|",
    );
  });
});

function runSqlite(databasePath: string, sql: string) {
  return execFileSync("sqlite3", [databasePath, sql], {
    encoding: "utf8",
  });
}
