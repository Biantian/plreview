import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

import { build } from "esbuild";

const outdir = path.resolve(".desktop-runtime");
const bootstrapDatabasePath = path.join(outdir, "assets", "plreview.db");
const localBuildContextPath = path.join(outdir, "assets", "local-build-context.json");

fs.rmSync(outdir, { recursive: true, force: true });

await build({
  entryPoints: [
    "electron/main.ts",
    "electron/preload.ts",
    "desktop/worker/background-entry.ts",
    "desktop/worker/task-entry.ts",
  ],
  outdir,
  outbase: ".",
  platform: "node",
  format: "cjs",
  target: "node20",
  bundle: true,
  external: [
    "electron",
    "@prisma/client",
  ],
  sourcemap: false,
  logLevel: "info",
  tsconfig: path.resolve("tsconfig.json"),
  outExtension: {
    ".js": ".cjs",
  },
});

createBootstrapDatabase(bootstrapDatabasePath);
writeLocalBuildContext(localBuildContextPath);

function createBootstrapDatabase(targetPath) {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "plreview-desktop-bootstrap-db-"),
  );
  const databasePath = path.join(tempRoot, "plreview.db");
  const env = {
    ...process.env,
    DATABASE_URL: `file:${databasePath}`,
  };

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(databasePath, "");

  try {
    runCommand(getNpxCommand(), ["prisma", "db", "push", "--skip-generate"], env);
    runCommand(process.execPath, ["prisma/seed.mjs"], env);
    fs.copyFileSync(databasePath, targetPath);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function getNpxCommand() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function writeLocalBuildContext(targetPath) {
  if (process.env.PLREVIEW_DESKTOP_LOCAL_BUILD_CONTEXT !== "1") {
    return;
  }

  const sourceRoot = path.resolve(".");
  const repoRoot = resolveGitValue(sourceRoot, ["rev-parse", "--show-toplevel"]) ?? sourceRoot;
  const branchName =
    resolveGitValue(sourceRoot, ["rev-parse", "--abbrev-ref", "HEAD"]) ??
    path.basename(sourceRoot);
  const repoName = sanitizeSegment(path.basename(repoRoot)) ?? "plreview";
  const branchSegment = sanitizeSegment(branchName) ?? "local";
  const profileHash = createHash("sha1").update(sourceRoot).digest("hex").slice(0, 8);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(
    targetPath,
    JSON.stringify(
      {
        sourceRoot,
        userDataProfile: `${repoName}-${branchSegment}-${profileHash}`,
      },
      null,
      2,
    ),
  );
}

function resolveGitValue(cwd, args) {
  const result = spawnSync(getGitCommand(), args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  if (result.status !== 0) {
    return null;
  }

  return result.stdout.trim() || null;
}

function getGitCommand() {
  return process.platform === "win32" ? "git.exe" : "git";
}

function sanitizeSegment(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/gu, "-")
    .replace(/^-+|-+$/gu, "") || null;
}

function runCommand(command, args, env) {
  const result = spawnSync(command, args, {
    cwd: path.resolve("."),
    env,
    stdio: "inherit",
  });

  if (typeof result.status === "number" && result.status !== 0) {
    throw new Error(
      `Command failed: ${command} ${args.join(" ")} (exit ${result.status})`,
    );
  }

  if (result.error) {
    throw result.error;
  }
}
