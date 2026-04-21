import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import os from "node:os";

import { afterEach, describe, expect, it } from "vitest";

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

  it("keeps the preload bootstrap free of tsx runtime hooks", () => {
    const preloadBootstrap = fs.readFileSync(path.resolve("electron/preload.cjs"), "utf8");

    expect(preloadBootstrap).not.toContain("tsx/cjs");
  });

  it("packages the compiled desktop runtime instead of tsx-driven source entries", () => {
    const builderConfig = fs.readFileSync(path.resolve("electron-builder.yml"), "utf8");

    expect(builderConfig).toContain(".desktop-runtime/**/*");
    expect(builderConfig).toContain("out/**/*");
    expect(builderConfig).toContain("from: node_modules/@prisma/client");
    expect(builderConfig).toContain("to: node_modules/@prisma/client");
    expect(builderConfig).toContain("from: node_modules/.prisma/client");
    expect(builderConfig).toContain("to: node_modules/.prisma/client");
    expect(builderConfig).toContain("!node_modules/**/*");
    expect(builderConfig).toContain("asarUnpack:");
    expect(builderConfig).not.toContain(".next/standalone");
    expect(builderConfig).not.toContain(".next/static");
    expect(builderConfig).not.toContain("electron/**/*.{ts,cjs}");
    expect(builderConfig).not.toContain("desktop/worker/**/*.{ts,cjs}");
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
});
