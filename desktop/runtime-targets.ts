import path from "node:path";

export type ForkTarget = {
  entryPath: string;
  execArgv: string[];
  mode: "source" | "compiled";
};

export function resolveForkTarget(
  currentModulePath: string,
  sourceEntryRelativePath: string,
  compiledEntryRelativePath: string,
  sourceBootstrapRelativePath: string,
): ForkTarget {
  const currentDir = path.dirname(currentModulePath);

  if (path.extname(currentModulePath) === ".cjs") {
    return {
      entryPath: path.join(currentDir, compiledEntryRelativePath),
      execArgv: [],
      mode: "compiled",
    };
  }

  return {
    entryPath: path.join(currentDir, sourceEntryRelativePath),
    execArgv: ["-r", path.join(currentDir, sourceBootstrapRelativePath)],
    mode: "source",
  };
}
