import { useState } from "react";
import { Sun } from "lucide-react";
import { DeleteButton } from "../../components/common";
import { Button } from "../../components/ui/button";
import { ChipToggle, DateInput, Field } from "../../components/ui/field";
import { closeSheet, isChanged, Sheet } from "../../components/ui/sheet";
import { Plan, PHOTO_TAGS } from "../../data";
import { formatDate } from "../../lib/dates";
import { SkinPhoto } from "../../lib/photo-db";
import { currentWeek } from "../../lib/plan";

/** "Week 3" when the date falls inside the plan, otherwise the date itself. */
export const defaultPhotoTitle = (plan: Plan, date: string) => {
  const week = currentWeek(plan, date);
  return week >= 1 ? `Week ${week}` : formatDate(date);
};

type Props = {
  photo: SkinPhoto;
  isNew: boolean;
  plan: Plan;
  today: string;
  onSave: (photo: SkinPhoto) => Promise<void>;
  onDelete: (photo: SkinPhoto) => Promise<void>;
  onClose: () => void;
};

export function PhotoSheet({ photo, isNew, plan, today, onSave, onDelete, onClose }: Props) {
  const [draft, setDraft] = useState<SkinPhoto>(photo);
  const [titleTouched, setTitleTouched] = useState(!isNew);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<SkinPhoto>) => setDraft((current) => ({ ...current, ...patch }));

  const setDate = (date: string) => {
    if (!date) return;
    set(titleTouched ? { date } : { date, title: defaultPhotoTitle(plan, date) });
  };

  const toggleTag = (tag: string) => set({ tags: draft.tags.includes(tag) ? draft.tags.filter((item) => item !== tag) : [...draft.tags, tag] });

  const save = async () => {
    setBusy(true);
    try {
      await onSave({ ...draft, title: draft.title.trim() || defaultPhotoTitle(plan, draft.date), note: (draft.note ?? "").trim() });
      closeSheet(onClose);
    } catch {
      // The parent already showed the error. Keep the sheet open so nothing is lost.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      eyebrow={isNew ? "New photo" : "Photo"}
      title={isNew ? "Save to Mirror" : "Edit photo"}
      onClose={onClose}
      dirty={isNew || isChanged(draft, photo)}
      footer={
        <div className="flex items-center gap-2">
          {!isNew && <DeleteButton onDelete={async () => { await onDelete(photo); closeSheet(onClose); }} />}
          <Button className="h-12 flex-1" onClick={save} disabled={busy}>{isNew ? "Save photo" : "Save changes"}</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="overflow-hidden rounded-2xl border border-black/[.06] bg-black/[.03]">
          <img src={draft.dataUrl} alt={draft.title} className="mx-auto max-h-[36dvh] w-auto object-contain" />
        </div>
        {isNew && (
          <p className="flex gap-2.5 rounded-2xl bg-sage/[.08] p-3 text-[13px] leading-5 text-ink/75">
            <Sun className="mt-0.5 h-4 w-4 shrink-0 text-sage" strokeWidth={1.7} />
            Next time: same light, angle and distance. Face a window, no flash, no filter.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Title">
            <input value={draft.title} onChange={(event) => { setTitleTouched(true); set({ title: event.target.value }); }} />
          </Field>
          <Field label="Date" hint={draft.date > today ? <span className="text-clay">In the future.</span> : undefined}>
            <DateInput label="Photo date" value={draft.date} onChange={setDate} />
          </Field>
        </div>
        <div>
          <p className="field-label">Areas</p>
          <div className="flex flex-wrap gap-2">
            {PHOTO_TAGS.map((tag) => <ChipToggle key={tag} active={draft.tags.includes(tag)} onClick={() => toggleTag(tag)}>{tag}</ChipToggle>)}
          </div>
        </div>
        <Field label="Note">
          <textarea rows={2} maxLength={240} value={draft.note ?? ""} onChange={(event) => set({ note: event.target.value })} placeholder="e.g. Chin calmer, two new spots on forehead" />
        </Field>
      </div>
    </Sheet>
  );
}

export function PhotoPicker({ photos, selectedId, title, onPick, onClose }: { photos: SkinPhoto[]; selectedId: string; title: string; onPick: (id: string) => void; onClose: () => void }) {
  return (
    <Sheet eyebrow="Compare" title={title} onClose={onClose}>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => { onPick(photo.id); closeSheet(onClose); }}
            className={`overflow-hidden rounded-xl border text-left ${photo.id === selectedId ? "border-ink ring-2 ring-ink/80" : "border-black/[.08]"}`}
          >
            <img src={photo.dataUrl} alt="" className="aspect-[3/4] w-full object-cover" />
            <span className="block truncate px-2 pt-1.5 text-xs font-medium">{photo.title}</span>
            <span className="block truncate px-2 pb-2 text-xs text-ink/65">{formatDate(photo.date)} · {photo.tags[0] ?? "No area"}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
