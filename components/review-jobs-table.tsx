"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { ReviewStatus } from "@prisma/client";

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

export function ReviewJobsTable({ items }: { items: ReviewJobRow[] }) {
  const [reviews, setReviews] = useState(items);
  const [query, setQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const keyword = deferredQuery.trim().toLowerCase();
  const filteredItems = reviews.filter((item) => matchesQuery(item, keyword));
  const hasActiveReviews = reviews.some((item) => !canOpenReview(item.status));

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

  async function handleManualRefresh() {
    if (typeof window === "undefined" || typeof window.fetch !== "function") {
      return;
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
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : "刷新失败，请稍后重试。");
    } finally {
      setIsRefreshing(false);
    }
  }

  if (reviews.length === 0) {
    return (
      <div className="queue-empty">
        <div>
          <h3>还没有评审任务</h3>
          <p className="muted">从新建评审页发起第一份文档后，这里会成为你的任务中心。</p>
        </div>
        <Link className="button" href="/reviews/new">
          去新建评审
        </Link>
      </div>
    );
  }

  return (
    <section className="card stack">
      <div className="table-toolbar">
        <TableSearchInput label="搜索评审任务" onChange={setQuery} value={query} />
        <div className="actions">
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

      {refreshError ? <p className="section-copy">刷新失败：{refreshError}</p> : null}

      <div className="table-shell">
        <table aria-label="评审任务表格" className="data-table">
          <thead>
            <tr>
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
                <td className="muted" colSpan={9}>
                  没有匹配的评审任务，试试换一个关键词。
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id}>
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
                      {canOpenReview(item.status) ? (
                        <Link className="button-ghost button-inline" href={`/reviews/${item.id}`}>
                          查看详情
                        </Link>
                      ) : (
                        <span className="pill pill-brand">处理中</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
