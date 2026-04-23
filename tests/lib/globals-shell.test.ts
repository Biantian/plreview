import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

describe("globals shell styles", () => {
  const getRuleBody = (selector: string) => {
    const normalizedSelector = selector.replace(/\s+/g, " ").trim();
    const blockRegex = /([^{}]+)\{([^{}]*)\}/g;
    let match: RegExpExecArray | null = null;

    for (const candidate of globalsCss.matchAll(blockRegex)) {
      const prelude = candidate[1].replace(/\s+/g, " ").trim();
      const selectors = candidate[1]
        .split(",")
        .map((part) => part.replace(/\s+/g, " ").trim());

      if (prelude === normalizedSelector || selectors.includes(normalizedSelector)) {
        match = candidate;
        break;
      }
    }

    expect(match, `missing CSS rule for ${selector}`).not.toBeNull();

    return match?.[2] ?? "";
  };

  const hasRule = (selector: string, required: string[]) => {
    const body = getRuleBody(selector);

    for (const token of required) {
      expect(body, `expected ${selector} to contain ${token}`).toContain(token);
    }
  };

  const hasAnyRule = (selectors: string[], required: string[]) => {
    let matchedSelector: string | null = null;
    let body = "";

    for (const selector of selectors) {
      try {
        body = getRuleBody(selector);
        matchedSelector = selector;
        break;
      } catch {
        continue;
      }
    }

    expect(matchedSelector, `missing CSS rule for ${selectors.join(" or ")}`).not.toBeNull();

    for (const token of required) {
      expect(body, `expected ${matchedSelector} to contain ${token}`).toContain(token);
    }
  };

  it("uses an edge-to-edge desktop shell with a flat sidebar and flat work surfaces", () => {
    expect(globalsCss).not.toContain("backdrop-filter: blur(18px);");
    expect(globalsCss).toContain(".desktop-shell {");
    expect(globalsCss).toContain("grid-template-columns: 248px minmax(0, 1fr);");
    expect(globalsCss).toContain("--titlebar-height: 40px;");
    expect(globalsCss).toContain(".app-sidebar {");
    expect(globalsCss).toContain("border-right: 1px solid var(--line);");
    expect(globalsCss).toContain("background: var(--shell);");
    expect(globalsCss).toContain(".desktop-surface,");
    expect(globalsCss).toContain("background: transparent;");
    expect(globalsCss).toContain("box-shadow: none;");
  });

  it("defines a fixed overlay shell with a dedicated scrolling body", () => {
    hasAnyRule([".form-overlay", ".form-overlay-backdrop"], ["position: fixed;", "inset: 0;", "z-index: 55;"]);
    hasRule(".form-overlay::backdrop", ["background: rgba(10, 18, 28, 0.5);"]);
    hasRule(".form-overlay-panel", [
      "display: grid;",
      "grid-template-rows: auto minmax(0, 1fr) auto;",
      "max-height: calc(100vh - 40px);",
      "overflow: hidden;",
    ]);
    hasRule(".form-overlay-body", ["min-height: 0;", "overflow-y: auto;"]);
    hasRule(".form-overlay-header", ["border-bottom: 1px solid var(--line);"]);
    hasRule(".form-overlay-footer", ["border-top: 1px solid var(--line);"]);
  });

  it("pushes content down with container padding while letting the shell itself reach the very top", () => {
    hasRule("html", ["height: 100%;", "padding: 0;"]);
    hasRule("body", ["height: 100%;", "padding: 0;", "overflow: hidden;"]);
    hasRule(".desktop-shell", ["height: 100vh;", "min-height: 100vh;", "overflow: hidden;"]);
    hasRule(".app-sidebar", [
      "top: 0;",
      "height: 100vh;",
      "padding: calc(var(--titlebar-height) + 18px) 16px 18px;",
      "-webkit-app-region: drag;",
    ]);
    hasRule(".workspace", [
      "display: flex;",
      "height: 100vh;",
      "min-height: 100vh;",
      "overflow: hidden;",
      "padding-top: var(--titlebar-height);",
      "-webkit-app-region: drag;",
    ]);
    hasRule(".app-sidebar > *", ["-webkit-app-region: no-drag;"]);
    hasRule(".workspace > *", ["-webkit-app-region: no-drag;"]);
  });

  it("does not keep a standalone fake titlebar strip in the CSS", () => {
    expect(globalsCss).not.toContain(".app-titlebar {");
    expect(globalsCss).not.toContain(".app-shell-body {");
    expect(globalsCss).not.toContain(".app-drag-region {");
    expect(globalsCss).not.toContain("calc(100vh - var(--titlebar-height))");
    expect(getRuleBody(".app-sidebar")).not.toContain("top: var(--titlebar-height);");
  });

  it("keeps interactive controls out of drag mode", () => {
    hasRule(".app-sidebar a,\n.app-sidebar button,\n.app-sidebar input,\n.app-sidebar select,\n.app-sidebar textarea,\n.workspace a,\n.workspace button,\n.workspace input,\n.workspace select,\n.workspace textarea", [
      "-webkit-app-region: no-drag;",
    ]);
  });

  it("keeps dense table controls compact and floats contextual bulk actions", () => {
    hasRule(".management-page-shell", [
      "display: flex;",
      "flex: 1 1 auto;",
      "flex-direction: column;",
      "overflow: hidden;",
    ]);
    hasRule(".workspace.page:has(.management-page-shell)", ["overflow: hidden;"]);
    hasRule(".reviews-page-shell", [
      "display: flex;",
      "flex: 1 1 auto;",
      "flex-direction: column;",
      "overflow: hidden;",
    ]);
    hasRule(".management-table-shell", [
      "display: flex;",
      "flex: 1 1 auto;",
      "flex-direction: column;",
      "overflow: hidden;",
    ]);
    hasRule(".review-jobs-list-shell", [
      "display: flex;",
      "flex: 1 1 auto;",
      "flex-direction: column;",
      "overflow: hidden;",
    ]);
    hasRule(".review-jobs-scroll-region", [
      "flex: 1 1 auto;",
      "overflow-y: auto;",
    ]);
    hasRule(".management-table-scroll-region", [
      "flex: 1 1 auto;",
      "overflow-y: auto;",
    ]);
    hasRule(".review-bulk-toolbar-shell", ["position: absolute;", "pointer-events: none;"]);
    hasRule(".review-bulk-toolbar-shell[data-active=\"false\"]", ["opacity: 0;", "visibility: hidden;"]);
    hasRule(".review-bulk-toolbar-shell[data-active=\"true\"]", ["pointer-events: auto;"]);
    hasRule(".table-text-link,\n.table-text-button", ["padding: 0;", "background: transparent;"]);
    hasRule(".table-nowrap", ["white-space: nowrap;"]);
    hasRule(".table-cell-primary", ["font-weight: 600;"]);
    hasRule(".table-cell-secondary", ["font-size: 12px;"]);
    hasRule(".icon-button", ["width: 32px;", "height: 32px;"]);
  });

  it("defines compact review table layout guards for the review-specific hook classes", () => {
    hasRule(".review-jobs-table", [
      "container-type: inline-size;",
      "width: 100%;",
      "min-width: 0;",
      "overflow-x: hidden;",
    ]);
    hasRule(".review-jobs-table .data-table", [
      "width: 100%;",
      "min-width: 0;",
      "table-layout: fixed;",
    ]);
    hasRule(".review-job-selection-col", ["width: 48px;"]);
    hasRule(".review-job-status-col", ["width: 112px;"]);
    hasRule(".review-job-file-col", ["width: 180px;"]);
    hasRule(".review-job-meta-col", ["width: 180px;"]);
    hasRule(".review-job-created-col", ["width: 130px;"]);
    hasRule(".review-job-action-col", ["width: 176px;"]);
    hasRule(".review-jobs-table .review-job-title-cell", ["min-width: 0;", "overflow: hidden;"]);
    hasRule(".review-jobs-table .review-job-file-cell", ["min-width: 0;", "overflow: hidden;"]);
    hasRule(".review-jobs-table .review-job-meta-cell", ["min-width: 0;", "overflow: hidden;"]);
    hasRule(".review-jobs-table .review-job-created-cell", ["min-width: 0;", "overflow: hidden;"]);
    expect(globalsCss).toContain(
      ".review-jobs-table .review-job-created-cell {\n  text-overflow: ellipsis;",
    );
    hasRule(".review-jobs-table .review-job-action-cell", [
      "width: 176px;",
      "white-space: nowrap;",
    ]);
    expect(getRuleBody(".review-jobs-table .review-job-action-cell")).not.toContain("width: 1%;");
    hasAnyRule([".review-jobs-table .table-row-actions", ".review-job-action-cell .table-row-actions"], [
      "display: inline-flex;",
      "flex-wrap: nowrap;",
    ]);
    expect(globalsCss).toContain("@container (max-width: 900px)");
    expect(globalsCss).toContain(".review-job-file-col {\n    width: 130px;");
    expect(globalsCss).toContain(".review-job-meta-col {\n    width: 142px;");
    expect(globalsCss).toContain(".review-job-created-col {\n    width: 126px;");
    expect(globalsCss).toContain(".review-job-action-col {\n    width: 148px;");
    expect(globalsCss).toContain("@container (max-width: 800px)");
    expect(globalsCss).toContain(".review-job-file-col {\n    width: 112px;");
    expect(globalsCss).toContain(".review-job-meta-col {\n    width: 126px;");
    expect(globalsCss).toContain(".review-job-created-col {\n    width: 124px;");
    expect(globalsCss).toContain(".review-job-action-col {\n    width: 138px;");
  });

  it("defines the docs workspace as fixed master-detail panes with dedicated scrolling", () => {
    hasRule(".docs-shell", [
      "grid-template-columns: 240px minmax(0, 1fr) 200px;",
      "flex: 1 1 auto;",
      "min-height: 0;",
    ]);
    expect(getRuleBody(".docs-shell")).not.toContain("height: 100vh;");
    expect(getRuleBody(".docs-shell")).not.toContain("min-height: 100vh;");
    hasRule(".docs-page", ["flex: 1 1 auto;", "min-height: 0;"]);
    hasRule(".docs-page-stack", ["flex: 1 1 auto;", "min-height: 0;"]);
    hasRule(".docs-pane", ["align-self: stretch;", "overflow: hidden;"]);
    hasRule(".docs-pane-directory", ["border-right: 1px solid var(--line);"]);
    hasRule(".docs-pane-toc", ["border-left: 1px solid var(--line);"]);
    hasRule(".docs-pane-header", ["flex: 0 0 auto;"]);
    hasRule(".docs-pane-scroll", [
      "overflow: hidden;",
      "overflow-y: auto;",
      "min-height: 0;",
    ]);
    hasRule(".docs-pane-article", ["padding: 0;"]);
  });

  it("keeps the home cockpit fixed on desktop while allowing the rail and panes to scroll internally", () => {
    hasRule(".workspace.page:has(.home-command-center)", ["overflow: hidden;"]);
    hasRule(".home-command-center", [
      "grid-template-rows: auto minmax(0, 1fr);",
      "min-height: 0;",
      "overflow: hidden;",
    ]);
    hasRule(".home-cockpit-grid", ["min-height: 0;", "overflow: hidden;"]);
    hasRule(".home-command-rail,\n.home-pane", [
      "min-width: 0;",
      "min-height: 0;",
    ]);
    expect(globalsCss).toContain(".home-command-rail {\n  display: flex;");
    expect(globalsCss).toContain("flex-direction: column;");
    expect(globalsCss).toContain("overflow-x: hidden;");
    expect(globalsCss).toContain("overflow-y: auto;");
    expect(globalsCss).toContain(".home-pane {\n  display: flex;");
    expect(globalsCss).toContain(".home-pane {\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;");
    hasRule(".home-pane-scroll", [
      "min-height: 0;",
      "overflow-x: hidden;",
      "overflow-y: auto;",
    ]);
    expect(globalsCss).toContain("@media (max-width: 1180px)");
    expect(globalsCss).toContain(".workspace.page:has(.home-command-center) {\n    overflow-y: auto;");
    expect(globalsCss).toContain(".home-command-rail,\n  .home-pane {\n    overflow: visible;");
    expect(globalsCss).toContain(".home-pane-scroll {\n    overflow: visible;");
  });
});
