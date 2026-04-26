import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const releaseDir = path.resolve(process.env.PLREVIEW_MAC_RELEASE_OUTPUT_DIR ?? "release");
const appPath = resolveArtifactPath(
  process.env.PLREVIEW_MAC_VERIFY_APP_PATH,
  [".app"],
);
const dmgPath = resolveArtifactPath(
  process.env.PLREVIEW_MAC_VERIFY_DMG_PATH,
  [".dmg"],
);

if (!appPath) {
  throw new Error(
    `Could not find a macOS .app bundle under ${releaseDir}. Build the release first or set PLREVIEW_MAC_VERIFY_APP_PATH.`,
  );
}

runCommand(getCodesignCommand(), ["--verify", "--deep", "--strict", "--verbose=2", appPath]);
runCommand(getSpctlCommand(), ["-a", "-vv", appPath]);

if (dmgPath) {
  runCommand(getStaplerCommand(), ["validate", dmgPath]);
}

function resolveArtifactPath(explicitPath, extensions) {
  if (explicitPath) {
    return path.resolve(explicitPath);
  }

  const entries = walk(releaseDir).filter((entryPath) =>
    extensions.some((extension) => entryPath.endsWith(extension)),
  );

  return entries[0] ?? null;
}

function walk(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const stats = fs.statSync(rootDir);

  if (!stats.isDirectory()) {
    return [rootDir];
  }

  const results = [rootDir];

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const entryPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      results.push(...walk(entryPath));
      continue;
    }

    results.push(entryPath);
  }

  return results;
}

function getCodesignCommand() {
  return {
    command: process.env.PLREVIEW_MAC_VERIFY_CODESIGN_CMD ?? "codesign",
    args: [],
  };
}

function getSpctlCommand() {
  return {
    command: process.env.PLREVIEW_MAC_VERIFY_SPCTL_CMD ?? "spctl",
    args: [],
  };
}

function getStaplerCommand() {
  return {
    command: process.env.PLREVIEW_MAC_VERIFY_STAPLER_CMD ?? "xcrun",
    args: ["stapler"],
  };
}

function runCommand(commandConfig, extraArgs) {
  const result = spawnSync(commandConfig.command, [...commandConfig.args, ...extraArgs], {
    stdio: "inherit",
    env: process.env,
  });

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.error) {
    throw result.error;
  }
}
