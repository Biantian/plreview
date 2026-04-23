"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

export type OverlayMode = "drawer" | "dialog";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const [mode, setMode] = useState<OverlayMode>(() =>
    typeof window === "undefined" ? "dialog" : getOverlayMode(window.innerWidth, window.innerHeight),
  );

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setMode(getOverlayMode(window.innerWidth, window.innerHeight));

    const focusable = overlayRef.current?.querySelectorAll<HTMLElement>(".form-overlay-body " + FOCUSABLE_SELECTOR);
    (focusable?.[0] ?? overlayRef.current)?.focus();

    const handleResize = () => {
      setMode(getOverlayMode(window.innerWidth, window.innerHeight));
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      document.body.style.overflow = previousBodyOverflow;
      previousActiveElementRef.current?.focus?.();
      previousActiveElementRef.current = null;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const getFocusableElements = () =>
    Array.from(overlayRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
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
    <div
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      aria-modal="true"
      className="form-overlay"
      data-overlay-mode={mode}
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
    </div>
  );
}
