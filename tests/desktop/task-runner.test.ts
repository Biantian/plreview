import fs from "node:fs";
import path from "node:path";
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

import { createTaskRunner } from "@/desktop/worker/task-runner";

describe("createTaskRunner", () => {
  beforeEach(() => {
    fork.mockReset();
  });

  it("spawns a short-lived task process for parse-document work", async () => {
    const postMessage = vi.fn();
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    fork.mockReturnValue({
      postMessage,
      on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
        const callbacks = listeners.get(event) ?? new Set();
        callbacks.add(callback);
        listeners.set(event, callbacks);
      }),
      off: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
        listeners.get(event)?.delete(callback);
      }),
      once: vi.fn(),
      kill: vi.fn(),
    });

    const runner = createTaskRunner();
    const promise = runner.run("parse-document", { filePath: "/tmp/demo.docx" });
    const bootstrapPath = path.resolve("desktop/worker/task-entry.cjs");
    const request = postMessage.mock.calls[0]?.[0];

    for (const callback of listeners.get("message") ?? []) {
      callback({ id: request.id, ok: true, result: { title: "策划案" } });
    }

    const result = await promise;

    expect(fs.existsSync(bootstrapPath)).toBe(true);
    expect(fs.readFileSync(bootstrapPath, "utf8")).toContain('require("tsx/cjs")');
    expect(fork).toHaveBeenCalledWith(
      expect.stringMatching(/desktop\/worker\/task-entry\.ts$/),
      [],
      expect.objectContaining({
        execArgv: ["-r", bootstrapPath],
      }),
    );
    expect(postMessage).toHaveBeenCalledWith({
      id: expect.any(String),
      task: "parse-document",
      payload: { filePath: "/tmp/demo.docx" },
    });
    expect(result).toEqual({ title: "策划案" });
  });

  it("ignores mismatched response ids until the matching response arrives", async () => {
    const postMessage = vi.fn();
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    const child = {
      postMessage,
      kill: vi.fn(),
      on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
        const callbacks = listeners.get(event) ?? new Set();
        callbacks.add(callback);
        listeners.set(event, callbacks);
        return child;
      }),
      off: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
        listeners.get(event)?.delete(callback);
        return child;
      }),
      once: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
        const onceCallback = (...args: unknown[]) => {
          listeners.get(event)?.delete(onceCallback);
          callback(...args);
        };
        const callbacks = listeners.get(event) ?? new Set();
        callbacks.add(onceCallback);
        listeners.set(event, callbacks);
        return child;
      }),
    };

    fork.mockReturnValue(child);

    const runner = createTaskRunner();
    const promise = runner.run("parse-document", { filePath: "/tmp/demo.docx" });
    const request = postMessage.mock.calls[0]?.[0];

    for (const callback of listeners.get("message") ?? []) {
      callback({ id: "other_msg", ok: true, result: { title: "错误结果" } });
    }

    expect(child.kill).not.toHaveBeenCalled();

    for (const callback of listeners.get("message") ?? []) {
      callback({ id: request.id, ok: true, result: { title: "正确结果" } });
    }

    await expect(promise).resolves.toEqual({ title: "正确结果" });
    expect(child.kill).toHaveBeenCalledTimes(1);
  });

  it("rejects when the matching task response reports an error", async () => {
    const postMessage = vi.fn();
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    const child = {
      postMessage,
      kill: vi.fn(),
      on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
        const callbacks = listeners.get(event) ?? new Set();
        callbacks.add(callback);
        listeners.set(event, callbacks);
        return child;
      }),
      off: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
        listeners.get(event)?.delete(callback);
        return child;
      }),
      once: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
        const onceCallback = (...args: unknown[]) => {
          listeners.get(event)?.delete(onceCallback);
          callback(...args);
        };
        const callbacks = listeners.get(event) ?? new Set();
        callbacks.add(onceCallback);
        listeners.set(event, callbacks);
        return child;
      }),
    };

    fork.mockReturnValue(child);

    const runner = createTaskRunner();
    const promise = runner.run("parse-document", { filePath: "/tmp/demo.docx" });
    const request = postMessage.mock.calls[0]?.[0];

    for (const callback of listeners.get("message") ?? []) {
      callback({ id: request.id, ok: false, error: "任务失败" });
    }

    await expect(promise).rejects.toThrow("任务失败");
    expect(child.kill).toHaveBeenCalledTimes(1);
  });
});

describe("task-entry protocol", () => {
  const originalParentPort = (process as typeof process & { parentPort?: unknown }).parentPort;

  beforeEach(() => {
    vi.resetModules();
  });

  it("replies with an error for malformed messages instead of silently ignoring them", async () => {
    const postMessage = vi.fn();
    let messageListener: ((message: unknown) => void | Promise<void>) | undefined;

    (process as typeof process & {
      parentPort?: {
        postMessage(message: unknown): void;
        on(event: "message", listener: (message: unknown) => void | Promise<void>): void;
      };
    }).parentPort = {
      postMessage,
      on: vi.fn((event, listener) => {
        if (event === "message") {
          messageListener = listener;
        }
      }),
    };

    await import("@/desktop/worker/task-entry");

    await messageListener?.({ nope: true });

    expect(postMessage).toHaveBeenCalledWith({
      id: "unknown",
      ok: false,
      error: "Malformed or unsupported task message.",
    });
  });

  it("unwraps utilityProcess task messages before parsing them", async () => {
    const postMessage = vi.fn();
    let messageListener: ((message: unknown) => void | Promise<void>) | undefined;
    const parseLocalDocumentInProcess = vi
      .fn()
      .mockResolvedValue({ title: "导入成功" });

    vi.doMock("@/desktop/core/files/parse-local-document", () => ({
      parseLocalDocumentInProcess,
    }));
    vi.doMock("@/lib/review-jobs", () => ({
      executeReviewJob: vi.fn(),
    }));

    (process as typeof process & {
      parentPort?: {
        postMessage(message: unknown): void;
        on(event: "message", listener: (message: unknown) => void | Promise<void>): void;
      };
    }).parentPort = {
      postMessage,
      on: vi.fn((event, listener) => {
        if (event === "message") {
          messageListener = listener;
        }
      }),
    };

    await import("@/desktop/worker/task-entry");

    await messageListener?.({
      data: {
        id: "task_msg_1",
        task: "parse-document",
        payload: {
          filePath: "/tmp/demo.md",
        },
      },
      ports: [],
    });

    expect(parseLocalDocumentInProcess).toHaveBeenCalledWith("/tmp/demo.md");
    expect(postMessage).toHaveBeenCalledWith({
      id: "task_msg_1",
      ok: true,
      result: { title: "导入成功" },
    });
  });

  afterEach(() => {
    if (originalParentPort === undefined) {
      Reflect.deleteProperty(process, "parentPort");
      return;
    }

    (process as typeof process & { parentPort?: unknown }).parentPort = originalParentPort;
  });
});
