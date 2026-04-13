import path from "node:path";

export interface AppPaths {
  dataDir: string;
  dbPath: string;
  documentsDir: string;
  logsDir: string;
}

export function resolveAppPaths(baseDir: string): AppPaths {
  const dataDir = path.join(baseDir, "data");

  return {
    dataDir,
    dbPath: path.join(dataDir, "app.db"),
    documentsDir: path.join(dataDir, "documents"),
    logsDir: path.join(baseDir, "logs"),
  };
}
