import { describe, expect, it, vi } from "vitest";

import { createDesktopApi } from "@/desktop/bridge/desktop-api";
import { createRuntimeStore } from "@/desktop/worker/runtime-store";
import { createRuntimeMetricsService } from "@/desktop/worker/services/runtime-metrics-service";

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
});
