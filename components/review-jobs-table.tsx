"use client";

import Link from "next/link";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { ReviewStatus } from "@prisma/client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { StatusBadge } from "@/components/status-badge";
import { TableSearchInput } from "@/components/table-search-input";
import { formatDate, reviewStatusLabel } from "@/lib/utils";

export type ReviewJobRow = {
  id: string;
  status: ReviewStatus;
  title: string;
  filename: string;
  fileType: string;
  batchName: string | null;
  modelName: string;
  annotationsCount: number;
  overallScore: number | null;
  createdAt: string;
  finishedAt: string | null;
};

function matchesQuery(item: ReviewJobRow, query: string) {
  if (!query) {
    return true;
  }

  return [
    item.title,
    item.filename,
    item.batchName ?? "",
    item.modelName,
    item.status,
    reviewStatusLabel(item.status),
  ]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function canOpenReview(status: ReviewStatus) {
  return status !== ReviewStatus.pending && status !== ReviewStatus.running;
}

function canRetryReview(status: ReviewStatus) {
  return status === ReviewStatus.failed || status === ReviewStatus.partial;
}

type SelectionMode = "manual" | "all-filtered";

type SelectionState = {
  mode: SelectionMode;
  selectedIds: Set<string>;
};

function getSelectionIds(selection: SelectionState, filteredItems: ReviewJobRow[]) {
  if (selection.mode === "all-filtered") {
    return new Set(filteredItems.map((item) => item.id));
  }

  return selection.selectedIds;
}

async function readResponseMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string };

    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

function parseFilenameFromContentDisposition(contentDisposition: string | null) {
  if (!contentDisposition) {
    return null;
  }

  const matches = /filename="([^"]+)"/i.exec(contentDisposition);

  return matches?.[1] ?? null;
}

async function triggerDownload(response: Response, fallbackFilename: string) {
  if (typeof window === "undefined") {
    return;
  }

  const blob = await response.blob();
  if (typeof URL.createObjectURL !== "function") {
    return;
  }

  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename =
    parseFilenameFromContentDisposition(response.headers.get("content-disposition")) ??
    fallbackFilename;

  link.href = downloadUrl;
  link.download = filename;
  link.rel = "noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(downloadUrl);
  }
}

export function ReviewJobsTable({ items }: { items: ReviewJobRow[] }) {
  const [reviews, setReviews] = useState(items);
  const [query, setQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [selection, setSelection] = useState<SelectionState>({
    mode: "manual",
    selectedIds: new Set(),
  });
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [deleteScope, setDeleteScope] = useState<
    | {
        mode: "selection";
      }
    | {
        mode: "row";
        reviewId: string;
      }
    | null
  >(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);
  const keyword = deferredQuery.trim().toLowerCase();
  const filteredItems = reviews.filter((item) => matchesQuery(item, keyword));
  const hasActiveReviews = reviews.some((item) => !canOpenReview(item.status));
  const selectedIds = getSelectionIds(selection, filteredItems);
  const selectedReviews = reviews.filter((item) => selectedIds.has(item.id));
  const selectedCount = selectedReviews.length;
  const selectedVisibleCount = filteredItems.filter((item) => selectedIds.has(item.id)).length;
  const hasSelection = selectedCount > 0;
  const allFilteredSelected =
    filteredItems.length > 0 && selectedVisibleCount === filteredItems.length;
  const allFilteredMode = selection.mode === "all-filtered";
  const deleteTargetReviews =
    deleteScope?.mode === "row"
      ? reviews.filter((item) => item.id === deleteScope.reviewId)
      : selectedReviews;
  const deleteTargetCount = deleteTargetReviews.length;
  const deleteTargetHasRunningOrPending = deleteTargetReviews.some(
    (item) => item.status === ReviewStatus.pending || item.status === ReviewStatus.running,
  );

  useEffect(() => {
    if (!selectAllCheckboxRef.current) {
      return;
    }

    selectAllCheckboxRef.current.indeterminate =
      selectedVisibleCount > 0 && selectedVisibleCount < filteredItems.length;
  }, [filteredItems.length, selectedVisibleCount]);

  useEffect(() => {
    setReviews(items);
  }, [items]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.fetch !== "function") {
      return;
    }

    let cancelled = false;

    async function syncReviews() {
      setIsRefreshing(true);

      try {
        const response = await fetch("/api/reviews", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("获取评审列表失败");
        }

        const data = (await response.json()) as { reviews: ReviewJobRow[] };

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setReviews(data.reviews);
          setRefreshError(null);
        });
      } catch (error) {
        if (!cancelled) {
          setRefreshError(error instanceof Error ? error.message : "刷新失败，请稍后重试。");
        }
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
        }
      }
    }

    void syncReviews();

    if (!hasActiveReviews) {
      return () => {
        cancelled = true;
      };
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void syncReviews();
      }
    }, 4000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncReviews();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasActiveReviews]);

  async function refreshReviews() {
    if (typeof window === "undefined" || typeof window.fetch !== "function") {
      return false;
    }

    setIsRefreshing(true);

    try {
      const response = await fetch("/api/reviews", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("获取评审列表失败");
      }

      const data = (await response.json()) as { reviews: ReviewJobRow[] };

      startTransition(() => {
        setReviews(data.reviews);
        setRefreshError(null);
      });
      return true;
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : "刷新失败，请稍后重试。");
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleManualRefresh() {
    await refreshReviews();
  }

  function clearSelection() {
    setSelection({
      mode: "manual",
      selectedIds: new Set(),
    });
    setBulkFeedback(null);
  }

  function toggleAllFilteredSelection() {
    setSelection((current) => {
      if (filteredItems.length === 0) {
        return current;
      }

      if (allFilteredSelected) {
        return {
          mode: "manual",
          selectedIds: new Set(),
        };
      }

      return {
        mode: "all-filtered",
        selectedIds: new Set(),
      };
    });
    setBulkFeedback(null);
  }

  function toggleRowSelection(item: ReviewJobRow, checked: boolean) {
    setSelection((current) => {
      if (current.mode === "all-filtered") {
        if (checked) {
          return current;
        }

        const nextSelectedIds = new Set(filteredItems.map((entry) => entry.id));
        nextSelectedIds.delete(item.id);

        return {
          mode: "manual",
          selectedIds: nextSelectedIds,
        };
      }

      const nextSelectedIds = new Set(current.selectedIds);

      if (checked) {
        nextSelectedIds.add(item.id);
      } else {
        nextSelectedIds.delete(item.id);
      }

      return {
        mode: "manual",
        selectedIds: nextSelectedIds,
      };
    });
    setBulkFeedback(null);
  }

  async function runBulkExport(route: "/api/reviews/export-list" | "/api/reviews/export-report") {
    if (typeof window === "undefined" || typeof window.fetch !== "function" || !hasSelection) {
      return;
    }

    setIsBulkWorking(true);

    try {
      const response = await fetch(route, {
        body: JSON.stringify(
          allFilteredMode
            ? {
                allMatching: true,
                query: deferredQuery.trim(),
              }
            : {
                allMatching: false,
                selectedIds: selectedReviews.map((item) => item.id),
              },
        ),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const message = await readResponseMessage(
          response,
          route === "/api/reviews/export-report" ? "导出评审报告失败。" : "导出评审清单失败。",
        );
        setBulkFeedback(`导出失败：${message}`);
        return;
      }

      await triggerDownload(
        response,
        route === "/api/reviews/export-report" ? "review-reports.zip" : "review-list.xlsx",
      );

      if (route === "/api/reviews/export-report") {
        const exportedCount = Number.parseInt(response.headers.get("x-exported-count") ?? "", 10);
        const skippedCount = Number.parseInt(response.headers.get("x-skipped-count") ?? "", 10);

        setBulkFeedback(
          Number.isFinite(exportedCount) && Number.isFinite(skippedCount) && skippedCount > 0
            ? `已导出 ${exportedCount} 份报告，已跳过 ${skippedCount} 个未生成报告的任务。`
            : Number.isFinite(exportedCount)
              ? `已导出 ${exportedCount} 份报告。`
              : "已导出评审报告。",
        );
      } else {
        setBulkFeedback("已导出评审清单，列表已同步最新结果。");
      }

      await refreshReviews();
    } catch (error) {
      setBulkFeedback(error instanceof Error ? `导出失败：${error.message}` : "导出失败，请稍后重试。");
    } finally {
      setIsBulkWorking(false);
    }
  }

  async function handleDeleteSelected() {
    if (typeof window === "undefined" || typeof window.fetch !== "function" || !deleteScope) {
      return;
    }

    setDeleteScope(null);
    setIsBulkWorking(true);

    try {
      const payload =
        deleteScope.mode === "row"
          ? {
              allMatching: false,
              selectedIds: [deleteScope.reviewId],
            }
          : allFilteredMode
            ? {
                allMatching: true,
                query: deferredQuery.trim(),
              }
            : {
                allMatching: false,
                selectedIds: selectedReviews.map((item) => item.id),
              };
      const response = await fetch("/api/reviews/delete", {
        body: JSON.stringify(payload),
        headers: {
          "content-type": "application/json",
        },
        method: "DELETE",
      });

      if (!response.ok) {
        const message = await readResponseMessage(response, "删除评审任务失败。");
        setBulkFeedback(`删除失败：${message}`);
        return;
      }

      const responsePayload = (await response.json()) as { deletedCount?: number };
      const deletedCount = typeof responsePayload.deletedCount === "number"
        ? responsePayload.deletedCount
        : 0;

      if (deleteScope.mode === "selection") {
        clearSelection();
      }
      setBulkFeedback(
        deletedCount > 0 ? `已删除 ${deletedCount} 条评审任务。` : "已删除评审任务，列表已同步最新结果。",
      );
      await refreshReviews();
    } catch (error) {
      setBulkFeedback(error instanceof Error ? `删除失败：${error.message}` : "删除失败，请稍后重试。");
    } finally {
      setIsBulkWorking(false);
    }
  }

  async function retrySingleReview(reviewId: string) {
    if (typeof window === "undefined" || typeof window.fetch !== "function") {
      return;
    }

    setIsBulkWorking(true);
    setBulkFeedback(null);

    try {
      const response = await fetch("/api/reviews/retry", {
        body: JSON.stringify({
          reviewJobId: reviewId,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const message = await readResponseMessage(response, "重新发起评审失败。");
        setBulkFeedback(`重试失败：${message}`);
        return;
      }

      setBulkFeedback("已重新发起 1 条评审任务。");
      await refreshReviews();
    } catch (error) {
      setBulkFeedback(error instanceof Error ? `重试失败：${error.message}` : "重试失败，请稍后重试。");
    } finally {
      setIsBulkWorking(false);
    }
  }

  const deleteDialogDescription = deleteTargetHasRunningOrPending
    ? "你选中了仍在运行或排队中的任务，删除后这些任务会从列表中移除，后台处理不一定会立即停止。"
    : `确认删除这 ${deleteTargetCount} 条评审任务吗？删除后无法恢复。`;

  return (
    <section className="desktop-table-card stack">
      <div className="desktop-table-header">
        <div className="desktop-table-heading">
          <p className="section-eyebrow">任务队列</p>
          <h2 className="subsection-title">评审列表</h2>
        </div>
        <p className="desktop-table-summary">共 {reviews.length} 条任务 · 当前显示 {filteredItems.length} 条</p>
      </div>

      <div className="desktop-table-toolbar">
        <TableSearchInput label="搜索评审任务" onChange={setQuery} value={query} />
        <div className="desktop-table-toolbar-actions">
          <p className="muted">支持按标题、文件名、批次名、模型名和状态快速筛选。</p>
          <button
            className="button-ghost button-inline"
            disabled={isRefreshing}
            onClick={() => void handleManualRefresh()}
            type="button"
          >
            {isRefreshing ? "刷新中..." : "立即刷新"}
          </button>
        </div>
      </div>

      {hasSelection ? (
        <div className="review-bulk-toolbar">
          <div className="review-bulk-toolbar-copy">
            <p className="section-copy">已选中 {selectedCount} 条</p>
            {allFilteredMode ? <span className="pill pill-accent">全部筛选结果</span> : null}
          </div>
          <div className="review-bulk-toolbar-actions">
            <button className="button-ghost button-inline" onClick={toggleAllFilteredSelection} type="button">
              {allFilteredSelected ? "取消全选筛选结果" : "全选筛选结果"}
            </button>
            <button className="button-ghost button-inline" onClick={clearSelection} type="button">
              清除选择
            </button>
            <button
              className="button-ghost button-inline"
              disabled={isBulkWorking}
              onClick={() => void runBulkExport("/api/reviews/export-list")}
              type="button"
            >
              导出清单
            </button>
            <button
              className="button-ghost button-inline"
              disabled={isBulkWorking}
              onClick={() => void runBulkExport("/api/reviews/export-report")}
              type="button"
            >
              导出报告
            </button>
            <button
              className="button-secondary button-inline"
              disabled={isBulkWorking}
              onClick={() => setDeleteScope({ mode: "selection" })}
              type="button"
            >
              删除
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        confirmBusyLabel="删除中..."
        confirmDisabled={isBulkWorking}
        confirmLabel="仍要删除"
        destructive
        description={deleteDialogDescription}
        open={deleteScope !== null}
        onClose={() => setDeleteScope(null)}
        onConfirm={() => void handleDeleteSelected()}
        title="删除评审任务"
      />

      {refreshError ? <p className="section-copy">刷新失败：{refreshError}</p> : null}
      {bulkFeedback ? <p className="section-copy">{bulkFeedback}</p> : null}

      {reviews.length === 0 ? (
        <div className="queue-empty">
          <div>
            <h3>还没有评审任务</h3>
            <p className="muted">从新建评审页发起第一份文档后，这里会成为你的任务中心。</p>
          </div>
          <Link className="button" href="/reviews/new">
            去新建评审
          </Link>
        </div>
      ) : (
        <div className="table-shell">
          <table aria-label="评审任务表格" className="data-table">
            <thead>
              <tr>
                <th scope="col" className="table-selection-head">
                  <input
                    aria-label="选择当前筛选结果"
                    checked={allFilteredSelected}
                    disabled={filteredItems.length === 0}
                    onChange={toggleAllFilteredSelection}
                    ref={selectAllCheckboxRef}
                    type="checkbox"
                  />
                </th>
                <th scope="col">状态</th>
                <th scope="col">标题</th>
                <th scope="col">文件</th>
                <th scope="col">批次</th>
                <th scope="col">模型</th>
                <th scope="col">问题数</th>
                <th scope="col">评分</th>
                <th scope="col">创建时间</th>
                <th scope="col">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td className="muted" colSpan={10}>
                    没有匹配的评审任务，试试换一个关键词。
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td className="table-selection-cell">
                      <input
                        aria-label={`选择评审任务 ${item.title}`}
                        checked={selectedIds.has(item.id)}
                        onChange={(event) => toggleRowSelection(item, event.target.checked)}
                        type="checkbox"
                      />
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>
                      <div className="stack table-cell-stack">
                        <strong>{item.title}</strong>
                        <span className="muted">
                          {item.finishedAt
                            ? `完成于 ${formatDate(item.finishedAt)}`
                            : "结果生成后会显示完成时间"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="stack table-cell-stack">
                        <span>{item.filename}</span>
                        <span className="muted">{item.fileType}</span>
                      </div>
                    </td>
                    <td>{item.batchName ?? "单任务"}</td>
                    <td>{item.modelName}</td>
                    <td>{item.annotationsCount}</td>
                    <td>{item.overallScore ?? "--"}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>
                      <div className="table-actions">
                        {canRetryReview(item.status) ? (
                          <button
                            aria-label={`重试评审任务 ${item.title}`}
                            className="button-ghost button-inline"
                            disabled={isBulkWorking}
                            onClick={() => void retrySingleReview(item.id)}
                            type="button"
                          >
                            重试
                          </button>
                        ) : null}
                        {canOpenReview(item.status) ? (
                          <Link className="button-ghost button-inline" href={`/reviews/${item.id}`}>
                            查看详情
                          </Link>
                        ) : (
                          <span className="pill pill-brand">处理中</span>
                        )}
                        <button
                          aria-label={`删除评审任务 ${item.title}`}
                          className="button-ghost button-inline"
                          disabled={isBulkWorking}
                          onClick={() => setDeleteScope({ mode: "row", reviewId: item.id })}
                          type="button"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
