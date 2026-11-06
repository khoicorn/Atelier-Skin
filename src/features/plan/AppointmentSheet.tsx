import { useEffect, useRef, useState } from "react";
import { Undo2 } from "lucide-react";
import { DeleteButton } from "../../components/common";
import { Button } from "../../components/ui/button";
import { DateInput, Field, MoneyInput, Segmented, TimeInput } from "../../components/ui/field";
import { closeSheet, isChanged, Sheet } from "../../components/ui/sheet";
import { Plan, PLAN_RESULTS, PLAN_STATUSES, PlanEntry } from "../../data";
import { formatDay } from "../../lib/dates";
import { currentWeek, knownServices, lastWeek, pinIfClosed, rhythmDate } from "../../lib/plan";
import { cn } from "../../lib/utils";

type Props = {
  plan: Plan;
  entry: PlanEntry;
  isNew: boolean;
  today: string;
  onSave: (entry: PlanEntry) => void;
  onDelete: (entry: PlanEntry) => void;
  onClose: () => void;
};

type Kind = "plan" | "extra";

export function AppointmentSheet({ plan, entry, isNew, today, onSave, onDelete, onClose }: Props) {
  const [draft, setDraft] = useState<PlanEntry>(entry);
  const [weekText, setWeekText] = useState(String(entry.week));
  const resultRef = useRef<HTMLDivElement>(null);
  const set = (patch: Partial<PlanEntry>) => setDraft((current) => ({ ...current, ...patch }));

  const kind: Kind = draft.extra ? "extra" : "plan";
  const autoDate = rhythmDate(plan, draft.week);
  const date = draft.customDate || autoDate;
  const valid = draft.service.trim().length > 0 && draft.week >= 1 && !!date;

  // Bring the rating into view as soon as the visit is marked completed.
  useEffect(() => {
    if (draft.status === "completed" && entry.status !== "completed") resultRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [draft.status, entry.status]);

  const setKind = (next: Kind | undefined) => {
    if (!next || next === kind) return;
    if (next === "extra") set({ extra: true, customDate: date <= today ? today : date, week: Math.max(1, currentWeek(plan, today)) });
    else {
      const week = isNew ? lastWeek(plan) + 1 : Math.max(1, entry.extra ? currentWeek(plan, date) : entry.week);
      setWeekText(String(week));
      set({ extra: false, customDate: undefined, week });
    }
  };

  const save = () => {
    if (!valid) return;
    const cleaned: PlanEntry = {
      ...draft,
      service: draft.service.trim(),
      clinic: draft.clinic.trim(),
      note: draft.note.trim(),
      time: draft.time || undefined,
      result: draft.status === "completed" ? draft.result : undefined
    };
    const final = draft.extra
      ? { ...cleaned, week: Math.max(1, currentWeek(plan, date)), customDate: date }
      : pinIfClosed(plan, cleaned);
    onSave(final);
    closeSheet(onClose);
  };

  return (
    <Sheet
      eyebrow={isNew ? "Add service" : kind === "extra" ? "Extra visit" : `Week ${entry.week}`}
      title={isNew ? "New clinic service" : "Edit clinic service"}
      onClose={onClose}
      dirty={isChanged(draft, entry)}
      footer={
        <div className="flex items-center gap-2">
          {!isNew && <DeleteButton onDelete={() => { onDelete(entry); closeSheet(onClose); }} />}
          <Button className="h-12 flex-1" onClick={save} disabled={!valid}>{isNew ? "Add to plan" : "Save changes"}</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <Segmented
            label="Type"
            options={[{ value: "plan", label: "Plan week" }, { value: "extra", label: "Extra visit" }]}
            value={kind}
            onChange={setKind}
          />
          <p className="mt-1.5 text-xs leading-4 text-ink/60">
            {kind === "plan" ? "Part of your weekly plan." : "A one-off visit. It counts in cost, not in “Week X of 6”."}
          </p>
        </div>

        <Field label="Service">
          <input value={draft.service} onChange={(event) => set({ service: event.target.value })} placeholder="e.g. Acne extraction" />
        </Field>
        <div className="-mt-2 flex flex-wrap gap-1.5">
          {knownServices(plan).map((service) => (
            <button
              key={service}
              type="button"
              onClick={() => set({ service })}
              className={cn("min-h-11 rounded-full border px-3.5 text-left text-[13px] leading-tight transition-colors", draft.service === service ? "border-ink bg-ink text-white" : "border-black/10 text-ink/70 hover:bg-white")}
            >
              {service}
            </button>
          ))}
        </div>

        {kind === "plan" ? (
          <div>
            <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3">
              <Field label="Week">
                <input
                  inputMode="numeric"
                  value={weekText}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, "").slice(0, 3);
                    setWeekText(digits);
                    if (Number(digits) >= 1) set({ week: Number(digits) });
                  }}
                  onBlur={() => setWeekText(String(draft.week))}
                />
              </Field>
              <Field label="Date">
                <DateInput label="Visit date" value={date} onChange={(value) => set({ customDate: value && value !== autoDate ? value : undefined })} />
              </Field>
            </div>
            {draft.customDate && draft.customDate !== autoDate ? (
              <button type="button" onClick={() => set({ customDate: undefined })} className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-[13px] text-[#4B5E45]">
                <Undo2 className="h-4 w-4" /> Moved. Use the weekly date ({formatDay(autoDate)})
              </button>
            ) : (
              <p className="mt-1.5 text-xs leading-4 text-ink/60">Follows the weekly rhythm from your first clinic date.</p>
            )}
          </div>
        ) : (
          <Field label="Date">
            <DateInput label="Visit date" value={date} onChange={(value) => value && set({ customDate: value })} />
          </Field>
        )}

        <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
          <Field label="Time (optional)">
            <TimeInput value={draft.time ?? ""} onChange={(time) => set({ time })} />
          </Field>
          <Field label="Clinic / provider">
            <input value={draft.clinic} onChange={(event) => set({ clinic: event.target.value })} placeholder="e.g. Hasaki Clinic" />
          </Field>
        </div>

        <Field label="Price (VND)">
          <MoneyInput value={draft.price} onChange={(price) => set({ price })} />
        </Field>

        <div>
          <p className="field-label">Status</p>
          <Segmented label="Status" columns={2} options={PLAN_STATUSES} value={draft.status} onChange={(status) => status && set({ status })} />
        </div>

        {draft.status === "completed" && (
          <div ref={resultRef}>
            <p className="field-label">How did your skin respond?</p>
            <Segmented label="Result" options={PLAN_RESULTS} value={draft.result} allowEmpty onChange={(result) => set({ result })} />
            <p className="mt-1.5 text-xs leading-4 text-ink/60">Judge a few days after the visit. Compare photos in Mirror.</p>
          </div>
        )}

        <Field label="Note">
          <textarea rows={2} maxLength={240} value={draft.note} onChange={(event) => set({ note: event.target.value })} placeholder="e.g. Doctor suggested lower intensity" />
        </Field>
      </div>
    </Sheet>
  );
}
