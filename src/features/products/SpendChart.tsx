import { MonthSpend } from "../../lib/spending";
import { formatMonth, formatMonthShort } from "../../lib/dates";
import { cn, formatCompact } from "../../lib/utils";

/**
 * Stacked monthly columns: clinic (bottom) and products (top).
 * Tap a column to select that month. Values are carried by the legend.
 */
export function SpendChart({ series, selected, onSelect }: { series: MonthSpend[]; selected: string; onSelect: (month: string) => void }) {
  const max = Math.max(...series.map((item) => item.total), 0);
  const empty = max === 0;

  return (
    <div>
      <div className="relative h-36">
        {empty && <p className="absolute inset-x-0 top-1/3 text-center text-[11px] text-ink/40">No spending recorded in these months</p>}
        <div className="absolute inset-x-0 bottom-0 h-px bg-black/[.09]" />
        <div className="relative grid h-full" style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }}>
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
                className={cn("group relative flex h-full flex-col items-center justify-end rounded-xl transition-colors", active ? "bg-ink/[.035]" : "hover:bg-ink/[.02]")}
              >
                {item.total > 0 && (
                  <span className={cn("mb-1.5 text-[10px] tabular-nums", active ? "font-semibold text-ink" : "text-transparent group-hover:text-ink/50")}>
                    {formatCompact(item.total)}
                  </span>
                )}
                <span className="flex w-6 flex-col gap-[2px]" style={{ height: `${Math.max(height - 14, item.total ? 3 : 0)}%` }}>
                  {item.products > 0 && <span className="w-full rounded-t-[4px] bg-chart-products" style={{ flexGrow: 100 - clinicShare }} />}
                  {item.clinic > 0 && <span className={cn("w-full bg-chart-clinic", item.products === 0 && "rounded-t-[4px]")} style={{ flexGrow: clinicShare }} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-2 grid" style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }}>
        {series.map((item) => (
          <span key={item.month} className={cn("text-center text-[10.5px]", item.month === selected ? "font-semibold text-ink" : "text-ink/40")}>
            {formatMonthShort(item.month)}
          </span>
        ))}
      </div>
    </div>
  );
}
