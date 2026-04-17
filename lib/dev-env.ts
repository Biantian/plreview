export const DEFAULT_DATABASE_URL = "file:./dev.db";
export const DEFAULT_APP_ENCRYPTION_KEY = "local-dev-encryption-key-32chars";

export function applyLocalDevEnvDefaults(env: NodeJS.ProcessEnv) {
  return {
    ...env,
    DATABASE_URL: env.DATABASE_URL || DEFAULT_DATABASE_URL,
    APP_ENCRYPTION_KEY: env.APP_ENCRYPTION_KEY || DEFAULT_APP_ENCRYPTION_KEY,
  };
}
