import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

describe("globals theme tokens", () => {
  const getRuleBody = (selector: string) => {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const blockRegex = new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, "m");
    const match = globalsCss.match(blockRegex);

    return match?.[1] ?? null;
  };

  it("uses the compact neutral desktop tokens", () => {
    expect(globalsCss).toContain("--bg: #ffffff;");
    expect(globalsCss).toContain("--shell: #f3f4f6;");
    expect(globalsCss).toContain("--line: #e5e7eb;");
    expect(globalsCss).toContain("--brand: #dd6b20;");
  });

  it("keeps the shell neutral while preserving the orange action accent", () => {
    expect(globalsCss).not.toContain("--brand: #0f766e;");
    expect(globalsCss).not.toContain("rgba(15, 118, 110");
    expect(globalsCss).toContain(".site-nav-link.active");
    expect(globalsCss).toContain(".button {");
  });

  it("keeps dense management surfaces flat and divider-based", () => {
    expect(globalsCss).toContain(".desktop-table-toolbar {");
    expect(globalsCss).toContain("border-top: 1px solid var(--line);");
    expect(globalsCss).toContain(".table-shell {");
    expect(globalsCss).toContain("background: transparent;");
    expect(globalsCss).toContain(".metric-card,");
    expect(globalsCss).toContain("border-right: 1px solid var(--line);");
  });

  it("keeps docs navigation rows neutral and text-first", () => {
    expect(globalsCss).toContain(".app-sidebar-footer {");
    expect(globalsCss).toContain("margin-top: auto;");
    expect(globalsCss).toContain("border-top: 1px solid var(--line);");
    expect(globalsCss).toMatch(
      /\.docs-directory-button,\s*\.docs-toc-link\s*\{[\s\S]*padding:\s*10px 12px;[\s\S]*background:\s*transparent;/m,
    );
    expect(globalsCss).toMatch(
      /\.docs-directory-button:hover,[\s\S]*\.docs-toc-link:focus-visible\s*\{[\s\S]*background:\s*#f3f4f6;/m,
    );
  });

  it("scopes docs reading tweaks to docs-only selectors", () => {
    expect(getRuleBody(".docs-document-stream")).toContain("gap: 28px;");
    expect(getRuleBody(".docs-document-block")).toContain("padding: 0;");
    expect(getRuleBody(".docs-document-block")).toContain("background: transparent;");
    expect(globalsCss).not.toMatch(/(^|\n)\.document-stream\s*\{[\s\S]*gap:\s*28px;/m);
    expect(getRuleBody(".document-block")).not.toContain("padding: 0;");
    expect(getRuleBody(".document-block")).not.toContain("background: transparent;");
  });
});
