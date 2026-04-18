import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fork } = vi.hoisted(() => ({
  fork: vi.fn(),
}));

vi.mock("electron", async () => {
  const actual = await vi.importActual<typeof import("electron")>("electron");
  return {
    ...actual,
    utilityProcess: {
      fork,
    },
  };
});

import { CHANNELS } from "@/electron/channels";
import { createWorkerManager } from "@/electron/worker-manager";

type WorkerProcessMock = {
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  once: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
  postMessage: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
};

describe("createWorkerManager", () => {
  const originalParentPort = (process as typeof process & { parentPort?: unknown }).parentPort;

  beforeEach(() => {
    fork.mockReset();
  });

  afterEach(() => {
    if (originalParentPort === undefined) {
      Reflect.deleteProperty(process, "parentPort");
    } else {
      (process as typeof process & { parentPort?: unknown }).parentPort = originalParentPort;
    }

    vi.restoreAllMocks();
  });

  function createWorkerProcessMock() {
    const handlers = new Map<string, Set<(...args: unknown[]) => void>>();

    function on(event: string, handler: (...args: unknown[]) => void) {
      const listeners = handlers.get(event) ?? new Set<(...args: unknown[]) => void>();
      listeners.add(handler);
      handlers.set(event, listeners);
    }

    function off(event: string, handler: (...args: unknown[]) => void) {
      const listeners = handlers.get(event);
      listeners?.delete(handler);
      if (listeners?.size === 0) {
        handlers.delete(event);
      }
    }

    function once(event: string, handler: (...args: unknown[]) => void) {
      const wrapped = (...args: unknown[]) => {
        off(event, wrapped);
        handler(...args);
      };
      on(event, wrapped);
    }

    return {
      emit(event: string, ...args: unknown[]) {
        for (const handler of handlers.get(event) ?? []) {
          handler(...args);
        }
      },
      process: {
        on: vi.fn(on),
        once: vi.fn(once),
        off: vi.fn(off),
        postMessage: vi.fn(),
        kill: vi.fn(),
      } satisfies WorkerProcessMock,
    };
  }

  it("waits for the worker-ready handshake before resolving", async () => {
    const worker = createWorkerProcessMock();
    fork.mockReturnValue(worker.process as never);

    const manager = createWorkerManager();
    const startPromise = manager.start();

    expect(fork).toHaveBeenCalledTimes(1);

    let settled = false;
    startPromise.then(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(settled).toBe(false);

    worker.emit("message", { type: "desktop-worker:started" });

    await expect(startPromise).resolves.toBe(worker.process);
  });

  it("does not fork twice when the worker is healthy", async () => {
    const worker = createWorkerProcessMock();
    fork.mockReturnValue(worker.process as never);

    const manager = createWorkerManager();
    const startPromise = manager.start();
    worker.emit("message", { type: "desktop-worker:started" });
    await startPromise;

    await manager.start();

    expect(fork).toHaveBeenCalledTimes(1);
  });

  it("clears cached state after an unexpected exit so a later start reforks", async () => {
    const firstWorker = createWorkerProcessMock();
    const secondWorker = createWorkerProcessMock();
    fork
      .mockReturnValueOnce(firstWorker.process as never)
      .mockReturnValueOnce(secondWorker.process as never);

    const manager = createWorkerManager();
    const startPromise = manager.start();
    firstWorker.emit("message", { type: "desktop-worker:started" });
    await startPromise;

    firstWorker.emit("exit", 1);

    expect(manager.getChild()).toBeNull();

    const restartPromise = manager.start();
    secondWorker.emit("message", { type: "desktop-worker:started" });
    await restartPromise;

    expect(fork).toHaveBeenCalledTimes(2);
  });

  it("does not report an error when the worker is stopped intentionally", async () => {
    const worker = createWorkerProcessMock();
    const onWorkerError = vi.fn();
    const onWorkerStopped = vi.fn();
    fork.mockReturnValue(worker.process as never);

    const manager = createWorkerManager({ onWorkerError, onWorkerStopped });
    const startPromise = manager.start();
    worker.emit("message", { type: "desktop-worker:started" });
    await startPromise;

    manager.stop();
    worker.emit("exit", 0);

    expect(onWorkerError).not.toHaveBeenCalled();
    expect(onWorkerStopped).toHaveBeenCalledTimes(1);
  });

  it("resolves invoke with the matching worker response payload", async () => {
    const worker = createWorkerProcessMock();
    fork.mockReturnValue(worker.process as never);
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("env_invoke_success");

    const manager = createWorkerManager();
    const invokePromise = manager.invoke(CHANNELS.reviewJobsList);

    worker.emit("message", { type: "desktop-worker:started" });
    await vi.waitFor(() =>
      expect(worker.process.postMessage).toHaveBeenCalledWith({
        id: "env_invoke_success",
        channel: "review-jobs:list",
        payload: undefined,
      }),
    );

    worker.emit("message", {
      type: "desktop-worker:response",
      id: "env_invoke_success",
      payload: [{ id: "job_1" }],
    });

    await expect(invokePromise).resolves.toEqual([{ id: "job_1" }]);
  });

  it("rejects invoke when the worker responds with a matching error", async () => {
    const worker = createWorkerProcessMock();
    fork.mockReturnValue(worker.process as never);
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("env_invoke_error");

    const manager = createWorkerManager();
    const invokePromise = manager.invoke(CHANNELS.rulesList);

    worker.emit("message", { type: "desktop-worker:started" });
    await vi.waitFor(() => expect(worker.process.postMessage).toHaveBeenCalledTimes(1));

    worker.emit("message", {
      type: "desktop-worker:error",
      id: "env_invoke_error",
      error: "boom",
    });

    await expect(invokePromise).rejects.toThrow("boom");
  });

  it("ignores unrelated worker messages until the matching request id arrives", async () => {
    const worker = createWorkerProcessMock();
    fork.mockReturnValue(worker.process as never);
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("env_match_target");

    const manager = createWorkerManager();
    const invokePromise = manager.invoke(CHANNELS.rulesSearch, { query: "risk" });

    worker.emit("message", { type: "desktop-worker:started" });
    await vi.waitFor(() => expect(worker.process.postMessage).toHaveBeenCalledTimes(1));

    let settled = false;
    invokePromise.then(() => {
      settled = true;
    });

    worker.emit("message", {
      type: "desktop-worker:response",
      id: "env_other",
      payload: [{ id: "wrong" }],
    });
    await Promise.resolve();

    expect(settled).toBe(false);

    worker.emit("message", {
      type: "desktop-worker:response",
      id: "env_match_target",
      payload: [{ id: "rule_1" }],
    });

    await expect(invokePromise).resolves.toEqual([{ id: "rule_1" }]);
  });

  it("keeps the background entry alive after startup", async () => {
    const postMessage = vi.fn();
    const on = vi.fn();
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval").mockReturnValue(0 as never);

    (process as typeof process & {
      parentPort?: {
        postMessage(message: { type: string }): void;
        on(event: "message", listener: (message: unknown) => void): void;
      };
    }).parentPort = {
      postMessage,
      on,
    } as never;

    await import("@/desktop/worker/background-entry");

    expect(postMessage).toHaveBeenCalledWith({
      type: "desktop-worker:started",
    });
    expect(on).toHaveBeenCalledWith("message", expect.any(Function));
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60_000);
  });
});
