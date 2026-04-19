import fs from "node:fs";
import path from "node:path";

import { applyLocalDevEnvDefaults } from "@/lib/dev-env";

type ResolveDesktopRuntimeEnvOptions = {
  currentDir: string;
  env: NodeJS.ProcessEnv;
  resourcesPath?: string;
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

  if (!sourceRoot) {
    return mergedEnv;
  }

  return {
    ...mergedEnv,
    DATABASE_URL: absolutizeSqliteDatabaseUrl(
      mergedEnv.DATABASE_URL,
      path.join(sourceRoot, "prisma"),
    ),
  };
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
