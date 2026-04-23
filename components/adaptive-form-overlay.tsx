"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type SyntheticEvent,
  type ReactNode,
} from "react";

export type OverlayMode = "drawer" | "dialog";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]):not([hidden]), [href]:not([hidden]), input:not([disabled]):not([type="hidden"]):not([hidden]), select:not([disabled]):not([hidden]), textarea:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"]):not([hidden])';

export function getOverlayMode(width: number, height: number): OverlayMode {
  return width >= 1180 && height >= 760 ? "drawer" : "dialog";
}

type AdaptiveFormOverlayProps = {
  open: boolean;
  title: string;
  description?: string;
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
};

export function AdaptiveFormOverlay({
  open,
  title,
  description,
  footer,
  onClose,
  children,
}: AdaptiveFormOverlayProps) {
  const titleId = useId();
  const descriptionId = useId();
  const overlayRef = useRef<HTMLDialogElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const [mode, setMode] = useState<OverlayMode>(() =>
    typeof window === "undefined" ? "dialog" : getOverlayMode(window.innerWidth, window.innerHeight),
  );

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const dialog = overlayRef.current;

    if (!dialog) {
      return;
    }

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setMode(getOverlayMode(window.innerWidth, window.innerHeight));

    if (typeof dialog.showModal === "function") {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      dialog.setAttribute("open", "");
    }

    const focusable = dialog.querySelectorAll<HTMLElement>(".form-overlay-body " + FOCUSABLE_SELECTOR);
    (focusable?.[0] ?? dialog)?.focus();

    const handleResize = () => {
      setMode(getOverlayMode(window.innerWidth, window.innerHeight));
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      document.body.style.overflow = previousBodyOverflow;
      if (typeof dialog.close === "function" && dialog.open) {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
      previousActiveElementRef.current?.focus?.();
      previousActiveElementRef.current = null;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const getFocusableElements = () =>
    Array.from(overlayRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []);

  const handleClose = () => {
    onClose();
  };

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement, Event>) => {
    event.preventDefault();
    handleClose();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      handleClose();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = getFocusableElements();

    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];
    const activeElement = document.activeElement as HTMLElement | null;
    const activeIndex = focusable.indexOf(activeElement as HTMLElement);

    if (event.shiftKey) {
      if (activeIndex <= 0) {
        event.preventDefault();
        lastFocusable.focus();
      }

      return;
    }

    if (activeIndex === -1 || activeIndex === focusable.length - 1) {
      event.preventDefault();
      firstFocusable.focus();
    }
  };

  return (
    <dialog
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className="form-overlay"
      data-overlay-mode={mode}
      onCancel={handleCancel}
      onKeyDown={handleKeyDown}
      ref={overlayRef}
      role="dialog"
      tabIndex={-1}
    >
      <header className="form-overlay-header">
        <div className="form-overlay-copy">
          <h2 id={titleId}>{title}</h2>
          {description ? <p id={descriptionId}>{description}</p> : null}
        </div>

        <button aria-label="Close overlay" className="form-overlay-close" onClick={onClose} type="button">
          ×
        </button>
      </header>

      <div className="form-overlay-body">{children}</div>

      {footer ? <footer className="form-overlay-footer">{footer}</footer> : null}
    </dialog>
  );
}
