import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const vnd = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const grouped = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

/** "1.200.000 ₫" */
export const formatMoney = (value: number) => vnd.format(value);

/** "1.200.000" (for inputs) */
export const formatDigits = (value: number) => grouped.format(value);

/** "1.2M ₫", "850K ₫" (for chart labels) */
export const formatCompact = (value: number) => {
  if (value >= 1_000_000) return `${trim(value / 1_000_000)}M ₫`;
  if (value >= 1_000) return `${trim(value / 1_000)}K ₫`;
  return `${value} ₫`;
};

const trim = (value: number) => (value >= 10 ? Math.round(value).toString() : value.toFixed(1).replace(/\.0$/, ""));

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
