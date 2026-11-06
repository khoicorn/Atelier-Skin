import { createDefaultPlan, DEFAULT_START_DATE, initialProducts, Plan, PlanEntry, Product } from "../data";
import { isISODate } from "./dates";
import { currentWeek } from "./plan";

export const STORAGE_KEYS = {
  plan: "atelier-plan-v2",
  products: "atelier-products-v2",
  schema: "atelier-schema"
} as const;

/** Keys written by version 1 (daily tracking). Read once for migration, never deleted automatically. */
export const LEGACY_KEYS = {
  firstClinic: "atelier-first-clinic",
  dailyLogs: "atelier-daily-logs",
  ledger: "atelier-ledger"
} as const;

const SEEDED_LEDGER_IDS = new Set(["inv-1", "inv-2", "inv-3", "inv-4", "inv-5"]);

type LegacyLedgerItem = {
  id?: string;
  name?: string;
  category?: string;
  price?: number;
  purchaseDate?: string;
  emptyDate?: string;
};

type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const readJSON = <T>(store: KeyValueStore, key: string): T | null => {
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const legacyLedger = (store: KeyValueStore) => {
  const items = readJSON<LegacyLedgerItem[]>(store, LEGACY_KEYS.ledger);
  return Array.isArray(items) ? items.filter((item) => item && typeof item.name === "string" && item.name.trim()) : [];
};

const priceOrNull = (value: unknown) => (typeof value === "number" && value > 0 ? value : null);

/**
 * One-time upgrade from version 1. Builds the plan and product list from old data
 * and leaves the old keys in place, so nothing is lost.
 * The plan starts on DEFAULT_START_DATE (the confirmed week 1 visit), not the old
 * version's first clinic date, which was only an automatic default.
 */
export function migrateLegacyData(store: KeyValueStore, makeId: () => string) {
  if (store.getItem(STORAGE_KEYS.schema) === "2") return;
  const ledger = legacyLedger(store);

  if (!store.getItem(STORAGE_KEYS.plan)) {
    const plan = createDefaultPlan(DEFAULT_START_DATE);
    const imported: PlanEntry[] = ledger
      .filter((item) => item.category === "Clinic")
      .map((item) => {
        const date = isISODate(item.purchaseDate) ? item.purchaseDate : undefined;
        return {
          id: makeId(),
          week: date ? Math.max(1, currentWeek(plan, date)) : 1,
          service: item.name!.trim(),
          clinic: "",
          price: priceOrNull(item.price),
          note: "Imported from the old ledger",
          status: "completed",
          customDate: date
        };
      });
    const result: Plan = { ...plan, entries: [...plan.entries, ...imported] };
    store.setItem(STORAGE_KEYS.plan, JSON.stringify(result));
  }

  if (!store.getItem(STORAGE_KEYS.products)) {
    const added: Product[] = ledger
      .filter((item) => (item.category === "Skincare" || item.category === "Supplement") && !SEEDED_LEDGER_IDS.has(item.id ?? ""))
      .map((item) => ({
        id: makeId(),
        name: item.name!.trim(),
        brand: "",
        category: item.category === "Supplement" ? "supplement" : "skincare",
        price: priceOrNull(item.price),
        purchaseDate: isISODate(item.purchaseDate) ? item.purchaseDate : "",
        openedDate: "",
        emptyDate: isISODate(item.emptyDate) ? item.emptyDate : "",
        status: "in-use",
        note: ""
      }));
    store.setItem(STORAGE_KEYS.products, JSON.stringify([...initialProducts, ...added]));
  }

  store.setItem(STORAGE_KEYS.schema, "2");
}

/** What is left from version 1, so the user can download it and remove it on purpose. */
export function legacySummary(store: KeyValueStore) {
  const logs = readJSON<Record<string, unknown>>(store, LEGACY_KEYS.dailyLogs);
  const hasAny = Object.values(LEGACY_KEYS).some((key) => store.getItem(key) !== null);
  return {
    hasAny,
    dailyCheckIns: logs && typeof logs === "object" ? Object.keys(logs).length : 0,
    ledgerItems: legacyLedger(store).length
  };
}

export function exportLegacy(store: KeyValueStore) {
  const data = Object.fromEntries(Object.values(LEGACY_KEYS).map((key) => [key, readJSON<unknown>(store, key)]));
  return JSON.stringify({ exportedFrom: "Atelier Skin v1", ...data }, null, 2);
}

export function removeLegacy(store: KeyValueStore) {
  Object.values(LEGACY_KEYS).forEach((key) => store.removeItem(key));
}
