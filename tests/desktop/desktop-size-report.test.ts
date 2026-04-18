import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import packageJson from "@/package.json";

const reportScriptPath = path.resolve("scripts/report-desktop-bundle-size.mjs");

describe("desktop bundle reporting", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const tempDir of tempDirs) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("declares a desktop size report script", () => {
    expect(packageJson.scripts["desktop:report-size"]).toBe(
      "node ./scripts/report-desktop-bundle-size.mjs",
    );
  });

  it("emits machine-readable artifact inventory for local desktop outputs", () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "plreview-desktop-size-report-"),
    );
    tempDirs.push(tempDir);

    writeFile(tempDir, ".next/standalone/server.js", "standalone");
    writeFile(tempDir, ".next/static/chunk.js", "chunk");
    writeFile(tempDir, "electron/main.cjs", "main");
    writeFile(tempDir, "desktop/worker/background-entry.cjs", "worker");
    writeFile(tempDir, "release/builder-debug.yml", "release");

    const report = JSON.parse(
      execFileSync("node", [reportScriptPath], {
        cwd: tempDir,
        encoding: "utf8",
      }),
    ) as {
      artifacts: Array<{
        id: string;
        path: string;
        exists: boolean;
        type: "file" | "directory";
        bytes: number;
        fileCount: number;
      }>;
      totals: {
        existingArtifacts: number;
        bytes: number;
      };
    };

    expect(report.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "nextStandalone",
          path: ".next/standalone",
          exists: true,
          type: "directory",
          bytes: 10,
          fileCount: 1,
        }),
        expect.objectContaining({
          id: "nextStatic",
          path: ".next/static",
          exists: true,
          type: "directory",
          bytes: 5,
          fileCount: 1,
        }),
        expect.objectContaining({
          id: "electronMainBootstrap",
          path: "electron/main.cjs",
          exists: true,
          type: "file",
          bytes: 4,
          fileCount: 1,
        }),
        expect.objectContaining({
          id: "workerBootstrap",
          path: "desktop/worker/background-entry.cjs",
          exists: true,
          type: "file",
          bytes: 6,
          fileCount: 1,
        }),
        expect.objectContaining({
          id: "release",
          path: "release",
          exists: true,
          type: "directory",
          bytes: 7,
          fileCount: 1,
        }),
      ]),
    );
    expect(report.totals).toEqual(
      expect.objectContaining({
        existingArtifacts: 5,
        bytes: 32,
        fileCount: 5,
      }),
    );
  });
});

function writeFile(root: string, relativePath: string, content: string) {
  const targetPath = path.join(root, relativePath);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content);
}
