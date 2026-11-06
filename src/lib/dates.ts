/** All dates are local calendar dates stored as "YYYY-MM-DD". Months are "YYYY-MM". */

export const localISO = (date = new Date()) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

export const todayISO = () => localISO();

export const isISODate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const toUTC = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

const fromUTC = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const addDays = (iso: string, amount: number) => fromUTC(toUTC(iso) + amount * 86_400_000);

/** Whole days from `from` to `to` (positive when `to` is later). */
export const daysBetween = (from: string, to: string) => Math.round((toUTC(to) - toUTC(from)) / 86_400_000);

export const monthOf = (iso: string) => iso.slice(0, 7);

export const addMonths = (month: string, amount: number) => {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + amount;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
};

export const monthStart = (month: string) => `${month}-01`;

export const monthEnd = (month: string) => addDays(monthStart(addMonths(month, 1)), -1);

const asDate = (iso: string) => new Date(toUTC(iso));
const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" });

/** "Thu 13 Nov" */
export const formatDay = (iso: string) => fmt({ weekday: "short", day: "numeric", month: "short" }).format(asDate(iso));
/** "Thu 13 Nov 2026" */
export const formatDayYear = (iso: string) => fmt({ weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(asDate(iso));
/** "13 Nov 2026" */
export const formatDate = (iso: string) => fmt({ day: "numeric", month: "short", year: "numeric" }).format(asDate(iso));
/** "13 Nov", or "13 Nov 2027" when `today` is given and the year differs. */
export const formatShort = (iso: string, today?: string) =>
  today && iso.slice(0, 4) !== today.slice(0, 4) ? formatDate(iso) : fmt({ day: "numeric", month: "short" }).format(asDate(iso));
/** "November 2026" */
export const formatMonth = (month: string) => fmt({ month: "long", year: "numeric" }).format(asDate(monthStart(month)));
/** "Nov" */
export const formatMonthShort = (month: string) => fmt({ month: "short" }).format(asDate(monthStart(month)));

/** "Today", "Tomorrow", "In 3 days", "Yesterday", "3 days ago" */
export const relativeDay = (iso: string, today: string) => {
  const diff = daysBetween(today, iso);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return diff > 0 ? `In ${diff} days` : `${-diff} days ago`;
};
