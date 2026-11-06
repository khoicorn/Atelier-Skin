export type Category = "Skincare" | "Supplement" | "Clinic";
export type LedgerItem = {
  id: string;
  name: string;
  category: Category;
  price: number;
  purchaseDate: string;
  emptyDate?: string;
};

export type DailyLog = {
  date: string;
  completed: Record<string, boolean>;
  redness: number;
  hydration: number;
  pustules: number;
};

export const routineItems = [
  { id: "am-sunscreen", period: "AM", name: "Torriden Balanceful Cica Sunscreen", detail: "Green cap · final step" },
  { id: "pm-micellar", period: "PM", name: "L'Oréal Micellar Water", detail: "Light blue cap · Hyaluronic Acid" },
  { id: "pm-cleanser", period: "PM", name: "Kiehl's Ultra Facial Cleanser", detail: "Gentle cleanse" },
  { id: "supp-vitc", period: "SUPPLEMENT", name: "Vitamin C · 500 mg", detail: "Morning" },
  { id: "supp-omega", period: "SUPPLEMENT", name: "Omega-3 Fish Oil · 1 capsule", detail: "Midday" }
] as const;

export const initialLedger: LedgerItem[] = [
  { id: "inv-1", name: "Torriden Balanceful Cica Sunscreen", category: "Skincare", price: 0, purchaseDate: "" },
  { id: "inv-2", name: "L'Oréal Micellar Water · HA", category: "Skincare", price: 0, purchaseDate: "" },
  { id: "inv-3", name: "Kiehl's Ultra Facial Cleanser", category: "Skincare", price: 0, purchaseDate: "" },
  { id: "inv-4", name: "Vitamin C · 500 mg", category: "Supplement", price: 0, purchaseDate: "" },
  { id: "inv-5", name: "Omega-3 Fish Oil", category: "Supplement", price: 0, purchaseDate: "" }
];

export const skinProfile = {
  phase: "Phase 1",
  title: "Healing & Acne Clearance",
  goal: "Calm inflammation, clear active acne, protect the barrier",
  conditions: ["Oily", "Acne-prone", "PIE", "Texture"],
  focus: ["Dried chin pustules", "Red acne marks", "Forehead texture"]
};

export const clinicForWeek = (week: number) => ({
  week,
  treatment: week % 2 === 1 ? "IPL F-AC / F-SR Therapy" : "Aqua Mesoderm Fusion Radiance",
  purpose: week % 2 === 1 ? "Acne + redness" : "Soothe + brighten"
});
