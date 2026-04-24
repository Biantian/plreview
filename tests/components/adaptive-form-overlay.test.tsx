import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdaptiveFormOverlay, getOverlayMode } from "@/components/adaptive-form-overlay";

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

  it("keeps overlay mode centered across viewport sizes", () => {
    expect(getOverlayMode(1179, 759)).toBe("dialog");
    expect(getOverlayMode(1180, 759)).toBe("dialog");
    expect(getOverlayMode(1179, 760)).toBe("dialog");
    expect(getOverlayMode(1180, 760)).toBe("dialog");
    expect(getOverlayMode(1440, 900)).toBe("dialog");
  });

  it("focuses the first shell control on open, closes on Escape, and restores focus to the trigger", async () => {
    const user = userEvent.setup();

    render(<OverlayHarness />);

    const trigger = screen.getByRole("button", { name: "Open overlay" });

    await user.click(trigger);

    expect(screen.getByRole("dialog").tagName).toBe("DIALOG");

    const closeButton = screen.getByRole("button", { name: "Close overlay" });
    expect(closeButton).toHaveFocus();
    expect(screen.getByTestId("hidden-field")).not.toHaveFocus();
    expect(screen.getByLabelText("名称")).not.toHaveFocus();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    expect(trigger).toHaveFocus();
  });

  it("falls back to focusing the panel when the shell has no focusable controls", async () => {
    const querySelectorAllSpy = vi
      .spyOn(HTMLDialogElement.prototype, "querySelectorAll")
      .mockImplementationOnce(() => [] as unknown as NodeListOf<HTMLElement>);

    try {
      render(
        <AdaptiveFormOverlay open onClose={() => {}} title="编辑信息">
          <p>纯文本内容</p>
        </AdaptiveFormOverlay>,
      );

      expect(screen.getByRole("dialog").querySelector(".form-overlay-panel")).toHaveFocus();
    } finally {
      querySelectorAllSpy.mockRestore();
    }
  });

  it("traps focus with Tab and Shift+Tab across the dialog edges", async () => {
    const user = userEvent.setup();

    render(<OverlayHarness />);

    await user.click(screen.getByRole("button", { name: "Open overlay" }));

    const overlay = screen.getByRole("dialog");
    const closeButton = screen.getByRole("button", { name: "Close overlay" });
    const input = screen.getByLabelText("名称");

    expect(overlay.tagName).toBe("DIALOG");
    expect(closeButton).toHaveFocus();

    await user.keyboard("{Tab}");

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

  it("does not dismiss when clicking inside the panel", async () => {
    render(<OverlayHarness />);

    await userEvent.click(screen.getByRole("button", { name: "Open overlay" }));

    const overlay = screen.getByRole("dialog");
    const panel = overlay.querySelector(".form-overlay-panel");

    expect(panel).toBeInTheDocument();

    fireEvent.click(panel as HTMLElement);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("locks body scroll while open and restores it on close", async () => {
    const user = userEvent.setup();
    const originalOverflow = document.body.style.overflow;

    try {
      document.body.style.overflow = "scroll";

      render(<OverlayHarness />);

      await user.click(screen.getByRole("button", { name: "Open overlay" }));

      expect(document.body.style.overflow).toBe("hidden");

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      expect(document.body.style.overflow).toBe("scroll");
    } finally {
      document.body.style.overflow = originalOverflow;
    }
  });

  it("renders the description, footer, and form body wrapper", () => {
    const { container } = render(
      <AdaptiveFormOverlay
        description="辅助说明"
        footer={<button type="button">保存</button>}
        open
        onClose={() => {}}
        title="编辑信息"
      >
        <input aria-label="名称" defaultValue="" />
      </AdaptiveFormOverlay>,
    );

    expect(screen.getByText("辅助说明")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
    expect(container.querySelector(".form-overlay-body")).toBeInTheDocument();
    expect(container.querySelector(".form-overlay-footer")).toBeInTheDocument();
  });

  it("falls back when native dialog methods are unavailable", async () => {
    const user = userEvent.setup();
    const removeAttributeSpy = vi.spyOn(HTMLDialogElement.prototype, "removeAttribute");

    try {
      Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(HTMLDialogElement.prototype, "close", {
        configurable: true,
        value: undefined,
      });

      render(<OverlayHarness />);

      await user.click(screen.getByRole("button", { name: "Open overlay" }));

      const overlay = screen.getByRole("dialog");

      expect(overlay).toHaveAttribute("open");
      expect(showModalMock).not.toHaveBeenCalled();

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      expect(removeAttributeSpy).toHaveBeenCalledWith("open");
    } finally {
      removeAttributeSpy.mockRestore();
    }
  });

  it("keeps dialog mode on resize without remounting typed form state", async () => {
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
      expect(overlay).toHaveAttribute("data-overlay-mode", "dialog");

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
