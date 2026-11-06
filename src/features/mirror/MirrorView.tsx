import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Camera, ImagePlus, Images } from "lucide-react";
import type { Notify } from "../../App";
import { EmptyState, SectionHeader } from "../../components/common";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Plan, PHOTO_TAGS } from "../../data";
import { daysBetween, formatDate, formatShort } from "../../lib/dates";
import { photoTakenDate } from "../../lib/exif";
import { byNewest, compressPhoto, deletePhoto, listPhotos, savePhoto, SkinPhoto } from "../../lib/photo-db";
import { servicesBetween } from "../../lib/plan";
import { cn, newId } from "../../lib/utils";
import { defaultPhotoTitle, PhotoPicker, PhotoSheet } from "./PhotoSheet";

type Props = { plan: Plan; today: string; notify: Notify };

/** The area to compare by default: the newest photo's area, preferring Full face. */
const mainArea = (photo?: SkinPhoto) => (photo?.tags.includes("Full face") ? "Full face" : photo?.tags[0]);

/** Oldest and newest photo of the same area, or of all photos when an area has fewer than 2. */
function defaultPair(photos: SkinPhoto[]) {
  const area = mainArea(photos[0]);
  const sameArea = area ? photos.filter((photo) => photo.tags.includes(area)) : [];
  const pool = sameArea.length >= 2 ? sameArea : photos;
  return { before: pool.at(-1), after: pool[0] };
}

export function MirrorView({ plan, today, notify }: Props) {
  const [photos, setPhotos] = useState<SkinPhoto[] | null>(null);
  const [editing, setEditing] = useState<{ photo: SkinPhoto; isNew: boolean } | null>(null);
  const [picking, setPicking] = useState<"before" | "after" | null>(null);
  const [beforeId, setBeforeId] = useState("");
  const [afterId, setAfterId] = useState("");
  const [filter, setFilter] = useState("All");
  const [working, setWorking] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listPhotos().then(setPhotos).catch(() => { setPhotos([]); notify("Photos could not be loaded on this browser"); });
  }, [notify]);

  const list = photos ?? [];
  const fallback = defaultPair(list);
  const before = list.find((photo) => photo.id === beforeId) ?? fallback.before;
  const after = list.find((photo) => photo.id === afterId) ?? fallback.after;

  const onFile = async (file: File | undefined, fromCamera: boolean) => {
    if (!file) return;
    setWorking(true);
    try {
      const [dataUrl, date] = await Promise.all([compressPhoto(file), fromCamera ? Promise.resolve(today) : photoTakenDate(file, today)]);
      const lastTags = list[0]?.tags.length ? list[0].tags : ["Full face"];
      setEditing({ isNew: true, photo: { id: newId(), title: defaultPhotoTitle(plan, date), date, tags: lastTags, note: "", dataUrl, createdAt: Date.now() } });
    } catch {
      notify("This photo could not be read");
    } finally {
      setWorking(false);
    }
  };

  const save = async (photo: SkinPhoto) => {
    try {
      await savePhoto(photo);
      setPhotos((current) => [...(current ?? []).filter((item) => item.id !== photo.id), photo].sort(byNewest));
      notify(editing?.isNew ? "Photo saved on this device" : "Photo updated");
    } catch {
      notify("Photo could not be saved. Storage may be full.");
      throw new Error("save failed");
    }
  };

  const remove = async (photo: SkinPhoto) => {
    try {
      await deletePhoto(photo.id);
    } catch {
      notify("Photo could not be deleted");
      return;
    }
    setPhotos((current) => (current ?? []).filter((item) => item.id !== photo.id));
    notify("Photo deleted", async () => {
      await savePhoto(photo);
      setPhotos((current) => [...(current ?? []), photo].sort(byNewest));
    });
  };

  const usedTags = PHOTO_TAGS.filter((tag) => list.some((photo) => photo.tags.includes(tag)));
  const shown = filter === "All" ? list : list.filter((photo) => photo.tags.includes(filter));
  const canCompare = list.length >= 2 && before && after;

  const addControls = (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Button className="h-12" onClick={() => cameraRef.current?.click()} disabled={working}><Camera className="h-4 w-4" strokeWidth={1.7} />Take photo</Button>
        <Button variant="secondary" className="h-12" onClick={() => galleryRef.current?.click()} disabled={working}><ImagePlus className="h-4 w-4" strokeWidth={1.7} />Gallery</Button>
      </div>
      <input ref={cameraRef} className="hidden" type="file" accept="image/*" capture="user" onChange={(event) => { onFile(event.target.files?.[0], true); event.target.value = ""; }} />
      <input ref={galleryRef} className="hidden" type="file" accept="image/*" onChange={(event) => { onFile(event.target.files?.[0], false); event.target.value = ""; }} />
    </>
  );

  const compare = canCompare ? (
    <section>
      <SectionHeader
        title="Before & after"
        action={
          <Button variant="secondary" size="sm" className="h-11 px-4 text-[13px]" onClick={() => { setBeforeId(after.id); setAfterId(before.id); }}>
            <ArrowLeftRight className="h-4 w-4" strokeWidth={1.7} />Swap
          </Button>
        }
      />
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <ComparePanel label="Before" photo={before} onClick={() => setPicking("before")} />
            <ComparePanel label="After" photo={after} onClick={() => setPicking("after")} />
          </div>
          <CompareSummary plan={plan} before={before} after={after} />
        </CardContent>
      </Card>
    </section>
  ) : null;

  return (
    <div className="animate-in">
      <div className="grid grid-cols-1 gap-x-10 gap-y-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
        {canCompare ? (
          <>
            <div className="lg:col-start-1 lg:row-start-1">{compare}</div>
            <div className="lg:col-start-2 lg:row-start-1">
              <div className="rounded-[1.5rem] border border-black/[.08] bg-white/45 p-3">{addControls}</div>
              <section className="mt-7">
                <Archive photos={shown} total={list.length} loaded={photos !== null} filter={filter} setFilter={setFilter} tags={usedTags} onOpen={(photo) => setEditing({ photo, isNew: false })} />
              </section>
            </div>
          </>
        ) : (
          <>
            <Card className="lg:col-start-1">
              <CardContent className="p-5">
                <p className="font-serif text-[1.5rem] leading-tight">{list.length ? "Add a second photo" : "Add your first photo"}</p>
                <p className="mb-4 mt-1.5 text-[13px] leading-5 text-ink/70">
                  {list.length ? "With two photos you can compare before and after." : "Your first photo becomes the baseline. It is made smaller and saved only on this phone."}
                </p>
                {addControls}
              </CardContent>
            </Card>
            <section className="lg:col-start-2">
              <Archive photos={shown} total={list.length} loaded={photos !== null} filter={filter} setFilter={setFilter} tags={usedTags} onOpen={(photo) => setEditing({ photo, isNew: false })} />
            </section>
          </>
        )}
      </div>

      {editing && <PhotoSheet photo={editing.photo} isNew={editing.isNew} plan={plan} today={today} onSave={save} onDelete={remove} onClose={() => setEditing(null)} />}
      {picking && (
        <PhotoPicker
          photos={list}
          title={picking === "before" ? "Choose the before photo" : "Choose the after photo"}
          selectedId={(picking === "before" ? before : after)?.id ?? ""}
          onPick={(id) => (picking === "before" ? setBeforeId(id) : setAfterId(id))}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}

function ComparePanel({ label, photo, onClick }: { label: string; photo: SkinPhoto; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="min-w-0 text-left" aria-label={`${label}: ${photo.title}, ${formatDate(photo.date)}. Tap to choose another photo.`}>
      <span className="relative block aspect-[3/4] overflow-hidden rounded-2xl bg-black/[.04]">
        <img src={photo.dataUrl} alt="" className="h-full w-full object-cover" />
        <span className="absolute left-2 top-2 rounded-full bg-ink/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">{label}</span>
      </span>
      <span className="mt-2 block truncate px-1 text-[13px] font-medium">{photo.title}</span>
      <span className="block truncate px-1 text-xs text-ink/65">{formatShort(photo.date)} · {photo.tags.join(", ") || "No area"}</span>
    </button>
  );
}

function CompareSummary({ plan, before, after }: { plan: Plan; before: SkinPhoto; after: SkinPhoto }) {
  const days = Math.abs(daysBetween(before.date, after.date));
  const services = servicesBetween(plan, before.date, after.date);
  const counts = new Map<string, number>();
  services.forEach((entry) => counts.set(entry.service, (counts.get(entry.service) ?? 0) + 1));
  const sharesArea = before.tags.some((tag) => after.tags.includes(tag));
  return (
    <div className="mt-3 rounded-2xl border border-black/[.06] bg-white/50 p-3.5 text-[13px] leading-5 text-ink/70">
      <p className="font-medium text-ink">
        {days === 0 ? "Same day" : `${days} days apart`} · {services.length} completed {services.length === 1 ? "visit" : "visits"} between
      </p>
      {counts.size > 0 && (
        <ul className="mt-1 space-y-0.5">
          {[...counts.entries()].map(([service, count]) => <li key={service} className="truncate">{service} × {count}</li>)}
        </ul>
      )}
      {!sharesArea && <p className="mt-1.5 font-medium text-[#6E5A38]">These photos show different areas. Pick two of the same area for a fair comparison.</p>}
      {before.date > after.date && <p className="mt-1.5 font-medium text-[#6E5A38]">The before photo is newer. Tap Swap.</p>}
    </div>
  );
}

function Archive({ photos, total, loaded, filter, setFilter, tags, onOpen }: {
  photos: SkinPhoto[]; total: number; loaded: boolean; filter: string; setFilter: (tag: string) => void; tags: string[]; onOpen: (photo: SkinPhoto) => void;
}) {
  return (
    <>
      <SectionHeader title={total ? `All photos · ${total}` : "All photos"} />
      {tags.length > 0 && (
        <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
          {["All", ...tags].map((tag) => (
            <button key={tag} type="button" onClick={() => setFilter(tag)} className={cn("min-h-11 shrink-0 rounded-full border px-4 text-[13px]", filter === tag ? "border-ink bg-ink text-white" : "border-black/10 text-ink/70")}>
              {tag}
            </button>
          ))}
        </div>
      )}
      {!loaded ? null : photos.length === 0 ? (
        <EmptyState icon={Images} title={filter === "All" ? "No photos yet" : `No ${filter.toLowerCase()} photos`} text={filter === "All" ? "Take a photo above. It stays private on this device." : "Choose another area or tag a photo with this area."} />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <button key={photo.id} type="button" onClick={() => onOpen(photo)} className="overflow-hidden rounded-xl border border-black/[.08] bg-white/50 text-left">
              <img src={photo.dataUrl} alt={photo.title} loading="lazy" className="aspect-[3/4] w-full object-cover" />
              <span className="block truncate px-2 pt-1.5 text-xs font-medium">{photo.title}</span>
              <span className="block truncate px-2 pb-2 text-xs text-ink/65">{formatShort(photo.date)}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
