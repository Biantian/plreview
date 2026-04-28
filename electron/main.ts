import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { OpenDialogOptions } from "electron";
import { BrowserWindow, app, dialog, ipcMain, net, protocol } from "electron";

import { DESKTOP_EVENTS } from "@/desktop/worker/protocol";
import { createRuntimeMetricsService } from "@/desktop/worker/services/runtime-metrics-service";
import { loadDesktopDataModules } from "@/electron/desktop-data-loader";
import { ensurePackagedDatabaseSchema } from "@/electron/packaged-database-schema";
import { applyDesktopRuntimeEnv } from "@/electron/runtime-env";
import { resolveDesktopUserDataPathOverride } from "@/electron/user-data-path";
import {
  PACKAGED_RENDERER_SCHEME,
  resolvePackagedRendererAssetPath,
  resolveRendererLoadTarget,
} from "@/electron/renderer-runtime";
import { resolveSmokeImportFilePaths } from "@/electron/smoke-import";
import { getWindowChromeOptions } from "@/electron/window-chrome";
import { CHANNELS, registerDesktopHandlers } from "./channels";
import { createWorkerManager } from "./worker-manager";

protocol.registerSchemesAsPrivileged([
  {
    scheme: PACKAGED_RENDERER_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

const currentDir = __dirname;
let mainWindow: BrowserWindow | null = null;
let registeredRendererRoot: string | null = null;
const runtimeMetrics = createRuntimeMetricsService();

configureUserDataPath();

function configureUserDataPath() {
  const overridePath = resolveDesktopUserDataPathOverride({
    currentDir,
    defaultUserDataPath: app.getPath("userData"),
    env: process.env,
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
  });

  if (!overridePath) {
    return;
  }

  fs.mkdirSync(overridePath, { recursive: true });
  app.setPath("userData", overridePath);
}

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
    ...getWindowChromeOptions(),
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const rendererTarget = await resolveRendererLoadTarget({
    currentDir,
    env: process.env,
    mode: app.isPackaged ? "packaged" : "development",
    resourcesPath: process.resourcesPath,
  });

  if (rendererTarget.kind === "url") {
    await mainWindow.loadURL(rendererTarget.url);
  } else if (rendererTarget.kind === "file") {
    registerPackagedRendererProtocol(rendererTarget.filePath);
    await mainWindow.loadURL(
      `${PACKAGED_RENDERER_SCHEME}://app/${path.basename(rendererTarget.filePath)}`,
    );
  } else {
    await mainWindow.loadURL(getFallbackHtml());
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function registerPackagedRendererProtocol(entryFilePath: string) {
  const rendererRoot = path.resolve(path.dirname(entryFilePath));

  if (
    registeredRendererRoot === rendererRoot &&
    protocol.isProtocolHandled(PACKAGED_RENDERER_SCHEME)
  ) {
    return;
  }

  if (protocol.isProtocolHandled(PACKAGED_RENDERER_SCHEME)) {
    protocol.unhandle(PACKAGED_RENDERER_SCHEME);
  }

  protocol.handle(PACKAGED_RENDERER_SCHEME, (request) => {
    const requestUrl = new URL(request.url);
    const resolvedFilePath =
      resolvePackagedRendererAssetPath(rendererRoot, requestUrl.pathname) ??
      path.join(rendererRoot, "404.html");

    return net.fetch(pathToFileURL(resolvedFilePath).toString());
  });

  registeredRendererRoot = rendererRoot;
}

void app.whenReady().then(async () => {
  const runtimeEnv = applyDesktopRuntimeEnv({
    currentDir,
    env: process.env,
    mode: app.isPackaged ? "packaged" : "development",
    userDataPath: app.getPath("userData"),
    resourcesPath: process.resourcesPath,
  });
  await ensurePackagedDatabaseSchema({
    databaseUrl: runtimeEnv.DATABASE_URL,
  });
  const desktopData = await loadDesktopDataModules();

  registerDesktopHandlers(
    (channel, handler) => {
      ipcMain.handle(channel, handler);
    },
    {
      [CHANNELS.homeDashboard]: async () => desktopData.getHomeDashboardData(),
      [CHANNELS.modelsDashboard]: async () => desktopData.getModelDashboardData(),
      [CHANNELS.rulesDashboard]: async (_event, payload) =>
        desktopData.getRuleDashboardData({
          includeDeleted: Boolean(
            (payload as { includeDeleted?: unknown } | undefined)?.includeDeleted,
          ),
        }),
      [CHANNELS.reviewDetail]: async (_event, payload) =>
        desktopData.getReviewDetailData(
          String((payload as { reviewId?: unknown })?.reviewId ?? ""),
        ),
      [CHANNELS.filesPick]: async () => {
        const smokeImportFilePaths = resolveSmokeImportFilePaths(process.env);

        if (smokeImportFilePaths && smokeImportFilePaths.length > 0) {
          return workerManager.invoke(CHANNELS.filesPick, smokeImportFilePaths);
        }

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
      [CHANNELS.reviewJobsDelete]: async (_event, payload) =>
        desktopData.deleteSelectedReviewJobs(payload as {
          selectedIds?: string[];
          query?: string;
          allMatching: boolean;
        }),
      [CHANNELS.reviewJobsRetry]: async (_event, payload) =>
        desktopData.retryReviewJobById(
          String((payload as { reviewJobId?: unknown })?.reviewJobId ?? ""),
        ),
      [CHANNELS.reviewJobsExportList]: async (_event, payload) =>
        desktopData.exportReviewListFile(payload as {
          selectedIds?: string[];
          query?: string;
          allMatching: boolean;
        }),
      [CHANNELS.reviewJobsExportReport]: async (_event, payload) =>
        desktopData.exportReviewReportArchive(payload as {
          selectedIds?: string[];
          query?: string;
          allMatching: boolean;
        }),
      [CHANNELS.rulesList]: async () => workerManager.invoke(CHANNELS.rulesList),
      [CHANNELS.rulesSearch]: async (_event, payload) =>
        workerManager.invoke(CHANNELS.rulesSearch, payload),
      [CHANNELS.rulesSave]: async (_event, payload) =>
        desktopData.saveRule(payload as {
          id?: string;
          name: string;
          category: string;
          description: string;
          promptTemplate: string;
          severity: "low" | "medium" | "high" | "critical";
          enabled: boolean;
        }),
      [CHANNELS.rulesToggleEnabled]: async (_event, payload) =>
        desktopData.toggleRuleEnabled(
          String((payload as { id?: unknown })?.id ?? ""),
          Boolean((payload as { enabled?: unknown })?.enabled),
        ),
      [CHANNELS.rulesDelete]: async (_event, payload) =>
        desktopData.deleteRule(String((payload as { id?: unknown })?.id ?? "")),
      [CHANNELS.modelsSave]: async (_event, payload) =>
        desktopData.saveLlmProfile(payload as {
          id?: string;
          name: string;
          provider: string;
          vendorKey: string;
          mode: "live" | "demo";
          baseUrl: string;
          defaultModel: string;
          modelOptionsText: string;
          apiKey: string;
          enabled: boolean;
        }),
      [CHANNELS.modelsToggleEnabled]: async (_event, payload) =>
        desktopData.toggleLlmProfileEnabled(
          String((payload as { id?: unknown })?.id ?? ""),
          Boolean((payload as { enabled?: unknown })?.enabled),
        ),
      [CHANNELS.modelsDelete]: async (_event, payload) =>
        desktopData.deleteLlmProfile(String((payload as { id?: unknown })?.id ?? "")),
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
  if (process.platform !== "darwin") {
    app.quit();
  }
});
