import { notFound } from "next/navigation";

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

  return (
    <>
      <section className="panel stack-lg">
        <div className="inline-actions">
          <StatusBadge status={review.status} />
          <span className="pill pill-brand">{review.providerSnapshot}</span>
          <span className="pill">{review.modelNameSnapshot}</span>
          <span className="pill">{formatDate(review.createdAt)}</span>
        </div>

        <div>
          <p className="section-eyebrow">Review Snapshot</p>
          <h1 className="section-title">{review.document.title}</h1>
          <p className="section-copy">
            文件：{review.document.filename} · 文档块：{review.document.blockCount || blocks.length}
          </p>
        </div>

        {review.summary ? <p className="hero-lead">{review.summary}</p> : null}
        {review.errorMessage ? <p className="section-copy">错误信息：{review.errorMessage}</p> : null}

        <div className="metric-grid">
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

      <ReviewDetailViewer annotations={annotations} blocks={blocks} />

      <section className="card stack">
        <div>
          <p className="section-eyebrow">Report Body</p>
          <h2 className="section-title">报告正文</h2>
          <p className="section-copy">当前先以内嵌文本方式展示，后续可继续扩展导出能力。</p>
        </div>

        <div className="report">{review.reportMarkdown ?? "该任务尚未生成报告正文。"}</div>
      </section>
    </>
  );
}
