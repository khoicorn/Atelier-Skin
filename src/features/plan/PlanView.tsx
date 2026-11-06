import { useState } from "react";
import { AlertCircle, ArrowDown, ArrowUp, Camera, Check, ChevronRight, Equal, Plus, SlidersHorizontal } from "lucide-react";
import { PageHeader, PlanStatusPill, PrivacyNote, SectionHeader, Stat } from "../../components/common";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Plan, PlanEntry } from "../../data";
import { addDays, formatDay, formatShort, relativeDay } from "../../lib/dates";
import { currentWeek, DatedEntry, datedEntries, lastWeek, newEntryDefaults, nextService, pastOpenServices, planCosts, ServiceStats, serviceStats } from "../../lib/plan";
import { cn, formatMoney, newId } from "../../lib/utils";
import { AppointmentSheet } from "./AppointmentSheet";
import { InstallPrompt, PlanSettingsSheet } from "./PlanSettingsSheet";

type Props = {
  plan: Plan;
  setPlan: (update: (plan: Plan) => Plan) => void;
  today: string;
  notify: (message: string) => void;
  onCompare: () => void;
  installPrompt: InstallPrompt | null;
};

export function PlanView({ plan, setPlan, today, notify, onCompare, installPrompt }: Props) {
  const [editing, setEditing] = useState<{ entry: PlanEntry; isNew: boolean } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const entries = datedEntries(plan);
  const week = currentWeek(plan, today);
  const total = lastWeek(plan);
  const next = nextService(plan, today);
  const overdue = pastOpenServices(plan, today);
  const costs = planCosts(plan);
  const active = plan.entries.filter((entry) => entry.status !== "skipped");
  const completedCount = active.filter((entry) => entry.status === "completed").length;

  const saveEntry = (entry: PlanEntry) => {
    setPlan((current) => ({
      ...current,
      entries: current.entries.some((item) => item.id === entry.id)
        ? current.entries.map((item) => (item.id === entry.id ? entry : item))
        : [...current.entries, entry]
    }));
    notify(editing?.isNew ? `Week ${entry.week} added` : "Plan updated");
  };

  const deleteEntry = (id: string) => {
    setPlan((current) => ({ ...current, entries: current.entries.filter((item) => item.id !== id) }));
    notify("Service removed");
  };

  const addWeek = () => setEditing({ entry: newEntryDefaults(plan, newId()), isNew: true });
  const edit = (entry: PlanEntry) => setEditing({ entry, isNew: false });

  const weekLine =
    week < 1 ? `Week 1 starts ${formatDay(plan.startDate)} · ${relativeDay(plan.startDate, today)}`
      : week > total ? `The ${total}-week plan has ended. Add weeks to continue.`
        : `${formatShort(addDays(plan.startDate, (week - 1) * 7))} – ${formatShort(addDays(plan.startDate, week * 7 - 1))}`;

  return (
    <div className="animate-in">
      <PageHeader eyebrow="Weekly plan" title="Clinic plan" />

      {/* Hero: phase, current week, next service */}
      <Card className="relative overflow-hidden border-ink bg-ink text-ivory">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-champagne/[.18]" />
        <div aria-hidden className="pointer-events-none absolute -right-6 -top-10 h-36 w-36 rounded-full border border-champagne/[.18]" />
        <CardContent className="relative p-6 md:p-8">
          <div className="flex items-start justify-between gap-3">
            <p className="eyebrow !text-champagne">{plan.phase}</p>
            <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Plan settings" className="-mr-2.5 -mt-2.5 grid h-11 w-11 shrink-0 place-items-center rounded-full text-white/55 hover:bg-white/10 hover:text-white">
              <SlidersHorizontal className="h-[18px] w-[18px]" strokeWidth={1.6} />
            </button>
          </div>
          <p className="mt-2 font-serif text-[2.75rem] leading-none tracking-[-.03em]">
            {week < 1 ? "Starting soon" : <>Week {week}<span className="ml-2 text-[1.4rem] text-white/40">of {total}</span></>}
          </p>
          <p className="mt-2 text-xs text-white/50">{weekLine}</p>

          <div className="mt-5 flex gap-1" aria-label={`${completedCount} of ${active.length} services completed`}>
            {entries.map((entry) => (
              <span
                key={entry.id}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  entry.status === "completed" ? "bg-champagne" : entry.status === "skipped" ? "bg-white/[.07]" : currentWeek(plan, entry.date) === week ? "bg-white/60" : "bg-white/[.16]"
                )}
              />
            ))}
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="eyebrow !text-white/40">Next service</p>
            {next ? (
              <button type="button" onClick={() => edit(next)} className="group -mx-2 flex w-[calc(100%+1rem)] items-end justify-between gap-3 rounded-2xl px-2 py-1 text-left hover:bg-white/[.04]">
                <span className="min-w-0">
                  <span className="block font-serif text-[1.6rem] leading-[1.1]">{next.service}</span>
                  <span className="mt-2 block text-xs text-white/55">
                    {formatDay(next.date)} · {relativeDay(next.date, today)}{next.clinic && ` · ${next.clinic}`}
                  </span>
                  <span className="mt-1 block text-xs text-white/55">
                    {next.status === "booked" ? "Booked" : "Not booked yet"} · {next.price !== null ? formatMoney(next.price) : <span className="text-champagne">Add price</span>}
                  </span>
                </span>
                <ChevronRight className="mb-0.5 h-5 w-5 shrink-0 text-white/35 group-hover:text-white/70" strokeWidth={1.6} />
              </button>
            ) : (
              <p className="text-sm text-white/55">No upcoming service. Add a week to continue the plan.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {overdue.length > 0 && (
        <button type="button" onClick={() => edit(overdue[0])} className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-champagne/35 bg-champagne/[.1] px-4 py-3.5 text-left">
          <AlertCircle className="h-5 w-5 shrink-0 text-[#8A7148]" strokeWidth={1.6} />
          <span className="min-w-0 flex-1 text-xs leading-5 text-ink/70">
            <strong className="font-semibold text-ink">Week {overdue[0].week} was on {formatDay(overdue[0].date)}.</strong> Mark it completed or skipped
            {overdue.length > 1 ? ` (${overdue.length - 1} more)` : ""}.
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-ink/35" />
        </button>
      )}

      {/* Clinic cost */}
      <Card className="mt-4">
        <CardContent className="p-5">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Plan total" value={formatMoney(costs.planned)} hint={costs.missingPrices ? `${costs.missingPrices} ${costs.missingPrices === 1 ? "price" : "prices"} to add` : "All prices added"} />
            <Stat label="Completed" value={formatMoney(costs.completed)} hint={`${completedCount} of ${active.length} services`} />
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/[.06]">
            <div className="h-full rounded-full bg-sage" style={{ width: `${costs.planned ? Math.min(100, (costs.completed / costs.planned) * 100) : 0}%` }} />
          </div>
          <p className="mt-2.5 text-[11px] text-ink/45">Clinic services only. Skipped weeks are not counted.</p>
        </CardContent>
      </Card>

      <div className="mt-9 grid grid-cols-1 gap-9 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)] lg:items-start">
        {/* Timeline */}
        <section>
          <SectionHeader eyebrow={`${entries.length} weeks`} title="Weekly timeline" action={<Button size="sm" variant="secondary" className="h-10 px-3.5" onClick={addWeek}><Plus className="h-4 w-4" />Add week</Button>} />

          <label className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-black/[.08] bg-white/45 px-4 py-3">
            <span className="min-w-0">
              <span className="block text-sm font-medium">First clinic date</span>
              <span className="block text-[11px] leading-4 text-ink/45">Each next week is 7 days later.</span>
            </span>
            <input
              type="date"
              value={plan.startDate}
              onChange={(event) => {
                const startDate = event.target.value;
                if (!startDate) return;
                setPlan((current) => ({ ...current, startDate }));
                notify("Weekly dates updated");
              }}
              className="date-chip"
            />
          </label>

          <Card>
            <ol className="p-2">
              {entries.map((entry, index) => (
                <TimelineRow key={entry.id} entry={entry} isCurrent={week >= 1 && currentWeek(plan, entry.date) === week} isLast={index === entries.length - 1} onClick={() => edit(entry)} />
              ))}
            </ol>
            <div className="border-t border-black/[.06] p-2">
              <button type="button" onClick={addWeek} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm text-ink/60 hover:bg-white/60">
                <Plus className="h-4 w-4" strokeWidth={1.7} /> Add week {total + 1}
              </button>
            </div>
          </Card>
        </section>

        {/* Effectiveness */}
        <section>
          <SectionHeader eyebrow="Results" title="Is it working?" />
          <div className="space-y-3">
            {serviceStats(plan).map((stats) => <ServiceCard key={stats.service} stats={stats} />)}
          </div>
          <Button variant="secondary" className="mt-3 h-12 w-full" onClick={onCompare}>
            <Camera className="h-4 w-4" strokeWidth={1.7} /> Compare photos in Mirror
          </Button>
          <p className="mt-3 text-[11px] leading-5 text-ink/45">After each completed visit, rate how your skin responded. This is your own record, not medical advice.</p>
        </section>
      </div>

      <PrivacyNote />

      {editing && (
        <AppointmentSheet plan={plan} entry={editing.entry} isNew={editing.isNew} onSave={saveEntry} onDelete={deleteEntry} onClose={() => setEditing(null)} />
      )}
      {settingsOpen && (
        <PlanSettingsSheet
          plan={plan}
          installPrompt={installPrompt}
          notify={notify}
          onClose={() => setSettingsOpen(false)}
          onSave={(patch) => { setPlan((current) => ({ ...current, ...patch })); notify("Settings saved"); }}
        />
      )}
    </div>
  );
}

function TimelineRow({ entry, isCurrent, isLast, onClick }: { entry: DatedEntry; isCurrent: boolean; isLast: boolean; onClick: () => void }) {
  const skipped = entry.status === "skipped";
  const resultLabel = entry.result === "better" ? "Better" : entry.result === "same" ? "No change" : entry.result === "worse" ? "Worse" : "";
  return (
    <li className="relative">
      {!isLast && <span aria-hidden className="absolute bottom-[-10px] left-[31px] top-[54px] w-px bg-black/[.09]" />}
      <button type="button" onClick={onClick} className={cn("flex w-full gap-3.5 rounded-2xl p-3 text-left transition-colors hover:bg-white/60", isCurrent && "bg-white/70")}>
        <span
          className={cn(
            "relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border font-serif text-[15px]",
            entry.status === "completed" ? "border-sage bg-sage text-white"
              : skipped ? "border-dashed border-black/20 bg-paper text-ink/30"
                : isCurrent ? "border-ink bg-ink text-white" : "border-sage/30 bg-paper text-ink"
          )}
        >
          {entry.status === "completed" ? <Check className="h-4 w-4" strokeWidth={2} /> : entry.week}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] tabular-nums text-ink/45">
              Week {entry.week} · {formatDay(entry.date)}{isCurrent ? " · This week" : ""}{entry.customDate ? " · Moved" : ""}
            </span>
            <PlanStatusPill status={entry.status} />
          </span>
          <span className={cn("mt-1 block text-[15px] font-medium leading-snug", skipped && "text-ink/40 line-through decoration-black/20")}>{entry.service}</span>
          <span className="mt-1 block truncate text-xs text-ink/50">
            {entry.clinic || "Clinic not set"} · {entry.price !== null ? <span className="tabular-nums">{formatMoney(entry.price)}</span> : <span className="text-[#8A7148]">Add price</span>}
          </span>
          {(resultLabel || entry.note) && (
            <span className="mt-1.5 block truncate text-[11.5px] text-ink/55">
              {resultLabel && <span className="font-medium text-ink/70">Result: {resultLabel}</span>}
              {resultLabel && entry.note && " · "}
              {entry.note}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

function ServiceCard({ stats }: { stats: ServiceStats }) {
  const { better, same, worse } = stats.results;
  const rated = better + same + worse;
  const verdict =
    stats.completed === 0 ? "No completed visits yet."
      : rated === 0 ? "Rate completed visits to see a trend."
        : better > same + worse ? "Mostly better so far."
          : worse > better ? "More worse than better. Worth discussing with your clinic."
            : "Mixed so far. Compare photos before deciding.";
  const segments = [
    { key: "better", value: better, className: "bg-sage" },
    { key: "same", value: same, className: "bg-taupe" },
    { key: "worse", value: worse, className: "bg-clay" },
    { key: "unrated", value: stats.unrated, className: "bg-black/[.08]" }
  ].filter((segment) => segment.value > 0);

  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-[15px] font-medium leading-snug">{stats.service}</p>
        <p className="mt-1 text-xs tabular-nums text-ink/50">{stats.completed} of {stats.sessions} done · {formatMoney(stats.spent)} spent</p>
        {stats.completed > 0 && (
          <>
            <div className="mt-4 flex h-1.5 gap-[2px] overflow-hidden rounded-full bg-black/[.05]">
              {segments.map((segment) => <span key={segment.key} className={segment.className} style={{ flexGrow: segment.value }} />)}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-ink/60">
              <span className="inline-flex items-center gap-1.5"><ArrowUp className="h-3.5 w-3.5 text-sage" />Better {better}</span>
              <span className="inline-flex items-center gap-1.5"><Equal className="h-3.5 w-3.5 text-taupe" />No change {same}</span>
              <span className="inline-flex items-center gap-1.5"><ArrowDown className="h-3.5 w-3.5 text-clay" />Worse {worse}</span>
              {stats.unrated > 0 && <span className="text-ink/45">Not rated {stats.unrated}</span>}
            </div>
          </>
        )}
        <p className="mt-3 text-xs text-ink/70">{verdict}</p>
      </CardContent>
    </Card>
  );
}
