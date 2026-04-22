import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const electronMainSource = readFileSync(resolve(process.cwd(), "electron/main.ts"), "utf8");
const desktopDataLoaderSource = readFileSync(
  resolve(process.cwd(), "electron/desktop-data-loader.ts"),
  "utf8",
);

describe("electron main lazy desktop data imports", () => {
  it("keeps main free of alias-based dynamic imports and pushes lazy loading into a local loader", () => {
    expect(electronMainSource).not.toContain('import("@/lib/');
    expect(electronMainSource).toContain('import { loadDesktopDataModules } from "@/electron/desktop-data-loader";');
    expect(desktopDataLoaderSource).toContain('require("./desktop-data-bridge.ts")');
  });
});
