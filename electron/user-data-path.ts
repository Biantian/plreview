import fs from "node:fs";
import path from "node:path";

const LOCAL_BUILD_CONTEXT_FILENAME = "local-build-context.json";

type ResolveDesktopUserDataPathOverrideOptions = {
  currentDir: string;
  defaultUserDataPath: string;
  env: NodeJS.ProcessEnv;
  isPackaged: boolean;
  resourcesPath?: string;
};

type LocalBuildContext = {
  userDataProfile?: string;
};

export function resolveLocalDevDesktopUserDataPath(projectRoot: string) {
  return path.resolve(projectRoot, ".desktop-user-data");
}

export function resolveDesktopUserDataPathOverride(
  options: ResolveDesktopUserDataPathOverrideOptions,
) {
  const explicitOverride = options.env.PLREVIEW_DESKTOP_USER_DATA_PATH?.trim();

  if (explicitOverride) {
    return path.resolve(explicitOverride);
  }

  if (!options.isPackaged) {
    return null;
  }

  const context = resolveLocalBuildContext(options);
  const userDataProfile = sanitizePathSegment(context?.userDataProfile);

  if (!userDataProfile) {
    return null;
  }

  const userDataParent = path.dirname(options.defaultUserDataPath);
  const defaultUserDataDirName = path.basename(options.defaultUserDataPath);

  return path.join(
    userDataParent,
    `${defaultUserDataDirName}-local`,
    userDataProfile,
  );
}

function resolveLocalBuildContext(options: ResolveDesktopUserDataPathOverrideOptions) {
  for (const candidatePath of buildLocalBuildContextCandidates(options)) {
    if (!fs.existsSync(candidatePath)) {
      continue;
    }

    try {
      return JSON.parse(fs.readFileSync(candidatePath, "utf8")) as LocalBuildContext;
    } catch {
      return null;
    }
  }

  return null;
}

function buildLocalBuildContextCandidates(
  options: ResolveDesktopUserDataPathOverrideOptions,
) {
  const candidates = new Set<string>();

  candidates.add(
    path.resolve(options.currentDir, "..", "assets", LOCAL_BUILD_CONTEXT_FILENAME),
  );

  for (const basePath of [options.resourcesPath].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  )) {
    candidates.add(
      path.resolve(
        basePath,
        "app.asar",
        ".desktop-runtime",
        "assets",
        LOCAL_BUILD_CONTEXT_FILENAME,
      ),
    );
    candidates.add(
      path.resolve(
        basePath,
        ".desktop-runtime",
        "assets",
        LOCAL_BUILD_CONTEXT_FILENAME,
      ),
    );
  }

  return candidates;
}

function sanitizePathSegment(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/gu, "-")
    .replace(/^-+|-+$/gu, "");

  return normalized || null;
}
