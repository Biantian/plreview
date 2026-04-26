import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const releaseScriptPath = path.resolve("scripts/run-mac-release.mjs");

describe("mac release runner", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const tempDir of tempDirs) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails fast when no notarization credential strategy is configured", () => {
    const result = spawnSync("node", [releaseScriptPath], {
      cwd: path.resolve("."),
      encoding: "utf8",
      env: {
        ...process.env,
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Configure one mac notarization credential strategy");
    expect(result.stderr).toContain("APPLE_KEYCHAIN_PROFILE");
    expect(result.stderr).toContain("APPLE_API_KEY");
    expect(result.stderr).toContain("APPLE_ID");
  });

  it("runs dist then verification with notarization enabled for Apple ID releases", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "plreview-mac-release-appleid-"));
    tempDirs.push(tempDir);

    const logPath = path.join(tempDir, "commands.log");
    const fakeDistPath = path.join(tempDir, "fake-dist.mjs");
    const fakeVerifyPath = path.join(tempDir, "fake-verify.mjs");

    fs.writeFileSync(
      fakeDistPath,
      [
        'import fs from "node:fs";',
        'fs.appendFileSync(process.env.LOG_PATH, JSON.stringify({',
        '  kind: "dist",',
        '  argv: process.argv.slice(2),',
        '  notarize: process.env.PLREVIEW_MAC_NOTARIZE,',
        '}) + "\\n");',
      ].join("\n"),
    );
    fs.writeFileSync(
      fakeVerifyPath,
      [
        'import fs from "node:fs";',
        'fs.appendFileSync(process.env.LOG_PATH, JSON.stringify({',
        '  kind: "verify",',
        '  argv: process.argv.slice(2),',
        '}) + "\\n");',
      ].join("\n"),
    );

    execFileSync("node", [releaseScriptPath, "--universal"], {
      cwd: path.resolve("."),
      encoding: "utf8",
      env: {
        ...process.env,
        APPLE_ID: "dev@example.com",
        APPLE_APP_SPECIFIC_PASSWORD: "app-password",
        APPLE_TEAM_ID: "TEAM123456",
        PLREVIEW_MAC_RELEASE_DIST_NODE_SCRIPT: fakeDistPath,
        PLREVIEW_MAC_RELEASE_VERIFY_NODE_SCRIPT: fakeVerifyPath,
        LOG_PATH: logPath,
      },
    });

    const commands = fs
      .readFileSync(logPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line)) as Array<{
      kind: "dist" | "verify";
      argv: string[];
      notarize?: string;
    }>;

    expect(commands).toEqual([
      {
        kind: "dist",
        argv: ["--mac", "dmg", "--arm64", "--universal"],
        notarize: "1",
      },
      {
        kind: "verify",
        argv: [],
      },
    ]);
  });

  it("accepts a keychain profile as the notarization credential strategy", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "plreview-mac-release-keychain-"));
    tempDirs.push(tempDir);

    const logPath = path.join(tempDir, "commands.log");
    const fakeDistPath = path.join(tempDir, "fake-dist.mjs");
    const fakeVerifyPath = path.join(tempDir, "fake-verify.mjs");

    fs.writeFileSync(
      fakeDistPath,
      [
        'import fs from "node:fs";',
        'fs.appendFileSync(process.env.LOG_PATH, JSON.stringify({',
        '  kind: "dist",',
        '  notarize: process.env.PLREVIEW_MAC_NOTARIZE,',
        '}) + "\\n");',
      ].join("\n"),
    );
    fs.writeFileSync(
      fakeVerifyPath,
      [
        'import fs from "node:fs";',
        'fs.appendFileSync(process.env.LOG_PATH, JSON.stringify({',
        '  kind: "verify",',
        '}) + "\\n");',
      ].join("\n"),
    );

    execFileSync("node", [releaseScriptPath], {
      cwd: path.resolve("."),
      encoding: "utf8",
      env: {
        ...process.env,
        APPLE_KEYCHAIN_PROFILE: "plreview-notary",
        PLREVIEW_MAC_RELEASE_DIST_NODE_SCRIPT: fakeDistPath,
        PLREVIEW_MAC_RELEASE_VERIFY_NODE_SCRIPT: fakeVerifyPath,
        LOG_PATH: logPath,
      },
    });

    const commands = fs
      .readFileSync(logPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line)) as Array<{ kind: "dist" | "verify"; notarize?: string }>;

    expect(commands).toEqual([
      {
        kind: "dist",
        notarize: "1",
      },
      {
        kind: "verify",
      },
    ]);
  });
});
