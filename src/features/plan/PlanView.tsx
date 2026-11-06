import { useState } from "react";
import { ArrowDown, ArrowUp, Camera, Check, Equal, Plus } from "lucide-react";
import type { Notify } from "../../App";
import { PlanStatusPill, PrivacyNote, SectionHeader, Stat } from "../../components/common";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Plan, PLAN_RESULTS, PlanEntry, PlanResult, PlanStatus } from "../../data";
import { addDays, formatDay, formatShort, relativeDay } from "../../lib/dates";
import {
  currentWeek, DatedEntry, datedEntries, isMoved, lastWeek, latestUnrated, newEntryDefaults, nextService,
  pastOpenServices, pinIfClosed, planCosts, planWeeks, ServiceStats, serviceStats, verdict
} from "../../lib/plan";
import { cn, formatMoney, newId } from "../../lib/utils";
import { AppointmentSheet } from "./AppointmentSheet";

type Props = {
  plan: Plan;
  setPlan: (update: (plan: Plan) => Plan) => void;
  today: string;
  notify: Notify;
  onCompare: () => void;
};

const resultLabel: Record<PlanResult, string> = { better: "Better", same: "No change", worse: "Worse" };

export function PlanView({ plan, setPlan, today, notify, onCompare }: Props) {
  const [editing, setEditing] = useState<{ entry: PlanEntry; isNew: boolean } | null>(null);

  const entries = datedEntries(plan);
  const weeks = planWeeks(plan);
  const week = currentWeek(plan, today);
  const total = lastWeek(plan);
  const next = nextService(plan, today);
  const pastDue = pastOpenServices(plan, today);
  const unrated = latestUnrated(plan, today);
  const costs = planCosts(plan);
  const active = plan.entries.filter((entry) => entry.status !== "skipped");
  const doneCount = active.filter((entry) => entry.status === "completed").length;

  const replace = (entry: PlanEntry) =>
    setPlan((current) => ({
      ...current,
      entries: current.entries.some((item) => item.id === entry.id) ? current.entries.map((item) => (item.id === entry.id ? entry : item)) : [...current.entries, entry]
    }));

  const saveEntry = (entry: PlanEntry) => {
    replace(entry);
    notify(editing?.isNew ? `${entry.extra ? "Extra visit" : `Week ${entry.week}`} added` : "Plan updated");
  };

  const deleteEntry = (entry: PlanEntry) => {
    const index = plan.entries.findIndex((item) => item.id === entry.id);
    setPlan((current) => ({ ...current, entries: current.entries.filter((item) => item.id !== entry.id) }));
    notify(`${entry.service || "Service"} removed`, () =>
      setPlan((current) => ({ ...current, entries: [...current.entries.slice(0, index), entry, ...current.entries.slice(index)] })));
  };

  /** One-tap status change from the Plan screen, with Undo. */
  const quickStatus = (entry: DatedEntry, status: PlanStatus) => {
    const before = plan.entries.find((item) => item.id === entry.id)!;
    replace(pinIfClosed(plan, { ...before, status }));
    notify(`${entry.extra ? "Extra visit" : `Week ${entry.week}`} marked ${status === "completed" ? "completed" : status}`, () => replace(before));
  };

  const rate = (entry: DatedEntry, result: PlanResult) => {
    const before = plan.entries.find((item) => item.id === entry.id)!;
    replace({ ...before, result });
    notify(`Rated ${resultLabel[result]}`, () => replace(before));
  };

  const edit = (entry: PlanEntry) => setEditing({ entry: plan.entries.find((item) => item.id === entry.id) ?? entry, isNew: false });
  const add = () => setEditing({ entry: newEntryDefaults(plan, newId()), isNew: true });

  const weekTitle = week < 1 ? "Starting soon" : `Week ${week} of ${total}`;
  const weekRange =
    week < 1 ? `Week 1 · ${formatDay(plan.startDate)}`
      : week > total ? "Plan finished · add weeks to continue"
        : `${formatShort(addDays(plan.startDate, (week - 1) * 7))} – ${formatShort(addDays(plan.startDate, week * 7 - 1))}`;

  return (
    <div className="animate-in">
      {/* Where am I in the plan */}
      <section aria-label="Plan progress" className="mb-5">
        <p className="label !normal-case !tracking-normal !text-[13px] !font-medium !text-[#6E5A38]">{plan.phase}</p>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <h1 className="font-serif text-[1.85rem] leading-none tracking-[-.02em]">{weekTitle}</h1>
          <p className="shrink-0 text-[13px] tabular-nums text-ink/65">{weekRange}</p>
        </div>
        <div className="mt-3 flex gap-1" aria-hidden>
          {weeks.map((entry) => (
            <span
              key={entry.id}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                entry.status === "completed" ? "bg-sage" : entry.status === "skipped" ? "bg-black/[.05]" : currentWeek(plan, entry.date) === week ? "bg-ink/70" : "bg-black/[.1]"
              )}
            />
          ))}
        </div>
        <p className="mt-2 text-[13px] tabular-nums text-ink/65">
          {doneCount} of {active.length} visits done · <span className="font-medium text-ink">{formatMoney(costs.completed)}</span> spent
        </p>
      </section>

      {/*
        Mobile order: next visit, timeline, cost, results (the side wrapper uses display: contents).
        Desktop: timeline on the left; next visit, cost and results stacked on the right.
      */}
      <div className="grid grid-cols-1 gap-y-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start lg:gap-x-10">
        <div className="contents lg:col-start-2 lg:row-start-1 lg:block lg:space-y-7">
        {/* Next, things to confirm */}
        <div className="order-1 space-y-3">
          {next ? (
            <div className="rounded-[1.5rem] bg-ink p-4 text-ivory">
              <button type="button" onClick={() => edit(next)} className="block w-full text-left">
                <span className="flex items-center justify-between gap-2">
                  <span className="label !text-champagne">Next · {relativeDay(next.date, today)}</span>
                  <span className="text-xs font-medium text-white/70">{next.status === "booked" ? "Booked" : "Not booked yet"}</span>
                </span>
                <span className="mt-1.5 block font-serif text-[1.45rem] leading-tight">{next.service}</span>
                <span className="mt-1.5 block text-[13px] leading-5 text-white/75">
                  {formatDay(next.date)}{next.time ? ` · ${next.time}` : ""}{next.clinic ? ` · ${next.clinic}` : ""} · {next.price !== null ? formatMoney(next.price) : <span className="text-champagne">Add price</span>}
                </span>
              </button>
              {(next.status === "planned" || next.date <= today) && (
                <div className="mt-3 flex gap-2">
                  {next.status === "planned" && <button type="button" onClick={() => quickStatus(next, "booked")} className="h-11 flex-1 rounded-xl bg-white/10 text-sm font-medium hover:bg-white/15">Mark booked</button>}
                  {next.date <= today && <button type="button" onClick={() => quickStatus(next, "completed")} className="h-11 flex-1 rounded-xl bg-champagne text-sm font-semibold text-ink">Mark completed</button>}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-black/15 p-4 text-[13px] text-ink/70">No upcoming visit. Add a service to continue the plan.</div>
          )}

          {pastDue.slice(0, 2).map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-champagne/45 bg-champagne/[.1] p-3.5">
              <button type="button" onClick={() => edit(entry)} className="block w-full text-left text-[13px] leading-5">
                <span className="font-semibold">Did {entry.extra ? "this visit" : `week ${entry.week}`} happen?</span>{" "}
                <span className="text-ink/70">{entry.service} · {formatDay(entry.date)}</span>
              </button>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => quickStatus(entry, "completed")} className="h-11 rounded-xl bg-ink text-sm font-medium text-white">Completed</button>
                <button type="button" onClick={() => quickStatus(entry, "skipped")} className="h-11 rounded-xl border border-black/10 bg-white/60 text-sm font-medium">Skipped</button>
              </div>
            </div>
          ))}
          {pastDue.length > 2 && <p className="px-1 text-xs text-ink/65">{pastDue.length - 2} more past visits need a status. See the timeline.</p>}

          {unrated && pastDue.length === 0 && (
            <div className="rounded-2xl border border-black/[.08] bg-white/55 p-3">
              <p className="truncate text-[13px] leading-5">
                <span className="font-semibold">How did your skin respond?</span>{" "}
                <span className="text-ink/70">{unrated.extra ? "Extra visit" : `Week ${unrated.week}`} · {formatShort(unrated.date)} · {unrated.service}</span>
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {PLAN_RESULTS.map((option) => (
                  <button key={option.value} type="button" onClick={() => rate(unrated, option.value)} className="h-11 rounded-xl border border-black/10 bg-white/70 text-[13px] font-medium hover:bg-white">
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Clinic cost */}
        <section aria-label="Clinic cost" className="order-3 rounded-2xl border border-black/[.08] bg-white/55 p-4">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Spent" value={formatMoney(costs.completed)} hint={`${doneCount} of ${active.length} visits done`} />
            <Stat label="Plan total" value={formatMoney(costs.planned)} hint={costs.missingPrices ? `+ ${costs.missingPrices} without price` : "All prices added"} />
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[.06]">
            <div className="h-full rounded-full bg-sage" style={{ width: `${active.length ? (doneCount / active.length) * 100 : 0}%` }} />
          </div>
        </section>

        {/* Effectiveness */}
        <section className="order-4">
          <SectionHeader title="Is it working?" />
          <div className="space-y-3">
            {serviceStats(plan).map((stats) => <ServiceCard key={stats.service} stats={stats} />)}
          </div>
          <Button variant="secondary" className="mt-3 h-12 w-full" onClick={onCompare}>
            <Camera className="h-4 w-4" strokeWidth={1.7} /> Compare photos in Mirror
          </Button>
          <p className="mt-3 text-xs leading-5 text-ink/60">Ratings are your own record, not medical advice.</p>
        </section>
        </div>

        {/* Timeline */}
        <section className="order-2 lg:col-start-1 lg:row-start-1">
          <SectionHeader title="Timeline" action={<Button size="sm" variant="secondary" className="h-11 px-4 text-[13px]" onClick={add}><Plus className="h-4 w-4" />Add service</Button>} />
          <Card>
            <ol className="p-1.5">
              {entries.map((entry, index) => (
                <TimelineRow
                  key={entry.id}
                  plan={plan}
                  entry={entry}
                  today={today}
                  isCurrent={week >= 1 && !entry.extra && currentWeek(plan, entry.date) === week}
                  isLast={index === entries.length - 1}
                  onClick={() => edit(entry)}
                />
              ))}
            </ol>
          </Card>
        </section>
      </div>

      <PrivacyNote className="mt-10" />

      {editing && (
        <AppointmentSheet
          plan={plan}
          entry={editing.entry}
          isNew={editing.isNew}
          today={today}
          onSave={saveEntry}
          onDelete={deleteEntry}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function TimelineRow({ plan, entry, today, isCurrent, isLast, onClick }: { plan: Plan; entry: DatedEntry; today: string; isCurrent: boolean; isLast: boolean; onClick: () => void }) {
  const skipped = entry.status === "skipped";
  const label = entry.extra ? "Extra visit" : `Week ${entry.week}`;
  return (
    <li className="relative">
      {!isLast && <span aria-hidden className="absolute bottom-[-8px] left-[29px] top-[50px] w-px bg-black/[.1]" />}
      <button type="button" onClick={onClick} className={cn("flex w-full gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-white/60", isCurrent && "bg-white/75")}>
        <span
          aria-hidden
          className={cn(
            "relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border font-serif text-[15px]",
            entry.status === "completed" ? "border-sage bg-sage text-white"
              : skipped ? "border-dashed border-black/25 bg-paper text-ink/45"
                : isCurrent ? "border-ink bg-ink text-white" : "border-sage/35 bg-paper text-ink"
          )}
        >
          {entry.status === "completed" ? <Check className="h-4 w-4" strokeWidth={2} /> : entry.extra ? <Plus className="h-4 w-4" strokeWidth={1.8} /> : entry.week}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-xs tabular-nums text-ink/65">
              {label} · {formatDay(entry.date)}{entry.time ? ` · ${entry.time}` : ""}{isCurrent ? " · This week" : ""}{isMoved(plan, entry) ? " · Moved" : ""}
            </span>
            <PlanStatusPill status={entry.status} />
          </span>
          <span className={cn("mt-0.5 block text-[15px] font-medium leading-snug", skipped && "text-ink/50 line-through decoration-black/25")}>{entry.service}</span>
          <span className="mt-0.5 block truncate text-[13px] text-ink/65">
            {entry.clinic || "Clinic not set"} · {entry.price !== null ? <span className="tabular-nums text-ink/80">{formatMoney(entry.price)}</span> : <span className="text-[#7A6440]">Add price</span>}
            {entry.status === "completed" && entry.result && <span className="text-ink/80"> · {resultLabel[entry.result]}</span>}
            {entry.status === "completed" && !entry.result && entry.date <= today && <span className="text-[#7A6440]"> · Rate it</span>}
          </span>
          {entry.note && <span className="mt-0.5 block truncate text-[13px] italic text-ink/60">{entry.note}</span>}
        </span>
      </button>
    </li>
  );
}

function ServiceCard({ stats }: { stats: ServiceStats }) {
  const { better, same, worse } = stats.results;
  const segments = [
    { key: "better", value: better, className: "bg-sage" },
    { key: "same", value: same, className: "bg-taupe" },
    { key: "worse", value: worse, className: "bg-clay" },
    { key: "unrated", value: stats.unrated, className: "bg-black/[.1]" }
  ].filter((segment) => segment.value > 0);

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[15px] font-medium leading-snug">{stats.service}</p>
        <p className="mt-0.5 text-[13px] tabular-nums text-ink/65">{stats.completed} of {stats.sessions} done · {formatMoney(stats.spent)} spent</p>
        {stats.completed > 0 && (
          <>
            <div className="mt-3 flex h-1.5 gap-[2px] overflow-hidden rounded-full bg-black/[.05]">
              {segments.map((segment) => <span key={segment.key} className={segment.className} style={{ flexGrow: segment.value }} />)}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink/70">
              <span className="inline-flex items-center gap-1.5"><ArrowUp className="h-3.5 w-3.5 text-sage" />Better {better}</span>
              <span className="inline-flex items-center gap-1.5"><Equal className="h-3.5 w-3.5 text-taupe" />No change {same}</span>
              <span className="inline-flex items-center gap-1.5"><ArrowDown className="h-3.5 w-3.5 text-clay" />Worse {worse}</span>
              {stats.unrated > 0 && <span className="text-ink/60">Not rated {stats.unrated}</span>}
            </div>
          </>
        )}
        <p className="mt-2.5 text-[13px] text-ink/80">{verdict(stats)}</p>
      </CardContent>
    </Card>
  );
}
