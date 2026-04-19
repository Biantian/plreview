import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

describe("globals shell styles", () => {
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
});
