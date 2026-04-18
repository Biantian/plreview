import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createDesktopApi,
  type DesktopInvoke,
} from "@/desktop/bridge/desktop-api";
import { DESKTOP_EVENTS } from "@/desktop/worker/protocol";
import { CHANNELS, registerDesktopHandlers } from "@/electron/channels";

describe("createDesktopApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("routes batch creation through the typed channel map", async () => {
    const invoke = vi.fn().mockResolvedValue({
      batchId: "batch_1",
      createdCount: 2,
    }) as DesktopInvoke;
    const api = createDesktopApi(invoke);

    await api.createReviewBatch({
      batchName: "四月策划案",
      llmProfileId: "profile_1",
      modelName: "qwen-plus",
      ruleIds: ["rule_a"],
      documents: [],
    });

    expect(invoke).toHaveBeenCalledWith(CHANNELS.reviewBatchesCreate, {
      batchName: "四月策划案",
      llmProfileId: "profile_1",
      modelName: "qwen-plus",
      ruleIds: ["rule_a"],
      documents: [],
    });
  });

  it("routes runtime status through the typed channel map", async () => {
    const runtimeStatus = {
      shellReady: true,
      workerReady: true,
      startupMs: 42,
      lastError: null,
    };
    const invoke = vi.fn().mockResolvedValue(runtimeStatus) as DesktopInvoke;
    const api = createDesktopApi(invoke);

    await expect(api.getRuntimeStatus()).resolves.toEqual(runtimeStatus);

    expect(invoke).toHaveBeenCalledWith(CHANNELS.runtimeStatus);
  });

  it("subscribes to runtime updates through the preload bridge", () => {
    const subscribe = vi.fn().mockReturnValue(vi.fn());
    const api = createDesktopApi(vi.fn() as DesktopInvoke, subscribe);
    const listener = vi.fn();

    const unsubscribe = api.subscribeRuntimeStatus(listener);

    expect(subscribe).toHaveBeenCalledWith(DESKTOP_EVENTS.runtimeUpdated, listener);
    expect(unsubscribe).toEqual(expect.any(Function));
  });

  it("registers handlers for every declared desktop channel", () => {
    const register = vi.fn();

    registerDesktopHandlers(register);

    expect(register).toHaveBeenCalledTimes(Object.keys(CHANNELS).length);
    expect(register).toHaveBeenCalledWith(
      CHANNELS.reviewBatchesCreate,
      expect.any(Function),
    );
    expect(register).toHaveBeenCalledWith(
      CHANNELS.reviewJobsList,
      expect.any(Function),
    );
    expect(register).toHaveBeenCalledWith(
      CHANNELS.reviewJobsSearch,
      expect.any(Function),
    );
    expect(register).toHaveBeenCalledWith(CHANNELS.rulesList, expect.any(Function));
    expect(register).toHaveBeenCalledWith(
      CHANNELS.rulesSearch,
      expect.any(Function),
    );
    expect(register).toHaveBeenCalledWith(CHANNELS.filesPick, expect.any(Function));
    expect(register).toHaveBeenCalledWith(
      CHANNELS.runtimeStatus,
      expect.any(Function),
    );
  });
});

describe("electron preload bridge", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("wires runtime subscription to ipcRenderer.on", async () => {
    const on = vi.fn();
    const off = vi.fn();
    const invoke = vi.fn();
    const exposeInMainWorld = vi.fn();

    vi.doMock("electron", () => ({
      contextBridge: {
        exposeInMainWorld,
      },
      ipcRenderer: {
        invoke,
        on,
        off,
      },
    }));

    await import("@/electron/preload");

    expect(exposeInMainWorld).toHaveBeenCalledTimes(1);
    const [, api] = exposeInMainWorld.mock.calls[0] as [
      string,
      {
        subscribeRuntimeStatus: (
          listener: (payload: unknown) => void,
        ) => () => void;
      },
    ];

    const listener = vi.fn();
    const unsubscribe = api.subscribeRuntimeStatus(listener);

    expect(on).toHaveBeenCalledWith(
      DESKTOP_EVENTS.runtimeUpdated,
      expect.any(Function),
    );
    expect(typeof unsubscribe).toBe("function");

    unsubscribe();

    expect(off).toHaveBeenCalledWith(
      DESKTOP_EVENTS.runtimeUpdated,
      expect.any(Function),
    );
  });
});
