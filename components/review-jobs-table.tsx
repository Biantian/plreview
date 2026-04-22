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

import type { DesktopBinaryPayload } from "@/desktop/bridge/desktop-api";
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

async function triggerDownload(payload: DesktopBinaryPayload, fallbackFilename: string) {
  if (typeof window === "undefined") {
    return;
  }

  const bytes = new Uint8Array(payload.bytes.byteLength);
  bytes.set(payload.bytes);
  const blob = new Blob([bytes.buffer]);
  if (typeof URL.createObjectURL !== "function") {
    return;
  }

  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = payload.filename || fallbackFilename;

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

function RefreshIcon({ spinning = false }: { spinning?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={spinning ? "refresh-icon is-spinning" : "refresh-icon"}
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="M13.5 3.5V6.5H10.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M13 6.1A5.5 5.5 0 1 0 13.2 10.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
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
    if (typeof window === "undefined" || !window.plreview?.listReviewJobs) {
      return;
    }

    let cancelled = false;

    async function syncReviews() {
      setIsRefreshing(true);

      try {
        const data = await window.plreview.listReviewJobs();

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setReviews(data);
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
    if (typeof window === "undefined" || !window.plreview?.listReviewJobs) {
      return false;
    }

    setIsRefreshing(true);

    try {
      const data = await window.plreview.listReviewJobs();

      startTransition(() => {
        setReviews(data);
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

  async function runBulkExport(route: "export-list" | "export-report") {
    if (
      typeof window === "undefined" ||
      !window.plreview?.exportReviewList ||
      !window.plreview?.exportReviewReport ||
      !hasSelection
    ) {
      return;
    }

    setIsBulkWorking(true);

    try {
      const payload =
        allFilteredMode
          ? {
              allMatching: true,
              query: deferredQuery.trim(),
            }
          : {
              allMatching: false,
              selectedIds: selectedReviews.map((item) => item.id),
            };
      const result =
        route === "export-report"
          ? await window.plreview.exportReviewReport(payload)
          : await window.plreview.exportReviewList(payload);

      await triggerDownload(
        result,
        route === "export-report" ? "review-reports.zip" : "review-list.xlsx",
      );

      if (route === "export-report") {
        const exportedCount = result.exportedCount;
        const skippedCount = result.skippedCount;

        setBulkFeedback(
          typeof exportedCount === "number" &&
            typeof skippedCount === "number" &&
            skippedCount > 0
            ? `已导出 ${exportedCount} 份报告，已跳过 ${skippedCount} 个未生成报告的任务。`
            : typeof exportedCount === "number"
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
    if (typeof window === "undefined" || !window.plreview?.deleteReviewJobs || !deleteScope) {
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
      const responsePayload = await window.plreview.deleteReviewJobs(payload);
      const deletedCount =
        typeof responsePayload.deletedCount === "number" ? responsePayload.deletedCount : 0;

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
    if (typeof window === "undefined" || !window.plreview?.retryReviewJob) {
      return;
    }

    setIsBulkWorking(true);
    setBulkFeedback(null);

    try {
      await window.plreview.retryReviewJob(reviewId);

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
          <h2 className="subsection-title">任务列表</h2>
        </div>
        <p className="desktop-table-summary">共 {reviews.length} 条任务 · 当前显示 {filteredItems.length} 条</p>
      </div>

      <div className="desktop-table-toolbar">
        <TableSearchInput label="搜索评审任务" onChange={setQuery} value={query} />
        <div className="desktop-table-toolbar-actions">
          <p className="muted">支持按标题、文件名、批次名、模型名和状态快速筛选。</p>
          <button
            aria-label="刷新任务列表"
            className="icon-button"
            disabled={isRefreshing}
            onClick={() => void handleManualRefresh()}
            type="button"
            title={isRefreshing ? "正在刷新任务列表" : "刷新任务列表"}
          >
            <RefreshIcon spinning={isRefreshing} />
          </button>
        </div>
      </div>

      <div
        aria-label="批量操作"
        className="review-bulk-toolbar-shell"
        data-active={hasSelection ? "true" : "false"}
        role="toolbar"
      >
        <div className="review-bulk-toolbar">
          <div className="review-bulk-toolbar-copy">
            <p className="section-copy">
              {hasSelection ? `已选中 ${selectedCount} 条` : "选择任务后可批量导出或删除。"}
            </p>
            {allFilteredMode ? <span className="pill pill-accent">全部筛选结果</span> : null}
          </div>
          <div className="review-bulk-toolbar-actions">
            {hasSelection ? (
              <>
                <button className="table-text-button" onClick={toggleAllFilteredSelection} type="button">
              {allFilteredSelected ? "取消全选筛选结果" : "全选筛选结果"}
                </button>
                <button className="table-text-button" onClick={clearSelection} type="button">
              清除选择
                </button>
                <button
                  className="table-text-button"
                  disabled={isBulkWorking}
                  onClick={() => void runBulkExport("export-list")}
                  type="button"
                >
              导出清单
                </button>
                <button
                  className="table-text-button"
                  disabled={isBulkWorking}
                  onClick={() => void runBulkExport("export-report")}
                  type="button"
                >
              导出报告
                </button>
                <button
                  className="table-text-button is-danger"
                  disabled={isBulkWorking}
                  onClick={() => setDeleteScope({ mode: "selection" })}
                  type="button"
                >
              删除
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

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
            <p className="muted">创建第一份评审后，这里会显示任务。</p>
          </div>
          <Link className="button" href="/reviews/new">
            去新建批次
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
                <th scope="col" className="table-nowrap">批次</th>
                <th scope="col" className="table-nowrap">模型</th>
                <th scope="col" className="table-nowrap">问题数</th>
                <th scope="col" className="table-nowrap">评分</th>
                <th scope="col" className="table-nowrap">创建时间</th>
                <th scope="col" className="table-nowrap">操作</th>
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
                        <span className="table-cell-primary">{item.title}</span>
                        <span className="table-cell-secondary">
                          {item.finishedAt
                            ? `完成于 ${formatDate(item.finishedAt)}`
                            : "结果生成后会显示完成时间"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="stack table-cell-stack">
                        <span className="table-cell-primary">{item.filename}</span>
                        <span className="table-cell-secondary">{item.fileType}</span>
                      </div>
                    </td>
                    <td className="table-nowrap">{item.batchName ?? "单任务"}</td>
                    <td className="table-nowrap">{item.modelName}</td>
                    <td className="table-nowrap">{item.annotationsCount}</td>
                    <td className="table-nowrap">{item.overallScore ?? "--"}</td>
                    <td className="table-nowrap">{formatDate(item.createdAt)}</td>
                    <td className="table-nowrap">
                      <div className="table-actions">
                        {canRetryReview(item.status) ? (
                          <button
                            aria-label={`重试评审任务 ${item.title}`}
                            className="table-text-button"
                            disabled={isBulkWorking}
                            onClick={() => void retrySingleReview(item.id)}
                            type="button"
                          >
                            重试
                          </button>
                        ) : null}
                        {canOpenReview(item.status) ? (
                          <Link
                            className="table-text-link"
                            href={`/reviews/detail?id=${encodeURIComponent(item.id)}`}
                          >
                            查看详情
                          </Link>
                        ) : (
                          <span className="pill pill-brand">处理中</span>
                        )}
                        <button
                          aria-label={`删除评审任务 ${item.title}`}
                          className="table-text-button is-danger"
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
