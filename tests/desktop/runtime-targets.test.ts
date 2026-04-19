import { describe, expect, it } from "vitest";

import { resolveForkTarget } from "@/desktop/runtime-targets";

describe("resolveForkTarget", () => {
  it("uses source TypeScript entries with a bootstrap hook in source mode", () => {
    const target = resolveForkTarget(
      "/tmp/plreview/electron/main.ts",
      "../desktop/worker/background-entry.ts",
      "../desktop/worker/background-entry.cjs",
      "../desktop/worker/background-entry.cjs",
    );

    expect(target).toEqual({
      entryPath: "/tmp/plreview/desktop/worker/background-entry.ts",
      execArgv: ["-r", "/tmp/plreview/desktop/worker/background-entry.cjs"],
      mode: "source",
    });
  });

  it("uses compiled CommonJS entries without tsx hooks in packaged mode", () => {
    const target = resolveForkTarget(
      "/tmp/plreview/.desktop-runtime/electron/main.cjs",
      "../desktop/worker/background-entry.ts",
      "../desktop/worker/background-entry.cjs",
      "../desktop/worker/background-entry.cjs",
    );

    expect(target).toEqual({
      entryPath: "/tmp/plreview/.desktop-runtime/desktop/worker/background-entry.cjs",
      execArgv: [],
      mode: "compiled",
    });
  });
});
