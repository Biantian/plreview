const path = require("node:path");

const { notarize } = require("@electron/notarize");

module.exports = async function notarizeApp(context) {
  const { electronPlatformName, appOutDir, packager } = context;

  if (electronPlatformName !== "darwin") {
    return;
  }

  if (process.env.PLREVIEW_MAC_NOTARIZE !== "1") {
    console.log("[notarize] skipping because PLREVIEW_MAC_NOTARIZE is not enabled");
    return;
  }

  const appName = packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);
  const credentials = resolveNotarizeCredentials(process.env);

  if (!credentials) {
    throw new Error(
      "PLREVIEW_MAC_NOTARIZE=1 but no notarization credentials were configured.",
    );
  }

  console.log(`[notarize] submitting ${appPath}`);
  await notarize({
    appPath,
    ...credentials,
  });
};

module.exports.default = module.exports;
module.exports.resolveNotarizeCredentials = resolveNotarizeCredentials;

function resolveNotarizeCredentials(env) {
  if (env.APPLE_KEYCHAIN_PROFILE) {
    return {
      keychainProfile: env.APPLE_KEYCHAIN_PROFILE,
    };
  }

  const apiKeyCredentials = resolveCredentialSet(env, [
    "APPLE_API_KEY",
    "APPLE_API_KEY_ID",
    "APPLE_API_ISSUER",
  ]);

  if (apiKeyCredentials) {
    return {
      appleApiKey: apiKeyCredentials.APPLE_API_KEY,
      appleApiKeyId: apiKeyCredentials.APPLE_API_KEY_ID,
      appleApiIssuer: apiKeyCredentials.APPLE_API_ISSUER,
    };
  }

  const appleIdCredentials = resolveCredentialSet(env, [
    "APPLE_ID",
    "APPLE_APP_SPECIFIC_PASSWORD",
    "APPLE_TEAM_ID",
  ]);

  if (appleIdCredentials) {
    return {
      appleId: appleIdCredentials.APPLE_ID,
      appleIdPassword: appleIdCredentials.APPLE_APP_SPECIFIC_PASSWORD,
      teamId: appleIdCredentials.APPLE_TEAM_ID,
    };
  }

  return null;
}

function resolveCredentialSet(env, keys) {
  const hasAny = keys.some((key) => Boolean(env[key]));

  if (!hasAny) {
    return null;
  }

  const missing = keys.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing mac notarization environment variables: ${missing.join(", ")}`,
    );
  }

  return Object.fromEntries(keys.map((key) => [key, env[key]]));
}
