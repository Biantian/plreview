import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/app-sidebar", () => ({
  AppSidebar: () => <aside data-testid="app-sidebar">sidebar</aside>,
}));

import RootLayout from "@/app/layout";

describe("RootLayout shell", () => {
  it("renders the desktop shell without a separate fake titlebar wrapper", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <div>workspace</div>
      </RootLayout>,
    );

    expect(markup).toContain('class="desktop-shell"');
    expect(markup).not.toContain("app-titlebar");
    expect(markup).not.toContain("app-shell-body");
    expect(markup).toContain("workspace");
  });
});
