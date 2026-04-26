import { spawnSync } from "node:child_process";

const forwardedArgs = process.argv.slice(2);
const notarizeCredentials = resolveNotarizeCredentials(process.env);

if (!notarizeCredentials) {
  console.error(
    [
      "Configure one mac notarization credential strategy before running a release build.",
      "Supported options:",
      "- APPLE_KEYCHAIN_PROFILE",
      "- APPLE_API_KEY + APPLE_API_KEY_ID + APPLE_API_ISSUER",
      "- APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD + APPLE_TEAM_ID",
    ].join("\n"),
  );
  process.exit(1);
}

runCommand(
  getDistCommand(),
  [...getDefaultReleaseArgs(), ...forwardedArgs],
  {
    ...process.env,
    PLREVIEW_MAC_NOTARIZE: "1",
  },
);

runCommand(getVerifyCommand(), [], process.env);

function resolveNotarizeCredentials(env) {
  if (env.APPLE_KEYCHAIN_PROFILE) {
    return {
      strategy: "keychain-profile",
    };
  }

  if (hasCompleteSet(env, ["APPLE_API_KEY", "APPLE_API_KEY_ID", "APPLE_API_ISSUER"])) {
    return {
      strategy: "api-key",
    };
  }

  if (
    hasCompleteSet(env, ["APPLE_ID", "APPLE_APP_SPECIFIC_PASSWORD", "APPLE_TEAM_ID"])
  ) {
    return {
      strategy: "apple-id",
    };
  }

  return null;
}

function hasCompleteSet(env, keys) {
  return keys.every((key) => Boolean(env[key]));
}

function getDefaultReleaseArgs() {
  return ["--mac", "dmg", "--arm64"];
}

function getDistCommand() {
  if (process.env.PLREVIEW_MAC_RELEASE_DIST_NODE_SCRIPT) {
    return {
      command: process.execPath,
      args: [process.env.PLREVIEW_MAC_RELEASE_DIST_NODE_SCRIPT],
    };
  }

  return {
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "desktop:dist", "--"],
  };
}

function getVerifyCommand() {
  if (process.env.PLREVIEW_MAC_RELEASE_VERIFY_NODE_SCRIPT) {
    return {
      command: process.execPath,
      args: [process.env.PLREVIEW_MAC_RELEASE_VERIFY_NODE_SCRIPT],
    };
  }

  return {
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "desktop:verify:mac-release"],
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
