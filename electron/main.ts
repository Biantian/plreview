import path from "node:path";
import { fileURLToPath } from "node:url";
import { BrowserWindow, app, ipcMain } from "electron";

import { registerDesktopHandlers } from "./channels";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | null = null;

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

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  const rendererHtmlPath = process.env.ELECTRON_RENDERER_HTML;

  if (rendererUrl) {
    await mainWindow.loadURL(rendererUrl);
  } else if (rendererHtmlPath) {
    await mainWindow.loadFile(rendererHtmlPath);
  } else {
    await mainWindow.loadURL(getFallbackHtml());
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

void app.whenReady().then(async () => {
  registerDesktopHandlers((channel, handler) => {
    ipcMain.handle(channel, handler);
  });
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
