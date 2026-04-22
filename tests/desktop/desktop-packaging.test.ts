import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import os from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import nextConfig from "@/next.config";
import packageJson from "@/package.json";

describe("desktop packaging scripts", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const tempDir of tempDirs) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("declares build scripts for both desktop development and production packaging", () => {
    expect(packageJson.scripts["desktop:dev"]).toBeTruthy();
    expect(packageJson.scripts["desktop:build"]).toBeTruthy();
    expect(packageJson.scripts["desktop:build:runtime"]).toBeTruthy();
    expect(packageJson.scripts["desktop:dist"]).toBeTruthy();
    expect(packageJson.scripts["test:desktop:smoke"]).toBeTruthy();
  });

  it("starts desktop main process from the cjs bootstrap entry", () => {
    expect(packageJson.scripts["desktop:main"]).toContain("electron ./electron/main.cjs");
    expect(packageJson.scripts["desktop:main"]).not.toContain("electron ./electron/main.ts");
  });

  it("keeps desktop distribution reporting wired through an explicit script", () => {
    expect(packageJson.scripts["desktop:dist"]).toBe(
      "node ./scripts/run-desktop-dist.mjs",
    );
  });

  it("keeps desktop smoke validation wired through an explicit script", () => {
    expect(packageJson.scripts["test:desktop:smoke"]).toBe(
      "node ./scripts/run-desktop-smoke.mjs",
    );
  });

  it("keeps the source preload bootstrap runtime-safe for Electron sandbox execution", () => {
    const preloadBootstrap = fs.readFileSync(path.resolve("electron/preload.cjs"), "utf8");

    expect(preloadBootstrap).toContain('require("electron")');
    expect(preloadBootstrap).toContain('contextBridge.exposeInMainWorld("plreview"');
    expect(preloadBootstrap).not.toContain('require("tsx/cjs")');
  });

  it("packages the compiled desktop runtime instead of tsx-driven source entries", () => {
    const builderConfig = fs.readFileSync(path.resolve("electron-builder.yml"), "utf8");
    const filesEntries = readTopLevelYamlList(builderConfig, "files");

    expect(filesEntries).toEqual(
      expect.arrayContaining([
        ".desktop-runtime/**/*",
        "out/**/*",
        "package.json",
        "from: node_modules/@prisma/client",
        "from: node_modules/.prisma/client",
        "!node_modules/**/*",
      ]),
    );
    expect(filesEntries).toHaveLength(6);
    expect(builderConfig).toMatch(
      /- from: node_modules\/@prisma\/client[\s\S]*?to: node_modules\/@prisma\/client/u,
    );
    expect(builderConfig).toMatch(
      /- from: node_modules\/\.prisma\/client[\s\S]*?to: node_modules\/\.prisma\/client/u,
    );
    expect(builderConfig).toMatch(/asarUnpack:[\s\S]*node_modules\/\.prisma\/client/u);
    expect(filesEntries.join("\n")).not.toMatch(/\.next/u);
  });

  it("keeps next configured for static export only", () => {
    expect(nextConfig.output).toBe("export");
    expect(nextConfig).not.toHaveProperty("outputFileTracingRoot");
  });

  it("builds desktop runtime directly from electron and worker entrypoints", () => {
    const buildRuntimeScript = fs.readFileSync(
      path.resolve("scripts/build-desktop-runtime.mjs"),
      "utf8",
    );
    const entryPoints = readQuotedArray(buildRuntimeScript, "entryPoints");

    expect(entryPoints).toEqual(
      expect.arrayContaining([
        "electron/main.ts",
        "electron/preload.ts",
        "desktop/worker/background-entry.ts",
        "desktop/worker/task-entry.ts",
      ]),
    );
    expect(entryPoints.every((entryPoint) => !entryPoint.includes(".next"))).toBe(true);
    expect(entryPoints.every((entryPoint) => !entryPoint.includes("standalone"))).toBe(true);
  });

  it("forwards desktop dist args to electron-builder before running the size report", () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "plreview-desktop-dist-script-"),
    );
    tempDirs.push(tempDir);

    const logPath = path.join(tempDir, "commands.log");
    const fakeBuilderPath = path.join(tempDir, "fake-builder.mjs");
    const fakeReportPath = path.join(tempDir, "fake-report.mjs");
    const runnerPath = path.resolve("scripts/run-desktop-dist.mjs");

    fs.writeFileSync(
      fakeBuilderPath,
      [
        'import fs from "node:fs";',
        'fs.appendFileSync(process.env.LOG_PATH, JSON.stringify({',
        '  kind: "builder",',
        '  argv: process.argv.slice(2),',
        '}) + "\\n");',
      ].join("\n"),
    );
    fs.writeFileSync(
      fakeReportPath,
      [
        'import fs from "node:fs";',
        'fs.appendFileSync(process.env.LOG_PATH, JSON.stringify({',
        '  kind: "report",',
        '  argv: process.argv.slice(2),',
        '}) + "\\n");',
      ].join("\n"),
    );

    execFileSync(
      "node",
      [runnerPath, "--win", "--x64", "--dir"],
      {
        cwd: path.resolve("."),
        encoding: "utf8",
        env: {
          ...process.env,
          PLREVIEW_DESKTOP_DIST_SKIP_BUILD: "1",
          PLREVIEW_DESKTOP_DIST_OUTPUT_DIR: path.join(tempDir, "release"),
          PLREVIEW_DESKTOP_DIST_BUILDER_NODE_SCRIPT: fakeBuilderPath,
          PLREVIEW_DESKTOP_DIST_REPORT_NODE_SCRIPT: fakeReportPath,
          LOG_PATH: logPath,
        },
      },
    );

    const commands = fs
      .readFileSync(logPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line)) as Array<{
      kind: "builder" | "report";
      argv: string[];
    }>;

    expect(commands).toEqual([
      {
        kind: "builder",
        argv: ["--win", "--x64", "--dir"],
      },
      {
        kind: "report",
        argv: [],
      },
    ]);
  });

  it("cleans stale release output before builder execution", () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "plreview-desktop-dist-clean-"),
    );
    tempDirs.push(tempDir);

    const releaseOutputDir = path.join(tempDir, "release");
    const staleMarker = path.join(releaseOutputDir, "stale.txt");
    const logPath = path.join(tempDir, "commands.log");
    const fakeBuilderPath = path.join(tempDir, "fake-builder.mjs");
    const fakeReportPath = path.join(tempDir, "fake-report.mjs");
    const runnerPath = path.resolve("scripts/run-desktop-dist.mjs");

    fs.mkdirSync(releaseOutputDir, { recursive: true });
    fs.writeFileSync(staleMarker, "stale");

    fs.writeFileSync(
      fakeBuilderPath,
      [
        'import fs from "node:fs";',
        'fs.appendFileSync(process.env.LOG_PATH, JSON.stringify({',
        '  kind: "builder",',
        '  staleExists: fs.existsSync(process.env.STALE_MARKER),',
        '}) + "\\n");',
      ].join("\n"),
    );
    fs.writeFileSync(
      fakeReportPath,
      [
        'import fs from "node:fs";',
        'fs.appendFileSync(process.env.LOG_PATH, JSON.stringify({',
        '  kind: "report",',
        '}) + "\\n");',
      ].join("\n"),
    );

    execFileSync("node", [runnerPath], {
      cwd: path.resolve("."),
      encoding: "utf8",
      env: {
        ...process.env,
        PLREVIEW_DESKTOP_DIST_SKIP_BUILD: "1",
        PLREVIEW_DESKTOP_DIST_OUTPUT_DIR: releaseOutputDir,
        PLREVIEW_DESKTOP_DIST_BUILDER_NODE_SCRIPT: fakeBuilderPath,
        PLREVIEW_DESKTOP_DIST_REPORT_NODE_SCRIPT: fakeReportPath,
        LOG_PATH: logPath,
        STALE_MARKER: staleMarker,
      },
    });

    const commands = fs
      .readFileSync(logPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line)) as Array<{
      kind: "builder" | "report";
      staleExists?: boolean;
    }>;

    expect(commands).toEqual([
      {
        kind: "builder",
        staleExists: false,
      },
      {
        kind: "report",
      },
    ]);
    expect(fs.existsSync(staleMarker)).toBe(false);
  });
});

function readTopLevelYamlList(source: string, key: string) {
  const lines = source.split(/\r?\n/u);
  const sectionStart = lines.findIndex((line) => line.trim() === `${key}:`);

  if (sectionStart < 0) {
    return [];
  }

  const sectionLines: string[] = [];

  for (const line of lines.slice(sectionStart + 1)) {
    if (/^[A-Za-z][\w-]*:/u.test(line)) {
      break;
    }

    sectionLines.push(line);
  }

  return sectionLines
    .filter((line) => /^  - /u.test(line))
    .map((line) => line.replace(/^  - /u, "").trim().replace(/^"(.+)"$/u, "$1"));
}

function readQuotedArray(source: string, key: string) {
  const sectionMatch = source.match(
    new RegExp(`${key}:\\s*\\[([\\s\\S]*?)\\]`, "u"),
  );

  if (!sectionMatch) {
    return [];
  }

  return Array.from(sectionMatch[1].matchAll(/"([^"]+)"/gu)).map((match) => match[1]);
}
