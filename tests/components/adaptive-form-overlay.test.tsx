import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { AdaptiveFormOverlay } from "@/components/adaptive-form-overlay";

function OverlayHarness() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setOpen(true)} type="button">
        Open overlay
      </button>
      <AdaptiveFormOverlay open={open} onClose={() => setOpen(false)} title="编辑信息">
        <label>
          名称
          <input aria-label="名称" defaultValue="" />
        </label>
      </AdaptiveFormOverlay>
    </div>
  );
}

describe("AdaptiveFormOverlay", () => {
  it("focuses the first field on open, closes on Escape, and restores focus to the trigger", async () => {
    const user = userEvent.setup();

    render(<OverlayHarness />);

    const trigger = screen.getByRole("button", { name: "Open overlay" });

    await user.click(trigger);

    const input = screen.getByLabelText("名称");
    expect(input).toHaveFocus();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    expect(trigger).toHaveFocus();
  });

  it("switches overlay mode on resize without remounting typed form state", async () => {
    const user = userEvent.setup();
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;

    window.innerWidth = 1280;
    window.innerHeight = 900;

    render(<OverlayHarness />);

    await user.click(screen.getByRole("button", { name: "Open overlay" }));

    const overlay = screen.getByRole("dialog");
    const input = screen.getByLabelText("名称") as HTMLInputElement;

    expect(overlay).toHaveAttribute("data-overlay-mode", "drawer");

    await user.type(input, "已填写的内容");
    expect(input.value).toBe("已填写的内容");

    window.innerWidth = 1024;
    window.innerHeight = 700;
    fireEvent(window, new Event("resize"));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toHaveAttribute("data-overlay-mode", "dialog");
    });

    expect(screen.getByLabelText("名称")).toHaveValue("已填写的内容");

    window.innerWidth = originalInnerWidth;
    window.innerHeight = originalInnerHeight;
  });
});
