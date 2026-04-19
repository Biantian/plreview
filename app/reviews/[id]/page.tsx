import { notFound } from "next/navigation";
import { ReviewStatus } from "@prisma/client";

import { PageIntro } from "@/components/page-intro";
import { ReportMarkdown } from "@/components/report-markdown";
import { ReviewDetailViewer } from "@/components/review-detail-viewer";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

type ReviewDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ReviewDetailPage({
  params,
}: ReviewDetailPageProps) {
  const { id } = await params;

  const review = await prisma.reviewJob.findUnique({
    where: { id },
    include: {
      document: {
        include: {
          blocks: {
            orderBy: { blockIndex: "asc" },
          },
          paragraphs: {
            orderBy: { paragraphIndex: "asc" },
          },
        },
      },
      annotations: {
        include: {
          rule: true,
        },
        orderBy: [{ blockIndex: "asc" }, { paragraphIndex: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!review) {
    notFound();
  }

  const blocks =
    review.document.blocks.length > 0
      ? review.document.blocks.map((block) => ({
          blockIndex: block.blockIndex,
          blockType: block.blockType,
          text: block.text,
          level: block.level,
          listKind: block.listKind,
        }))
      : review.document.paragraphs.map((paragraph) => ({
          blockIndex: paragraph.paragraphIndex,
          blockType: "paragraph" as const,
          text: paragraph.text,
          level: null,
          listKind: null,
        }));

  const annotations = review.annotations.map((annotation) => ({
    id: annotation.id,
    blockIndex: annotation.blockIndex ?? annotation.paragraphIndex,
    issue: annotation.issue,
    suggestion: annotation.suggestion,
    severity: annotation.severity,
    evidenceText: annotation.evidenceText,
    ruleName: annotation.rule.name,
  }));

  const hitBlockCount = new Set(annotations.map((annotation) => annotation.blockIndex)).size;
  const highPriorityCount = annotations.filter((annotation) =>
    ["high", "critical"].includes(annotation.severity),
  ).length;
  const isProcessing =
    review.status === ReviewStatus.pending || review.status === ReviewStatus.running;
  const isFailed = review.status === ReviewStatus.failed;

  return (
    <div className="desktop-management-page stack-lg">
      <section className="panel stack-lg">
        <div className="inline-actions">
          <span className="pill pill-brand">{review.providerSnapshot}</span>
          <span className="pill">{review.modelNameSnapshot}</span>
          <span className="pill">{formatDate(review.createdAt)}</span>
        </div>

        <PageIntro
          actions={<StatusBadge status={review.status} />}
          description={`文件：${review.document.filename} · 文档块：${review.document.blockCount || blocks.length}`}
          eyebrow="Review Snapshot"
          title={review.document.title}
        />

        {review.summary ? <p className="hero-lead">{review.summary}</p> : null}
        {review.errorMessage ? <p className="section-copy">错误信息：{review.errorMessage}</p> : null}

        <div className="desktop-kpi-grid">
          <div className="metric-card">
            <p className="metric-label">问题总数</p>
            <strong className="metric-value">{annotations.length}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">命中块数</p>
            <strong className="metric-value">{hitBlockCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">高优先问题</p>
            <strong className="metric-value">{highPriorityCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">总体评分</p>
            <strong className="metric-value">{review.overallScore ?? "--"}</strong>
          </div>
        </div>
      </section>

      <ReviewDetailViewer annotations={annotations} blocks={blocks} status={review.status} />

      <section className="desktop-surface stack">
        <div>
          <p className="section-eyebrow">Report Body</p>
          <h2 className="subsection-title">报告正文</h2>
          <p className="section-copy">正文已按 Markdown 文档阅读方式渲染，便于直接浏览结论、规则明细和结构化内容。</p>
        </div>

        {review.reportMarkdown ? (
          <ReportMarkdown markdown={review.reportMarkdown} />
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
