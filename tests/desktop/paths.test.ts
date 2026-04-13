import path from "node:path";
import { describe, expect, it } from "vitest";

import { resolveAppPaths } from "@/desktop/core/paths";

describe("resolveAppPaths", () => {
  it("creates stable desktop directories under the supplied base dir", () => {
    const baseDir = path.resolve("tmp", "plreview");
    const paths = resolveAppPaths(baseDir);

    expect(paths.dataDir).toBe(path.join(baseDir, "data"));
    expect(paths.dbPath).toBe(path.join(baseDir, "data", "app.db"));
    expect(paths.documentsDir).toBe(path.join(baseDir, "data", "documents"));
    expect(paths.logsDir).toBe(path.join(baseDir, "logs"));
  });
});
