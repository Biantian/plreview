import fs from "node:fs";
import path from "node:path";

import { build } from "esbuild";

const outdir = path.resolve(".desktop-runtime");

fs.rmSync(outdir, { recursive: true, force: true });

await build({
  entryPoints: [
    "electron/main.ts",
    "electron/preload.ts",
    "desktop/worker/background-entry.ts",
    "desktop/worker/task-entry.ts",
  ],
  outdir,
  outbase: ".",
  platform: "node",
  format: "cjs",
  target: "node20",
  bundle: true,
  packages: "external",
  sourcemap: false,
  logLevel: "info",
  tsconfig: path.resolve("tsconfig.json"),
  outExtension: {
    ".js": ".cjs",
  },
});
