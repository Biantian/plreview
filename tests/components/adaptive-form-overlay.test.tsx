import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdaptiveFormOverlay } from "@/components/adaptive-form-overlay";

let originalShowModalDescriptor: PropertyDescriptor | undefined;
let originalCloseDescriptor: PropertyDescriptor | undefined;
let showModalMock: ReturnType<typeof vi.fn>;
let closeMock: ReturnType<typeof vi.fn>;

function OverlayHarness() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setOpen(true)} type="button">
        Open overlay
      </button>
      <AdaptiveFormOverlay open={open} onClose={() => setOpen(false)} title="编辑信息">
        <input data-testid="hidden-field" type="hidden" defaultValue="secret" />
        <label>
          名称
          <input aria-label="名称" defaultValue="" />
        </label>
      </AdaptiveFormOverlay>
    </div>
  );
}

describe("AdaptiveFormOverlay", () => {
  beforeEach(() => {
    originalShowModalDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
    originalCloseDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
    showModalMock = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    closeMock = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });

    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value: showModalMock,
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value: closeMock,
    });
  });

  afterEach(() => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", originalShowModalDescriptor ?? {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", originalCloseDescriptor ?? {
      configurable: true,
      value: undefined,
    });
  });

  it("focuses the first field on open, closes on Escape, and restores focus to the trigger", async () => {
    const user = userEvent.setup();

    render(<OverlayHarness />);

    const trigger = screen.getByRole("button", { name: "Open overlay" });

    await user.click(trigger);

    expect(screen.getByRole("dialog").tagName).toBe("DIALOG");

    const input = screen.getByLabelText("名称");
    expect(input).toHaveFocus();
    expect(screen.getByTestId("hidden-field")).not.toHaveFocus();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    expect(trigger).toHaveFocus();
  });

  it("traps focus with Tab and Shift+Tab across the dialog edges", async () => {
    const user = userEvent.setup();

    render(<OverlayHarness />);

    await user.click(screen.getByRole("button", { name: "Open overlay" }));

    const overlay = screen.getByRole("dialog");
    const closeButton = screen.getByRole("button", { name: "Close overlay" });
    const input = screen.getByLabelText("名称");

    expect(overlay.tagName).toBe("DIALOG");
    expect(input).toHaveFocus();

    await user.keyboard("{Tab}");

    expect(closeButton).toHaveFocus();

    await user.keyboard("{Shift>}{Tab}{/Shift}");

    expect(input).toHaveFocus();
  });

  it("dismisses from the backdrop using the native dialog modal API", async () => {
    const user = userEvent.setup();

    render(<OverlayHarness />);

    await user.click(screen.getByRole("button", { name: "Open overlay" }));

    const overlay = screen.getByRole("dialog");

    expect(showModalMock).toHaveBeenCalledTimes(1);
    expect(overlay.open).toBe(true);

    fireEvent.click(overlay);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it("switches overlay mode on resize without remounting typed form state", async () => {
    const user = userEvent.setup();
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;

    try {
      window.innerWidth = 1280;
      window.innerHeight = 900;

      render(<OverlayHarness />);

      await user.click(screen.getByRole("button", { name: "Open overlay" }));

      const overlay = screen.getByRole("dialog");
      const input = screen.getByLabelText("名称") as HTMLInputElement;

      expect(overlay.tagName).toBe("DIALOG");
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
    } finally {
      window.innerWidth = originalInnerWidth;
      window.innerHeight = originalInnerHeight;
    }
  });
});
