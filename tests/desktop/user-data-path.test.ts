import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  resolveDesktopUserDataPathOverride,
  resolveLocalDevDesktopUserDataPath,
} from "@/electron/user-data-path";

describe("resolveLocalDevDesktopUserDataPath", () => {
  it("keeps local desktop user data inside the current workspace root", () => {
    expect(resolveLocalDevDesktopUserDataPath("/tmp/plreview")).toBe(
      "/tmp/plreview/.desktop-user-data",
    );
  });
});

describe("resolveDesktopUserDataPathOverride", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const tempDir of tempDirs) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("prefers an explicit environment override", () => {
    expect(
      resolveDesktopUserDataPathOverride({
        currentDir: "/tmp/plreview/.desktop-runtime/electron",
        defaultUserDataPath: "/Users/test/Library/Application Support/plreview",
        env: {
          PLREVIEW_DESKTOP_USER_DATA_PATH: "  /tmp/custom-user-data  ",
        },
        isPackaged: true,
      }),
    ).toBe("/tmp/custom-user-data");
  });

  it("isolates packaged local builds under a branch-specific application support directory", () => {
    const packagedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "plreview-user-data-path-"));
    tempDirs.push(packagedRoot);

    fs.mkdirSync(path.join(packagedRoot, ".desktop-runtime", "assets"), { recursive: true });
    fs.writeFileSync(
      path.join(packagedRoot, ".desktop-runtime", "assets", "local-build-context.json"),
      JSON.stringify({
        userDataProfile: "plreview-centered-overlay-drafts-ab12cd34",
      }),
    );

    expect(
      resolveDesktopUserDataPathOverride({
        currentDir: path.join(packagedRoot, ".desktop-runtime", "electron"),
        defaultUserDataPath: "/Users/test/Library/Application Support/plreview",
        env: {},
        isPackaged: true,
      }),
    ).toBe(
      "/Users/test/Library/Application Support/plreview-local/plreview-centered-overlay-drafts-ab12cd34",
    );
  });

  it("leaves packaged user data unchanged when no local build context exists", () => {
    expect(
      resolveDesktopUserDataPathOverride({
        currentDir: "/tmp/plreview/.desktop-runtime/electron",
        defaultUserDataPath: "/Users/test/Library/Application Support/plreview",
        env: {},
        isPackaged: true,
      }),
    ).toBeNull();
  });
});
