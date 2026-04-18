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

  it("forks exactly one long-lived background worker", async () => {
    fork.mockReturnValue({
      postMessage: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      kill: vi.fn(),
    } as never);

    const manager = createWorkerManager();
    await manager.start();

    expect(fork).toHaveBeenCalledTimes(1);
    expect(fork).toHaveBeenCalledWith(
      expect.stringContaining("background-entry.ts"),
      [],
      expect.objectContaining({
        execArgv: ["-r", expect.stringContaining("background-entry.cjs")],
      }),
    );
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
