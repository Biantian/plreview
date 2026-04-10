"use client";

import { useEffect, useState } from "react";

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

function severityText(value: ReviewAnnotation["severity"]) {
  switch (value) {
    case "low":
      return "低";
    case "medium":
      return "中";
    case "high":
      return "高";
    case "critical":
      return "严重";
    default:
      return value;
  }
}

function blockTypeLabel(block: ReviewBlock) {
  if (block.blockType === "heading") {
    return `标题 L${block.level ?? 1}`;
  }

  if (block.blockType === "list_item") {
    return block.listKind === "ordered" ? "有序项" : "列表项";
  }

  return "正文";
}

export function ReviewDetailViewer({
  blocks,
  annotations,
}: {
  blocks: ReviewBlock[];
  annotations: ReviewAnnotation[];
}) {
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(
    annotations[0]?.id ?? null,
  );

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

  return (
    <section className="review-layout">
      <div className="panel">
        <div className="stack">
          <div>
            <p className="section-eyebrow">Structured Document</p>
            <h2 className="section-title">原文结构</h2>
            <p className="section-copy">标题、正文和列表项会按结构展示，左侧主要负责提供上下文与问题落点。</p>
          </div>

          <div className="document-stream">
            {blocks.map((block) => {
              const blockAnnotations = annotations.filter(
                (annotation) => annotation.blockIndex === block.blockIndex,
              );
              const isActive = activeAnnotation?.blockIndex === block.blockIndex;

              return (
                <article
                  className={`document-block ${isActive ? "active" : ""} ${
                    blockAnnotations.length > 0 ? "has-issues" : ""
                  }`}
                  id={`block-${block.blockIndex}`}
                  key={block.blockIndex}
                >
                  <div className="document-block-meta">
                    <span className="document-block-number">{block.blockIndex + 1}</span>
                    <span className="pill">{blockTypeLabel(block)}</span>
                    {blockAnnotations.length > 0 ? (
                      <span className="pill pill-accent">命中 {blockAnnotations.length} 个问题</span>
                    ) : null}
                  </div>

                  {block.blockType === "heading" ? (
                    <h3 className={`document-heading level-${Math.min(block.level ?? 2, 4)}`}>
                      {block.text}
                    </h3>
                  ) : block.blockType === "list_item" ? (
                    <div className="document-list-row">
                      <span className="document-list-marker">
                        {block.listKind === "ordered" ? `${block.blockIndex + 1}.` : "•"}
                      </span>
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
                          {annotation.ruleName}
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

      <div className="review-sidebar stack">
        <section className="card stack">
          <div>
            <p className="section-eyebrow">Issue Navigator</p>
            <h2 className="section-title">问题清单</h2>
            <p className="section-copy">目录承担主要阅读任务，点击后会同步高亮左侧对应内容块。</p>
          </div>

          <div className="issue-list">
            {annotations.length === 0 ? (
              <div className="list-item">
                <div>
                  <h3>当前没有标注问题</h3>
                  <p className="muted">若你使用的是演示模式，可换一份文档或补充规则再试一次。</p>
                </div>
              </div>
            ) : (
              annotations.map((annotation) => (
                <a
                  className={`issue-item ${annotation.id === activeAnnotation?.id ? "active" : ""}`}
                  href={`#block-${annotation.blockIndex}`}
                  key={annotation.id}
                  onClick={() => setActiveAnnotationId(annotation.id)}
                >
                  <div className="issue-item-copy">
                    <div className="inline-actions">
                      <span className="document-block-number subtle">{annotation.blockIndex + 1}</span>
                      <span className="pill">{annotation.ruleName}</span>
                      <span className={`severity-badge severity-${annotation.severity}`}>
                        {severityText(annotation.severity)}
                      </span>
                    </div>
                    <p className="issue-item-title">{annotation.issue}</p>
                  </div>
                </a>
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
                <span className="document-block-number subtle">{activeAnnotation.blockIndex + 1}</span>
                <span className="pill pill-brand">{activeAnnotation.ruleName}</span>
                <span className={`severity-badge severity-${activeAnnotation.severity}`}>
                  {severityText(activeAnnotation.severity)}
                </span>
              </div>
              <p className="issue-item-title">{activeAnnotation.issue}</p>
              <p className="annotation-copy">{activeAnnotation.suggestion}</p>
              {activeAnnotation.evidenceText ? (
                <div className="issue-evidence">{activeAnnotation.evidenceText}</div>
              ) : null}
            </div>
          ) : (
            <p className="section-copy">当前没有可展示的问题详情。</p>
          )}
        </section>
      </div>
    </section>
  );
}
