import * as React from "react";
import { CalendarDays, Clock } from "lucide-react";
import { formatDayYear } from "../../lib/dates";
import { cn, formatDigits, formatMoney, parseVND } from "../../lib/utils";

export function Field({ label, hint, children, className }: { label: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("form-field", className)}>
      <span>{label}</span>
      {children}
      {hint && <small className="mt-1.5 block text-xs leading-4 text-ink/60">{hint}</small>}
    </label>
  );
}

/**
 * VND amount. Accepts "1.200.000", "850k" or "1tr1". Empty means "unknown".
 * The "000" key appends three zeros without closing the phone's number pad.
 */
export function MoneyInput({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  const [text, setText] = React.useState(value === null ? "" : formatDigits(value));
  const [focused, setFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!focused) setText(value === null ? "" : formatDigits(value));
  }, [value, focused]);

  const update = (raw: string) => {
    setText(raw);
    onChange(raw.trim() ? parseVND(raw) : null);
  };

  const invalid = text.trim() !== "" && value === null;
  const shorthand = /[a-z]/i.test(text) && value !== null;
  const tiny = value !== null && value > 0 && value < 10_000;

  return (
    <div>
      <div className="relative">
        <input
          ref={inputRef}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Add price"
          value={text}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => update(event.target.value)}
          className="pr-20 tabular-nums"
        />
        <button
          type="button"
          tabIndex={-1}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => { update(`${text.replace(/\D/g, "") || "0"}000`.replace(/^0+(?=\d)/, "")); inputRef.current?.focus(); }}
          className="absolute right-1.5 top-1/2 h-9 -translate-y-1/2 rounded-lg border border-black/10 bg-white/70 px-2 text-xs font-medium text-ink/70"
          aria-label="Add three zeros"
        >
          000
        </button>
      </div>
      {(invalid || shorthand || tiny) && (
        <small className={cn("mt-1.5 block text-xs leading-4", invalid || tiny ? "text-clay" : "text-ink/60")}>
          {invalid ? "Not a price. Try 850000 or 850k." : tiny ? `= ${formatMoney(value!)}. Did you mean ${formatDigits(value! * 1000)}?` : `= ${formatMoney(value!)}`}
        </small>
      )}
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
              "min-h-11 rounded-xl border px-2 text-[13px] font-medium transition-colors",
              active ? "border-ink bg-ink text-white" : "border-black/10 bg-white/50 text-ink/70 hover:bg-white"
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
        "min-h-11 rounded-full border px-4 text-[13px] transition-colors",
        active ? "border-ink bg-ink text-white" : "border-black/10 bg-white/50 text-ink/70 hover:bg-white"
      )}
    >
      {children}
    </button>
  );
}

const openPicker = (event: React.MouseEvent<HTMLInputElement>) => {
  try {
    event.currentTarget.showPicker?.();
  } catch {
    // Some browsers block showPicker; the native tap still works.
  }
};

/**
 * Date field that always reads "Sat 7 Nov 2026", whatever the phone's language.
 * The real date input sits invisibly on top so a tap opens the phone's picker.
 */
export function DateInput({ value, onChange, optional, placeholder = "Add date", label }: {
  value: string; onChange: (value: string) => void; optional?: boolean; placeholder?: string; label?: string;
}) {
  return (
    <div className="field-wrap relative">
      <div className="field-box">
        <span className={cn("truncate", !value && "text-ink/40")}>{value ? formatDayYear(value) : placeholder}</span>
        {!(optional && value) && <CalendarDays className="h-4 w-4 shrink-0 text-ink/45" strokeWidth={1.6} />}
      </div>
      <input type="date" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} onClick={openPicker} className="native-picker !h-full" />
      {optional && value && (
        <button type="button" onClick={(event) => { event.preventDefault(); onChange(""); }} className="absolute right-1.5 top-1/2 z-10 h-9 -translate-y-1/2 rounded-lg px-2.5 text-xs font-medium text-ink/60 hover:bg-black/[.04]">
          Clear
        </button>
      )}
    </div>
  );
}

/** Optional time, shown as "10:00". */
export function TimeInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="field-wrap relative">
      <div className="field-box">
        <span className={cn(!value && "text-ink/40")}>{value || "Add time"}</span>
        {!value && <Clock className="h-4 w-4 shrink-0 text-ink/45" strokeWidth={1.6} />}
      </div>
      <input type="time" aria-label="Time" value={value} onChange={(event) => onChange(event.target.value)} onClick={openPicker} className="native-picker !h-full" />
      {value && (
        <button type="button" onClick={(event) => { event.preventDefault(); onChange(""); }} className="absolute right-1.5 top-1/2 z-10 h-9 -translate-y-1/2 rounded-lg px-2.5 text-xs font-medium text-ink/60 hover:bg-black/[.04]">
          Clear
        </button>
      )}
    </div>
  );
}
