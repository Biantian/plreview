import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const forwardedArgs = process.argv.slice(2);

if (process.env.PLREVIEW_DESKTOP_DIST_SKIP_BUILD !== "1") {
  runCommand(getNpmCommand(), ["run", "desktop:build"], {
    ...process.env,
    PLREVIEW_DESKTOP_LOCAL_BUILD_CONTEXT:
      process.env.PLREVIEW_DESKTOP_LOCAL_BUILD_CONTEXT ?? "1",
  });
}

if (process.env.PLREVIEW_DESKTOP_DIST_CLEAN_OUTPUT !== "0") {
  cleanDistOutput();
}

runCommand(getBuilderCommand(), forwardedArgs, process.env);
runCommand(getReportCommand(), [], process.env);

function getNpmCommand() {
  if (process.env.PLREVIEW_DESKTOP_DIST_NPM_CMD) {
    return {
      command: process.env.PLREVIEW_DESKTOP_DIST_NPM_CMD,
      args: [],
    };
  }

  return {
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args: [],
  };
}

function getBuilderCommand() {
  if (process.env.PLREVIEW_DESKTOP_DIST_BUILDER_NODE_SCRIPT) {
    return {
      command: process.execPath,
      args: [process.env.PLREVIEW_DESKTOP_DIST_BUILDER_NODE_SCRIPT],
    };
  }

  return {
    command: process.platform === "win32" ? "npx.cmd" : "npx",
    args: ["electron-builder"],
  };
}

function getReportCommand() {
  if (process.env.PLREVIEW_DESKTOP_DIST_REPORT_NODE_SCRIPT) {
    return {
      command: process.execPath,
      args: [process.env.PLREVIEW_DESKTOP_DIST_REPORT_NODE_SCRIPT],
    };
  }

  return {
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "desktop:report-size"],
  };
}

function runCommand(commandConfig, extraArgs, env) {
  const result = spawnSync(commandConfig.command, [...commandConfig.args, ...extraArgs], {
    stdio: "inherit",
    env,
  });

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.error) {
    throw result.error;
  }
}

function cleanDistOutput() {
  const outputDir = path.resolve(process.env.PLREVIEW_DESKTOP_DIST_OUTPUT_DIR ?? "release");

  fs.rmSync(outputDir, { recursive: true, force: true });
}
