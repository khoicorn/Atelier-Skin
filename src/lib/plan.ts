import { Plan, PlanEntry, PlanResult, PRESET_SERVICES, SERVICE_AQUA, SERVICE_IPL } from "../data";
import { addDays, daysBetween, monthOf } from "./dates";

export type DatedEntry = PlanEntry & { date: string };

/** The date a week falls on when it follows the weekly rhythm. */
export const rhythmDate = (plan: Plan, week: number) => addDays(plan.startDate, (week - 1) * 7);

export const entryDate = (plan: Plan, entry: PlanEntry) => entry.customDate || rhythmDate(plan, entry.week);

/** True when a plan week was moved off its rhythm date (extra visits are never "moved"). */
export const isMoved = (plan: Plan, entry: PlanEntry) => !entry.extra && !!entry.customDate && entry.customDate !== rhythmDate(plan, entry.week);

export const datedEntries = (plan: Plan): DatedEntry[] =>
  plan.entries
    .map((entry) => ({ ...entry, date: entryDate(plan, entry) }))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "") || a.week - b.week);

/** Plan weeks only, without extra visits. */
export const planWeeks = (plan: Plan) => datedEntries(plan).filter((entry) => !entry.extra);

/** Week number that contains `date`. Below 1 means before the plan started. */
export const currentWeek = (plan: Plan, date: string) => Math.floor(daysBetween(plan.startDate, date) / 7) + 1;

/** Highest plan week. Extra visits do not extend the plan. */
export const lastWeek = (plan: Plan) => plan.entries.reduce((max, entry) => (entry.extra ? max : Math.max(max, entry.week)), 0);

const isOpen = (entry: PlanEntry) => entry.status === "planned" || entry.status === "booked";
const isClosed = (entry: PlanEntry) => entry.status === "completed" || entry.status === "skipped";

/** The next planned or booked service on or after today. */
export const nextService = (plan: Plan, today: string) =>
  datedEntries(plan).find((entry) => isOpen(entry) && entry.date >= today);

/** Planned or booked services whose date has passed. They need a status update. */
export const pastOpenServices = (plan: Plan, today: string) =>
  datedEntries(plan).filter((entry) => isOpen(entry) && entry.date < today);

/** Pins a completed or skipped visit to its date, so later plan changes never move it. */
export const pinIfClosed = (plan: Plan, entry: PlanEntry): PlanEntry =>
  isClosed(entry) && !entry.customDate ? { ...entry, customDate: rhythmDate(plan, entry.week) } : entry;

/** Upcoming plan weeks that follow the rhythm, so a new first clinic date would move them. */
export const visitsThatMove = (plan: Plan) => plan.entries.filter((entry) => !entry.extra && isOpen(entry) && !entry.customDate);

/** Changes the first clinic date. Completed and skipped visits keep their date. */
export const changeStartDate = (plan: Plan, startDate: string): Plan => ({
  ...plan,
  startDate,
  entries: plan.entries.map((entry) => pinIfClosed(plan, entry))
});

export const planCosts = (plan: Plan) => {
  const active = plan.entries.filter((entry) => entry.status !== "skipped");
  const planned = active.reduce((sum, entry) => sum + (entry.price ?? 0), 0);
  const completed = active.filter((entry) => entry.status === "completed").reduce((sum, entry) => sum + (entry.price ?? 0), 0);
  const missingPrices = active.filter((entry) => entry.price === null).length;
  return { planned, completed, remaining: planned - completed, missingPrices };
};

/** Open visits in a month: how many, the known cost, and how many have no price. */
export const plannedIn = (plan: Plan, month: string) => {
  const open = datedEntries(plan).filter((entry) => isOpen(entry) && monthOf(entry.date) === month);
  return {
    count: open.length,
    known: open.reduce((sum, entry) => sum + (entry.price ?? 0), 0),
    missingPrices: open.filter((entry) => entry.price === null).length
  };
};

/** Completed visits in a month, oldest first. */
export const visitsIn = (plan: Plan, month: string) =>
  datedEntries(plan).filter((entry) => entry.status === "completed" && monthOf(entry.date) === month);

/** The most recent completed visit with no rating, within `withinDays`. */
export const latestUnrated = (plan: Plan, today: string, withinDays = 45) =>
  datedEntries(plan)
    .filter((entry) => entry.status === "completed" && !entry.result && entry.date <= today && daysBetween(entry.date, today) <= withinDays)
    .at(-1);

/** Services to offer as one-tap choices: presets first, then any custom ones used before. */
export const knownServices = (plan: Plan) => {
  const custom = plan.entries.map((entry) => entry.service.trim()).filter((name) => name && !PRESET_SERVICES.includes(name));
  return [...PRESET_SERVICES, ...new Set(custom)];
};

/** Defaults for a new plan week after the last one. Continues the IPL / Aqua alternation. */
export const newEntryDefaults = (plan: Plan, id: string): PlanEntry => {
  const sorted = plan.entries.filter((entry) => !entry.extra).sort((a, b) => a.week - b.week);
  const last = sorted.at(-1);
  const service = last?.service === SERVICE_IPL ? SERVICE_AQUA : last?.service === SERVICE_AQUA ? SERVICE_IPL : last?.service || SERVICE_IPL;
  const lastPrice = [...sorted].reverse().find((entry) => entry.service === service && entry.price !== null)?.price ?? null;
  return { id, week: lastWeek(plan) + 1, service, clinic: last?.clinic ?? "", price: lastPrice, note: "", status: "planned" };
};

/** Defaults for a one-off visit outside the plan, dated today. */
export const newExtraDefaults = (plan: Plan, id: string, today: string): PlanEntry => ({
  id,
  week: Math.max(1, currentWeek(plan, today)),
  service: "",
  clinic: plan.entries.find((entry) => entry.clinic)?.clinic ?? "",
  price: null,
  note: "",
  status: "planned",
  customDate: today,
  extra: true
});

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

/** A cautious one-line reading of the ratings. Needs at least 2 ratings before it judges. */
export const verdict = (stats: ServiceStats) => {
  const { better, same, worse } = stats.results;
  const rated = better + same + worse;
  if (stats.completed === 0) return "No completed visits yet.";
  if (rated === 0) return "Rate completed visits to see a trend.";
  if (rated < 2) return "1 rating so far. Rate one more visit to see a trend.";
  if (better > same + worse) return "Mostly better so far.";
  if (worse > better) return "More worse than better. Worth discussing with your clinic.";
  return "Mixed so far. Compare photos before deciding.";
};

/** Completed services after `from` and up to and including `to`. */
export const servicesBetween = (plan: Plan, from: string, to: string) => {
  const [start, end] = from <= to ? [from, to] : [to, from];
  return datedEntries(plan).filter((entry) => entry.status === "completed" && entry.date > start && entry.date <= end);
};
