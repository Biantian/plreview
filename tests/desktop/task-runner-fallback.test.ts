import { afterEach, describe, expect, it, vi } from "vitest";

describe("createTaskRunner fallback", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("runs parse-document work in-process when utilityProcess is unavailable", async () => {
    const parseLocalDocumentInProcess = vi
      .fn()
      .mockResolvedValue({ title: "回归导入文档" });

    vi.doMock("electron", async () => {
      const actual = await vi.importActual<typeof import("electron")>("electron");
      return {
        ...actual,
        utilityProcess: undefined,
      };
    });
    vi.doMock("@/desktop/core/files/parse-local-document", () => ({
      parseLocalDocumentInProcess,
    }));
    vi.doMock("@/lib/review-jobs", () => ({
      executeReviewJob: vi.fn(),
    }));

    const { createTaskRunner } = await import("@/desktop/worker/task-runner");
    const runner = createTaskRunner();

    await expect(
      runner.run("parse-document", { filePath: "/tmp/fallback-import.md" }),
    ).resolves.toEqual({ title: "回归导入文档" });

    expect(parseLocalDocumentInProcess).toHaveBeenCalledWith("/tmp/fallback-import.md");
  });

  it("runs execute-review-job work in-process when utilityProcess is unavailable", async () => {
    const executeReviewJob = vi.fn().mockResolvedValue({
      jobId: "job_1",
      status: "completed",
    });

    vi.doMock("electron", async () => {
      const actual = await vi.importActual<typeof import("electron")>("electron");
      return {
        ...actual,
        utilityProcess: undefined,
      };
    });
    vi.doMock("@/desktop/core/files/parse-local-document", () => ({
      parseLocalDocumentInProcess: vi.fn(),
    }));
    vi.doMock("@/lib/review-jobs", () => ({
      executeReviewJob,
    }));

    const { createTaskRunner } = await import("@/desktop/worker/task-runner");
    const runner = createTaskRunner();
    const payload = {
      reviewJobId: "job_1",
      llmProfileId: "profile_1",
    };

    await expect(runner.run("execute-review-job", payload)).resolves.toEqual({
      jobId: "job_1",
      status: "completed",
    });

    expect(executeReviewJob).toHaveBeenCalledWith(payload);
  });

  it("rejects malformed parse-document payloads in fallback mode", async () => {
    const parseLocalDocumentInProcess = vi.fn();

    vi.doMock("electron", async () => {
      const actual = await vi.importActual<typeof import("electron")>("electron");
      return {
        ...actual,
        utilityProcess: undefined,
      };
    });
    vi.doMock("@/desktop/core/files/parse-local-document", () => ({
      parseLocalDocumentInProcess,
    }));
    vi.doMock("@/lib/review-jobs", () => ({
      executeReviewJob: vi.fn(),
    }));

    const { createTaskRunner } = await import("@/desktop/worker/task-runner");
    const runner = createTaskRunner();

    await expect(
      runner.run("parse-document", { invalid: true }),
    ).rejects.toThrow("Malformed or unsupported task message.");

    expect(parseLocalDocumentInProcess).not.toHaveBeenCalled();
  });
});
