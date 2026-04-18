import { contextBridge, ipcRenderer } from "electron";

import { createDesktopApi } from "../desktop/bridge/desktop-api";
import type { RuntimeStatusPayload } from "@/desktop/worker/protocol";

contextBridge.exposeInMainWorld(
  "plreview",
  createDesktopApi(
    (channel, payload) => ipcRenderer.invoke(channel, payload),
    (event, listener) => {
      const wrapped = (_event: unknown, payload: RuntimeStatusPayload) => {
        listener(payload);
      };

      ipcRenderer.on(event, wrapped);

      return () => {
        ipcRenderer.off(event, wrapped);
      };
    },
  ),
);
