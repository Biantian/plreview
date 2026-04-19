import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

describe("globals theme tokens", () => {
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
});
