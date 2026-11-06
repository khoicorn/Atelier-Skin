import * as React from "react";
import { ShieldCheck, Trash2, type LucideIcon } from "lucide-react";
import { PlanStatus, ProductStatus } from "../data";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

export function SectionHeader({ title, action, className }: { title: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex min-h-11 items-center justify-between gap-3", className)}>
      <h2 className="font-serif text-[1.5rem] leading-none tracking-[-.015em]">{title}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-black/[.14] px-6 py-9 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-sage/[.1] text-sage"><Icon className="h-5 w-5" strokeWidth={1.6} /></span>
      <p className="mt-4 font-serif text-xl">{title}</p>
      <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-5 text-ink/65">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const pillBase = "inline-flex shrink-0 items-center rounded-full border px-2.5 py-[3px] text-xs font-semibold leading-4";

const planStatusStyle: Record<PlanStatus, string> = {
  planned: "border-black/[.14] text-ink/65",
  booked: "border-champagne/50 bg-champagne/[.16] text-[#6E5A38]",
  completed: "border-sage/35 bg-sage/[.13] text-[#425539]",
  skipped: "border-dashed border-black/[.18] text-ink/55"
};

const planStatusLabel: Record<PlanStatus, string> = { planned: "Planned", booked: "Booked", completed: "Completed", skipped: "Skipped" };

export function PlanStatusPill({ status, className }: { status: PlanStatus; className?: string }) {
  return <span className={cn(pillBase, planStatusStyle[status], className)}>{planStatusLabel[status]}</span>;
}

const productStatusStyle: Record<ProductStatus, string> = {
  unopened: "border-black/[.14] text-ink/65",
  "in-use": "border-sage/35 bg-sage/[.13] text-[#425539]",
  "almost-empty": "border-champagne/50 bg-champagne/[.16] text-[#6E5A38]",
  finished: "border-black/[.1] bg-black/[.03] text-ink/55"
};

const productStatusLabel: Record<ProductStatus, string> = { unopened: "Unopened", "in-use": "In use", "almost-empty": "Almost empty", finished: "Finished" };

export function ProductStatusPill({ status }: { status: ProductStatus }) {
  return <span className={cn(pillBase, productStatusStyle[status])}>{productStatusLabel[status]}</span>;
}

/** One tap deletes. The toast that follows offers Undo. */
export function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <Button type="button" variant="ghost" onClick={onDelete} className="h-12 px-4 text-ink/65">
      <Trash2 className="h-4 w-4" strokeWidth={1.7} />
      Delete
    </Button>
  );
}

export function PrivacyNote({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-center justify-center gap-2 text-center text-xs text-ink/60", className)}>
      <ShieldCheck className="h-4 w-4 shrink-0 text-sage" strokeWidth={1.7} />
      Your skincare records and photos stay on this device.
    </p>
  );
}

export function Stat({ label, value, hint, className }: { label: string; value: React.ReactNode; hint?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="label">{label}</p>
      <p className="mt-1 truncate text-[17px] font-semibold tabular-nums tracking-[-.01em]">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink/65">{hint}</p>}
    </div>
  );
}
