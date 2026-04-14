import { contextBridge, ipcRenderer } from "electron";

import { createDesktopApi } from "../desktop/bridge/desktop-api";

contextBridge.exposeInMainWorld(
  "plreview",
  createDesktopApi((channel, payload) => ipcRenderer.invoke(channel, payload)),
);
