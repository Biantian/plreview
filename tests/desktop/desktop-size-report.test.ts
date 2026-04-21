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

    writeFile(tempDir, "out/index.html", "standalone");
    writeFile(tempDir, "out/assets/chunk.js", "chunk");
    writeFile(tempDir, ".desktop-runtime/electron/main.cjs", "main");
    writeFile(tempDir, ".desktop-runtime/electron/preload.cjs", "preload");
    writeFile(tempDir, ".desktop-runtime/desktop/worker/background-entry.cjs", "worker");
    writeFile(tempDir, ".desktop-runtime/desktop/worker/task-entry.cjs", "task");
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
          id: "rendererOut",
          path: "out",
          exists: true,
          type: "directory",
          bytes: 15,
          fileCount: 2,
        }),
        expect.objectContaining({
          id: "desktopRuntime",
          path: ".desktop-runtime",
          exists: true,
          type: "directory",
          bytes: 21,
          fileCount: 4,
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
        existingArtifacts: 3,
        bytes: 43,
        fileCount: 7,
      }),
    );
  });

  it("does not double-count symlinked bundle contents", () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "plreview-desktop-size-symlink-"),
    );
    tempDirs.push(tempDir);

    writeFile(tempDir, "release/PLReview.app/Contents/MacOS/PLReview", "binary");
    fs.mkdirSync(
      path.join(tempDir, "release/PLReview.app/Contents/Frameworks"),
      { recursive: true },
    );
    fs.symlinkSync(
      path.join(tempDir, "release/PLReview.app/Contents/MacOS/PLReview"),
      path.join(tempDir, "release/PLReview.app/Contents/Frameworks/Current"),
    );

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
    };

    expect(report.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "release",
          path: "release",
          exists: true,
          type: "directory",
          bytes: 6,
          fileCount: 1,
        }),
      ]),
    );
  });
});

function writeFile(root: string, relativePath: string, content: string) {
  const targetPath = path.join(root, relativePath);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content);
}
