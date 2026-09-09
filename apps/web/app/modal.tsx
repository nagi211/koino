"use client";

import { createPortal } from "react-dom";

export function Modal({
  open,
  onClose,
  children,
  widthClassName = "max-w-sm",
  confirmClose,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  widthClassName?: string;
  /** Runs before actually closing, whether triggered by the backdrop or the ✕
   * button — return false to keep the modal open. Used to ask the user to
   * confirm discarding unsaved changes; omit for modals that never need that. */
  confirmClose?: () => boolean;
}) {
  if (!open) return null;

  function requestClose() {
    if (confirmClose && !confirmClose()) return;
    onClose();
  }

  // Portaled to <body>: `position: fixed` is only relative to the true viewport
  // when every ancestor is un-transformed — react-grid-layout positions each
  // panel with `transform: translate(...)`, which (per spec) makes that panel a
  // new containing block for any fixed descendant. A modal opened from inside a
  // panel (e.g. the profile viewers list) would otherwise get trapped inside
  // that panel's own box — dim backdrop and all — instead of covering the page.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={requestClose}
    >
      {/* max-h + flex-col here, with the scrolling isolated to the inner div below
          (not this outer one): a form long enough to exceed the viewport (e.g. the
          favorite verse editor, with its search UI on top of the full panel-style
          controls) would otherwise grow the modal past the screen with no way to
          scroll down to it — the ✕ button stays fixed in place across scrolling by
          living outside the scrollable div, positioned absolute against this one. */}
      <div
        className={`relative flex max-h-[85vh] w-full flex-col ${widthClassName} rounded-3xl border border-card-border bg-card shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={requestClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 text-muted hover:text-foreground"
        >
          ✕
        </button>
        <div className="overflow-y-auto p-8">{children}</div>
      </div>
    </div>,
    document.body
  );
}
