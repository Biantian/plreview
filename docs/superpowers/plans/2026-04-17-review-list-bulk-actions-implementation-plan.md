# Review List Bulk Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bulk selection, bulk delete, export-list, and export-report workflows to the review list without breaking the existing search, refresh, and detail-entry flow.

**Architecture:** Keep the current `app/reviews/page.tsx -> components/review-jobs-table.tsx -> app/api/reviews -> lib/review-jobs.ts` shape, but split new bulk-action behavior into focused helpers. Server-side code owns scope resolution, delete, workbook generation, and report-archive generation; the client owns selection state, confirmation UI, and download triggers.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma, Vitest, Testing Library, `xlsx`, `jszip`

---

## File Structure

- Modify: `package.json`
  - Add the zip dependency used by the report export route.
- Modify: `lib/review-jobs.ts`
  - Export reusable review-row query helpers and bulk-action services.
- Create: `lib/review-jobs-selection.ts`
  - Resolve `selectedIds` vs `query + allMatching` into a single server-side selection scope.
- Create: `lib/review-jobs-export.ts`
  - Generate the `xlsx` workbook and the report `zip` archive.
- Create: `app/api/reviews/delete/route.ts`
  - Delete selected review jobs.
- Create: `app/api/reviews/export-list/route.ts`
  - Return the workbook download response.
- Create: `app/api/reviews/export-report/route.ts`
  - Return the report archive download response.
- Create: `components/confirm-dialog.tsx`
  - Reusable lightweight confirmation dialog for bulk delete.
- Modify: `components/review-jobs-table.tsx`
  - Add row selection, bulk-action toolbar, delete confirmation, export triggers, and result feedback.
- Create: `tests/lib/review-jobs-selection.test.ts`
  - Cover selection-scope resolution rules.
- Create: `tests/lib/review-jobs-export.test.ts`
  - Cover export-list fields, export-report skip rules, and filename sanitizing.
- Create: `tests/api/reviews-delete-route.test.ts`
  - Cover delete route success and empty-scope rejection.
- Create: `tests/api/reviews-export-list-route.test.ts`
  - Cover workbook response shape.
- Create: `tests/api/reviews-export-report-route.test.ts`
  - Cover archive response and skip-count response headers/body metadata.
- Modify: `tests/components/review-jobs-table.test.tsx`
  - Cover selection UX, bulk toolbar visibility, confirmation copy, and export/delete request handling.

### Task 1: Add Server-Side Selection Scope Resolution

**Files:**
- Create: `lib/review-jobs-selection.ts`
- Create: `tests/lib/review-jobs-selection.test.ts`
- Modify: `lib/review-jobs.ts`

- [ ] **Step 1: Write the failing selection-scope tests**

```ts
// tests/lib/review-jobs-selection.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    reviewJob: {
      findMany: findManyMock,
    },
  },
}));

import { resolveReviewSelectionScope } from "@/lib/review-jobs-selection";

describe("resolveReviewSelectionScope", () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  it("loads explicit selected ids when allMatching is false", async () => {
    findManyMock.mockResolvedValue([
      { id: "review_1", status: "completed", reportMarkdown: "# done" },
      { id: "review_2", status: "running", reportMarkdown: null },
    ]);

    const result = await resolveReviewSelectionScope({
      allMatching: false,
      query: "",
      selectedIds: ["review_1", "review_2"],
    });

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["review_1", "review_2"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        status: true,
        reportMarkdown: true,
      },
    });
    expect(result.items.map((item) => item.id)).toEqual(["review_1", "review_2"]);
    expect(result.mode).toBe("selected");
  });

  it("uses the search predicate when allMatching is true", async () => {
    findManyMock.mockResolvedValue([
      { id: "review_3", status: "completed", reportMarkdown: "# report" },
    ]);

    const result = await resolveReviewSelectionScope({
      allMatching: true,
      query: "四月",
      selectedIds: [],
    });

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        OR: [
          { document: { title: { contains: "四月" } } },
          { document: { filename: { contains: "四月" } } },
          { reviewBatch: { name: { contains: "四月" } } },
          { modelNameSnapshot: { contains: "四月" } },
          { status: { in: ["completed", "failed", "partial", "pending", "running"] } },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        status: true,
        reportMarkdown: true,
      },
    });
    expect(result.mode).toBe("allMatching");
    expect(result.items).toHaveLength(1);
  });

  it("rejects an empty scope", async () => {
    await expect(
      resolveReviewSelectionScope({
        allMatching: false,
        query: "",
        selectedIds: [],
      }),
    ).rejects.toThrow("至少选择一条评审任务。");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run tests/lib/review-jobs-selection.test.ts`
Expected: FAIL with `Cannot find module '@/lib/review-jobs-selection'`

- [ ] **Step 3: Add the shared search predicate helper**

```ts
// lib/review-jobs.ts
import { ReviewStatus } from "@prisma/client";

export const REVIEW_STATUS_VALUES = [
  ReviewStatus.pending,
  ReviewStatus.running,
  ReviewStatus.completed,
  ReviewStatus.partial,
  ReviewStatus.failed,
] as const;

export function buildReviewSearchWhere(query: string) {
  const trimmed = query.trim();

  if (!trimmed) {
    return {};
  }

  return {
    OR: [
      { document: { title: { contains: trimmed } } },
      { document: { filename: { contains: trimmed } } },
      { reviewBatch: { name: { contains: trimmed } } },
      { modelNameSnapshot: { contains: trimmed } },
      { status: { in: REVIEW_STATUS_VALUES.filter((status) => status.includes(trimmed)) } },
    ],
  };
}
```

- [ ] **Step 4: Implement scope resolution**

```ts
// lib/review-jobs-selection.ts
import { prisma } from "@/lib/prisma";
import { buildReviewSearchWhere } from "@/lib/review-jobs";

export type ReviewSelectionInput = {
  selectedIds?: string[];
  query?: string;
  allMatching?: boolean;
};

export type ReviewSelectionItem = {
  id: string;
  status: "pending" | "running" | "completed" | "partial" | "failed";
  reportMarkdown: string | null;
};

export async function resolveReviewSelectionScope(input: ReviewSelectionInput) {
  const selectedIds = Array.from(new Set(input.selectedIds ?? []));
  const query = input.query ?? "";
  const allMatching = Boolean(input.allMatching);

  if (!allMatching && selectedIds.length === 0) {
    throw new Error("至少选择一条评审任务。");
  }

  const items = await prisma.reviewJob.findMany({
    where: allMatching
      ? buildReviewSearchWhere(query)
      : {
          id: {
            in: selectedIds,
          },
        },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      status: true,
      reportMarkdown: true,
    },
  });

  if (items.length === 0) {
    throw new Error("没有找到可操作的评审任务。");
  }

  return {
    items,
    mode: allMatching ? "allMatching" : "selected",
  } as const;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- --run tests/lib/review-jobs-selection.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/review-jobs.ts lib/review-jobs-selection.ts tests/lib/review-jobs-selection.test.ts
git commit -m "feat: add review bulk selection scope service"
```

### Task 2: Add Delete Route and Delete Service

**Files:**
- Create: `app/api/reviews/delete/route.ts`
- Modify: `lib/review-jobs.ts`
- Modify: `lib/review-jobs-selection.ts`
- Create: `tests/api/reviews-delete-route.test.ts`
- Modify: `tests/lib/review-jobs.test.ts`

- [ ] **Step 1: Write the failing delete-service and route tests**

```ts
// tests/lib/review-jobs.test.ts
it("deletes review jobs without touching document records", async () => {
  const deleteManyMock = vi.fn().mockResolvedValue({ count: 2 });
  vi.mocked(await import("@/lib/prisma")).prisma.reviewJob.deleteMany = deleteManyMock;

  const { deleteReviewJobs } = await import("@/lib/review-jobs");

  const result = await deleteReviewJobs(["review_1", "review_2"]);

  expect(deleteManyMock).toHaveBeenCalledWith({
    where: {
      id: {
        in: ["review_1", "review_2"],
      },
    },
  });
  expect(result).toEqual({ count: 2 });
});
```

```ts
// tests/api/reviews-delete-route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveMock, deleteMock } = vi.hoisted(() => ({
  resolveMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("@/lib/review-jobs-selection", () => ({
  resolveReviewSelectionScope: resolveMock,
}));

vi.mock("@/lib/review-jobs", () => ({
  deleteReviewJobs: deleteMock,
}));

import { DELETE } from "@/app/api/reviews/delete/route";

describe("DELETE /api/reviews/delete", () => {
  beforeEach(() => {
    resolveMock.mockReset();
    deleteMock.mockReset();
  });

  it("returns deleted count", async () => {
    resolveMock.mockResolvedValue({
      items: [{ id: "review_1", status: "completed", reportMarkdown: "# done" }],
      mode: "selected",
    });
    deleteMock.mockResolvedValue({ count: 1 });

    const response = await DELETE(
      new Request("http://localhost/api/reviews/delete", {
        method: "DELETE",
        body: JSON.stringify({
          selectedIds: ["review_1"],
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ deletedCount: 1 });
  });

  it("returns 400 for empty selection errors", async () => {
    resolveMock.mockRejectedValue(new Error("至少选择一条评审任务。"));

    const response = await DELETE(
      new Request("http://localhost/api/reviews/delete", {
        method: "DELETE",
        body: JSON.stringify({ selectedIds: [] }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "至少选择一条评审任务。",
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- --run tests/lib/review-jobs.test.ts tests/api/reviews-delete-route.test.ts`
Expected: FAIL with `deleteReviewJobs is not a function` and `Cannot find module '@/app/api/reviews/delete/route'`

- [ ] **Step 3: Implement deleteReviewJobs**

```ts
// lib/review-jobs.ts
export async function deleteReviewJobs(reviewJobIds: string[]) {
  if (reviewJobIds.length === 0) {
    throw new Error("至少选择一条评审任务。");
  }

  const result = await prisma.reviewJob.deleteMany({
    where: {
      id: {
        in: reviewJobIds,
      },
    },
  });

  return {
    count: result.count,
  };
}
```

- [ ] **Step 4: Implement the delete route**

```ts
// app/api/reviews/delete/route.ts
import { NextResponse } from "next/server";

import { deleteReviewJobs } from "@/lib/review-jobs";
import { resolveReviewSelectionScope } from "@/lib/review-jobs-selection";

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as {
      selectedIds?: string[];
      query?: string;
      allMatching?: boolean;
    };
    const scope = await resolveReviewSelectionScope(body);
    const result = await deleteReviewJobs(scope.items.map((item) => item.id));

    return NextResponse.json({
      deletedCount: result.count,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除评审任务失败。";
    const status = message === "至少选择一条评审任务。" ? 400 : 500;

    return NextResponse.json(
      {
        error: message,
      },
      {
        status,
      },
    );
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- --run tests/lib/review-jobs.test.ts tests/api/reviews-delete-route.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/review-jobs.ts app/api/reviews/delete/route.ts tests/lib/review-jobs.test.ts tests/api/reviews-delete-route.test.ts
git commit -m "feat: add review bulk delete endpoint"
```

### Task 3: Add Export-List Workbook Generation and Route

**Files:**
- Create: `lib/review-jobs-export.ts`
- Create: `app/api/reviews/export-list/route.ts`
- Create: `tests/lib/review-jobs-export.test.ts`
- Create: `tests/api/reviews-export-list-route.test.ts`
- Modify: `lib/review-jobs.ts`

- [ ] **Step 1: Write the failing export-list tests**

```ts
// tests/lib/review-jobs-export.test.ts
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { buildReviewListWorkbook } from "@/lib/review-jobs-export";

describe("buildReviewListWorkbook", () => {
  it("writes the expected review columns", () => {
    const file = buildReviewListWorkbook([
      {
        id: "review_1",
        title: "玩法复盘",
        filename: "玩法.xlsx",
        fileType: "xlsx",
        batchName: "四月批次",
        status: "completed",
        modelName: "qwen-plus",
        annotationsCount: 3,
        overallScore: 88,
        createdAt: "2026-04-17T08:00:00.000Z",
        finishedAt: "2026-04-17T08:05:00.000Z",
      },
    ]);

    const workbook = XLSX.read(file, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet);

    expect(rows).toEqual([
      {
        标题: "玩法复盘",
        文件名: "玩法.xlsx",
        文件类型: "xlsx",
        批次: "四月批次",
        模型: "qwen-plus",
        状态: "completed",
        问题数: 3,
        评分: 88,
        创建时间: "2026-04-17 08:00:00",
        完成时间: "2026-04-17 08:05:00",
      },
    ]);
  });
});
```

```ts
// tests/api/reviews-export-list-route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveMock, listMock } = vi.hoisted(() => ({
  resolveMock: vi.fn(),
  listMock: vi.fn(),
}));

vi.mock("@/lib/review-jobs-selection", () => ({
  resolveReviewSelectionScope: resolveMock,
}));

vi.mock("@/lib/review-jobs", () => ({
  getReviewListItemsByIds: listMock,
}));

import { POST } from "@/app/api/reviews/export-list/route";

describe("POST /api/reviews/export-list", () => {
  beforeEach(() => {
    resolveMock.mockReset();
    listMock.mockReset();
  });

  it("returns an xlsx attachment", async () => {
    resolveMock.mockResolvedValue({
      items: [{ id: "review_1", status: "completed", reportMarkdown: "# done" }],
      mode: "selected",
    });
    listMock.mockResolvedValue([
      {
        id: "review_1",
        title: "玩法复盘",
        filename: "玩法.xlsx",
        fileType: "xlsx",
        batchName: "四月批次",
        status: "completed",
        provider: "DashScope",
        modelName: "qwen-plus",
        summary: "完成",
        overallScore: 88,
        annotationsCount: 3,
        errorMessage: null,
        createdAt: "2026-04-17T08:00:00.000Z",
        finishedAt: "2026-04-17T08:05:00.000Z",
      },
    ]);

    const response = await POST(
      new Request("http://localhost/api/reviews/export-list", {
        method: "POST",
        body: JSON.stringify({ selectedIds: ["review_1"] }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers.get("content-disposition")).toContain("attachment;");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- --run tests/lib/review-jobs-export.test.ts tests/api/reviews-export-list-route.test.ts`
Expected: FAIL with `Cannot find module '@/lib/review-jobs-export'`

- [ ] **Step 3: Add a row loader and workbook builder**

```ts
// lib/review-jobs.ts
export async function getReviewListItemsByIds(reviewJobIds: string[]) {
  const items = await getReviewListItems();

  return items.filter((item) => reviewJobIds.includes(item.id));
}
```

```ts
// lib/review-jobs-export.ts
import * as XLSX from "xlsx";

import { formatDate } from "@/lib/utils";
import type { ReviewListItem } from "@/lib/review-jobs";

export function buildReviewListWorkbook(items: ReviewListItem[]) {
  const rows = items.map((item) => ({
    标题: item.title,
    文件名: item.filename,
    文件类型: item.fileType,
    批次: item.batchName ?? "单任务",
    模型: item.modelName,
    状态: item.status,
    问题数: item.annotationsCount,
    评分: item.overallScore ?? "",
    创建时间: formatDate(item.createdAt).replace(/\//g, "-"),
    完成时间: item.finishedAt ? formatDate(item.finishedAt).replace(/\//g, "-") : "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "评审清单");

  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  });
}
```

- [ ] **Step 4: Implement the export-list route**

```ts
// app/api/reviews/export-list/route.ts
import { NextResponse } from "next/server";

import { buildReviewListWorkbook } from "@/lib/review-jobs-export";
import { getReviewListItemsByIds } from "@/lib/review-jobs";
import { resolveReviewSelectionScope } from "@/lib/review-jobs-selection";

function createTimestamp() {
  return new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      selectedIds?: string[];
      query?: string;
      allMatching?: boolean;
    };
    const scope = await resolveReviewSelectionScope(body);
    const items = await getReviewListItemsByIds(scope.items.map((item) => item.id));
    const workbook = buildReviewListWorkbook(items);

    return new NextResponse(workbook, {
      status: 200,
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="review-list-${createTimestamp()}.xlsx"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "导出清单失败。";
    const status = message === "至少选择一条评审任务。" ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- --run tests/lib/review-jobs-export.test.ts tests/api/reviews-export-list-route.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/review-jobs.ts lib/review-jobs-export.ts app/api/reviews/export-list/route.ts tests/lib/review-jobs-export.test.ts tests/api/reviews-export-list-route.test.ts
git commit -m "feat: add review list workbook export"
```

### Task 4: Add Report-Archive Export and Skip Rules

**Files:**
- Modify: `package.json`
- Modify: `lib/review-jobs-export.ts`
- Create: `app/api/reviews/export-report/route.ts`
- Create: `tests/api/reviews-export-report-route.test.ts`
- Modify: `tests/lib/review-jobs-export.test.ts`

- [ ] **Step 1: Write the failing report-export tests**

```ts
// tests/lib/review-jobs-export.test.ts
import JSZip from "jszip";

import { buildReviewReportArchive, canExportReviewReport } from "@/lib/review-jobs-export";

it("only exports items with report markdown", async () => {
  const archive = await buildReviewReportArchive([
    {
      id: "review_1",
      title: "玩法复盘",
      filename: "玩法.xlsx",
      status: "completed",
      reportMarkdown: "# 完成报告",
    },
    {
      id: "review_2",
      title: "活动包装",
      filename: "包装.docx",
      status: "running",
      reportMarkdown: null,
    },
  ]);

  const zip = await JSZip.loadAsync(archive.file);

  expect(canExportReviewReport({ reportMarkdown: "# x" })).toBe(true);
  expect(canExportReviewReport({ reportMarkdown: null })).toBe(false);
  expect(Object.keys(zip.files)).toEqual(["玩法复盘__玩法.xlsx__completed.md"]);
  expect(archive.exportedCount).toBe(1);
  expect(archive.skippedCount).toBe(1);
});
```

```ts
// tests/api/reviews-export-report-route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveMock, detailMock } = vi.hoisted(() => ({
  resolveMock: vi.fn(),
  detailMock: vi.fn(),
}));

vi.mock("@/lib/review-jobs-selection", () => ({
  resolveReviewSelectionScope: resolveMock,
}));

vi.mock("@/lib/review-jobs", () => ({
  getReviewReportItemsByIds: detailMock,
}));

import { POST } from "@/app/api/reviews/export-report/route";

describe("POST /api/reviews/export-report", () => {
  beforeEach(() => {
    resolveMock.mockReset();
    detailMock.mockReset();
  });

  it("returns a zip attachment with export summary headers", async () => {
    resolveMock.mockResolvedValue({
      items: [{ id: "review_1", status: "completed", reportMarkdown: "# done" }],
      mode: "selected",
    });
    detailMock.mockResolvedValue([
      {
        id: "review_1",
        title: "玩法复盘",
        filename: "玩法.xlsx",
        status: "completed",
        reportMarkdown: "# done",
      },
    ]);

    const response = await POST(
      new Request("http://localhost/api/reviews/export-report", {
        method: "POST",
        body: JSON.stringify({ selectedIds: ["review_1"] }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("x-exported-count")).toBe("1");
    expect(response.headers.get("x-skipped-count")).toBe("0");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- --run tests/lib/review-jobs-export.test.ts tests/api/reviews-export-report-route.test.ts`
Expected: FAIL with `Cannot find package 'jszip'` or `buildReviewReportArchive is not exported`

- [ ] **Step 3: Add the dependency**

```json
// package.json
{
  "dependencies": {
    "jszip": "^3.10.1"
  }
}
```

Run: `npm install`
Expected: `added 1 package` and `package-lock.json` updated

- [ ] **Step 4: Implement report export helpers**

```ts
// lib/review-jobs.ts
export async function getReviewReportItemsByIds(reviewJobIds: string[]) {
  const reviews = await prisma.reviewJob.findMany({
    where: {
      id: {
        in: reviewJobIds,
      },
    },
    select: {
      id: true,
      status: true,
      reportMarkdown: true,
      document: {
        select: {
          title: true,
          filename: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return reviews.map((review) => ({
    id: review.id,
    title: review.document.title,
    filename: review.document.filename,
    status: review.status,
    reportMarkdown: review.reportMarkdown,
  }));
}
```

```ts
// lib/review-jobs-export.ts
import JSZip from "jszip";

function sanitizeFilenamePart(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").trim() || "untitled";
}

export function canExportReviewReport(input: { reportMarkdown: string | null }) {
  return Boolean(input.reportMarkdown && input.reportMarkdown.trim());
}

export async function buildReviewReportArchive(
  items: Array<{
    id: string;
    title: string;
    filename: string;
    status: string;
    reportMarkdown: string | null;
  }>,
) {
  const zip = new JSZip();
  let exportedCount = 0;
  let skippedCount = 0;

  for (const item of items) {
    if (!canExportReviewReport(item)) {
      skippedCount += 1;
      continue;
    }

    zip.file(
      `${sanitizeFilenamePart(item.title)}__${sanitizeFilenamePart(item.filename)}__${item.status}.md`,
      item.reportMarkdown!,
    );
    exportedCount += 1;
  }

  return {
    file: await zip.generateAsync({ type: "uint8array" }),
    exportedCount,
    skippedCount,
  };
}
```

- [ ] **Step 5: Implement the report route**

```ts
// app/api/reviews/export-report/route.ts
import { NextResponse } from "next/server";

import { buildReviewReportArchive } from "@/lib/review-jobs-export";
import { getReviewReportItemsByIds } from "@/lib/review-jobs";
import { resolveReviewSelectionScope } from "@/lib/review-jobs-selection";

function createTimestamp() {
  return new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      selectedIds?: string[];
      query?: string;
      allMatching?: boolean;
    };
    const scope = await resolveReviewSelectionScope(body);
    const items = await getReviewReportItemsByIds(scope.items.map((item) => item.id));
    const archive = await buildReviewReportArchive(items);

    if (archive.exportedCount === 0) {
      return NextResponse.json(
        {
          error: "未找到可导出的报告。",
          exportedCount: 0,
          skippedCount: archive.skippedCount,
        },
        {
          status: 400,
        },
      );
    }

    return new NextResponse(archive.file, {
      status: 200,
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="review-reports-${createTimestamp()}.zip"`,
        "x-exported-count": String(archive.exportedCount),
        "x-skipped-count": String(archive.skippedCount),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "导出报告失败。";
    const status =
      message === "至少选择一条评审任务。" || message === "未找到可导出的报告。"
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -- --run tests/lib/review-jobs-export.test.ts tests/api/reviews-export-report-route.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json lib/review-jobs.ts lib/review-jobs-export.ts app/api/reviews/export-report/route.ts tests/lib/review-jobs-export.test.ts tests/api/reviews-export-report-route.test.ts
git commit -m "feat: add review report archive export"
```

### Task 5: Add Bulk Selection UI, Confirmation Dialog, and Download Feedback

**Files:**
- Create: `components/confirm-dialog.tsx`
- Modify: `components/review-jobs-table.tsx`
- Modify: `tests/components/review-jobs-table.test.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Extend the failing component tests**

```tsx
// tests/components/review-jobs-table.test.tsx
it("shows the bulk toolbar after selecting rows", async () => {
  const user = userEvent.setup();

  render(
    <ReviewJobsTable
      items={[
        {
          annotationsCount: 3,
          batchName: "四月批次",
          createdAt: "2026-04-13T10:00:00.000Z",
          fileType: "xlsx",
          filename: "玩法.xlsx",
          finishedAt: "2026-04-13T12:00:00.000Z",
          id: "1",
          modelName: "qwen-plus",
          overallScore: 80,
          status: "completed",
          title: "玩法复盘",
        },
        {
          annotationsCount: 0,
          batchName: "五月批次",
          createdAt: "2026-04-13T11:00:00.000Z",
          fileType: "docx",
          filename: "包装.docx",
          finishedAt: null,
          id: "2",
          modelName: "qwen-max",
          overallScore: null,
          status: "running",
          title: "活动包装",
        },
      ]}
    />,
  );

  await user.click(screen.getByRole("checkbox", { name: "选择 玩法复盘" }));

  expect(screen.getByText("已选 1 项")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "导出清单" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "导出报告" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "删除" })).toBeEnabled();
});

it("switches the delete confirmation copy when running jobs are selected", async () => {
  const user = userEvent.setup();

  render(
    <ReviewJobsTable
      items={[
        {
          annotationsCount: 3,
          batchName: "四月批次",
          createdAt: "2026-04-13T10:00:00.000Z",
          fileType: "xlsx",
          filename: "玩法.xlsx",
          finishedAt: "2026-04-13T12:00:00.000Z",
          id: "1",
          modelName: "qwen-plus",
          overallScore: 80,
          status: "completed",
          title: "玩法复盘",
        },
        {
          annotationsCount: 0,
          batchName: "五月批次",
          createdAt: "2026-04-13T11:00:00.000Z",
          fileType: "docx",
          filename: "包装.docx",
          finishedAt: null,
          id: "2",
          modelName: "qwen-max",
          overallScore: null,
          status: "running",
          title: "活动包装",
        },
      ]}
    />,
  );

  await user.click(screen.getByRole("checkbox", { name: "选择 活动包装" }));
  await user.click(screen.getByRole("button", { name: "删除" }));

  expect(screen.getByRole("heading", { name: "确认删除进行中任务" })).toBeInTheDocument();
  expect(screen.getByText("所选任务中包含进行中的评审，删除后无法恢复，确认继续删除？")).toBeInTheDocument();
});

it("calls export-report and shows skipped feedback", async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reviews: [] }),
    })
    .mockResolvedValueOnce({
      ok: true,
      headers: new Headers({
        "x-exported-count": "1",
        "x-skipped-count": "1",
      }),
      blob: async () => new Blob(["zip"]),
    });

  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:report"),
    revokeObjectURL: vi.fn(),
  });

  render(
    <ReviewJobsTable
      items={[
        {
          annotationsCount: 3,
          batchName: "四月批次",
          createdAt: "2026-04-13T10:00:00.000Z",
          fileType: "xlsx",
          filename: "玩法.xlsx",
          finishedAt: "2026-04-13T12:00:00.000Z",
          id: "1",
          modelName: "qwen-plus",
          overallScore: 80,
          status: "completed",
          title: "玩法复盘",
        },
        {
          annotationsCount: 0,
          batchName: "五月批次",
          createdAt: "2026-04-13T11:00:00.000Z",
          fileType: "docx",
          filename: "包装.docx",
          finishedAt: null,
          id: "2",
          modelName: "qwen-max",
          overallScore: null,
          status: "running",
          title: "活动包装",
        },
      ]}
    />,
  );

  await user.click(screen.getByRole("checkbox", { name: "选择 玩法复盘" }));
  await user.click(screen.getByRole("button", { name: "导出报告" }));

  expect(fetchMock).toHaveBeenCalledWith(
    "/api/reviews/export-report",
    expect.objectContaining({
      method: "POST",
    }),
  );
  expect(await screen.findByText("已导出 1 份报告，跳过 1 条未完成任务")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the component tests to verify they fail**

Run: `npm test -- --run tests/components/review-jobs-table.test.tsx`
Expected: FAIL because the selection checkboxes, bulk toolbar, and confirmation dialog do not exist yet

- [ ] **Step 3: Create the reusable confirmation dialog**

```tsx
// components/confirm-dialog.tsx
"use client";

type ConfirmDialogProps = {
  title: string;
  body: string;
  summary?: string | null;
  confirmLabel?: string;
  cancelLabel?: string;
  open: boolean;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
  title,
  body,
  summary,
  confirmLabel = "确认",
  cancelLabel = "取消",
  open,
  pending = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <div aria-modal="true" className="dialog-card stack" role="dialog">
        <div>
          <h3>{title}</h3>
          <p className="section-copy">{body}</p>
          {summary ? <p className="muted">{summary}</p> : null}
        </div>

        <div className="actions">
          <button className="button-ghost" disabled={pending} onClick={onCancel} type="button">
            {cancelLabel}
          </button>
          <button className="button" disabled={pending} onClick={() => void onConfirm()} type="button">
            {pending ? "处理中..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement the table bulk-action flow**

```tsx
// components/review-jobs-table.tsx
const [selectedIds, setSelectedIds] = useState<string[]>([]);
const [allMatchingSelected, setAllMatchingSelected] = useState(false);
const [feedback, setFeedback] = useState<string | null>(null);
const [isDeleting, setIsDeleting] = useState(false);
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

const scopedIds = filteredItems.map((item) => item.id);
const selectedIdSet = new Set(selectedIds);
const selectedCount = allMatchingSelected
  ? filteredItems.length
  : filteredItems.filter((item) => selectedIdSet.has(item.id)).length;
const hasBulkSelection = selectedCount > 0;
const selectedStatuses = allMatchingSelected
  ? filteredItems.map((item) => item.status)
  : filteredItems.filter((item) => selectedIdSet.has(item.id)).map((item) => item.status);
const hasActiveSelected = selectedStatuses.some(
  (status) => status === ReviewStatus.pending || status === ReviewStatus.running,
);

function toggleRowSelection(id: string) {
  setAllMatchingSelected(false);
  setSelectedIds((current) =>
    current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
  );
}

function selectAllMatching() {
  setAllMatchingSelected(true);
  setSelectedIds(filteredItems.map((item) => item.id));
}

function clearSelection() {
  setAllMatchingSelected(false);
  setSelectedIds([]);
}

async function runDownload(
  url: string,
  successMessage: (response: Response) => string,
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      selectedIds,
      query,
      allMatching: allMatchingSelected,
    }),
  });

  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    throw new Error(data.error ?? "批量操作失败，请稍后重试。");
  }

  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const disposition = response.headers.get("content-disposition");
  const filenameMatch = disposition?.match(/filename="(.+)"/);

  anchor.href = href;
  anchor.download = filenameMatch?.[1] ?? "download.bin";
  anchor.click();
  URL.revokeObjectURL(href);

  setFeedback(successMessage(response));
}
```

```tsx
// components/review-jobs-table.tsx
{hasBulkSelection ? (
  <div className="bulk-toolbar" role="status">
    <div className="inline-actions">
      <strong>{allMatchingSelected ? `已选筛选结果 ${selectedCount} 项` : `已选 ${selectedCount} 项`}</strong>
      {!allMatchingSelected && filteredItems.length > selectedCount ? (
        <button className="button-ghost button-inline" onClick={selectAllMatching} type="button">
          {`全选筛选结果 ${filteredItems.length} 项`}
        </button>
      ) : null}
      {allMatchingSelected ? (
        <button className="button-ghost button-inline" onClick={() => setAllMatchingSelected(false)} type="button">
          仅保留已勾选
        </button>
      ) : null}
      <button className="button-ghost button-inline" onClick={clearSelection} type="button">
        清除选择
      </button>
    </div>
    <div className="table-actions">
      <button className="button-ghost button-inline" onClick={() => void runDownload("/api/reviews/export-list", () => "已导出评审清单")} type="button">
        导出清单
      </button>
      <button
        className="button-ghost button-inline"
        onClick={() =>
          void runDownload("/api/reviews/export-report", (response) => {
            const exported = Number(response.headers.get("x-exported-count") ?? "0");
            const skipped = Number(response.headers.get("x-skipped-count") ?? "0");

            return skipped > 0
              ? `已导出 ${exported} 份报告，跳过 ${skipped} 条未完成任务`
              : `已导出 ${exported} 份报告`;
          })
        }
        type="button"
      >
        导出报告
      </button>
      <button className="button-ghost button-inline" onClick={() => setDeleteDialogOpen(true)} type="button">
        删除
      </button>
    </div>
  </div>
) : null}
```

```tsx
// components/review-jobs-table.tsx
<ConfirmDialog
  body={
    hasActiveSelected
      ? "所选任务中包含进行中的评审，删除后无法恢复，确认继续删除？"
      : `删除后无法恢复，确认删除这 ${selectedCount} 条评审任务？`
  }
  open={deleteDialogOpen}
  pending={isDeleting}
  summary={
    hasActiveSelected
      ? `包含 ${
          selectedStatuses.filter((status) => status === ReviewStatus.pending || status === ReviewStatus.running)
            .length
        } 条进行中任务`
      : null
  }
  title={hasActiveSelected ? "确认删除进行中任务" : "确认删除"}
  onCancel={() => setDeleteDialogOpen(false)}
  onConfirm={async () => {
    setIsDeleting(true);

    try {
      const response = await fetch("/api/reviews/delete", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          selectedIds,
          query,
          allMatching: allMatchingSelected,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "删除评审任务失败。");
      }

      const data = (await response.json()) as { deletedCount: number };

      setReviews((current) =>
        current.filter((item) =>
          allMatchingSelected
            ? !filteredItems.some((filtered) => filtered.id === item.id)
            : !selectedIdSet.has(item.id),
        ),
      );
      setFeedback(`已删除 ${data.deletedCount} 条评审任务`);
      clearSelection();
      setDeleteDialogOpen(false);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "删除评审任务失败。");
    } finally {
      setIsDeleting(false);
    }
  }}
/>
```

- [ ] **Step 5: Add the minimal styles**

```css
/* app/globals.css */
.bulk-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border: 1px solid rgba(163, 127, 73, 0.28);
  border-radius: 16px;
  background: rgba(250, 243, 227, 0.92);
}

.dialog-backdrop {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(22, 33, 47, 0.28);
}

.dialog-card {
  width: min(520px, calc(100vw - 32px));
  padding: 24px;
  border-radius: 20px;
  background: #fffdf8;
  border: 1px solid rgba(22, 33, 47, 0.12);
}
```

- [ ] **Step 6: Run the component tests to verify they pass**

Run: `npm test -- --run tests/components/review-jobs-table.test.tsx`
Expected: PASS

- [ ] **Step 7: Run the focused regression suite**

Run: `npm test -- --run tests/lib/review-jobs-selection.test.ts tests/lib/review-jobs.test.ts tests/lib/review-jobs-export.test.ts tests/api/reviews-delete-route.test.ts tests/api/reviews-export-list-route.test.ts tests/api/reviews-export-report-route.test.ts tests/components/review-jobs-table.test.tsx`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add components/confirm-dialog.tsx components/review-jobs-table.tsx app/globals.css tests/components/review-jobs-table.test.tsx
git commit -m "feat: add review list bulk actions ui"
```

## Self-Review Checklist

- Spec coverage:
  - Selection state and “current filtered result” support: Task 1 and Task 5
  - Delete confirmation variants: Task 2 and Task 5
  - Export-list workbook: Task 3
  - Export-report skip rules: Task 4
  - Component feedback and regression tests: Task 5
- Placeholder scan:
  - No `TBD`, `TODO`, or “similar to previous task” shortcuts remain.
- Type consistency:
  - `selectedIds`, `query`, and `allMatching` are the only bulk-scope inputs across UI and routes.
  - `reportMarkdown` is the single report-export eligibility check across helpers and routes.
