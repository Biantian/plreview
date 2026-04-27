import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/app-sidebar", () => ({
  AppSidebar: () => <aside data-testid="app-sidebar">sidebar</aside>,
}));

import RootLayout from "@/app/layout";

describe("RootLayout shell", () => {
  it("renders the desktop shell with a dedicated top drag bar", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <div>workspace</div>
      </RootLayout>,
    );

    expect(markup).toContain('class="desktop-titlebar"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup.indexOf('class="desktop-titlebar"')).toBeLessThan(
      markup.indexOf('class="desktop-shell"'),
    );
    expect(markup).toContain('class="desktop-shell"');
    expect(markup).toContain("workspace");
  });
});
