"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, startTransition, useEffect, useState } from "react";

import type { ReviewDetailData } from "@/desktop/bridge/desktop-api";
import { PageIntro } from "@/components/page-intro";
import { ReportMarkdown } from "@/components/report-markdown";
import { ReviewDetailViewer } from "@/components/review-detail-viewer";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";

function ReviewDetailPageContent() {
  const searchParams = useSearchParams();
  const reviewId = searchParams.get("id")?.trim() ?? "";
  const [detail, setDetail] = useState<ReviewDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      if (!reviewId) {
        setErrorMessage("缺少评审任务 ID。");
        setIsLoading(false);
        return;
      }

      if (!window.plreview?.getReviewDetail) {
        setErrorMessage("桌面桥接不可用，请从 Electron 桌面壳启动。");
        setIsLoading(false);
        return;
      }

      try {
        const nextDetail = await window.plreview.getReviewDetail(reviewId);

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setDetail(nextDetail);
          setErrorMessage(null);
        });
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "评审详情加载失败。");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [reviewId]);

  if (isLoading) {
    return (
      <div className="desktop-management-page stack-lg">
        <section className="desktop-surface stack">
          <p className="section-copy">正在读取评审详情。</p>
        </section>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="desktop-management-page stack-lg">
        <section className="desktop-surface stack">
          <p className="section-copy">{errorMessage ?? "未找到对应的评审任务。"}</p>
          <Link className="button" href="/reviews">
            返回评审任务
          </Link>
        </section>
      </div>
    );
  }

  const isProcessing = detail.status === "pending" || detail.status === "running";
  const isFailed = detail.status === "failed";

  return (
    <div className="desktop-management-page stack-lg">
      <section className="panel stack-lg">
        <div className="inline-actions">
          <span className="pill pill-brand">{detail.providerSnapshot}</span>
          <span className="pill">{detail.modelNameSnapshot}</span>
          <span className="pill">{formatDate(detail.createdAt)}</span>
        </div>

        <PageIntro
          actions={<StatusBadge status={detail.status} />}
          description={`文件：${detail.filename} · 文档块：${detail.blocks.length}`}
          eyebrow="Review Snapshot"
          title={detail.title}
        />

        {detail.summary ? <p className="hero-lead">{detail.summary}</p> : null}
        {detail.errorMessage ? <p className="section-copy">错误信息：{detail.errorMessage}</p> : null}

        <div className="desktop-kpi-grid">
          <div className="metric-card">
            <p className="metric-label">问题总数</p>
            <strong className="metric-value">{detail.annotationsCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">命中块数</p>
            <strong className="metric-value">{detail.hitBlockCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">高优先问题</p>
            <strong className="metric-value">{detail.highPriorityCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">总体评分</p>
            <strong className="metric-value">{detail.overallScore ?? "--"}</strong>
          </div>
        </div>
      </section>

      <ReviewDetailViewer
        annotations={detail.annotations}
        blocks={detail.blocks}
        status={detail.status}
      />

      <section className="desktop-surface stack">
        <div>
          <p className="section-eyebrow">Report Body</p>
          <h2 className="subsection-title">报告正文</h2>
          <p className="section-copy">正文已按 Markdown 文档阅读方式渲染，便于直接浏览结论、规则明细和结构化内容。</p>
        </div>

        {detail.reportMarkdown ? (
          <ReportMarkdown markdown={detail.reportMarkdown} />
        ) : (
          <div className="report-empty">
            <p className="section-copy">
              {isProcessing
                ? "后台正在生成报告正文，完成后刷新页面即可查看完整 Markdown 报告。"
                : isFailed
                  ? "该任务未生成可展示的报告正文。"
                  : "该任务尚未生成报告正文。"}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default function ReviewDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="desktop-management-page stack-lg">
          <section className="desktop-surface stack">
            <p className="section-copy">正在读取评审详情。</p>
          </section>
        </div>
      }
    >
      <ReviewDetailPageContent />
    </Suspense>
  );
}
