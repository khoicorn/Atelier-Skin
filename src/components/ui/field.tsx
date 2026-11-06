import * as React from "react";
import { cn, formatDigits } from "../../lib/utils";

export function Field({ label, hint, children, className }: { label: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("form-field", className)}>
      <span>{label}</span>
      {children}
      {hint && <small className="mt-1.5 block text-[11px] leading-4 text-ink/45">{hint}</small>}
    </label>
  );
}

/** VND amount. Shows dot-grouped digits while typing; empty means "unknown". */
export function MoneyInput({ value, onChange, id }: { value: number | null; onChange: (value: number | null) => void; id?: string }) {
  return (
    <div className="relative">
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="Add price"
        value={value === null ? "" : formatDigits(value)}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "").slice(0, 12);
          onChange(digits ? Number(digits) : null);
        }}
        className="pr-9 tabular-nums"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink/40">₫</span>
    </div>
  );
}

type Option<T extends string> = { value: T; label: string };

/** Single choice. `allowEmpty` lets a second tap clear the choice. */
export function Segmented<T extends string>({ options, value, onChange, columns, allowEmpty, label }: {
  options: Option<T>[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  columns?: number;
  allowEmpty?: boolean;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active && allowEmpty ? undefined : option.value)}
            className={cn(
              "min-h-11 rounded-xl border px-2 text-[12.5px] font-medium transition-colors",
              active ? "border-ink bg-ink text-white" : "border-black/10 bg-white/50 text-ink/65 hover:bg-white"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function ChipToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-h-10 rounded-full border px-3.5 text-[12px] transition-colors",
        active ? "border-sage bg-sage text-white" : "border-black/10 bg-white/50 text-ink/65 hover:bg-white"
      )}
    >
      {children}
    </button>
  );
}

/** Optional date with a clear action, because native pickers often lack one. */
export function DateInput({ value, onChange, optional }: { value: string; onChange: (value: string) => void; optional?: boolean }) {
  return (
    <div className="relative">
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className={cn(optional && value && "pr-16")} />
      {optional && value && (
        <button type="button" onClick={() => onChange("")} className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-lg px-2 text-[11px] text-ink/50 hover:bg-black/[.04]">
          Clear
        </button>
      )}
    </div>
  );
}
