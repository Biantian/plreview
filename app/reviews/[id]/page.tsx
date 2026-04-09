import { notFound } from "next/navigation";

import { SeverityBadge } from "@/components/severity-badge";
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
          paragraphs: {
            orderBy: { paragraphIndex: "asc" },
          },
        },
      },
      annotations: {
        include: {
          rule: true,
        },
        orderBy: [{ paragraphIndex: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!review) {
    notFound();
  }

  const annotationsByParagraph = new Map(
    review.document.paragraphs.map((paragraph) => [paragraph.paragraphIndex, [] as typeof review.annotations]),
  );

  review.annotations.forEach((annotation) => {
    const current = annotationsByParagraph.get(annotation.paragraphIndex);
    if (current) {
      current.push(annotation);
    }
  });

  return (
    <>
      <section className="panel stack">
        <div className="inline-actions">
          <StatusBadge status={review.status} />
          <span className="pill">{review.providerSnapshot}</span>
          <span className="pill">{review.modelNameSnapshot}</span>
          <span className="pill">{formatDate(review.createdAt)}</span>
        </div>
        <div>
          <h1 className="section-title">{review.document.title}</h1>
          <p className="section-copy">
            文件：{review.document.filename} · 段落数：{review.document.paragraphCount}
          </p>
        </div>

        {review.summary ? <p className="section-copy">{review.summary}</p> : null}
        {review.errorMessage ? (
          <p className="section-copy">错误信息：{review.errorMessage}</p>
        ) : null}
      </section>

      <section className="review-layout">
        <div className="panel">
          <div className="stack">
            <div>
              <h2 className="section-title">原文与段落标注</h2>
              <p className="section-copy">
                命中问题的段落会直接附带规则、问题描述和修改建议。
              </p>
            </div>

            <div className="paragraphs">
              {review.document.paragraphs.map((paragraph) => {
                const paragraphAnnotations =
                  annotationsByParagraph.get(paragraph.paragraphIndex) ?? [];

                return (
                  <article
                    className={`paragraph-card ${
                      paragraphAnnotations.length > 0 ? "highlight" : ""
                    }`}
                    id={`paragraph-${paragraph.paragraphIndex}`}
                    key={paragraph.id}
                  >
                    <p className="paragraph-index">
                      段落 {paragraph.paragraphIndex + 1}
                    </p>
                    <p className="annotation-copy">{paragraph.text}</p>

                    {paragraphAnnotations.map((annotation) => (
                      <div className="annotation-block" key={annotation.id}>
                        <div className="inline-actions">
                          <span className="pill">{annotation.rule.name}</span>
                          <SeverityBadge severity={annotation.severity} />
                        </div>
                        <p className="annotation-title">{annotation.issue}</p>
                        <p className="annotation-copy">{annotation.suggestion}</p>
                        {annotation.evidenceText ? (
                          <p className="hint">证据摘录：{annotation.evidenceText}</p>
                        ) : null}
                      </div>
                    ))}
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        <div className="stack">
          <section className="card stack">
            <div>
              <h2 className="section-title">问题清单</h2>
              <p className="section-copy">按段落顺序聚合，方便快速跳转定位。</p>
            </div>

            <div className="list">
              {review.annotations.length === 0 ? (
                <div className="list-item">
                  <div>
                    <h3>当前没有标注问题</h3>
                    <p className="muted">若你使用的是演示模式，可换一份文档或补充规则再试一次。</p>
                  </div>
                </div>
              ) : (
                review.annotations.map((annotation) => (
                  <a
                    className="list-item"
                    href={`#paragraph-${annotation.paragraphIndex}`}
                    key={annotation.id}
                  >
                    <div>
                      <h3>
                        段落 {annotation.paragraphIndex + 1} · {annotation.rule.name}
                      </h3>
                      <p className="muted">{annotation.issue}</p>
                    </div>
                    <SeverityBadge severity={annotation.severity} />
                  </a>
                ))
              )}
            </div>
          </section>

          <section className="card stack">
            <div>
              <h2 className="section-title">报告正文</h2>
              <p className="section-copy">当前先以内嵌文本方式展示，后续可继续扩展导出能力。</p>
            </div>

            <div className="report">
              {review.reportMarkdown ?? "该任务尚未生成报告正文。"}
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
