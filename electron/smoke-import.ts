export const SMOKE_IMPORT_PATHS_ENV_KEY = "PLREVIEW_SMOKE_IMPORT_PATHS";

export function resolveSmokeImportFilePaths(env: NodeJS.ProcessEnv) {
  const rawValue = env[SMOKE_IMPORT_PATHS_ENV_KEY];

  if (!rawValue || rawValue.trim().length === 0) {
    return null;
  }

  const parsed = JSON.parse(rawValue) as unknown;

  if (
    !Array.isArray(parsed) ||
    parsed.some((entry) => typeof entry !== "string" || entry.trim().length === 0)
  ) {
    throw new Error(`${SMOKE_IMPORT_PATHS_ENV_KEY} must be a JSON array of file paths.`);
  }

  return parsed.map((entry) => entry.trim());
}
