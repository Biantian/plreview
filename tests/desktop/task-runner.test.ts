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
    fork.mockReturnValue({
      postMessage,
      on: vi.fn(),
      once: vi.fn((event, callback) => {
        if (event === "message") {
          callback({ id: "msg_1", ok: true, result: { title: "策划案" } });
        }
      }),
      kill: vi.fn(),
    });

    const runner = createTaskRunner();
    const result = await runner.run("parse-document", { filePath: "/tmp/demo.docx" });
    const bootstrapPath = path.resolve("desktop/worker/task-entry.cjs");

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
});
