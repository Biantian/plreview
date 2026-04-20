import { describe, expect, it } from "vitest";

import { getWindowChromeOptions } from "@/electron/window-chrome";

describe("getWindowChromeOptions", () => {
  it("uses hidden inset chrome on macOS without a custom overlay strip", () => {
    expect(getWindowChromeOptions("darwin")).toEqual({
      titleBarStyle: "hiddenInset",
    });
  });

  it("uses hidden titlebar overlay chrome on Windows-style platforms", () => {
    expect(getWindowChromeOptions("win32")).toEqual({
      titleBarStyle: "hidden",
      titleBarOverlay: {
        color: "#ffffff",
        symbolColor: "#333333",
        height: 40,
      },
    });
  });
});
