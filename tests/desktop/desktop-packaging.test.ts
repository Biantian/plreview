import { describe, expect, it } from "vitest";

import packageJson from "@/package.json";

describe("desktop packaging scripts", () => {
  it("declares build scripts for both desktop development and production packaging", () => {
    expect(packageJson.scripts["desktop:dev"]).toBeTruthy();
    expect(packageJson.scripts["desktop:build"]).toBeTruthy();
    expect(packageJson.scripts["desktop:dist"]).toBeTruthy();
  });

  it("starts desktop main process from the cjs bootstrap entry", () => {
    expect(packageJson.scripts["desktop:main"]).toContain("electron ./electron/main.cjs");
    expect(packageJson.scripts["desktop:main"]).not.toContain("--import tsx");
  });
});
