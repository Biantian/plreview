"use client";

import { useId, useLayoutEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmBusyLabel?: string;
  confirmDisabled?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "取消",
  confirmBusyLabel,
  confirmDisabled = false,
  destructive = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    (focusable?.[0] ?? dialogRef.current)?.focus();

    return () => {
      previousActiveElementRef.current?.focus?.();
      previousActiveElementRef.current = null;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const getFocusableElements = () =>
    Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );

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
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="dialog-card"
        data-dialog-card="true"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="dialog-copy">
          <h2 id={titleId}>{title}</h2>
          <p id={descriptionId}>{description}</p>
        </div>

        <div className="dialog-actions">
          <button className="button-ghost button-inline" onClick={onClose} type="button">
            {cancelLabel}
          </button>
          <button
            className={destructive ? "button-secondary button-inline" : "button button-inline"}
            disabled={confirmDisabled}
            onClick={onConfirm}
            type="button"
          >
            {confirmDisabled && confirmBusyLabel ? confirmBusyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
