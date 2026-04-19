import { afterEach, describe, expect, it, vi } from "vitest";

import { createDesktopApi } from "@/desktop/bridge/desktop-api";
import { DESKTOP_EVENTS } from "@/desktop/worker/protocol";
import { createRuntimeStore } from "@/desktop/worker/runtime-store";
import { createRuntimeMetricsService } from "@/desktop/worker/services/runtime-metrics-service";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("createDesktopApi runtime subscription", () => {
  it("subscribes to runtime updates and returns an unsubscribe function", () => {
    const on = vi.fn((_event, listener) => {
      listener({
        shellReady: true,
        workerReady: true,
        startupMs: 180,
        lastError: null,
      });

      return () => "disposed";
    });

    const api = createDesktopApi(vi.fn(), on);
    const listener = vi.fn();

    const dispose = api.subscribeRuntimeStatus(listener);

    expect(listener).toHaveBeenCalledWith({
      shellReady: true,
      workerReady: true,
      startupMs: 180,
      lastError: null,
    });
    expect(dispose()).toBe("disposed");
  });
});

describe("createRuntimeStore", () => {
  it("starts with the default runtime status and merges updates", () => {
    const store = createRuntimeStore();

    expect(store.getState()).toEqual({
      shellReady: true,
      workerReady: false,
      startupMs: null,
      lastError: null,
    });

    expect(
      store.update({
        workerReady: true,
        startupMs: 180,
      }),
    ).toEqual({
      shellReady: true,
      workerReady: true,
      startupMs: 180,
      lastError: null,
    });
  });
});

describe("createRuntimeMetricsService", () => {
  it("clears worker readiness when the worker crashes after startup", () => {
    const nowSpy = vi
      .spyOn(performance, "now")
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(280);
    const service = createRuntimeMetricsService();

    expect(service.getRuntimeStatus()).toEqual({
      shellReady: true,
      workerReady: false,
      startupMs: null,
      lastError: null,
    });

    expect(service.markWorkerReady()).toEqual({
      shellReady: true,
      workerReady: true,
      startupMs: 180,
      lastError: null,
    });

    expect(service.markWorkerError(new Error("worker crashed"))).toEqual({
      shellReady: true,
      workerReady: false,
      startupMs: 180,
      lastError: "worker crashed",
    });

    nowSpy.mockRestore();
  });

  it("measures startup time from the current worker start attempt", () => {
    const nowSpy = vi
      .spyOn(performance, "now")
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(120)
      .mockReturnValueOnce(180)
      .mockReturnValueOnce(400)
      .mockReturnValueOnce(470);
    const service = createRuntimeMetricsService();

    service.markWorkerStarting();

    expect(service.markWorkerReady()).toEqual({
      shellReady: true,
      workerReady: true,
      startupMs: 60,
      lastError: null,
    });

    service.markWorkerError(new Error("worker crashed"));
    service.markWorkerStarting();

    expect(service.markWorkerReady()).toEqual({
      shellReady: true,
      workerReady: true,
      startupMs: 70,
      lastError: null,
    });

    nowSpy.mockRestore();
  });
});

describe("electron main runtime publication", () => {
  it("publishes the updated runtime snapshot after worker startup callbacks run", async () => {
    const send = vi.fn();
    const loadURL = vi.fn().mockResolvedValue(undefined);
    const windowOn = vi.fn();
    const appOn = vi.fn();
    const handle = vi.fn();
    const showOpenDialog = vi.fn();
    const getAllWindows = vi.fn().mockReturnValue([]);
    let workerOptions:
      | {
          onWorkerStarting?: () => void;
          onWorkerReady?: () => void;
          onWorkerError?: (error: Error) => void;
        }
      | undefined;

    const state = {
      shellReady: true,
      workerReady: false,
      startupMs: null as number | null,
      lastError: null as string | null,
    };
    const markWorkerStarting = vi.fn(() => {
      state.workerReady = false;
      state.startupMs = null;
      return { ...state };
    });
    const markWorkerReady = vi.fn(() => {
      state.workerReady = true;
      state.startupMs = 42;
      state.lastError = null;
      return { ...state };
    });
    const markWorkerError = vi.fn((error: Error) => {
      state.workerReady = false;
      state.lastError = error.message;
      return { ...state };
    });
    const getRuntimeStatus = vi.fn(() => ({ ...state }));
    const workerStart = vi.fn(async () => {
      workerOptions?.onWorkerStarting?.();
      workerOptions?.onWorkerReady?.();
    });

    const BrowserWindowMock = Object.assign(
      vi.fn(() => ({
        webContents: {
          send,
        },
        loadURL,
        loadFile: vi.fn(),
        on: windowOn,
      })),
      {
        getAllWindows,
      },
    );

    vi.doMock("electron", () => ({
      BrowserWindow: BrowserWindowMock,
      app: {
        whenReady: vi.fn(() => Promise.resolve()),
        on: appOn,
        quit: vi.fn(),
      },
      dialog: {
        showOpenDialog,
      },
      ipcMain: {
        handle,
      },
    }));

    vi.doMock("@/electron/worker-manager", () => ({
      createWorkerManager: vi.fn((options) => {
        workerOptions = options;
        return {
          start: workerStart,
          invoke: vi.fn(),
          stop: vi.fn(),
          getChild: vi.fn(),
        };
      }),
    }));

    vi.doMock("@/desktop/worker/services/runtime-metrics-service", () => ({
      createRuntimeMetricsService: vi.fn(() => ({
        markWorkerStarting,
        markWorkerReady,
        markWorkerError,
        getRuntimeStatus,
      })),
    }));

    vi.doMock("@/electron/renderer-runtime", () => ({
      resolveRendererLoadTarget: vi.fn(async () => ({
        kind: "url",
        url: "http://127.0.0.1:3000",
      })),
    }));

    await import("@/electron/main");

    await vi.waitFor(() => expect(markWorkerStarting).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(markWorkerReady).toHaveBeenCalledTimes(1));
    await vi.waitFor(() =>
      expect(send).toHaveBeenCalledWith(DESKTOP_EVENTS.runtimeUpdated, {
        shellReady: true,
        workerReady: true,
        startupMs: 42,
        lastError: null,
      }),
    );
  });
});
