"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { ReviewStatus } from "@prisma/client";

import { StatusBadge } from "@/components/status-badge";
import type { ReviewListItem } from "@/lib/review-jobs";
import { formatDate } from "@/lib/utils";

const ACTIVE_STATUSES = new Set<ReviewStatus>([ReviewStatus.pending, ReviewStatus.running]);

function isActiveStatus(status: ReviewStatus) {
  return ACTIVE_STATUSES.has(status);
}

function getReviewHint(review: ReviewListItem) {
  if (review.status === ReviewStatus.pending) {
    return "任务已创建，后台即将开始评审。";
  }

  if (review.status === ReviewStatus.running) {
    return "后台正在生成报告正文与问题标注。";
  }

  if (review.status === ReviewStatus.failed) {
    return review.errorMessage ?? "评审失败，请打开详情查看失败原因。";
  }

  return review.summary ?? "评审已完成，可进入详情查看报告正文和命中位置。";
}

async function requestReviews() {
  const response = await fetch("/api/reviews", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("获取评审列表失败");
  }

  return (await response.json()) as {
    reviews: ReviewListItem[];
  };
}

export function ReviewQueue({ initialReviews }: { initialReviews: ReviewListItem[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const hasActiveReviews = reviews.some((review) => isActiveStatus(review.status));

  useEffect(() => {
    let cancelled = false;

    async function hydrateReviews() {
      setIsRefreshing(true);

      try {
        const data = await requestReviews();

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

    void hydrateReviews();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasActiveReviews) {
      return;
    }

    let cancelled = false;

    async function syncReviews() {
      setIsRefreshing(true);

      try {
        const data = await requestReviews();

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

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void syncReviews();
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
    setIsRefreshing(true);

    try {
      const data = await requestReviews();

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
    <div className="stack">
      <div className="queue-toolbar">
        <div className="queue-toolbar-copy">
          <strong>{hasActiveReviews ? "后台正在持续更新状态" : "当前没有进行中的任务"}</strong>
          <p className="muted">
            {hasActiveReviews
              ? "列表会在页面可见时自动刷新，但不会打断你当前的浏览位置。"
              : "你仍然可以手动刷新一次，或继续创建新的评审任务。"}
          </p>
        </div>

        <button
          className="button-ghost button-inline"
          disabled={isRefreshing}
          onClick={() => void handleManualRefresh()}
          type="button"
        >
          {isRefreshing ? "刷新中..." : "立即刷新"}
        </button>
      </div>

      {refreshError ? <p className="section-copy">刷新失败：{refreshError}</p> : null}

      <div className="queue-list">
        {reviews.map((review) => {
          const canOpen = !isActiveStatus(review.status);

          return (
            <article className="queue-item" key={review.id}>
              <div className="queue-item-main">
                <div className="queue-item-copy">
                  <div className="inline-actions">
                    <StatusBadge status={review.status} />
                    <span className="pill">{review.provider}</span>
                    <span className="pill">{review.modelName}</span>
                  </div>

                  <div className="stack">
                    <div>
                      <h3 className="queue-item-title">{review.title}</h3>
                      <p className="muted">
                        {review.filename} · 创建于 {formatDate(review.createdAt)}
                        {review.finishedAt ? ` · 完成于 ${formatDate(review.finishedAt)}` : ""}
                      </p>
                    </div>

                    <p className="queue-item-summary">{getReviewHint(review)}</p>
                  </div>
                </div>

                <div className="queue-item-side">
                  {canOpen ? (
                    <div className="queue-metrics">
                      <div className="queue-metric">
                        <span>问题数</span>
                        <strong>{review.annotationsCount}</strong>
                      </div>
                      <div className="queue-metric">
                        <span>评分</span>
                        <strong>{review.overallScore ?? "--"}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="queue-progress">
                      <span className="queue-progress-label">后台处理中</span>
                      <p className="muted">评审完成后，这里会显示问题数和评分。</p>
                    </div>
                  )}

                  {canOpen ? (
                    <Link className="button-ghost button-inline" href={`/reviews/${review.id}`}>
                      查看详情
                    </Link>
                  ) : (
                    <span className="pill pill-brand">自动刷新中</span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
