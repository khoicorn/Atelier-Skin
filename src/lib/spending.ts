import { Plan, Product } from "../data";
import { addMonths, daysBetween, monthEnd, monthOf, monthStart } from "./dates";
import { datedEntries } from "./plan";

export type MonthSpend = { month: string; clinic: number; products: number; total: number };

/** Clinic spending counts completed services only, on the date they happened. */
export const clinicSpend = (plan: Plan, month: string) =>
  datedEntries(plan)
    .filter((entry) => entry.status === "completed" && monthOf(entry.date) === month)
    .reduce((sum, entry) => sum + (entry.price ?? 0), 0);

/** Product spending counts purchases by purchase date. */
export const productSpend = (products: Product[], month: string) =>
  productsBoughtIn(products, month).reduce((sum, item) => sum + (item.price ?? 0), 0);

export const monthSpend = (plan: Plan, products: Product[], month: string): MonthSpend => {
  const clinic = clinicSpend(plan, month);
  const productTotal = productSpend(products, month);
  return { month, clinic, products: productTotal, total: clinic + productTotal };
};

/** `count` months ending with `endMonth`, oldest first. */
export const monthSeries = (plan: Plan, products: Product[], endMonth: string, count = 6) =>
  Array.from({ length: count }, (_, index) => monthSpend(plan, products, addMonths(endMonth, index - count + 1)));

/** Average monthly spend, ignoring empty months before the first recorded spend. */
export const averageMonthly = (series: MonthSpend[]) => {
  const first = series.findIndex((item) => item.total > 0);
  if (first === -1) return 0;
  const active = series.slice(first);
  return Math.round(active.reduce((sum, item) => sum + item.total, 0) / active.length);
};

/** Products with a price but no purchase date. They cannot be placed in a month. */
export const pricedWithoutDate = (products: Product[]) => products.filter((item) => item.price !== null && !item.purchaseDate);

/** Products to rebuy: marked almost empty, or expected to run out within `withinDays`. Soonest first. */
export const buySoon = (products: Product[], today: string, withinDays = 14) =>
  products
    .filter((item) => item.status !== "finished" && item.status !== "unopened")
    .filter((item) => item.status === "almost-empty" || (item.emptyDate && daysBetween(today, item.emptyDate) <= withinDays))
    .sort((a, b) => (a.emptyDate || "9999").localeCompare(b.emptyDate || "9999"));

export const productsBoughtIn = (products: Product[], month: string) =>
  products.filter((item) => item.purchaseDate && monthOf(item.purchaseDate) === month);

/**
 * Products in use at any point during `month`.
 * Starts at the opened date (or purchase date). Ends at the empty date once finished.
 * Items with no dates count as in use for the current month only.
 */
export const productsUsedIn = (products: Product[], month: string, today: string) => {
  const start = monthStart(month);
  const end = monthEnd(month);
  const currentMonth = monthOf(today);
  return products.filter((item) => {
    if (item.status === "unopened") return false;
    const began = item.openedDate || item.purchaseDate;
    const ended = item.status === "finished" ? item.emptyDate : "";
    if (began && began > end) return false;
    if (ended && ended < start) return false;
    if (!ended && month > currentMonth) return false;
    if (!began && !ended) return month === currentMonth;
    if (!began && ended) return monthOf(ended) === month;
    return true;
  });
};
