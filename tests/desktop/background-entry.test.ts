import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DESKTOP_REQUESTS } from "@/desktop/worker/protocol";

describe("background-entry protocol", () => {
  const originalParentPort = (process as typeof process & { parentPort?: unknown }).parentPort;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();

    if (originalParentPort === undefined) {
      Reflect.deleteProperty(process, "parentPort");
      return;
    }

    (process as typeof process & { parentPort?: unknown }).parentPort = originalParentPort;
  });

  it("unwraps utilityProcess messages and responds to worker requests", async () => {
    const postMessage = vi.fn();
    let messageListener: ((message: unknown) => void | Promise<void>) | undefined;
    const listRules = vi.fn().mockResolvedValue([{ id: "rule_1" }]);

    vi.doMock("@/desktop/worker/prisma-provider", () => ({
      createWorkerPrisma: vi.fn(() => ({ $disconnect: vi.fn() })),
    }));
    vi.doMock("@/desktop/worker/services/review-service", () => ({
      createReviewService: vi.fn(() => ({
        createReviewBatch: vi.fn(),
        listReviewJobs: vi.fn(),
        searchReviewJobs: vi.fn(),
      })),
    }));
    vi.doMock("@/desktop/worker/services/rule-service", () => ({
      createRuleService: vi.fn(() => ({
        listRules,
        searchRules: vi.fn(),
      })),
    }));
    vi.doMock("@/desktop/worker/services/file-import-service", () => ({
      createFileImportService: vi.fn(() => ({
        importDocumentsIntoStore: vi.fn(),
      })),
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

    await import("@/desktop/worker/background-entry");

    await messageListener?.({
      data: {
        id: "worker_msg_1",
        channel: DESKTOP_REQUESTS.rulesList,
      },
      ports: [],
    });

    expect(postMessage).toHaveBeenCalledWith({
      type: "desktop-worker:response",
      id: "worker_msg_1",
      payload: [{ id: "rule_1" }],
    });
    expect(listRules).toHaveBeenCalledTimes(1);
  });

  it("routes review job IPC actions through review-ipc services", async () => {
    const postMessage = vi.fn();
    let messageListener: ((message: unknown) => void | Promise<void>) | undefined;
    const deleteSelectedReviewJobs = vi.fn().mockResolvedValue({ deletedCount: 3 });

    vi.doMock("@/desktop/worker/prisma-provider", () => ({
      createWorkerPrisma: vi.fn(() => ({ $disconnect: vi.fn() })),
    }));
    vi.doMock("@/desktop/worker/services/review-service", () => ({
      createReviewService: vi.fn(() => ({
        createReviewBatch: vi.fn(),
        listReviewJobs: vi.fn(),
        searchReviewJobs: vi.fn(),
      })),
    }));
    vi.doMock("@/desktop/worker/services/rule-service", () => ({
      createRuleService: vi.fn(() => ({
        listRules: vi.fn(),
        searchRules: vi.fn(),
      })),
    }));
    vi.doMock("@/desktop/worker/services/file-import-service", () => ({
      createFileImportService: vi.fn(() => ({
        importDocumentsIntoStore: vi.fn(),
      })),
    }));
    vi.doMock("@/lib/review-ipc", () => ({
      deleteSelectedReviewJobs,
      retryReviewJobById: vi.fn(),
      exportReviewListFile: vi.fn(),
      exportReviewReportArchive: vi.fn(),
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

    await import("@/desktop/worker/background-entry");

    await messageListener?.({
      data: {
        id: "worker_msg_delete",
        channel: DESKTOP_REQUESTS.reviewJobsDelete,
        payload: {
          selectedIds: ["job_1", "job_2", 42],
          query: "待导出",
          allMatching: false,
        },
      },
      ports: [],
    });

    expect(deleteSelectedReviewJobs).toHaveBeenCalledWith({
      selectedIds: ["job_1", "job_2"],
      query: "待导出",
      allMatching: false,
    }, expect.any(Object));
    expect(postMessage).toHaveBeenCalledWith({
      type: "desktop-worker:response",
      id: "worker_msg_delete",
      payload: { deletedCount: 3 },
    });
  });
});
