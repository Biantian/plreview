import type { BrowserWindowConstructorOptions } from "electron";

export const TITLEBAR_HEIGHT = 40;

const overlay = {
  color: "#ffffff",
  symbolColor: "#333333",
  height: TITLEBAR_HEIGHT,
} as const satisfies NonNullable<BrowserWindowConstructorOptions["titleBarOverlay"]>;

export function getWindowChromeOptions(
  platform: NodeJS.Platform = process.platform,
): Pick<BrowserWindowConstructorOptions, "titleBarStyle" | "titleBarOverlay"> {
  if (platform === "darwin") {
    return {
      titleBarStyle: "hiddenInset",
    };
  }

  return {
    titleBarStyle: "hidden",
    titleBarOverlay: overlay,
  };
}
