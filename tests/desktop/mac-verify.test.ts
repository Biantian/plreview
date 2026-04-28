import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const verifyScriptPath = path.resolve("scripts/verify-mac-release.mjs");

describe("mac release verification", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const tempDir of tempDirs) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("verifies the app bundle and notarized dmg found under release", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "plreview-mac-verify-"));
    tempDirs.push(tempDir);

    const releaseDir = path.join(tempDir, "release");
    const appBinaryPath = path.join(
      releaseDir,
      "mac-arm64/PLReview.app/Contents/MacOS/PLReview",
    );
    const dmgPath = path.join(releaseDir, "PLReview-0.2.0-arm64.dmg");
    const logPath = path.join(tempDir, "commands.log");
    const fakeCodesignPath = path.join(tempDir, "fake-codesign");
    const fakeSpctlPath = path.join(tempDir, "fake-spctl");
    const fakeStaplerPath = path.join(tempDir, "fake-stapler");

    writeFile(appBinaryPath, "binary");
    writeFile(dmgPath, "dmg");
    writeExecutable(
      fakeCodesignPath,
      "codesign",
      logPath,
    );
    writeExecutable(
      fakeSpctlPath,
      "spctl",
      logPath,
    );
    writeExecutable(
      fakeStaplerPath,
      "stapler",
      logPath,
    );

    execFileSync("node", [verifyScriptPath], {
      cwd: path.resolve("."),
      encoding: "utf8",
      env: {
        ...process.env,
        PLREVIEW_MAC_RELEASE_OUTPUT_DIR: releaseDir,
        PLREVIEW_MAC_VERIFY_CODESIGN_CMD: fakeCodesignPath,
        PLREVIEW_MAC_VERIFY_SPCTL_CMD: fakeSpctlPath,
        PLREVIEW_MAC_VERIFY_STAPLER_CMD: fakeStaplerPath,
        LOG_PATH: logPath,
      },
    });

    const commands = fs
      .readFileSync(logPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line)) as Array<{
      kind: "codesign" | "spctl" | "stapler";
      argv: string[];
    }>;

    expect(commands).toEqual([
      {
        kind: "codesign",
        argv: [
          "--verify",
          "--deep",
          "--strict",
          "--verbose=2",
          path.join(releaseDir, "mac-arm64/PLReview.app"),
        ],
      },
      {
        kind: "spctl",
        argv: ["-a", "-vv", path.join(releaseDir, "mac-arm64/PLReview.app")],
      },
      {
        kind: "stapler",
        argv: ["stapler", "validate", dmgPath],
      },
    ]);
  });

  it("fails when no mac app bundle exists in release output", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "plreview-mac-verify-missing-"));
    tempDirs.push(tempDir);

    const result = spawnSync("node", [verifyScriptPath], {
      cwd: path.resolve("."),
      encoding: "utf8",
      env: {
        ...process.env,
        PLREVIEW_MAC_RELEASE_OUTPUT_DIR: path.join(tempDir, "release"),
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Could not find a macOS .app bundle");
  });
});

function writeFile(targetPath: string, content: string) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content);
}

function writeExecutable(targetPath: string, kind: string, logPath: string) {
  fs.writeFileSync(
    targetPath,
    [
      "#!/usr/bin/env node",
      'const fs = require("node:fs");',
      "fs.appendFileSync(",
      `  ${JSON.stringify(logPath)},`,
      `  JSON.stringify({ kind: ${JSON.stringify(kind)}, argv: process.argv.slice(2) }) + "\\n",`,
      ");",
    ].join("\n"),
    { mode: 0o755 },
  );
}
