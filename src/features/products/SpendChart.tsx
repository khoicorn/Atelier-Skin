import { MonthSpend } from "../../lib/spending";
import { formatMonth, formatMonthShort } from "../../lib/dates";
import { cn, formatCompact } from "../../lib/utils";

/**
 * Stacked monthly columns: clinic (bottom) and products (top).
 * Every month with spending shows its total. Tap a column to select that month.
 */
export function SpendChart({ series, selected, onSelect }: { series: MonthSpend[]; selected: string; onSelect: (month: string) => void }) {
  const max = Math.max(...series.map((item) => item.total), 0);
  const empty = max === 0;
  const columns = { gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` };

  return (
    <div>
      <div className="relative h-28">
        {empty && <p className="absolute inset-x-0 top-1/3 text-center text-[13px] text-ink/60">No spending recorded in these months</p>}
        <div className="absolute inset-x-0 bottom-0 h-px bg-black/[.1]" />
        <div className="relative grid h-full" style={columns}>
          {series.map((item) => {
            const active = item.month === selected;
            const height = empty ? 0 : (item.total / max) * 100;
            const clinicShare = item.total ? (item.clinic / item.total) * 100 : 0;
            return (
              <button
                key={item.month}
                type="button"
                onClick={() => onSelect(item.month)}
                aria-pressed={active}
                aria-label={`${formatMonth(item.month)}: ${formatCompact(item.total)} total, ${formatCompact(item.clinic)} clinic, ${formatCompact(item.products)} products`}
                className="flex h-full flex-col items-center justify-end"
              >
                {item.total > 0 && (
                  <span className={cn("mb-1 text-xs tabular-nums", active ? "font-semibold text-ink" : "text-ink/60")}>{formatCompact(item.total)}</span>
                )}
                <span className="flex w-6 flex-col gap-[2px]" style={{ height: `${Math.max(height - 18, item.total ? 4 : 0)}%` }}>
                  {item.products > 0 && <span className="w-full rounded-t-[4px] bg-chart-products" style={{ flexGrow: 100 - clinicShare }} />}
                  {item.clinic > 0 && <span className={cn("w-full bg-chart-clinic", item.products === 0 && "rounded-t-[4px]")} style={{ flexGrow: clinicShare }} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-1.5 grid" style={columns}>
        {series.map((item) => (
          <button
            key={item.month}
            type="button"
            tabIndex={-1}
            onClick={() => onSelect(item.month)}
            className={cn("h-8 text-center text-xs", item.month === selected ? "font-semibold text-ink underline decoration-2 underline-offset-[6px]" : "text-ink/60")}
          >
            {formatMonthShort(item.month)}
          </button>
        ))}
      </div>
    </div>
  );
}
