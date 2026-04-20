import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

describe("globals shell styles", () => {
  const getRuleBody = (selector: string) => {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const blockRegex = new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, "m");
    const match = globalsCss.match(blockRegex);

    expect(match, `missing CSS rule for ${selector}`).not.toBeNull();

    return match?.[1] ?? "";
  };

  const hasRule = (selector: string, required: string[]) => {
    const body = getRuleBody(selector);

    for (const token of required) {
      expect(body, `expected ${selector} to contain ${token}`).toContain(token);
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

  it("pushes content down with container padding while letting the shell itself reach the very top", () => {
    hasRule("html", ["height: 100%;", "padding: 0;"]);
    hasRule("body", ["height: 100%;", "padding: 0;"]);
    hasRule(".desktop-shell", ["min-height: 100vh;"]);
    hasRule(".app-sidebar", [
      "top: 0;",
      "height: 100vh;",
      "padding: calc(var(--titlebar-height) + 18px) 16px 18px;",
      "-webkit-app-region: drag;",
    ]);
    hasRule(".workspace", [
      "min-height: 100vh;",
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
});
