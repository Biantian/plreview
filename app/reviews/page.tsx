"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";

import type { DesktopReviewJobRow } from "@/desktop/bridge/desktop-api";
import { PageIntro } from "@/components/page-intro";
import { ReviewJobsTable } from "@/components/review-jobs-table";

export default function ReviewsPage() {
  const [items, setItems] = useState<DesktopReviewJobRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReviews() {
      if (!window.plreview?.listReviewJobs) {
        setErrorMessage("桌面桥接不可用，请从 Electron 桌面壳启动。");
        setIsLoading(false);
        return;
      }

      try {
        const reviews = await window.plreview.listReviewJobs();

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setItems(reviews);
          setErrorMessage(null);
        });
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "评审任务加载失败。");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadReviews();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isLoading && errorMessage) {
    return (
      <div className="desktop-management-page stack-lg">
        <section className="panel stack-lg">
          <PageIntro
            actions={
              <>
                <Link className="button" href="/reviews/new">
                  新建批次
                </Link>
                <Link className="button-ghost" href="/docs">
                  帮助文档
                </Link>
                <Link className="button-ghost" href="/">
                  返回工作台
                </Link>
              </>
            }
            description="集中查看后台评审状态，按标题、文件、批次和模型筛选队列，并继续处理失败项、导出结果或打开报告。"
            eyebrow="Review Operations"
            title="评审任务"
          />
          <p className="section-copy">加载失败：{errorMessage}</p>
          <p className="section-copy">请确认桌面桥接可用后重试。</p>
        </section>
      </div>
    );
  }

  const totalCount = items.length;
  const runningCount = items.filter((review) => ["pending", "running"].includes(review.status)).length;
  const completedCount = items.filter((review) => ["completed", "partial"].includes(review.status)).length;
  const failedCount = items.filter((review) => review.status === "failed").length;

  return (
    <div className="desktop-management-page stack-lg">
      <section className="panel stack-lg">
        <PageIntro
          actions={
            <>
              <Link className="button" href="/reviews/new">
                新建批次
              </Link>
              <Link className="button-ghost" href="/docs">
                帮助文档
              </Link>
              <Link className="button-ghost" href="/">
                返回工作台
              </Link>
            </>
          }
          description="集中查看后台评审状态，按标题、文件、批次和模型筛选队列，并继续处理失败项、导出结果或打开报告。"
          eyebrow="Review Operations"
          title="评审任务"
        />

        <div className="desktop-kpi-grid">
          <div className="metric-card">
            <p className="metric-label">总任务数</p>
            <strong className="metric-value">{totalCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">进行中</p>
            <strong className="metric-value">{runningCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">已完成</p>
            <strong className="metric-value">{completedCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">失败</p>
            <strong className="metric-value">{failedCount}</strong>
          </div>
        </div>
      </section>

      {isLoading ? (
        <section className="desktop-surface stack">
          <p className="section-copy">正在从桌面工作线程同步评审任务列表。</p>
        </section>
      ) : (
        <ReviewJobsTable items={items} />
      )}
    </div>
  );
}
