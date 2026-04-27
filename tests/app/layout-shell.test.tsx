import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/app-sidebar", () => ({
  AppSidebar: () => <aside data-testid="app-sidebar">sidebar</aside>,
}));

import RootLayout from "@/app/layout";

describe("RootLayout shell", () => {
  it("renders the desktop shell with dedicated transparent drag overlays", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <div>workspace</div>
      </RootLayout>,
    );

    expect(markup).toContain('class="desktop-sidebar-drag-region"');
    expect(markup).toContain('class="desktop-workspace-drag-region"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup.indexOf('class="desktop-sidebar-drag-region"')).toBeLessThan(
      markup.indexOf('class="desktop-shell"'),
    );
    expect(markup.indexOf('class="desktop-workspace-drag-region"')).toBeLessThan(
      markup.indexOf('class="desktop-shell"'),
    );
    expect(markup).toContain('class="desktop-shell"');
    expect(markup).not.toContain("desktop-titlebar");
    expect(markup).toContain("workspace");
  });
});
