"use client";

import { ReviewStatus } from "@prisma/client";
import { useEffect, useState } from "react";

import { severityLabel } from "@/lib/utils";

type ReviewBlock = {
  blockIndex: number;
  blockType: "heading" | "paragraph" | "list_item";
  text: string;
  level: number | null;
  listKind: "unordered" | "ordered" | null;
};

type ReviewAnnotation = {
  id: string;
  blockIndex: number;
  issue: string;
  suggestion: string;
  severity: "low" | "medium" | "high" | "critical";
  evidenceText: string | null;
  ruleName: string;
};

function getEmptyState(status: ReviewStatus) {
  if (status === ReviewStatus.pending || status === ReviewStatus.running) {
    return "后台正在分析文档，问题清单会在评审完成后出现在这里。";
  }

  if (status === ReviewStatus.failed) {
    return "该任务未生成问题清单，你可以先查看顶部错误信息定位失败原因。";
  }

  return "当前没有命中问题，正文会保持自然排版，不额外插入提示标签。";
}

export function ReviewDetailViewer({
  blocks,
  annotations,
  status,
}: {
  blocks: ReviewBlock[];
  annotations: ReviewAnnotation[];
  status: ReviewStatus;
}) {
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(
    annotations[0]?.id ?? null,
  );

  useEffect(() => {
    setActiveAnnotationId(annotations[0]?.id ?? null);
  }, [annotations]);

  const activeAnnotation =
    annotations.find((annotation) => annotation.id === activeAnnotationId) ?? annotations[0] ?? null;

  useEffect(() => {
    if (!activeAnnotation) {
      return;
    }

    const element = document.getElementById(`block-${activeAnnotation.blockIndex}`);
    if (element) {
      element.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [activeAnnotation]);

  let orderedListIndex = 0;

  return (
    <section className="review-layout">
      <div className="panel review-document-pane">
        <div className="stack">
          <div>
            <p className="section-eyebrow">Annotated Source</p>
            <h2 className="section-title">原文命中</h2>
            <p className="section-copy">正文与问题联动阅读，详细使用说明可在文档页查看。</p>
          </div>

          <div className="document-stream document-reading-flow document-stream-dense">
            {blocks.map((block) => {
              const blockAnnotations = annotations.filter(
                (annotation) => annotation.blockIndex === block.blockIndex,
              );
              const isActive = activeAnnotation?.blockIndex === block.blockIndex;
              const orderedMarker =
                block.blockType === "list_item" && block.listKind === "ordered"
                  ? `${(orderedListIndex += 1)}.`
                  : (orderedListIndex = 0, "•");

              return (
                <article
                  className={`document-block document-block-plain ${
                    isActive ? "active" : ""
                  } ${blockAnnotations.length > 0 ? "has-issues" : ""}`}
                  id={`block-${block.blockIndex}`}
                  key={block.blockIndex}
                >
                  {block.blockType === "heading" ? (
                    <h3 className={`document-heading level-${Math.min(block.level ?? 2, 4)}`}>
                      {block.text}
                    </h3>
                  ) : block.blockType === "list_item" ? (
                    <div className="document-list-row">
                      <span className="document-list-marker">{orderedMarker}</span>
                      <p className="document-paragraph">{block.text}</p>
                    </div>
                  ) : (
                    <p className="document-paragraph">{block.text}</p>
                  )}

                  {blockAnnotations.length > 0 ? (
                    <div className="document-annotation-rail">
                      {blockAnnotations.map((annotation) => (
                        <button
                          className={`document-annotation-chip ${
                            annotation.id === activeAnnotation?.id ? "active" : ""
                          }`}
                          key={annotation.id}
                          onClick={() => setActiveAnnotationId(annotation.id)}
                          type="button"
                        >
                          <span>{annotation.ruleName}</span>
                          <span className="document-annotation-chip-meta">
                            {severityLabel(annotation.severity)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </div>

      <div className="review-sidebar review-issue-pane stack">
        <section className="card stack">
          <div>
            <p className="section-eyebrow">Issue Navigator</p>
            <h2 className="section-title">问题清单</h2>
            <p className="section-copy">点击问题项或正文中的提示标签，右侧详情和原文位置会同步聚焦。</p>
          </div>

          <div className="issue-list">
            {annotations.length === 0 ? (
              <div className="list-item">
                <div>
                  <h3>当前没有可展示的问题</h3>
                  <p className="muted">{getEmptyState(status)}</p>
                </div>
              </div>
            ) : (
              annotations.map((annotation) => (
                <button
                  className={`issue-item ${annotation.id === activeAnnotation?.id ? "active" : ""}`}
                  key={annotation.id}
                  onClick={() => setActiveAnnotationId(annotation.id)}
                  type="button"
                >
                  <div className="issue-item-copy">
                    <div className="inline-actions">
                      <span className="pill">{annotation.ruleName}</span>
                      <span className={`severity-badge severity-${annotation.severity}`}>
                        {severityLabel(annotation.severity)}
                      </span>
                    </div>
                    <p className="issue-item-title">{annotation.issue}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="card stack">
          <div>
            <p className="section-eyebrow">Issue Detail</p>
            <h2 className="section-title">当前问题</h2>
          </div>

          {activeAnnotation ? (
            <div className="issue-detail stack">
              <div className="inline-actions">
                <span className="pill pill-brand">{activeAnnotation.ruleName}</span>
                <span className={`severity-badge severity-${activeAnnotation.severity}`}>
                  {severityLabel(activeAnnotation.severity)}
                </span>
                <span className="pill">已定位到正文对应位置</span>
              </div>
              <p className="issue-item-title">{activeAnnotation.issue}</p>
              <p className="annotation-copy">{activeAnnotation.suggestion}</p>
              {activeAnnotation.evidenceText ? (
                <div className="issue-evidence">{activeAnnotation.evidenceText}</div>
              ) : null}
            </div>
          ) : (
            <p className="section-copy">{getEmptyState(status)}</p>
          )}
        </section>
      </div>
    </section>
  );
}
