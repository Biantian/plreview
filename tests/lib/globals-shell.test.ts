import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

describe("globals shell styles", () => {
  const hasRule = (selector: string, required: string[]) => {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const blockRegex = new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, "m");
    const match = globalsCss.match(blockRegex);

    expect(match, `missing CSS rule for ${selector}`).not.toBeNull();

    const body = match?.[1] ?? "";

    for (const token of required) {
      expect(body, `expected ${selector} to contain ${token}`).toContain(token);
    }
  };

  it("uses an edge-to-edge desktop shell with a flat sidebar and flat work surfaces", () => {
    expect(globalsCss).not.toContain("backdrop-filter: blur(18px);");
    expect(globalsCss).toContain(".desktop-shell {");
    expect(globalsCss).toContain("grid-template-columns: 248px minmax(0, 1fr);");
    expect(globalsCss).toContain(".app-sidebar {");
    expect(globalsCss).toContain("border-right: 1px solid var(--line);");
    expect(globalsCss).toContain("background: var(--shell);");
    expect(globalsCss).toContain(".desktop-surface,");
    expect(globalsCss).toContain("background: transparent;");
    expect(globalsCss).toContain("box-shadow: none;");
  });

  it("defines the docs workspace as fixed master-detail panes with dedicated scrolling", () => {
    hasRule(".docs-shell", [
      "grid-template-columns: 240px minmax(0, 1fr) 200px;",
      "height: 100vh;",
      "overflow: hidden;",
    ]);
    hasRule(".docs-pane", ["align-self: stretch;", "overflow: hidden;"]);
    hasRule(".docs-pane-directory", ["border-right: 1px solid var(--line);"]);
    hasRule(".docs-pane-toc", ["border-left: 1px solid var(--line);"]);
    hasRule(".docs-pane-content", ["overflow-y: auto;"]);
    hasRule(".docs-pane-article", ["overflow-y: auto;"]);
  });
});
