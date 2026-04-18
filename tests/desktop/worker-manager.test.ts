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

import { createWorkerManager } from "@/electron/worker-manager";

describe("createWorkerManager", () => {
  const originalParentPort = (process as typeof process & { parentPort?: unknown }).parentPort;

  beforeEach(() => {
    fork.mockReset();
  });

  afterEach(() => {
    if (originalParentPort === undefined) {
      delete (process as typeof process & { parentPort?: unknown }).parentPort;
    } else {
      (process as typeof process & { parentPort?: unknown }).parentPort = originalParentPort;
    }

    vi.restoreAllMocks();
  });

  function createWorkerProcessMock() {
    const handlers: Record<string, (...args: unknown[]) => void> = {};

    return {
      handlers,
      process: {
        on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
          handlers[event] = handler;
        }),
        once: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
          handlers[event] = handler;
        }),
        off: vi.fn(),
        postMessage: vi.fn(),
        kill: vi.fn(),
      } as never,
    };
  }

  it("waits for the worker-ready handshake before resolving", async () => {
    const worker = createWorkerProcessMock();
    fork.mockReturnValue(worker.process);

    const manager = createWorkerManager();
    const startPromise = manager.start();

    expect(fork).toHaveBeenCalledTimes(1);

    let settled = false;
    startPromise.then(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(settled).toBe(false);

    worker.handlers.message?.({ type: "desktop-worker:started" });

    await expect(startPromise).resolves.toBe(worker.process);
  });

  it("does not fork twice when the worker is healthy", async () => {
    const worker = createWorkerProcessMock();
    fork.mockReturnValue(worker.process);

    const manager = createWorkerManager();
    const startPromise = manager.start();
    worker.handlers.message?.({ type: "desktop-worker:started" });
    await startPromise;

    await manager.start();

    expect(fork).toHaveBeenCalledTimes(1);
  });

  it("clears cached state after an unexpected exit so a later start reforks", async () => {
    const firstWorker = createWorkerProcessMock();
    const secondWorker = createWorkerProcessMock();
    fork.mockReturnValueOnce(firstWorker.process).mockReturnValueOnce(secondWorker.process);

    const manager = createWorkerManager();
    const startPromise = manager.start();
    firstWorker.handlers.message?.({ type: "desktop-worker:started" });
    await startPromise;

    firstWorker.handlers.exit?.(1, null);

    expect(manager.getChild()).toBeNull();

    const restartPromise = manager.start();
    secondWorker.handlers.message?.({ type: "desktop-worker:started" });
    await restartPromise;

    expect(fork).toHaveBeenCalledTimes(2);
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
    };

    await import("@/desktop/worker/background-entry.ts");

    expect(postMessage).toHaveBeenCalledWith({
      type: "desktop-worker:started",
    });
    expect(on).toHaveBeenCalledWith("message", expect.any(Function));
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60_000);
  });
});
