import { Plan, PlanEntry, PlanResult, PRESET_SERVICES, SERVICE_AQUA, SERVICE_IPL } from "../data";
import { addDays, daysBetween } from "./dates";

export type DatedEntry = PlanEntry & { date: string };

/** The date a week falls on when it follows the weekly rhythm. */
export const rhythmDate = (plan: Plan, week: number) => addDays(plan.startDate, (week - 1) * 7);

export const entryDate = (plan: Plan, entry: PlanEntry) => entry.customDate || rhythmDate(plan, entry.week);

export const datedEntries = (plan: Plan): DatedEntry[] =>
  plan.entries
    .map((entry) => ({ ...entry, date: entryDate(plan, entry) }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.week - b.week);

/** Week number that contains `today`. Below 1 means the plan has not started. */
export const currentWeek = (plan: Plan, today: string) => Math.floor(daysBetween(plan.startDate, today) / 7) + 1;

export const lastWeek = (plan: Plan) => plan.entries.reduce((max, entry) => Math.max(max, entry.week), 0);

const isOpen = (entry: PlanEntry) => entry.status === "planned" || entry.status === "booked";

/** The next planned or booked service on or after today. */
export const nextService = (plan: Plan, today: string) =>
  datedEntries(plan).find((entry) => isOpen(entry) && entry.date >= today);

/** Planned or booked services whose date has passed. They need a status update. */
export const pastOpenServices = (plan: Plan, today: string) =>
  datedEntries(plan).filter((entry) => isOpen(entry) && entry.date < today);

export const planCosts = (plan: Plan) => {
  const active = plan.entries.filter((entry) => entry.status !== "skipped");
  const planned = active.reduce((sum, entry) => sum + (entry.price ?? 0), 0);
  const completed = active.filter((entry) => entry.status === "completed").reduce((sum, entry) => sum + (entry.price ?? 0), 0);
  const missingPrices = active.filter((entry) => entry.price === null).length;
  return { planned, completed, remaining: planned - completed, missingPrices };
};

/** Services to offer as one-tap choices: presets first, then any custom ones used before. */
export const knownServices = (plan: Plan) => {
  const custom = plan.entries.map((entry) => entry.service.trim()).filter((name) => name && !PRESET_SERVICES.includes(name));
  return [...PRESET_SERVICES, ...new Set(custom)];
};

/** Defaults for a new week added after the last one. Continues the IPL / Aqua alternation. */
export const newEntryDefaults = (plan: Plan, id: string): PlanEntry => {
  const sorted = [...plan.entries].sort((a, b) => a.week - b.week);
  const last = sorted.at(-1);
  const service = last?.service === SERVICE_IPL ? SERVICE_AQUA : last?.service === SERVICE_AQUA ? SERVICE_IPL : last?.service || SERVICE_IPL;
  const lastPrice = [...sorted].reverse().find((entry) => entry.service === service && entry.price !== null)?.price ?? null;
  return { id, week: lastWeek(plan) + 1, service, clinic: last?.clinic ?? "", price: lastPrice, note: "", status: "planned" };
};

export type ServiceStats = {
  service: string;
  sessions: number;
  completed: number;
  spent: number;
  results: Record<PlanResult, number>;
  unrated: number;
};

/** Per-service summary used to judge whether a service is working. */
export const serviceStats = (plan: Plan): ServiceStats[] => {
  const map = new Map<string, ServiceStats>();
  for (const entry of plan.entries) {
    if (entry.status === "skipped") continue;
    const stats = map.get(entry.service) ?? { service: entry.service, sessions: 0, completed: 0, spent: 0, results: { better: 0, same: 0, worse: 0 }, unrated: 0 };
    stats.sessions += 1;
    if (entry.status === "completed") {
      stats.completed += 1;
      stats.spent += entry.price ?? 0;
      if (entry.result) stats.results[entry.result] += 1;
      else stats.unrated += 1;
    }
    map.set(entry.service, stats);
  }
  return [...map.values()];
};

/** Completed services after `from` and up to and including `to`. */
export const servicesBetween = (plan: Plan, from: string, to: string) => {
  const [start, end] = from <= to ? [from, to] : [to, from];
  return datedEntries(plan).filter((entry) => entry.status === "completed" && entry.date > start && entry.date <= end);
};
