"use client";

import { type CSSProperties, useState } from "react";

export type DocsDocumentSection = {
  id: string;
  title: string;
  body: string;
};

export type DocsDocument = {
  id: string;
  title: string;
  description: string;
  intro: string;
  sections: DocsDocumentSection[];
};

type DocsShellProps = {
  documents: DocsDocument[];
};

export function DocsShell({ documents }: DocsShellProps) {
  const [activeDocumentId, setActiveDocumentId] = useState(documents[0]?.id ?? "");
  const [isDirectoryCollapsed, setIsDirectoryCollapsed] = useState(false);
  const [isTocCollapsed, setIsTocCollapsed] = useState(false);

  const activeDocument =
    documents.find((document) => document.id === activeDocumentId) ?? documents[0] ?? null;

  if (!activeDocument) {
    return (
      <div className="page-stack">
        <section className="desktop-surface stack">
          <h1 className="section-title">文档</h1>
          <p className="section-copy">暂时还没有可展示的文档内容。</p>
        </section>
      </div>
    );
  }

  const shellStyle = {
    "--docs-left-column": isDirectoryCollapsed ? "32px" : "248px",
    "--docs-right-column": isTocCollapsed ? "32px" : "220px",
  } as CSSProperties;

  return (
    <div className="page-stack">
      <div
        className="docs-shell docs-workspace"
        data-left-collapsed={isDirectoryCollapsed}
        data-right-collapsed={isTocCollapsed}
        data-testid="docs-shell"
        style={shellStyle}
      >
        <aside
          aria-label="文档目录"
          className="desktop-surface docs-sidebar docs-rail docs-sidebar-left"
          data-collapsed={isDirectoryCollapsed}
          data-testid="docs-directory-rail"
          role="complementary"
        >
          <button
            aria-label={isDirectoryCollapsed ? "展开文档目录" : "折叠文档目录"}
            className="docs-rail-toggle"
            onClick={() => setIsDirectoryCollapsed((current) => !current)}
            type="button"
          >
            {isDirectoryCollapsed ? "▶" : "◀"}
          </button>

          {!isDirectoryCollapsed ? (
            <div className="stack docs-sidebar-content">
              <div className="page-header">
                <p className="section-eyebrow">Directory</p>
                <h2 className="subsection-title">文档目录</h2>
                <p className="section-copy">左侧聚合各类操作文档，先选主题，再在正文中连续阅读。</p>
              </div>

              <div className="docs-directory-list">
                {documents.map((document) => {
                  const isActive = document.id === activeDocument.id;

                  return (
                    <button
                      aria-current={isActive ? "true" : undefined}
                      aria-label={`打开文档 ${document.title}`}
                      className={`docs-directory-button ${isActive ? "active" : ""}`}
                      key={document.id}
                      onClick={() => setActiveDocumentId(document.id)}
                      type="button"
                    >
                      <strong>{document.title}</strong>
                      <span>{document.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </aside>

        <article aria-label="文档正文" className="desktop-surface stack-lg docs-main" role="article">
          <div className="page-header">
            <p className="section-eyebrow">Docs</p>
            <h1 className="section-title">{activeDocument.title}</h1>
            <p className="section-copy">{activeDocument.intro}</p>
          </div>

          <div className="inline-actions">
            <span className="pill pill-brand">{activeDocument.description}</span>
            <span className="pill">{activeDocument.sections.length} 个章节</span>
          </div>

          <div className="document-stream">
            {activeDocument.sections.map((section, index) => (
              <section className="document-block" id={section.id} key={section.id}>
                <div className="feature-row">
                  <span className="feature-kicker">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h2 className="subsection-title">{section.title}</h2>
                    <p className="section-copy">{section.body}</p>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </article>

        <aside
          aria-label="文章目录"
          className="desktop-surface docs-sidebar docs-rail docs-sidebar-right"
          data-collapsed={isTocCollapsed}
          data-testid="docs-toc-rail"
          role="complementary"
        >
          <button
            aria-label={isTocCollapsed ? "展开文章目录" : "折叠文章目录"}
            className="docs-rail-toggle"
            onClick={() => setIsTocCollapsed((current) => !current)}
            type="button"
          >
            {isTocCollapsed ? "◀" : "▶"}
          </button>

          {!isTocCollapsed ? (
            <div className="stack docs-sidebar-content">
              <div className="page-header">
                <p className="section-eyebrow">Article Toc</p>
                <h2 className="subsection-title">文章目录</h2>
                <p className="section-copy">右侧只显示当前文档的章节锚点，方便在长文里快速跳转。</p>
              </div>

              <div className="docs-toc-list">
                {activeDocument.sections.map((section, index) => (
                  <a className="docs-toc-link" href={`#${section.id}`} key={section.id}>
                    <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <strong>{section.title}</strong>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
