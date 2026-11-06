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

/**
 * Reads a VND amount the way people type it in Vietnam.
 * "1.200.000" → 1200000, "850k" → 850000, "1tr1" → 1100000, "1,5tr" → 1500000.
 * Returns null when the text is empty or not an amount.
 */
export function parseVND(input: string): number | null {
  const text = input.trim().toLowerCase().replace(/\s+/g, "").replace(/₫|đ|vnd|vnđ/g, "");
  if (!text) return null;
  const unit = text.match(/^(\d+(?:[.,]\d+)?)(k|tr|triệu|trieu|m)(\d*)$/);
  if (unit) {
    const [, number, name, tail] = unit;
    const base = Number(number.replace(",", "."));
    const extra = tail ? Number(`0.${tail}`) : 0;
    return Math.round((base + extra) * (name === "k" ? 1_000 : 1_000_000));
  }
  const digits = text.replace(/[.,]/g, "");
  return /^\d{1,12}$/.test(digits) ? Number(digits) : null;
}

const trim = (value: number) => (value >= 10 ? Math.round(value).toString() : value.toFixed(1).replace(/\.0$/, ""));

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
