import { useState } from "react";
import { Undo2 } from "lucide-react";
import { DeleteButton } from "../../components/common";
import { Button } from "../../components/ui/button";
import { DateInput, Field, MoneyInput, Segmented } from "../../components/ui/field";
import { closeSheet, Sheet } from "../../components/ui/sheet";
import { Plan, PLAN_RESULTS, PLAN_STATUSES, PlanEntry } from "../../data";
import { formatDay } from "../../lib/dates";
import { knownServices, rhythmDate } from "../../lib/plan";
import { cn } from "../../lib/utils";

type Props = {
  plan: Plan;
  entry: PlanEntry;
  isNew: boolean;
  onSave: (entry: PlanEntry) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

export function AppointmentSheet({ plan, entry, isNew, onSave, onDelete, onClose }: Props) {
  const [draft, setDraft] = useState<PlanEntry>(entry);
  const [weekText, setWeekText] = useState(String(entry.week));
  const set = (patch: Partial<PlanEntry>) => setDraft((current) => ({ ...current, ...patch }));

  const autoDate = rhythmDate(plan, draft.week);
  const date = draft.customDate || autoDate;
  const valid = draft.service.trim().length > 0 && draft.week >= 1;

  const save = () => {
    if (!valid) return;
    onSave({
      ...draft,
      service: draft.service.trim(),
      clinic: draft.clinic.trim(),
      note: draft.note.trim(),
      result: draft.status === "completed" ? draft.result : undefined
    });
    closeSheet(onClose);
  };

  return (
    <Sheet
      eyebrow={isNew ? "Add week" : `Week ${entry.week}`}
      title={isNew ? "New clinic service" : "Edit clinic service"}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          {!isNew && <DeleteButton onConfirm={() => { onDelete(entry.id); closeSheet(onClose); }} />}
          <Button className="h-12 flex-1" onClick={save} disabled={!valid}>{isNew ? "Add to plan" : "Save changes"}</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Service">
          <input value={draft.service} onChange={(event) => set({ service: event.target.value })} placeholder="e.g. IPL F-AC / F-SR Therapy" />
        </Field>
        <div className="-mt-2 flex flex-wrap gap-1.5">
          {knownServices(plan).map((service) => (
            <button
              key={service}
              type="button"
              onClick={() => set({ service })}
              className={cn("min-h-9 rounded-full border px-3 text-left text-[11.5px] leading-tight transition-colors", draft.service === service ? "border-ink bg-ink text-white" : "border-black/10 text-ink/60 hover:bg-white")}
            >
              {service}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3">
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
            <DateInput value={date} onChange={(value) => set({ customDate: value && value !== autoDate ? value : undefined })} />
          </Field>
        </div>
        <div className="-mt-3 text-[11px] leading-4 text-ink/45">
          {draft.customDate ? (
            <button type="button" onClick={() => set({ customDate: undefined })} className="inline-flex min-h-8 items-center gap-1.5 text-sage">
              <Undo2 className="h-3.5 w-3.5" /> Rescheduled. Use the weekly date ({formatDay(autoDate)})
            </button>
          ) : (
            <p className="min-h-8 pt-1.5">Follows the weekly rhythm from your first clinic date.</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
          <Field label="Clinic / provider">
            <input value={draft.clinic} onChange={(event) => set({ clinic: event.target.value })} placeholder="e.g. Hasaki Clinic" />
          </Field>
          <Field label="Price (VND)">
            <MoneyInput value={draft.price} onChange={(price) => set({ price })} />
          </Field>
        </div>

        <div>
          <p className="field-label">Status</p>
          <Segmented label="Status" columns={2} options={PLAN_STATUSES} value={draft.status} onChange={(status) => status && set({ status })} />
        </div>

        {draft.status === "completed" && (
          <div>
            <p className="field-label">How did your skin respond?</p>
            <Segmented label="Result" options={PLAN_RESULTS} value={draft.result} allowEmpty onChange={(result) => set({ result })} />
            <p className="mt-1.5 text-[11px] leading-4 text-ink/45">Judge a few days after the visit. Compare photos in Mirror.</p>
          </div>
        )}

        <Field label="Note">
          <textarea rows={2} maxLength={240} value={draft.note} onChange={(event) => set({ note: event.target.value })} placeholder="e.g. Doctor suggested lower intensity" />
        </Field>
      </div>
    </Sheet>
  );
}
