import { describe, expect, it } from "vitest";

import { resolveSmokeImportFilePaths } from "@/electron/smoke-import";

describe("resolveSmokeImportFilePaths", () => {
  it("returns null when smoke imports are not configured", () => {
    expect(resolveSmokeImportFilePaths({})).toBeNull();
  });

  it("parses a JSON array of file paths", () => {
    expect(
      resolveSmokeImportFilePaths({
        PLREVIEW_SMOKE_IMPORT_PATHS: JSON.stringify([
          "/tmp/one.md",
          "/tmp/two.docx",
        ]),
      }),
    ).toEqual(["/tmp/one.md", "/tmp/two.docx"]);
  });

  it("rejects invalid smoke import payloads", () => {
    expect(() =>
      resolveSmokeImportFilePaths({
        PLREVIEW_SMOKE_IMPORT_PATHS: "{\"not\":\"an-array\"}",
      }),
    ).toThrowError("PLREVIEW_SMOKE_IMPORT_PATHS must be a JSON array of file paths.");
  });
});
