import { describe, expect, it } from "vitest";
import { createDefaultPlan, initialProducts, Plan, Product, SERVICE_AQUA, SERVICE_IPL } from "../data";
import { addDays, addMonths, daysBetween, monthEnd, relativeDay } from "./dates";
import { exportLegacy, LEGACY_KEYS, legacySummary, migrateLegacyData, removeLegacy, STORAGE_KEYS } from "./migrate";
import { currentWeek, datedEntries, newEntryDefaults, nextService, pastOpenServices, planCosts, serviceStats, servicesBetween } from "./plan";
import { averageMonthly, buySoon, monthSeries, pricedWithoutDate, productsBoughtIn, productsUsedIn } from "./spending";

const memoryStore = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key)
  };
};

let counter = 0;
const makeId = () => `id-${++counter}`;

const product = (overrides: Partial<Product>): Product => ({
  id: makeId(), name: "Item", brand: "", category: "skincare", price: null,
  purchaseDate: "", openedDate: "", emptyDate: "", status: "in-use", note: "", ...overrides
});

describe("dates", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-12-29", 7)).toBe("2027-01-05");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("counts days between dates", () => {
    expect(daysBetween("2026-11-06", "2026-11-20")).toBe(14);
    expect(daysBetween("2026-11-20", "2026-11-06")).toBe(-14);
  });
  it("moves months and finds month end", () => {
    expect(addMonths("2026-11", 2)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(monthEnd("2028-02")).toBe("2028-02-29");
  });
  it("describes relative days", () => {
    expect(relativeDay("2026-11-06", "2026-11-06")).toBe("Today");
    expect(relativeDay("2026-11-09", "2026-11-06")).toBe("In 3 days");
    expect(relativeDay("2026-11-03", "2026-11-06")).toBe("3 days ago");
  });
});

describe("weekly plan", () => {
  const plan = createDefaultPlan("2026-11-06");

  it("preloads six alternating weeks; only week 1 has a known price", () => {
    expect(plan.entries).toHaveLength(6);
    expect(plan.entries.map((entry) => entry.service)).toEqual([SERVICE_IPL, SERVICE_AQUA, SERVICE_IPL, SERVICE_AQUA, SERVICE_IPL, SERVICE_AQUA]);
    expect(plan.entries[0]).toMatchObject({ week: 1, price: 850_000, status: "completed" });
    expect(plan.entries.slice(1).every((entry) => entry.price === null && entry.status === "planned")).toBe(true);
  });

  it("starts the default plan on the confirmed week 1 date", () => {
    const fresh = createDefaultPlan();
    expect(fresh.startDate).toBe("2026-10-31");
    expect(currentWeek(fresh, "2026-11-06")).toBe(1);
    expect(nextService(fresh, "2026-11-06")).toMatchObject({ week: 2, date: "2026-11-07" });
  });

  it("derives weekly dates from the first clinic date", () => {
    expect(datedEntries(plan).map((entry) => entry.date)).toEqual(["2026-11-06", "2026-11-13", "2026-11-20", "2026-11-27", "2026-12-04", "2026-12-11"]);
    const moved: Plan = { ...plan, startDate: "2026-11-10" };
    expect(datedEntries(moved)[2].date).toBe("2026-11-24");
  });

  it("keeps a rescheduled date when the first clinic date changes", () => {
    const edited: Plan = { ...plan, startDate: "2026-11-10", entries: plan.entries.map((entry) => entry.week === 3 ? { ...entry, customDate: "2026-11-21" } : entry) };
    const dates = datedEntries(edited);
    expect(dates.find((entry) => entry.week === 3)?.date).toBe("2026-11-21");
    expect(dates.find((entry) => entry.week === 4)?.date).toBe("2026-12-01");
  });

  it("finds the current week and the next open service", () => {
    expect(currentWeek(plan, "2026-11-05")).toBe(0);
    expect(currentWeek(plan, "2026-11-06")).toBe(1);
    expect(currentWeek(plan, "2026-11-19")).toBe(2);
    const withDone: Plan = { ...plan, entries: plan.entries.map((entry) => entry.week === 1 ? { ...entry, status: "completed" } : entry) };
    expect(nextService(withDone, "2026-11-06")?.week).toBe(2);
    expect(pastOpenServices(plan, "2026-11-14").map((entry) => entry.week)).toEqual([2]);
  });

  it("totals planned and completed clinic cost separately", () => {
    const priced: Plan = {
      ...plan,
      entries: plan.entries.map((entry) =>
        entry.week === 1 ? { ...entry, price: 1_000_000, status: "completed" }
          : entry.week === 2 ? { ...entry, price: 800_000, status: "skipped" }
            : entry.week === 3 ? { ...entry, price: 1_000_000 } : entry)
    };
    expect(planCosts(priced)).toEqual({ planned: 2_000_000, completed: 1_000_000, remaining: 1_000_000, missingPrices: 3 });
  });

  it("continues the alternation and reuses the last known price when adding a week", () => {
    const priced: Plan = { ...plan, entries: plan.entries.map((entry) => entry.week === 5 ? { ...entry, price: 900_000 } : entry) };
    const next = newEntryDefaults(priced, "new");
    expect(next).toMatchObject({ week: 7, service: SERVICE_IPL, price: 900_000, status: "planned" });
  });

  it("summarises results per service and lists services between photos", () => {
    const rated: Plan = {
      ...plan,
      entries: plan.entries.map((entry) =>
        entry.week === 1 ? { ...entry, status: "completed", result: "better", price: 500_000 }
          : entry.week === 3 ? { ...entry, status: "completed" }
            : entry.week === 2 ? { ...entry, status: "skipped" } : entry)
    };
    const ipl = serviceStats(rated).find((item) => item.service === SERVICE_IPL)!;
    expect(ipl).toMatchObject({ sessions: 3, completed: 2, spent: 500_000, unrated: 1, results: { better: 1, same: 0, worse: 0 } });
    expect(servicesBetween(rated, "2026-11-05", "2026-11-20").map((entry) => entry.week)).toEqual([1, 3]);
    expect(servicesBetween(rated, "2026-11-20", "2026-11-05").map((entry) => entry.week)).toEqual([1, 3]);
  });
});

describe("spending", () => {
  const plan: Plan = {
    ...createDefaultPlan("2026-10-30"),
    entries: [
      { id: "a", week: 1, service: SERVICE_IPL, clinic: "", price: 1_200_000, note: "", status: "completed" },
      { id: "b", week: 2, service: SERVICE_AQUA, clinic: "", price: 900_000, note: "", status: "booked" }
    ]
  };
  const products = [
    product({ price: 450_000, purchaseDate: "2026-11-02" }),
    product({ price: null, purchaseDate: "2026-11-03" }),
    product({ price: 300_000, purchaseDate: "2026-09-15" })
  ];

  it("keeps clinic and product spending apart and counts only completed services", () => {
    const series = monthSeries(plan, products, "2026-11", 3);
    expect(series.map((item) => item.month)).toEqual(["2026-09", "2026-10", "2026-11"]);
    expect(series[1]).toMatchObject({ clinic: 1_200_000, products: 0, total: 1_200_000 });
    expect(series[2]).toMatchObject({ clinic: 0, products: 450_000, total: 450_000 });
  });

  it("averages from the first month with spending", () => {
    expect(averageMonthly(monthSeries(plan, products, "2026-11", 6))).toBe(Math.round((300_000 + 1_200_000 + 450_000) / 3));
    expect(averageMonthly(monthSeries(plan, [], "2026-09", 3))).toBe(0);
  });

  it("lists products bought and used in a month", () => {
    expect(productsBoughtIn(products, "2026-11")).toHaveLength(2);
    const items = [
      product({ name: "open", openedDate: "2026-10-01" }),
      product({ name: "done", openedDate: "2026-08-01", status: "finished", emptyDate: "2026-09-20" }),
      product({ name: "new", status: "unopened", purchaseDate: "2026-11-01" }),
      product({ name: "undated" })
    ];
    const names = (month: string) => productsUsedIn(items, month, "2026-11-06").map((item) => item.name);
    expect(names("2026-09")).toEqual(["done"]);
    expect(names("2026-10")).toEqual(["open"]);
    expect(names("2026-11")).toEqual(["open", "undated"]);
    expect(names("2026-12")).toEqual([]);
  });
});

describe("starting data from the user", () => {
  const plan = createDefaultPlan();

  it("splits October and November spending into clinic and products", () => {
    const [october, november] = monthSeries(plan, initialProducts, "2026-11", 2);
    expect(october).toMatchObject({ clinic: 850_000, products: 258_000 + 400_000, total: 1_508_000 });
    expect(november).toMatchObject({ clinic: 0, products: 169_000, total: 169_000 });
  });

  it("flags the fish oil to buy soon and nothing priced without a date", () => {
    expect(buySoon(initialProducts, "2026-11-06").map((item) => item.name)).toEqual(["Omega-3 Fish Oil"]);
    expect(pricedWithoutDate(initialProducts)).toHaveLength(0);
  });

  it("finds products expiring soon, ignoring finished and unopened ones", () => {
    const items = [
      product({ name: "late", emptyDate: "2026-12-30" }),
      product({ name: "soon", emptyDate: "2026-11-10" }),
      product({ name: "done", status: "finished", emptyDate: "2026-11-01" }),
      product({ name: "sealed", status: "unopened", emptyDate: "2026-11-08" }),
      product({ name: "low", status: "almost-empty" })
    ];
    expect(buySoon(items, "2026-11-06").map((item) => item.name)).toEqual(["soon", "low"]);
    expect(pricedWithoutDate([product({ price: 100_000 }), product({ price: 100_000, purchaseDate: "2026-11-01" })])).toHaveLength(1);
  });
});

describe("migration from version 1", () => {
  it("creates the default plan and products on a fresh install", () => {
    const store = memoryStore();
    migrateLegacyData(store, makeId);
    const plan = JSON.parse(store.getItem(STORAGE_KEYS.plan)!) as Plan;
    expect(plan.startDate).toBe("2026-10-31");
    expect(plan.entries).toHaveLength(6);
    expect(JSON.parse(store.getItem(STORAGE_KEYS.products)!)).toEqual(initialProducts);
    expect(legacySummary(store).hasAny).toBe(false);
  });

  it("starts on the confirmed week 1 date and keeps old purchases without deleting old keys", () => {
    const ledger = [
      { id: "inv-1", name: "Torriden Balanceful Cica Sunscreen", category: "Skincare", price: 0, purchaseDate: "" },
      { id: "u1", name: "Hasaki IPL session", category: "Clinic", price: 1_500_000, purchaseDate: "2026-11-14" },
      { id: "u2", name: "Niacinamide serum", category: "Skincare", price: 390_000, purchaseDate: "2026-11-02", emptyDate: "2027-01-02" }
    ];
    const store = memoryStore({
      [LEGACY_KEYS.firstClinic]: JSON.stringify("2026-11-07"),
      [LEGACY_KEYS.dailyLogs]: JSON.stringify({ "2026-11-06": { redness: 4 } }),
      [LEGACY_KEYS.ledger]: JSON.stringify(ledger)
    });
    migrateLegacyData(store, makeId);

    const plan = JSON.parse(store.getItem(STORAGE_KEYS.plan)!) as Plan;
    expect(plan.startDate).toBe("2026-10-31");
    const imported = plan.entries.find((entry) => entry.service === "Hasaki IPL session")!;
    expect(imported).toMatchObject({ status: "completed", price: 1_500_000, customDate: "2026-11-14", week: 3 });

    const products = JSON.parse(store.getItem(STORAGE_KEYS.products)!) as Product[];
    expect(products).toHaveLength(initialProducts.length + 1);
    expect(products.at(-1)).toMatchObject({ name: "Niacinamide serum", price: 390_000, purchaseDate: "2026-11-02", emptyDate: "2027-01-02" });

    expect(store.getItem(LEGACY_KEYS.dailyLogs)).not.toBeNull();
    expect(legacySummary(store)).toEqual({ hasAny: true, dailyCheckIns: 1, ledgerItems: 3 });
    expect(JSON.parse(exportLegacy(store))[LEGACY_KEYS.ledger]).toHaveLength(3);
  });

  it("never overwrites version 2 data and runs only once", () => {
    const store = memoryStore({ [STORAGE_KEYS.plan]: "{\"keep\":true}" });
    migrateLegacyData(store, makeId);
    expect(store.getItem(STORAGE_KEYS.plan)).toBe("{\"keep\":true}");
    store.setItem(STORAGE_KEYS.products, "[]");
    migrateLegacyData(store, makeId);
    expect(store.getItem(STORAGE_KEYS.products)).toBe("[]");
  });

  it("removes old keys only when asked", () => {
    const store = memoryStore({ [LEGACY_KEYS.dailyLogs]: "{}", [LEGACY_KEYS.ledger]: "[]", [LEGACY_KEYS.firstClinic]: "\"2026-11-07\"" });
    removeLegacy(store);
    expect(legacySummary(store).hasAny).toBe(false);
  });
});
