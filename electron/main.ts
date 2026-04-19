import path from "node:path";
import type { OpenDialogOptions } from "electron";
import { BrowserWindow, app, dialog, ipcMain } from "electron";

import { DESKTOP_EVENTS } from "@/desktop/worker/protocol";
import { createRuntimeMetricsService } from "@/desktop/worker/services/runtime-metrics-service";
import { applyDesktopRuntimeEnv } from "@/electron/runtime-env";
import { resolveRendererLoadTarget } from "@/electron/renderer-runtime";
import { CHANNELS, registerDesktopHandlers } from "./channels";
import { createWorkerManager } from "./worker-manager";

const currentDir = __dirname;
let mainWindow: BrowserWindow | null = null;
const runtimeMetrics = createRuntimeMetricsService();
let stopPackagedRenderer: (() => void) | null = null;

function publishRuntimeStatus() {
  const runtimeStatus = runtimeMetrics.getRuntimeStatus();

  mainWindow?.webContents.send(DESKTOP_EVENTS.runtimeUpdated, runtimeStatus);

  return runtimeStatus;
}

const workerManager = createWorkerManager({
  onWorkerStarting: () => {
    runtimeMetrics.markWorkerStarting();
    publishRuntimeStatus();
  },
  onWorkerReady: () => {
    runtimeMetrics.markWorkerReady();
    publishRuntimeStatus();
  },
  onWorkerStopped: () => {
    runtimeMetrics.markWorkerStopped();
    publishRuntimeStatus();
  },
  onWorkerError: (error) => {
    runtimeMetrics.markWorkerError(error);
    publishRuntimeStatus();
  },
});

function getPreloadPath() {
  if (process.env.ELECTRON_PRELOAD_PATH) {
    return path.resolve(process.env.ELECTRON_PRELOAD_PATH);
  }

  return path.join(currentDir, "preload.cjs");
}

function getFallbackHtml() {
  return `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>PLReview Desktop Shell</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f5f1e8;
        color: #16212f;
      }

      main {
        width: min(540px, calc(100vw - 48px));
        padding: 24px 28px;
        border: 1px solid rgba(22, 33, 47, 0.12);
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.9);
      }
    </style>
  </head>
  <body>
    <main>
      <h1>PLReview Desktop Shell</h1>
      <p>Renderer bundle is not configured yet. Start the renderer dev server or provide a packaged HTML entry.</p>
    </main>
  </body>
</html>`)}`;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const rendererTarget = await resolveRendererLoadTarget({
    currentDir,
    env: process.env,
  });

  if (rendererTarget.kind === "url") {
    stopPackagedRenderer = rendererTarget.stop ?? null;
    await mainWindow.loadURL(rendererTarget.url);
  } else if (rendererTarget.kind === "file") {
    await mainWindow.loadFile(rendererTarget.filePath);
  } else {
    await mainWindow.loadURL(getFallbackHtml());
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

void app.whenReady().then(async () => {
  applyDesktopRuntimeEnv({
    currentDir,
    env: process.env,
  });

  registerDesktopHandlers(
    (channel, handler) => {
      ipcMain.handle(channel, handler);
    },
    {
      [CHANNELS.filesPick]: async () => {
        const dialogOptions: OpenDialogOptions = {
          filters: [
            {
              name: "策划案文件",
              extensions: ["docx", "txt", "md", "xlsx"],
            },
          ],
          properties: ["openFile", "multiSelections"],
        };
        const result = mainWindow
          ? await dialog.showOpenDialog(mainWindow, dialogOptions)
          : await dialog.showOpenDialog(dialogOptions);

        if (result.canceled || result.filePaths.length === 0) {
          return [];
        }

        return workerManager.invoke(CHANNELS.filesPick, result.filePaths);
      },
      [CHANNELS.reviewBatchesCreate]: async (_event, payload) =>
        workerManager.invoke(CHANNELS.reviewBatchesCreate, payload),
      [CHANNELS.reviewJobsList]: async () => workerManager.invoke(CHANNELS.reviewJobsList),
      [CHANNELS.reviewJobsSearch]: async (_event, payload) =>
        workerManager.invoke(CHANNELS.reviewJobsSearch, payload),
      [CHANNELS.rulesList]: async () => workerManager.invoke(CHANNELS.rulesList),
      [CHANNELS.rulesSearch]: async (_event, payload) =>
        workerManager.invoke(CHANNELS.rulesSearch, payload),
      [CHANNELS.runtimeStatus]: async () => runtimeMetrics.getRuntimeStatus(),
    },
  );

  try {
    await workerManager.start();
  } catch (error) {
    const runtimeError =
      error instanceof Error ? error : new Error(String(error));

    if (runtimeMetrics.getRuntimeStatus().lastError !== runtimeError.message) {
      runtimeMetrics.markWorkerError(runtimeError);
    }
  }

  await createWindow();
  publishRuntimeStatus();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
      publishRuntimeStatus();
    }
  });
});

app.on("window-all-closed", () => {
  stopPackagedRenderer?.();
  stopPackagedRenderer = null;
  if (process.platform !== "darwin") {
    app.quit();
  }
});
