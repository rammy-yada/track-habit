"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";

export function Modal({ open, onClose, title, children, width = "max-w-md" }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: string }) {
  const panel = useRef<HTMLDivElement>(null);
  // The latest onClose is kept in a ref so the effect below runs only when
  // the sheet opens or closes. (If it re-ran whenever a caller passed a new
  // function — which happens on every keystroke in a form — the focus would
  // jump back to the first field while someone was typing in another.)
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    // the element marked data-autofocus wins; otherwise the first field
    const target = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.current?.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select");
    target?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Rendered into <body> so no animated ancestor can trap the fixed overlay.
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div data-sheet className="fixed inset-0 z-50 grid place-items-end p-0 sm:place-items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[3px]" onClick={onClose} />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`relative max-h-[92dvh] w-full ${width} overflow-y-auto rounded-t-3xl border border-line bg-card p-6 shadow-2xl sm:rounded-3xl`}
            initial={{ y: 40, scale: 0.94, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 24, scale: 0.97, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-ink">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
