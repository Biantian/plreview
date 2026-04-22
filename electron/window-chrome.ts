import type { BrowserWindowConstructorOptions } from "electron";

export const TITLEBAR_HEIGHT = 40;
export const MAC_TRAFFIC_LIGHT_POSITION = {
  x: 18,
  y: 14,
} as const;

const overlay = {
  color: "#ffffff",
  symbolColor: "#333333",
  height: TITLEBAR_HEIGHT,
} as const satisfies NonNullable<BrowserWindowConstructorOptions["titleBarOverlay"]>;

export function getWindowChromeOptions(
  platform: NodeJS.Platform = process.platform,
): Pick<
  BrowserWindowConstructorOptions,
  | "backgroundColor"
  | "titleBarStyle"
  | "titleBarOverlay"
  | "trafficLightPosition"
  | "vibrancy"
  | "visualEffectState"
> {
  if (platform === "darwin") {
    return {
      backgroundColor: "#00000000",
      titleBarStyle: "hiddenInset",
      trafficLightPosition: MAC_TRAFFIC_LIGHT_POSITION,
      vibrancy: "sidebar",
      visualEffectState: "active",
    };
  }

  return {
    titleBarStyle: "hidden",
    titleBarOverlay: overlay,
  };
}
