import { beforeEach, describe, expect, it, vi } from "vitest";

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
  beforeEach(() => {
    fork.mockReset();
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
    expect(fork).toHaveBeenCalledWith(expect.stringContaining("background-entry"));
  });
});
