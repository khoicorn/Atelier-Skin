import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "./button";

/** Set while the app itself closes a sheet, so the back handler does not ask "Discard changes?". */
let closingOnPurpose = false;

/**
 * Closes the open sheet. Each sheet adds one browser history entry, so the
 * Android back gesture closes the sheet instead of leaving the app.
 */
export function closeSheet(fallback: () => void) {
  if (window.history.state?.atelierSheet) {
    closingOnPurpose = true;
    window.history.back();
  } else {
    fallback();
  }
}

type SheetProps = {
  eyebrow?: string;
  title: string;
  onClose: () => void;
  footer?: React.ReactNode;
  /** True when the form has unsaved changes. Closing then asks first. */
  dirty?: boolean;
  children: React.ReactNode;
};

export function Sheet({ eyebrow, title, onClose, footer, dirty = false, children }: SheetProps) {
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  const dirtyRef = React.useRef(dirty);
  dirtyRef.current = dirty;
  const [confirming, setConfirming] = React.useState(false);
  const titleId = React.useId();

  const requestClose = React.useCallback(() => {
    if (dirtyRef.current) setConfirming(true);
    else closeSheet(onCloseRef.current);
  }, []);

  React.useEffect(() => {
    if (!window.history.state?.atelierSheet) window.history.pushState({ ...window.history.state, atelierSheet: true }, "");
    const onPop = () => {
      if (!closingOnPurpose && dirtyRef.current) {
        // Back gesture with unsaved edits: stay open and ask.
        window.history.pushState({ ...window.history.state, atelierSheet: true }, "");
        setConfirming(true);
        return;
      }
      closingOnPurpose = false;
      onCloseRef.current();
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") requestClose(); };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [requestClose]);

  // Rendered at the top of <body> so page animations and stacking never trap it.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" aria-label="Close" className="sheet-backdrop absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={requestClose} />
      <div className="sheet-panel relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-black/[.08] bg-paper md:rounded-[1.75rem]">
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-black/10 md:hidden" />
        <header className="flex shrink-0 items-start justify-between gap-4 px-5 pb-3 pt-3 md:px-7 md:pt-6">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 id={titleId} className="font-serif text-[1.6rem] leading-tight tracking-[-.02em]">{title}</h2>
          </div>
          <button type="button" onClick={requestClose} aria-label="Close" className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/60 hover:bg-black/[.04]">
            <X className="h-5 w-5" strokeWidth={1.6} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 md:px-7">{children}</div>
        {(footer || confirming) && (
          <footer className="shrink-0 border-t border-black/[.06] bg-paper/95 px-5 pb-[max(.9rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:px-7">
            {confirming ? (
              <div role="alertdialog" aria-label="Discard changes?">
                <p className="mb-2.5 text-sm font-medium">Discard your changes?</p>
                <div className="flex gap-2">
                  <Button variant="secondary" className="h-12 flex-1" onClick={() => setConfirming(false)}>Keep editing</Button>
                  <Button className="h-12 flex-1 bg-clay hover:bg-clay/90" onClick={() => { dirtyRef.current = false; closeSheet(onCloseRef.current); }}>Discard</Button>
                </div>
              </div>
            ) : footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}

/** True when two drafts differ. Used to mark a sheet form as changed. */
export const isChanged = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);
