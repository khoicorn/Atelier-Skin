import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Closes the open sheet. Each sheet adds one browser history entry, so the
 * Android back gesture closes the sheet instead of leaving the app.
 */
export function closeSheet(fallback: () => void) {
  if (window.history.state?.atelierSheet) window.history.back();
  else fallback();
}

type SheetProps = {
  eyebrow?: string;
  title: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

export function Sheet({ eyebrow, title, onClose, footer, children }: SheetProps) {
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = React.useId();

  React.useEffect(() => {
    if (!window.history.state?.atelierSheet) window.history.pushState({ atelierSheet: true }, "");
    const onPop = () => onCloseRef.current();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeSheet(onCloseRef.current); };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, []);

  // Rendered at the top of <body> so page animations and stacking never trap it.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" aria-label="Close" className="sheet-backdrop absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={() => closeSheet(onClose)} />
      <div className="sheet-panel relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-black/[.08] bg-paper md:rounded-[1.75rem]">
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-black/10 md:hidden" />
        <header className="flex shrink-0 items-start justify-between gap-4 px-5 pb-3 pt-4 md:px-7 md:pt-6">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 id={titleId} className="font-serif text-[1.65rem] leading-tight tracking-[-.02em]">{title}</h2>
          </div>
          <button type="button" onClick={() => closeSheet(onClose)} aria-label="Close" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/55 hover:bg-black/[.04]">
            <X className="h-5 w-5" strokeWidth={1.6} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 md:px-7">{children}</div>
        {footer && (
          <footer className={cn("shrink-0 border-t border-black/[.06] bg-paper/95 px-5 pt-3 backdrop-blur md:px-7", "pb-[max(.9rem,env(safe-area-inset-bottom))]")}>
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}
