import * as React from "react";
import { ShieldCheck, Trash2, type LucideIcon } from "lucide-react";
import { PlanStatus, ProductStatus } from "../data";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

export function PageHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="font-serif text-[2.35rem] leading-[.95] tracking-[-.03em] md:text-5xl">{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3.5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="font-serif text-[1.6rem] leading-none tracking-[-.02em]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-black/[.12] px-6 py-10 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-sage/[.09] text-sage"><Icon className="h-5 w-5" strokeWidth={1.6} /></span>
      <p className="mt-4 font-serif text-xl">{title}</p>
      <p className="mx-auto mt-1.5 max-w-xs text-xs leading-5 text-ink/50">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const pillBase = "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10.5px] font-semibold leading-none tracking-[.02em]";

const planStatusStyle: Record<PlanStatus, string> = {
  planned: "border-black/[.12] text-ink/55",
  booked: "border-champagne/40 bg-champagne/[.14] text-[#7A6440]",
  completed: "border-sage/30 bg-sage/[.12] text-[#4B5E45]",
  skipped: "border-dashed border-black/[.15] text-ink/40"
};

const planStatusLabel: Record<PlanStatus, string> = { planned: "Planned", booked: "Booked", completed: "Completed", skipped: "Skipped" };

export function PlanStatusPill({ status, className }: { status: PlanStatus; className?: string }) {
  return <span className={cn(pillBase, planStatusStyle[status], className)}>{planStatusLabel[status]}</span>;
}

const productStatusStyle: Record<ProductStatus, string> = {
  unopened: "border-black/[.12] text-ink/55",
  "in-use": "border-sage/30 bg-sage/[.12] text-[#4B5E45]",
  "almost-empty": "border-champagne/40 bg-champagne/[.14] text-[#7A6440]",
  finished: "border-black/[.08] bg-black/[.03] text-ink/40"
};

const productStatusLabel: Record<ProductStatus, string> = { unopened: "Unopened", "in-use": "In use", "almost-empty": "Almost empty", finished: "Finished" };

export function ProductStatusPill({ status }: { status: ProductStatus }) {
  return <span className={cn(pillBase, productStatusStyle[status])}>{productStatusLabel[status]}</span>;
}

/** Two taps to delete. The first tap arms it for 4 seconds. */
export function DeleteButton({ onConfirm, label = "Delete" }: { onConfirm: () => void; label?: string }) {
  const [armed, setArmed] = React.useState(false);
  React.useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(timer);
  }, [armed]);
  return (
    <Button type="button" variant="ghost" onClick={() => (armed ? onConfirm() : setArmed(true))} className={cn("h-12 px-4 text-ink/60", armed && "bg-clay/10 text-clay hover:bg-clay/15")}>
      <Trash2 className="h-4 w-4" strokeWidth={1.7} />
      {armed ? "Tap again to delete" : label}
    </Button>
  );
}

export function PrivacyNote() {
  return (
    <p className="mt-12 flex items-center justify-center gap-2 text-center text-[11px] text-ink/40">
      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-sage" strokeWidth={1.7} />
      Your skincare records and photos stay on this device.
    </p>
  );
}

export function Stat({ label, value, hint, className }: { label: string; value: React.ReactNode; hint?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-ink/40">{label}</p>
      <p className="mt-1.5 truncate text-[17px] font-semibold tabular-nums tracking-[-.01em]">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-ink/45">{hint}</p>}
    </div>
  );
}
