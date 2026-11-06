/* ---------- Weekly plan ---------- */

export type PlanStatus = "planned" | "booked" | "completed" | "skipped";
export type PlanResult = "better" | "same" | "worse";

export type PlanEntry = {
  id: string;
  /** Week number in the plan. Week 1 starts on `Plan.startDate`. */
  week: number;
  service: string;
  clinic: string;
  /** VND. `null` means the price is not known yet. */
  price: number | null;
  note: string;
  status: PlanStatus;
  /** Set only when this visit was moved off the weekly rhythm. */
  customDate?: string;
  /** How the skin responded after this service. Only used when completed. */
  result?: PlanResult;
};

export type Plan = {
  startDate: string;
  phase: string;
  entries: PlanEntry[];
};

export const SERVICE_IPL = "IPL F-AC / F-SR Therapy";
export const SERVICE_AQUA = "Aqua Mesoderm Fusion Radiance";
export const PRESET_SERVICES = [SERVICE_IPL, SERVICE_AQUA];
export const DEFAULT_CLINIC = "Hasaki Clinic";
export const DEFAULT_PHASE = "Phase 1 — Healing & Acne Clearance";

export const PLAN_STATUSES: { value: PlanStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "booked", label: "Booked" },
  { value: "completed", label: "Completed" },
  { value: "skipped", label: "Skipped" }
];

export const PLAN_RESULTS: { value: PlanResult; label: string }[] = [
  { value: "better", label: "Better" },
  { value: "same", label: "No change" },
  { value: "worse", label: "Worse" }
];

/** Week 1 (IPL) was done on 31 Oct 2026. Later weeks follow every 7 days. */
export const DEFAULT_START_DATE = "2026-10-31";

export const createDefaultPlan = (startDate = DEFAULT_START_DATE): Plan => ({
  startDate,
  phase: DEFAULT_PHASE,
  entries: Array.from({ length: 6 }, (_, index): PlanEntry => ({
    id: `plan-week-${index + 1}`,
    week: index + 1,
    service: index % 2 === 0 ? SERVICE_IPL : SERVICE_AQUA,
    clinic: DEFAULT_CLINIC,
    price: null,
    note: "",
    status: "planned"
  })).map((entry) =>
    // Known facts from the user: week 1 IPL (2 heads, F-AC + F-SR) is done and cost 850,000 VND.
    entry.week === 1 ? { ...entry, price: 850_000, status: "completed", note: "2 heads: F-AC + F-SR" } : entry
  )
});

/* ---------- Products ---------- */

export type ProductCategory = "skincare" | "supplement";
export type ProductStatus = "unopened" | "in-use" | "almost-empty" | "finished";

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  /** VND. `null` means the price is not known yet. */
  price: number | null;
  purchaseDate: string;
  openedDate: string;
  /** Estimated empty date. Once finished, this is the date it ran out. */
  emptyDate: string;
  status: ProductStatus;
  note: string;
};

export const PRODUCT_CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "skincare", label: "Skincare" },
  { value: "supplement", label: "Supplement" }
];

export const PRODUCT_STATUSES: { value: ProductStatus; label: string }[] = [
  { value: "unopened", label: "Unopened" },
  { value: "in-use", label: "In use" },
  { value: "almost-empty", label: "Almost empty" },
  { value: "finished", label: "Finished" }
];

const product = (id: string, name: string, brand: string, category: ProductCategory, extra: Partial<Product> = {}): Product => ({
  id, name, brand, category,
  note: "", price: null, purchaseDate: "", openedDate: "", emptyDate: "", status: "in-use",
  ...extra
});

// Prices and purchase months come from the user. Exact purchase days are not known: October items use 31 Oct.
export const initialProducts: Product[] = [
  product("inv-1", "Balanceful Cica Sunscreen", "Torriden", "skincare", { note: "Green cap", price: 258_000, purchaseDate: "2026-10-31" }),
  product("inv-2", "Micellar Water · Hyaluronic Acid", "L’Oréal", "skincare", { note: "Light blue cap", price: 169_000, purchaseDate: "2026-11-06" }),
  product("inv-3", "Ultra Facial Cleanser", "Kiehl’s", "skincare", { note: "Bought on sale · price approx.", price: 400_000, purchaseDate: "2026-10-31" }),
  product("inv-4", "Vitamin C 500 mg", "", "supplement"),
  // 7 capsules left on 6 Nov at 1 capsule a day.
  product("inv-5", "Omega-3 Fish Oil", "", "supplement", { note: "7 capsules left on 6 Nov", status: "almost-empty", emptyDate: "2026-11-13" })
];

/* ---------- Mirror ---------- */

export const PHOTO_TAGS = ["Full face", "Chin", "Forehead", "Left cheek", "Right cheek"];
