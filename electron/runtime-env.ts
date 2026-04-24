import fs from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

import { applyLocalDevEnvDefaults } from "@/lib/dev-env";

const PACKAGED_DATABASE_FILENAME = "plreview.db";
const PACKAGED_ENCRYPTION_KEY_FILENAME = "app-encryption.key";

type ResolveDesktopRuntimeEnvOptions = {
  currentDir: string;
  env: NodeJS.ProcessEnv;
  mode?: "development" | "packaged";
  resourcesPath?: string;
  userDataPath?: string;
  bootstrapDatabasePath?: string;
};

export function resolveDesktopRuntimeEnv(
  options: ResolveDesktopRuntimeEnvOptions,
) {
  const sourceRoot = findSourceRoot(options.currentDir, options.resourcesPath);
  const fileEnv = sourceRoot ? readDotEnv(sourceRoot) : {};
  const mergedEnv = applyLocalDevEnvDefaults({
    ...fileEnv,
    ...options.env,
  });

  if (sourceRoot) {
    return {
      ...mergedEnv,
      DATABASE_URL: absolutizeSqliteDatabaseUrl(
        mergedEnv.DATABASE_URL,
        path.join(sourceRoot, "prisma"),
      ),
    };
  }

  if (options.mode === "packaged") {
    return resolvePackagedRuntimeEnv({
      ...options,
      env: options.env,
    });
  }

  return mergedEnv;
}

export function applyDesktopRuntimeEnv(
  options: ResolveDesktopRuntimeEnvOptions,
) {
  const resolved = resolveDesktopRuntimeEnv(options);

  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === "string") {
      process.env[key] = value;
    }
  }

  return resolved;
}

function findSourceRoot(currentDir: string, resourcesPath = process.resourcesPath) {
  for (const candidate of buildSearchPaths(currentDir, resourcesPath)) {
    if (fs.existsSync(path.join(candidate, "prisma", "schema.prisma"))) {
      return candidate;
    }
  }

  return null;
}

function resolvePackagedRuntimeEnv(options: ResolveDesktopRuntimeEnvOptions) {
  const userDataPath = resolvePackagedUserDataPath(options);
  const bootstrapDatabasePath = resolveBootstrapDatabasePath(options);
  const databaseUrl = resolvePackagedDatabaseUrl(
    options.env.DATABASE_URL,
    userDataPath,
    bootstrapDatabasePath,
  );
  const encryptionKey = resolvePackagedEncryptionKey(
    options.env.APP_ENCRYPTION_KEY,
    userDataPath,
  );

  return {
    ...options.env,
    DATABASE_URL: databaseUrl,
    APP_ENCRYPTION_KEY: encryptionKey,
  };
}

function resolvePackagedUserDataPath(options: ResolveDesktopRuntimeEnvOptions) {
  const explicitUserDataPath =
    options.userDataPath ?? options.env.PLREVIEW_DESKTOP_USER_DATA_PATH;

  if (typeof explicitUserDataPath === "string" && explicitUserDataPath.trim().length > 0) {
    const resolvedPath = path.resolve(explicitUserDataPath);
    fs.mkdirSync(resolvedPath, { recursive: true });
    return resolvedPath;
  }

  throw new Error("Missing packaged desktop user data path.");
}

function resolveBootstrapDatabasePath(options: ResolveDesktopRuntimeEnvOptions) {
  if (
    typeof options.bootstrapDatabasePath === "string" &&
    options.bootstrapDatabasePath.trim().length > 0
  ) {
    return path.resolve(options.bootstrapDatabasePath);
  }

  const candidates = new Set<string>();
  const currentDirAssetPath = path.resolve(
    options.currentDir,
    "..",
    "assets",
    PACKAGED_DATABASE_FILENAME,
  );

  candidates.add(currentDirAssetPath);

  for (const basePath of [options.resourcesPath].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  )) {
    candidates.add(
      path.resolve(
        basePath,
        "app.asar",
        ".desktop-runtime",
        "assets",
        PACKAGED_DATABASE_FILENAME,
      ),
    );
    candidates.add(
      path.resolve(basePath, ".desktop-runtime", "assets", PACKAGED_DATABASE_FILENAME),
    );
  }

  for (const candidatePath of candidates) {
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}

function resolvePackagedDatabaseUrl(
  databaseUrl: string | undefined,
  userDataPath: string,
  bootstrapDatabasePath: string | null,
) {
  const normalizedDatabaseUrl = databaseUrl?.trim()
    ? absolutizeSqliteDatabaseUrl(databaseUrl, userDataPath)
    : `file:${path.join(userDataPath, PACKAGED_DATABASE_FILENAME)}`;

  const databaseFilePath = extractSqliteDatabasePath(normalizedDatabaseUrl);

  if (!databaseFilePath) {
    return normalizedDatabaseUrl;
  }

  if (fs.existsSync(databaseFilePath) && isUsableSqliteDatabase(databaseFilePath)) {
    return normalizedDatabaseUrl;
  }

  fs.mkdirSync(path.dirname(databaseFilePath), { recursive: true });

  if (!bootstrapDatabasePath) {
    throw new Error("Missing packaged bootstrap database.");
  }

  fs.writeFileSync(databaseFilePath, fs.readFileSync(bootstrapDatabasePath));

  return normalizedDatabaseUrl;
}

function isUsableSqliteDatabase(databaseFilePath: string) {
  try {
    const stats = fs.statSync(databaseFilePath);

    if (stats.size === 0) {
      return false;
    }

    const header = fs.readFileSync(databaseFilePath).subarray(0, 16).toString("utf8");

    return header === "SQLite format 3\u0000";
  } catch {
    return false;
  }
}

function resolvePackagedEncryptionKey(
  encryptionKey: string | undefined,
  userDataPath: string,
) {
  if (typeof encryptionKey === "string" && encryptionKey.trim().length > 0) {
    return encryptionKey.trim();
  }

  const keyFilePath = path.join(userDataPath, PACKAGED_ENCRYPTION_KEY_FILENAME);

  if (fs.existsSync(keyFilePath)) {
    const persistedKey = fs.readFileSync(keyFilePath, "utf8").trim();

    if (persistedKey) {
      return persistedKey;
    }
  }

  const generatedKey = randomBytes(32).toString("hex");

  fs.writeFileSync(keyFilePath, `${generatedKey}\n`, { mode: 0o600 });

  return generatedKey;
}

function buildSearchPaths(currentDir: string, resourcesPath?: string) {
  const candidates = new Set<string>();

  for (const start of [currentDir, resourcesPath].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  )) {
    let cursor = path.resolve(start);

    for (let depth = 0; depth < 8; depth += 1) {
      candidates.add(cursor);

      const parent = path.dirname(cursor);
      if (parent === cursor) {
        break;
      }

      cursor = parent;
    }
  }

  return candidates;
}

function readDotEnv(sourceRoot: string) {
  const envPath = path.join(sourceRoot, ".env");

  if (!fs.existsSync(envPath)) {
    return {};
  }

  const env: Record<string, string> = {};
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/u);

  for (const line of lines) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u.exec(line);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    const value = rawValue.replace(/^['"]|['"]$/gu, "");

    env[key] = value;
  }

  return env;
}

function absolutizeSqliteDatabaseUrl(databaseUrl: string, prismaDir: string) {
  if (!databaseUrl.startsWith("file:")) {
    return databaseUrl;
  }

  const [filePath, search = ""] = databaseUrl.slice("file:".length).split("?");

  if (!filePath || path.isAbsolute(filePath)) {
    return databaseUrl;
  }

  const absolutePath = path.resolve(prismaDir, filePath);

  return `file:${absolutePath}${search ? `?${search}` : ""}`;
}

function extractSqliteDatabasePath(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) {
    return null;
  }

  const [filePath] = databaseUrl.slice("file:".length).split("?");

  if (!filePath || !path.isAbsolute(filePath)) {
    return null;
  }

  return filePath;
}
