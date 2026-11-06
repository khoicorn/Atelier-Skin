import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Camera, ImagePlus, Images, Sun } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { EmptyState, PageHeader, PrivacyNote, SectionHeader } from "../../components/common";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Plan, PHOTO_TAGS } from "../../data";
import { daysBetween, formatDate } from "../../lib/dates";
import { byNewest, compressPhoto, deletePhoto, listPhotos, savePhoto, SkinPhoto } from "../../lib/photo-db";
import { servicesBetween } from "../../lib/plan";
import { cn, newId } from "../../lib/utils";
import { defaultPhotoTitle, PhotoPicker, PhotoSheet } from "./PhotoSheet";

type Props = { plan: Plan; today: string; notify: (message: string) => void };

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
  const oldest = list.at(-1);
  const newest = list[0];
  const before = list.find((photo) => photo.id === beforeId) ?? oldest;
  const after = list.find((photo) => photo.id === afterId) ?? newest;

  const onFile = async (file?: File) => {
    if (!file) return;
    setWorking(true);
    try {
      const dataUrl = await compressPhoto(file);
      const lastTags = list[0]?.tags.length ? list[0].tags : ["Full face"];
      setEditing({ isNew: true, photo: { id: newId(), title: defaultPhotoTitle(plan, today), date: today, tags: lastTags, note: "", dataUrl, createdAt: Date.now() } });
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
      if (editing?.isNew) setAfterId(photo.id);
      notify(editing?.isNew ? "Photo saved on this device" : "Photo updated");
    } catch {
      notify("Photo could not be saved. Storage may be full.");
      throw new Error("save failed");
    }
  };

  const remove = async (id: string) => {
    try {
      await deletePhoto(id);
    } catch {
      notify("Photo could not be deleted");
      return;
    }
    setPhotos((current) => (current ?? []).filter((item) => item.id !== id));
    if (beforeId === id) setBeforeId("");
    if (afterId === id) setAfterId("");
    notify("Photo deleted");
  };

  const usedTags = PHOTO_TAGS.filter((tag) => list.some((photo) => photo.tags.includes(tag)));
  const shown = filter === "All" ? list : list.filter((photo) => photo.tags.includes(filter));

  return (
    <div className="animate-in">
      <PageHeader eyebrow="Mirror" title="Visual progress" action={photos && photos.length > 0 ? <Badge>{photos.length} photos</Badge> : undefined} />

      <div className="grid grid-cols-1 gap-9 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] lg:items-start">
        <div className="space-y-9">
          {/* Add */}
          <Card className="overflow-hidden">
            <CardContent className="p-5 md:p-6">
              <p className="font-serif text-[1.6rem] leading-tight">Add this week’s photo</p>
              <p className="mt-1.5 text-xs leading-5 text-ink/50">The photo is made smaller and saved only on this phone.</p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Button className="h-12" onClick={() => cameraRef.current?.click()} disabled={working}><Camera className="h-4 w-4" strokeWidth={1.7} />Take photo</Button>
                <Button variant="secondary" className="h-12" onClick={() => galleryRef.current?.click()} disabled={working}><ImagePlus className="h-4 w-4" strokeWidth={1.7} />Gallery</Button>
              </div>
              <input ref={cameraRef} className="hidden" type="file" accept="image/*" capture="user" onChange={(event) => { onFile(event.target.files?.[0]); event.target.value = ""; }} />
              <input ref={galleryRef} className="hidden" type="file" accept="image/*" onChange={(event) => { onFile(event.target.files?.[0]); event.target.value = ""; }} />
              <p className="mt-4 flex gap-2.5 rounded-2xl bg-sage/[.07] p-3.5 text-[11.5px] leading-5 text-ink/60">
                <Sun className="mt-0.5 h-4 w-4 shrink-0 text-sage" strokeWidth={1.7} />
                Same light, angle and distance each week. Face a window, no flash, no filter.
              </p>
            </CardContent>
          </Card>

          {/* Archive (desktop: left column) */}
          <section className="hidden lg:block">
            <Archive photos={shown} loaded={photos !== null} filter={filter} setFilter={setFilter} tags={usedTags} onOpen={(photo) => setEditing({ photo, isNew: false })} />
          </section>
        </div>

        {/* Compare */}
        <section>
          <SectionHeader
            eyebrow="Compare"
            title="Before & after"
            action={list.length >= 2 ? (
              <Button variant="secondary" size="sm" className="h-10 px-3.5" onClick={() => { setBeforeId(after?.id ?? ""); setAfterId(before?.id ?? ""); }}>
                <ArrowLeftRight className="h-4 w-4" strokeWidth={1.7} />Swap
              </Button>
            ) : undefined}
          />
          {list.length >= 2 && before && after ? (
            <Card>
              <CardContent className="p-3 md:p-4">
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <ComparePanel label="Before" photo={before} onClick={() => setPicking("before")} />
                  <ComparePanel label="After" photo={after} onClick={() => setPicking("after")} />
                </div>
                <CompareSummary plan={plan} before={before} after={after} />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed bg-white/30">
              <CardContent className="py-8 text-center text-xs leading-5 text-ink/50">
                {list.length === 1 ? "One photo saved. Add another next week to compare." : "Your first photo becomes the baseline. Add a second to compare."}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Archive (mobile) */}
        <section className="lg:hidden">
          <Archive photos={shown} loaded={photos !== null} filter={filter} setFilter={setFilter} tags={usedTags} onOpen={(photo) => setEditing({ photo, isNew: false })} />
        </section>
      </div>

      <PrivacyNote />

      {editing && <PhotoSheet photo={editing.photo} isNew={editing.isNew} plan={plan} onSave={save} onDelete={remove} onClose={() => setEditing(null)} />}
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
    <button type="button" onClick={onClick} className="min-w-0 text-left" aria-label={`${label}: ${photo.title}. Tap to change.`}>
      <span className="relative block aspect-[3/4] overflow-hidden rounded-2xl bg-black/[.04]">
        <img src={photo.dataUrl} alt={photo.title} className="h-full w-full object-cover" />
        <span className="absolute left-2 top-2 rounded-full bg-ink/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-white backdrop-blur">{label}</span>
      </span>
      <span className="mt-2 block truncate px-1 text-[13px] font-medium">{photo.title}</span>
      <span className="block px-1 text-[11px] text-ink/45">{formatDate(photo.date)} · Change</span>
    </button>
  );
}

function CompareSummary({ plan, before, after }: { plan: Plan; before: SkinPhoto; after: SkinPhoto }) {
  const days = Math.abs(daysBetween(before.date, after.date));
  const services = servicesBetween(plan, before.date, after.date);
  const counts = new Map<string, number>();
  services.forEach((entry) => counts.set(entry.service, (counts.get(entry.service) ?? 0) + 1));
  return (
    <div className="mt-4 rounded-2xl border border-black/[.06] bg-white/45 p-4 text-xs leading-5 text-ink/60">
      <p className="font-medium text-ink">
        {days === 0 ? "Same day" : `${days} days apart`} · {services.length} completed {services.length === 1 ? "service" : "services"} between
      </p>
      {counts.size > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {[...counts.entries()].map(([service, count]) => <li key={service} className="truncate">{service} × {count}</li>)}
        </ul>
      )}
      {before.date > after.date && <p className="mt-1.5 text-[#8A7148]">The before photo is newer. Tap Swap.</p>}
    </div>
  );
}

function Archive({ photos, loaded, filter, setFilter, tags, onOpen }: {
  photos: SkinPhoto[]; loaded: boolean; filter: string; setFilter: (tag: string) => void; tags: string[]; onOpen: (photo: SkinPhoto) => void;
}) {
  return (
    <>
      <SectionHeader eyebrow="Archive" title="All photos" />
      {tags.length > 0 && (
        <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
          {["All", ...tags].map((tag) => (
            <button key={tag} type="button" onClick={() => setFilter(tag)} className={cn("min-h-10 shrink-0 rounded-full border px-3.5 text-[12px]", filter === tag ? "border-ink bg-ink text-white" : "border-black/10 text-ink/60")}>
              {tag}
            </button>
          ))}
        </div>
      )}
      {!loaded ? null : photos.length === 0 ? (
        <EmptyState icon={Images} title={filter === "All" ? "No photos yet" : `No ${filter.toLowerCase()} photos`} text={filter === "All" ? "Take a photo above. It stays private on this device." : "Choose another area or tag a photo with this area."} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <button key={photo.id} type="button" onClick={() => onOpen(photo)} className="overflow-hidden rounded-2xl border border-black/[.08] bg-white/50 text-left">
              <img src={photo.dataUrl} alt={photo.title} loading="lazy" className="aspect-[3/4] w-full object-cover" />
              <span className="block px-3 pt-2.5 text-[13px] font-medium leading-tight">{photo.title}</span>
              <span className="block px-3 pt-0.5 text-[11px] text-ink/45">{formatDate(photo.date)}</span>
              <span className="block truncate px-3 pb-3 pt-1 text-[10.5px] text-ink/45">{photo.tags.join(" · ") || "No area"}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
