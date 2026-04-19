# Electron Desktop Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Electron desktop runtime so the main process stays thin, heavy review work moves into background and task processes, and desktop builds produce measurable size and startup improvements.

**Architecture:** Keep Electron as the desktop shell, but introduce a typed background worker boundary between `electron/*` and `desktop/core/*`. The main process will own only windowing, dialogs, lifecycle, and worker orchestration; the background worker will own Prisma-backed services and spawn short-lived task processes for document parsing and review execution. Add startup telemetry and bundle-size reporting so each optimization round is measurable.

**Tech Stack:** Electron 33 `utilityProcess`, Next.js 15, React 19, TypeScript, Prisma, SQLite, Vitest, electron-builder

---

## File Structure

### New files

- `electron/worker-manager.ts`
- `desktop/worker/protocol.ts`
- `desktop/worker/background-entry.ts`
- `desktop/worker/background-router.ts`
- `desktop/worker/prisma-provider.ts`
- `desktop/worker/runtime-store.ts`
- `desktop/worker/task-runner.ts`
- `desktop/worker/task-entry.ts`
- `desktop/worker/services/file-import-service.ts`
- `desktop/worker/services/review-service.ts`
- `desktop/worker/services/rule-service.ts`
- `desktop/worker/services/runtime-metrics-service.ts`
- `scripts/report-desktop-bundle-size.mjs`
- `tests/desktop/worker-protocol.test.ts`
- `tests/desktop/worker-manager.test.ts`
- `tests/desktop/background-router.test.ts`
- `tests/desktop/task-runner.test.ts`
- `tests/desktop/runtime-metrics.test.ts`
- `tests/desktop/desktop-size-report.test.ts`

### Modified files

- `electron/channels.ts`
- `electron/main.ts`
- `electron/preload.ts`
- `desktop/bridge/desktop-api.ts`
- `desktop/core/files/import-documents-into-store.ts`
- `desktop/core/files/parse-local-document.ts`
- `desktop/core/reviews/create-review-batch.ts`
- `lib/parse-document.ts`
- `package.json`
- `electron-builder.yml`
- `README.md`
- `docs/qa/2026-04-14-win11-smoke-test-checklist.md`

### Responsibility notes

- `electron/*` only owns shell concerns and worker orchestration
- `desktop/worker/*` owns process boundaries, Prisma lifecycle, telemetry, and heavy-task dispatch
- `desktop/core/*` remains the business-logic layer, but is invoked by worker services instead of Electron main
- `scripts/report-desktop-bundle-size.mjs` is the single source of truth for post-build bundle reporting
- `tests/desktop/*` should verify process boundaries, lazy loading, startup telemetry, and packaging expectations

## Task 1: Define Typed Worker Protocol And Runtime Channels

**Files:**
- Create: `desktop/worker/protocol.ts`
- Create: `tests/desktop/worker-protocol.test.ts`
- Modify: `electron/channels.ts`
- Modify: `desktop/bridge/desktop-api.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import {
  DESKTOP_EVENTS,
  DESKTOP_REQUESTS,
  createWorkerEnvelope,
  isRuntimeStatusPayload,
} from "@/desktop/worker/protocol";

describe("desktop worker protocol", () => {
  it("creates stable request envelopes", () => {
    expect(
      createWorkerEnvelope("review-batches:create", {
        batchName: "四月策划案",
      }),
    ).toEqual({
      id: expect.any(String),
      channel: "review-batches:create",
      payload: { batchName: "四月策划案" },
    });
  });

  it("recognizes runtime status payloads", () => {
    expect(
      isRuntimeStatusPayload({
        shellReady: true,
        workerReady: false,
        startupMs: 120,
        lastError: null,
      }),
    ).toBe(true);
  });

  it("exposes runtime channels through the public constants", () => {
    expect(DESKTOP_REQUESTS.runtimeStatus).toBe("desktop-runtime:status");
    expect(DESKTOP_EVENTS.runtimeUpdated).toBe("desktop-runtime:updated");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/desktop/worker-protocol.test.ts`

Expected: FAIL with `Cannot find module '@/desktop/worker/protocol'`

- [ ] **Step 3: Write minimal implementation**

```ts
// desktop/worker/protocol.ts
import { randomUUID } from "node:crypto";

export const DESKTOP_REQUESTS = {
  reviewBatchesCreate: "review-batches:create",
  reviewJobsList: "review-jobs:list",
  reviewJobsSearch: "review-jobs:search",
  rulesList: "rules:list",
  rulesSearch: "rules:search",
  filesPick: "files:pick",
  runtimeStatus: "desktop-runtime:status",
} as const;

export const DESKTOP_EVENTS = {
  runtimeUpdated: "desktop-runtime:updated",
} as const;

export type DesktopRequestChannel =
  (typeof DESKTOP_REQUESTS)[keyof typeof DESKTOP_REQUESTS];

export type WorkerEnvelope<T = unknown> = {
  id: string;
  channel: DesktopRequestChannel;
  payload?: T;
};

export type RuntimeStatusPayload = {
  shellReady: boolean;
  workerReady: boolean;
  startupMs: number | null;
  lastError: string | null;
};

export function createWorkerEnvelope<T>(
  channel: DesktopRequestChannel,
  payload?: T,
): WorkerEnvelope<T> {
  return {
    id: randomUUID(),
    channel,
    payload,
  };
}

export function isRuntimeStatusPayload(value: unknown): value is RuntimeStatusPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.shellReady === "boolean" &&
    typeof candidate.workerReady === "boolean" &&
    (typeof candidate.startupMs === "number" || candidate.startupMs === null) &&
    (typeof candidate.lastError === "string" || candidate.lastError === null)
  );
}
```

```ts
// electron/channels.ts
import { DESKTOP_REQUESTS } from "@/desktop/worker/protocol";

export const CHANNELS = {
  reviewBatchesCreate: DESKTOP_REQUESTS.reviewBatchesCreate,
  reviewJobsList: DESKTOP_REQUESTS.reviewJobsList,
  reviewJobsSearch: DESKTOP_REQUESTS.reviewJobsSearch,
  rulesList: DESKTOP_REQUESTS.rulesList,
  rulesSearch: DESKTOP_REQUESTS.rulesSearch,
  filesPick: DESKTOP_REQUESTS.filesPick,
  runtimeStatus: DESKTOP_REQUESTS.runtimeStatus,
} as const satisfies Record<string, string>;
```

```ts
// desktop/bridge/desktop-api.ts (excerpt)
import {
  DESKTOP_EVENTS,
  type RuntimeStatusPayload,
} from "@/desktop/worker/protocol";

export interface DesktopApi {
  getRuntimeStatus: () => Promise<RuntimeStatusPayload>;
  subscribeRuntimeStatus: (listener: (payload: RuntimeStatusPayload) => void) => () => void;
}

export type DesktopSubscribe = (
  event: typeof DESKTOP_EVENTS.runtimeUpdated,
  listener: (payload: RuntimeStatusPayload) => void,
) => () => void;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/desktop/worker-protocol.test.ts`

Expected: PASS with `3 passed`

- [ ] **Step 5: Commit**

```bash
git add desktop/worker/protocol.ts tests/desktop/worker-protocol.test.ts electron/channels.ts desktop/bridge/desktop-api.ts
git commit -m "test: add desktop worker protocol"
```

## Task 2: Add Background Worker Bootstrap And Main-Process Worker Manager

**Files:**
- Create: `electron/worker-manager.ts`
- Create: `desktop/worker/background-entry.ts`
- Create: `tests/desktop/worker-manager.test.ts`
- Modify: `electron/main.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
    });

    const manager = createWorkerManager();
    await manager.start();

    expect(fork).toHaveBeenCalledTimes(1);
    expect(fork).toHaveBeenCalledWith(expect.stringContaining("background-entry"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/desktop/worker-manager.test.ts`

Expected: FAIL with `Cannot find module '@/electron/worker-manager'`

- [ ] **Step 3: Write minimal implementation**

```ts
// electron/worker-manager.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { utilityProcess } from "electron";

import type { WorkerEnvelope } from "@/desktop/worker/protocol";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export function createWorkerManager() {
  let child: Electron.UtilityProcess | null = null;
  const pending = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();

  return {
    async start() {
      if (child) {
        return child;
      }

      child = utilityProcess.fork(path.join(currentDir, "../desktop/worker/background-entry.ts"));
      child.on("message", (message: { id?: string; ok?: boolean; result?: unknown; error?: string }) => {
        if (!message?.id) {
          return;
        }

        const request = pending.get(message.id);
        if (!request) {
          return;
        }

        pending.delete(message.id);
        if (message.ok) {
          request.resolve(message.result);
          return;
        }

        request.reject(new Error(message.error ?? "Desktop worker request failed."));
      });
      return child;
    },
    async invoke(channel: WorkerEnvelope["channel"], payload?: unknown) {
      const process = await this.start();
      return new Promise<unknown>((resolve, reject) => {
        const id = randomUUID();
        pending.set(id, { resolve, reject });
        process.postMessage({ id, channel, payload });
      });
    },
    getChild() {
      return child;
    },
    stop() {
      child?.kill();
      child = null;
    },
  };
}
```

```ts
// desktop/worker/background-entry.ts
import { createWorkerPrisma } from "@/desktop/worker/prisma-provider";
import { createBackgroundRouter } from "@/desktop/worker/background-router";
import { createFileImportService } from "@/desktop/worker/services/file-import-service";
import { createReviewService } from "@/desktop/worker/services/review-service";
import { createRuleService } from "@/desktop/worker/services/rule-service";

const prisma = createWorkerPrisma();
const router = createBackgroundRouter({
  reviews: createReviewService(prisma),
  rules: createRuleService(prisma),
  files: createFileImportService(prisma),
});

process.parentPort?.on("message", async (message) => {
  try {
    const result = await router.handle(message);
    process.parentPort?.postMessage({ id: message.id, ok: true, result });
  } catch (error) {
    process.parentPort?.postMessage({
      id: message.id,
      ok: false,
      error: error instanceof Error ? error.message : "Unknown worker error.",
    });
  }
});
```

```ts
// electron/main.ts (excerpt)
import { createWorkerManager } from "@/electron/worker-manager";

const workerManager = createWorkerManager();

void app.whenReady().then(async () => {
  await workerManager.start();
  await createWindow();
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/desktop/worker-manager.test.ts`

Expected: PASS with `1 passed`

- [ ] **Step 5: Commit**

```bash
git add electron/worker-manager.ts desktop/worker/background-entry.ts tests/desktop/worker-manager.test.ts electron/main.ts
git commit -m "feat: add desktop background worker manager"
```

## Task 3: Move Prisma-Backed Desktop Services Behind The Background Router

**Files:**
- Create: `desktop/worker/background-router.ts`
- Create: `desktop/worker/prisma-provider.ts`
- Create: `desktop/worker/services/file-import-service.ts`
- Create: `desktop/worker/services/review-service.ts`
- Create: `desktop/worker/services/rule-service.ts`
- Create: `tests/desktop/background-router.test.ts`
- Modify: `desktop/core/files/import-documents-into-store.ts`
- Modify: `desktop/core/reviews/create-review-batch.ts`
- Modify: `desktop/core/reviews/list-review-jobs.ts`
- Modify: `desktop/core/reviews/search-review-jobs.ts`
- Modify: `desktop/core/rules/list-rules.ts`
- Modify: `desktop/core/rules/search-rules.ts`
- Modify: `electron/main.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";

import { createBackgroundRouter } from "@/desktop/worker/background-router";

describe("createBackgroundRouter", () => {
  it("routes review list requests through the injected Prisma-backed services", async () => {
    const listReviewJobs = vi.fn().mockResolvedValue([{ id: "job_1" }]);
    const router = createBackgroundRouter({
      reviews: {
        listReviewJobs,
      },
      rules: {
        listRules: vi.fn(),
        searchRules: vi.fn(),
      },
      files: {
        importDocumentsIntoStore: vi.fn(),
      },
    } as never);

    const result = await router.handle({
      id: "msg_1",
      channel: "review-jobs:list",
    });

    expect(listReviewJobs).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ id: "job_1" }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/desktop/background-router.test.ts`

Expected: FAIL with `Cannot find module '@/desktop/worker/background-router'`

- [ ] **Step 3: Write minimal implementation**

```ts
// desktop/worker/prisma-provider.ts
import { PrismaClient } from "@prisma/client";

export function createWorkerPrisma() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}
```

```ts
// desktop/worker/services/review-service.ts
import type { PrismaClient } from "@prisma/client";

import { createReviewBatch } from "@/desktop/core/reviews/create-review-batch";
import { listReviewJobs } from "@/desktop/core/reviews/list-review-jobs";
import { searchReviewJobs } from "@/desktop/core/reviews/search-review-jobs";

export function createReviewService(prisma: PrismaClient) {
  return {
    createReviewBatch: (input: Parameters<typeof createReviewBatch>[1]) =>
      createReviewBatch(prisma, input),
    listReviewJobs: () => listReviewJobs(prisma),
    searchReviewJobs: (query: string) => searchReviewJobs(prisma, query),
  };
}
```

```ts
// desktop/worker/services/rule-service.ts
import type { PrismaClient } from "@prisma/client";

import { listRules } from "@/desktop/core/rules/list-rules";
import { searchRules } from "@/desktop/core/rules/search-rules";

export function createRuleService(prisma: PrismaClient) {
  return {
    listRules: () => listRules(prisma),
    searchRules: (query: string) => searchRules(prisma, query),
  };
}
```

```ts
// desktop/worker/services/file-import-service.ts
import type { PrismaClient } from "@prisma/client";

import { importDocumentsIntoStore } from "@/desktop/core/files/import-documents-into-store";

export function createFileImportService(prisma: PrismaClient) {
  return {
    importDocumentsIntoStore: (paths: string[]) => importDocumentsIntoStore(prisma, paths),
  };
}
```

```ts
// desktop/worker/background-router.ts
import type { WorkerEnvelope } from "@/desktop/worker/protocol";

export function createBackgroundRouter(services: {
  reviews: {
    createReviewBatch?: (input: unknown) => Promise<unknown>;
    listReviewJobs: () => Promise<unknown>;
    searchReviewJobs?: (query: string) => Promise<unknown>;
  };
  rules: {
    listRules: () => Promise<unknown>;
    searchRules: (query: string) => Promise<unknown>;
  };
  files: {
    importDocumentsIntoStore: (paths: string[]) => Promise<unknown>;
  };
}) {
  return {
    async handle(message: WorkerEnvelope) {
      switch (message.channel) {
        case "review-jobs:list":
          return services.reviews.listReviewJobs();
        case "rules:list":
          return services.rules.listRules();
        default:
          throw new Error(`Unsupported worker message: ${message.channel}`);
      }
    },
  };
}
```

```ts
// electron/main.ts (excerpt)
registerDesktopHandlers(
  (channel, handler) => {
    ipcMain.handle(channel, handler);
  },
  {
    [CHANNELS.filesPick]: async () => {
      const result = mainWindow
        ? await dialog.showOpenDialog(mainWindow, dialogOptions)
        : await dialog.showOpenDialog(dialogOptions);

      if (result.canceled || result.filePaths.length === 0) {
        return [];
      }

      return workerManager.invoke(CHANNELS.filesPick, result.filePaths);
    },
    [CHANNELS.reviewBatchesCreate]: async (_event, payload) =>
      workerManager.invoke(CHANNELS.reviewBatchesCreate, payload),
    [CHANNELS.reviewJobsList]: async () => workerManager.invoke(CHANNELS.reviewJobsList),
    [CHANNELS.reviewJobsSearch]: async (_event, payload) =>
      workerManager.invoke(CHANNELS.reviewJobsSearch, payload),
    [CHANNELS.rulesList]: async () => workerManager.invoke(CHANNELS.rulesList),
    [CHANNELS.rulesSearch]: async (_event, payload) =>
      workerManager.invoke(CHANNELS.rulesSearch, payload),
  },
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/desktop/background-router.test.ts`

Expected: PASS with `1 passed`

- [ ] **Step 5: Run the current desktop regression cluster**

Run: `npm test -- --run tests/desktop/create-review-batch.test.ts tests/desktop/import-documents-into-store.test.ts tests/desktop/desktop-api.test.ts`

Expected: PASS with all targeted desktop service tests green

- [ ] **Step 6: Commit**

```bash
git add desktop/worker/background-router.ts desktop/worker/prisma-provider.ts desktop/worker/services/file-import-service.ts desktop/worker/services/review-service.ts desktop/worker/services/rule-service.ts tests/desktop/background-router.test.ts desktop/core/files/import-documents-into-store.ts desktop/core/reviews/create-review-batch.ts desktop/core/reviews/list-review-jobs.ts desktop/core/reviews/search-review-jobs.ts desktop/core/rules/list-rules.ts desktop/core/rules/search-rules.ts electron/main.ts
git commit -m "refactor: move desktop services behind background worker"
```

## Task 4: Offload Parsing And Review Execution To Short-Lived Task Processes

**Files:**
- Create: `desktop/worker/task-runner.ts`
- Create: `desktop/worker/task-entry.ts`
- Create: `tests/desktop/task-runner.test.ts`
- Modify: `desktop/core/files/parse-local-document.ts`
- Modify: `desktop/core/reviews/create-review-batch.ts`
- Modify: `lib/parse-document.ts`

- [ ] **Step 1: Write the failing test**

```ts
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

    expect(postMessage).toHaveBeenCalledWith({
      id: expect.any(String),
      task: "parse-document",
      payload: { filePath: "/tmp/demo.docx" },
    });
    expect(result).toEqual({ title: "策划案" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/desktop/task-runner.test.ts`

Expected: FAIL with `Cannot find module '@/desktop/worker/task-runner'`

- [ ] **Step 3: Write minimal implementation**

```ts
// desktop/worker/task-runner.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { utilityProcess } from "electron";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export function createTaskRunner() {
  return {
    run(task: "parse-document" | "execute-review-job", payload: unknown) {
      return new Promise<unknown>((resolve, reject) => {
        const child = utilityProcess.fork(path.join(currentDir, "./task-entry.ts"));
        const id = randomUUID();

        child.once("message", (message) => {
          child.kill();
          if (message?.ok) {
            resolve(message.result);
            return;
          }

          reject(new Error(message?.error ?? "Task process failed."));
        });

        child.postMessage({ id, task, payload });
      });
    },
  };
}
```

```ts
// lib/parse-document.ts (excerpt)
export async function parseDocx(buffer: ArrayBuffer) {
  const mammoth = await import("mammoth");
  return mammoth.extractRawText({ arrayBuffer: buffer });
}
```

```ts
// desktop/core/files/parse-local-document.ts (excerpt)
if (filename.toLowerCase().endsWith(".xlsx")) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  return parseSpreadsheetWorkbook(workbook, filename);
}
```

```ts
// desktop/core/reviews/create-review-batch.ts (excerpt)
export type ReviewJobExecutor = (input: {
  reviewJobId: string;
  documentTitle: string;
  modelName: string;
  llmProfile: Parameters<typeof executeReviewJob>[0]["llmProfile"];
  parsedDocument: Parameters<typeof executeReviewJob>[0]["parsedDocument"];
  rules: Parameters<typeof executeReviewJob>[0]["rules"];
}) => Promise<unknown>;

export async function createReviewBatch(
  prisma: PrismaClient,
  input: CreateReviewBatchInput,
  executeJob: ReviewJobExecutor = executeReviewJob,
) {
  const reviewJobs = reviewJobsToExecute.map((job) => ({
    reviewJobId: job.id,
    documentTitle: job.document.title,
    modelName: modelNameSnapshot,
    llmProfile: llmProfile!,
    parsedDocument: toParsedDocument(job.document),
    rules: orderedRules,
  }));

  void Promise.allSettled(reviewJobs.map((job) => executeJob(job)));
}
```

```ts
// desktop/worker/task-entry.ts
import { executeReviewJob } from "@/lib/review-jobs";
import { parseLocalDocument } from "@/desktop/core/files/parse-local-document";

process.parentPort?.on("message", async (message) => {
  try {
    if (message.task === "parse-document") {
      const result = await parseLocalDocument(message.payload.filePath);
      process.parentPort?.postMessage({ id: message.id, ok: true, result });
      return;
    }

    if (message.task === "execute-review-job") {
      const result = await executeReviewJob(message.payload);
      process.parentPort?.postMessage({ id: message.id, ok: true, result });
      return;
    }

    process.parentPort?.postMessage({ id: message.id, ok: false, error: "Unsupported task." });
  } catch (error) {
    process.parentPort?.postMessage({
      id: message.id,
      ok: false,
      error: error instanceof Error ? error.message : "Unknown task error.",
    });
  }
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/desktop/task-runner.test.ts`

Expected: PASS with `1 passed`

- [ ] **Step 5: Run parsing and batch execution coverage**

Run: `npm test -- --run tests/desktop/parse-spreadsheet.test.ts tests/desktop/create-review-batch.test.ts`

Expected: PASS with the parsing and review batch suites green

- [ ] **Step 6: Commit**

```bash
git add desktop/worker/task-runner.ts desktop/worker/task-entry.ts tests/desktop/task-runner.test.ts desktop/core/files/parse-local-document.ts desktop/core/reviews/create-review-batch.ts lib/parse-document.ts
git commit -m "perf: offload desktop parsing and review execution"
```

## Task 5: Publish Runtime Status And Startup Metrics To The Renderer

**Files:**
- Create: `desktop/worker/runtime-store.ts`
- Create: `desktop/worker/services/runtime-metrics-service.ts`
- Create: `tests/desktop/runtime-metrics.test.ts`
- Modify: `desktop/bridge/desktop-api.ts`
- Modify: `electron/preload.ts`
- Modify: `electron/main.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";

import { createDesktopApi } from "@/desktop/bridge/desktop-api";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/desktop/runtime-metrics.test.ts`

Expected: FAIL with `Expected number of arguments` or missing runtime subscription support

- [ ] **Step 3: Write minimal implementation**

```ts
// desktop/worker/runtime-store.ts
import type { RuntimeStatusPayload } from "@/desktop/worker/protocol";

export function createRuntimeStore(initial?: Partial<RuntimeStatusPayload>) {
  let state: RuntimeStatusPayload = {
    shellReady: true,
    workerReady: false,
    startupMs: null,
    lastError: null,
    ...initial,
  };

  return {
    getState: () => state,
    update(next: Partial<RuntimeStatusPayload>) {
      state = { ...state, ...next };
      return state;
    },
  };
}
```

```ts
// desktop/worker/services/runtime-metrics-service.ts
import { performance } from "node:perf_hooks";

import { createRuntimeStore } from "@/desktop/worker/runtime-store";

export function createRuntimeMetricsService() {
  const bootStartedAt = performance.now();
  const runtimeStore = createRuntimeStore();

  return {
    markWorkerReady() {
      return runtimeStore.update({
        workerReady: true,
        startupMs: Math.round(performance.now() - bootStartedAt),
      });
    },
    markWorkerError(error: Error) {
      return runtimeStore.update({
        lastError: error.message,
      });
    },
    getRuntimeStatus() {
      return runtimeStore.getState();
    },
  };
}
```

```ts
// desktop/bridge/desktop-api.ts (excerpt)
export function createDesktopApi(invoke: DesktopInvoke, subscribe?: DesktopSubscribe): DesktopApi {
  return {
    getRuntimeStatus: () => invoke<RuntimeStatusPayload>(CHANNELS.runtimeStatus),
    subscribeRuntimeStatus: (listener) => {
      if (!subscribe) {
        return () => undefined;
      }

      return subscribe(DESKTOP_EVENTS.runtimeUpdated, listener);
    },
  };
}
```

```ts
// electron/preload.ts
contextBridge.exposeInMainWorld(
  "plreview",
  createDesktopApi(
    (channel, payload) => ipcRenderer.invoke(channel, payload),
    (event, listener) => {
      const wrapped = (_event: Electron.IpcRendererEvent, payload: unknown) => {
        listener(payload as RuntimeStatusPayload);
      };

      ipcRenderer.on(event, wrapped);
      return () => ipcRenderer.removeListener(event, wrapped);
    },
  ),
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/desktop/runtime-metrics.test.ts`

Expected: PASS with `1 passed`

- [ ] **Step 5: Run bridge regression coverage**

Run: `npm test -- --run tests/desktop/desktop-api.test.ts tests/desktop/runtime-metrics.test.ts`

Expected: PASS with all desktop bridge tests green

- [ ] **Step 6: Commit**

```bash
git add desktop/worker/runtime-store.ts desktop/worker/services/runtime-metrics-service.ts tests/desktop/runtime-metrics.test.ts desktop/bridge/desktop-api.ts electron/preload.ts electron/main.ts
git commit -m "feat: publish desktop runtime metrics"
```

## Task 6: Tighten Packaging Inputs And Emit Bundle-Size Reports

**Files:**
- Create: `scripts/report-desktop-bundle-size.mjs`
- Create: `tests/desktop/desktop-size-report.test.ts`
- Modify: `package.json`
- Modify: `electron-builder.yml`
- Modify: `README.md`
- Modify: `tests/desktop/desktop-packaging.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import packageJson from "@/package.json";

describe("desktop bundle reporting", () => {
  it("declares a post-build size report script", () => {
    expect(packageJson.scripts["desktop:report-size"]).toBe(
      "node ./scripts/report-desktop-bundle-size.mjs",
    );
  });

  it("keeps electron-builder file inputs explicit", () => {
    const builderConfig = fs.readFileSync(path.resolve("electron-builder.yml"), "utf8");

    expect(builderConfig).toContain("desktop/worker/**/*.{ts,cjs}");
    expect(builderConfig).toContain(".next/standalone/**");
    expect(builderConfig).not.toContain(".next/**");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/desktop/desktop-size-report.test.ts`

Expected: FAIL because `desktop:report-size` does not exist and builder inputs are missing worker files

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/report-desktop-bundle-size.mjs
import fs from "node:fs";

function bytesToMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getSize(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    return stat.size;
  }

  return fs.readdirSync(target).reduce((total, entry) => {
    return total + getSize(`${target}/${entry}`);
  }, 0);
}

const roots = [".next", "electron", "desktop", "release"];
const report = roots
  .filter((root) => fs.existsSync(root))
  .map((root) => ({
    root,
    size: bytesToMb(getSize(root)),
  }));

console.log(JSON.stringify(report, null, 2));
```

```json
// package.json (scripts excerpt)
{
  "scripts": {
    "desktop:build": "next build --no-lint",
    "desktop:dist": "npm run desktop:build && electron-builder",
    "desktop:report-size": "node ./scripts/report-desktop-bundle-size.mjs"
  }
}
```

```yaml
# electron-builder.yml
appId: com.plreview.desktop
productName: PLReview
directories:
  output: release
files:
  - electron/**/*.{ts,cjs}
  - desktop/bridge/**/*.ts
  - desktop/worker/**/*.{ts,cjs}
  - .next/standalone/**
  - .next/static/**
  - package.json
extraMetadata:
  main: electron/main.cjs
mac:
  category: public.app-category.productivity
  identity: null
  target:
    - dmg
win:
  target:
    - nsis
  compression: maximum
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/desktop/desktop-size-report.test.ts tests/desktop/desktop-packaging.test.ts`

Expected: PASS with the packaging suites green

- [ ] **Step 5: Run the reporting script on the local build output**

Run: `npm run desktop:report-size`

Expected: prints JSON with entries for `.next`, `electron`, `desktop`, and `release` when those directories exist

- [ ] **Step 6: Commit**

```bash
git add scripts/report-desktop-bundle-size.mjs tests/desktop/desktop-size-report.test.ts package.json electron-builder.yml README.md tests/desktop/desktop-packaging.test.ts
git commit -m "build: add desktop bundle size reporting"
```

## Task 7: Final Verification And Handoff

**Files:**
- Modify: `README.md`
- Modify: `docs/qa/2026-04-14-win11-smoke-test-checklist.md`

- [ ] **Step 1: Update operator-facing docs**

```md
## Desktop Optimization Validation

Run the desktop verification sequence after any runtime boundary or packaging change:

    npm test -- --run tests/desktop/worker-protocol.test.ts tests/desktop/worker-manager.test.ts tests/desktop/background-router.test.ts tests/desktop/task-runner.test.ts tests/desktop/runtime-metrics.test.ts tests/desktop/desktop-packaging.test.ts tests/desktop/desktop-size-report.test.ts
    npm run desktop:report-size
```

- [ ] **Step 2: Run the full desktop verification cluster**

Run: `npm test -- --run tests/desktop/worker-protocol.test.ts tests/desktop/worker-manager.test.ts tests/desktop/background-router.test.ts tests/desktop/task-runner.test.ts tests/desktop/runtime-metrics.test.ts tests/desktop/desktop-api.test.ts tests/desktop/create-review-batch.test.ts tests/desktop/import-documents-into-store.test.ts tests/desktop/parse-spreadsheet.test.ts tests/desktop/desktop-packaging.test.ts tests/desktop/desktop-size-report.test.ts`

Expected: PASS with all desktop suites green

- [ ] **Step 3: Run desktop build and report commands**

Run: `npm run desktop:build && npm run desktop:report-size`

Expected: Next.js build succeeds, then the size report prints the current desktop artifact inventory

- [ ] **Step 4: Commit**

```bash
git add README.md docs/qa/2026-04-14-win11-smoke-test-checklist.md
git commit -m "docs: add desktop optimization verification flow"
```
