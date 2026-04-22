export function loadDesktopDataModules() {
  return Promise.resolve(require("./desktop-data-bridge.ts"));
}
