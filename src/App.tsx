import { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaChart, BarChart3, CalendarDays, Camera, Check, ChevronRight, CircleDollarSign,
  FlaskConical, Home, ImagePlus, Info, Layers2, Package, Plus, ShieldCheck,
  Sparkles, Target, Trash2, TrendingDown, X
} from "lucide-react";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Checkbox } from "./components/ui/checkbox";
import { Slider } from "./components/ui/slider";
import { Category, DailyLog, initialLedger, LedgerItem, clinicForWeek, routineItems, skinProfile } from "./data";
import { useLocalStorage } from "./hooks/use-local-storage";
import { compressPhoto, deletePhoto, listPhotos, savePhoto, SkinPhoto } from "./lib/photo-db";
import { cn, formatMoney, localISO } from "./lib/utils";

type Tab = "today" | "mirror" | "ledger" | "plan";
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const today = localISO();

function startOfWeekISO() {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  now.setDate(now.getDate() - day);
  return localISO(now);
}

function addDays(iso: string, amount: number) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return localISO(date);
}

function shortDate(iso: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${iso}T12:00:00`));
}

function weekDays(center = new Date()) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(center);
    date.setDate(center.getDate() + index - 3);
    return { iso: localISO(date), day: new Intl.DateTimeFormat("en", { weekday: "short" }).format(date).slice(0, 2), number: date.getDate() };
  });
}

const sectionTitle = (eyebrow: string, title: string, right?: React.ReactNode) => (
  <div className="mb-4 flex items-end justify-between gap-4">
    <div><p className="eyebrow">{eyebrow}</p><h2 className="font-serif text-[1.75rem] leading-none tracking-[-.025em]">{title}</h2></div>
    {right}
  </div>
);

function App() {
  const [active, setActive] = useState<Tab>("today");
  const [phaseStart] = useLocalStorage("atelier-phase-start", startOfWeekISO());
  const [logs, setLogs] = useLocalStorage<Record<string, DailyLog>>("atelier-daily-logs", {});
  const [ledger, setLedger] = useLocalStorage<LedgerItem[]>("atelier-ledger", initialLedger);
  const [notice, setNotice] = useState("");
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);

  const defaultLog: DailyLog = { date: today, completed: {}, redness: 4, hydration: 6, pustules: 0 };
  const [daily, setDaily] = useState<DailyLog>(logs[today] || defaultLog);
  const clinicDates = useMemo(() => Array.from({ length: 6 }, (_, i) => ({ ...clinicForWeek(i + 1), date: addDays(phaseStart, i * 7 + 5) })), [phaseStart]);

  useEffect(() => {
    const handler = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const saveToday = () => {
    setLogs({ ...logs, [today]: daily });
    setNotice("Today’s check-in is saved");
  };

  const nav = [
    { id: "today" as const, label: "Today", icon: Home },
    { id: "mirror" as const, label: "Mirror", icon: Camera },
    { id: "ledger" as const, label: "Ledger", icon: BarChart3 },
    { id: "plan" as const, label: "Plan", icon: Layers2 }
  ];

  return (
    <div className="min-h-dvh bg-ivory text-ink">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <div className="mx-auto min-h-dvh w-full max-w-6xl border-black/[.06] lg:border-x">
        <header className="sticky top-0 z-30 border-b border-black/[.06] bg-ivory/80 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-2xl md:px-8">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <button onClick={() => setActive("today")} className="text-left" aria-label="Go to dashboard">
              <p className="font-serif text-2xl leading-none tracking-[-.035em]">Atelier Skin</p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[.24em] text-ink/45">Private care ledger</p>
            </button>
            <div className="flex items-center gap-2">
              <Badge className="border-sage/20 bg-sage/[.08] text-sage">{skinProfile.phase}</Badge>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-ink font-serif text-sm text-ivory">NH</div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 pb-32 pt-6 md:px-8 md:pt-9">
          {active === "today" && <Dashboard daily={daily} setDaily={setDaily} saveToday={saveToday} clinicDates={clinicDates} logs={logs} />}
          {active === "mirror" && <Mirror setNotice={setNotice} />}
          {active === "ledger" && <Ledger ledger={ledger} setLedger={setLedger} setNotice={setNotice} />}
          {active === "plan" && <Plan clinicDates={clinicDates} installPrompt={installPrompt} />}
        </main>

        <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[460px] -translate-x-1/2 px-3 pb-[max(.65rem,env(safe-area-inset-bottom))] md:max-w-[520px]">
          <div className="grid grid-cols-4 rounded-[1.35rem] border border-black/10 bg-[#f8f6f0]/90 p-1.5 backdrop-blur-2xl">
            {nav.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActive(id)} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-[1rem] text-[10px] font-semibold tracking-wide text-ink/45 transition-colors", active === id && "bg-ink text-white")}>
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} /><span>{label}</span>
              </button>
            ))}
          </div>
        </nav>

        {notice && <div className="fixed left-1/2 top-24 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs text-white"><Check className="h-4 w-4" />{notice}</div>}
      </div>
    </div>
  );
}

function Dashboard({ daily, setDaily, saveToday, clinicDates, logs }: {
  daily: DailyLog; setDaily: (value: DailyLog) => void; saveToday: () => void; clinicDates: (ReturnType<typeof clinicForWeek> & { date: string })[]; logs: Record<string, DailyLog>;
}) {
  const checked = routineItems.filter((item) => daily.completed[item.id]).length;
  const nextClinic = clinicDates.find((clinic) => clinic.date! >= today) || clinicDates.at(-1)!;
  const trend = Object.values(logs).slice(-7);

  return <div className="animate-in">
    <section className="mb-8 grid gap-4 md:grid-cols-[1.25fr_.75fr]">
      <Card className="relative overflow-hidden bg-ink text-ivory">
        <CardContent className="relative p-6 md:p-8">
          <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full border border-champagne/20" />
          <div className="absolute -right-4 -top-6 h-32 w-32 rounded-full border border-champagne/20" />
          <p className="eyebrow text-champagne">{new Intl.DateTimeFormat("en", { weekday: "long", day: "2-digit", month: "long" }).format(new Date())}</p>
          <h1 className="mt-4 max-w-lg font-serif text-[2.4rem] leading-[.98] tracking-[-.04em] md:text-5xl">Good skin is built<br />in quiet increments.</h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-white/55">Focus today: protect the barrier, complete the basics, and record only what changed.</p>
          <div className="mt-7 flex items-center gap-3">
            <div className="flex -space-x-2">{["bg-sage", "bg-taupe", "bg-champagne"].map((color) => <div key={color} className={cn("h-8 w-8 rounded-full border-2 border-ink", color)} />)}</div>
            <span className="text-xs text-white/55">{checked} of {routineItems.length} care actions</span>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-sage/[.09]">
        <CardContent className="flex h-full flex-col justify-between p-6">
          <div className="flex items-start justify-between"><div className="rounded-full border border-sage/20 bg-white/40 p-2"><CalendarDays className="h-5 w-5 text-sage" /></div><Badge>Next clinic</Badge></div>
          <div className="mt-10"><p className="font-serif text-2xl leading-tight">{nextClinic.treatment}</p><p className="mt-2 text-xs text-ink/50">{shortDate(nextClinic.date!)} · Hasaki Clinic</p></div>
          <div className="mt-5 flex items-center justify-between border-t border-black/[.08] pt-4 text-xs"><span>{nextClinic.purpose}</span><span className="font-semibold">Week {nextClinic.week}</span></div>
        </CardContent>
      </Card>
    </section>

    <div className="grid gap-7 lg:grid-cols-[1.1fr_.9fr]">
      <section>
        {sectionTitle("Daily ritual", "Today’s protocol", <span className="text-xs text-ink/40">{Math.round(checked / routineItems.length * 100)}% complete</span>)}
        <Card><CardContent className="divide-y divide-black/[.06] p-0">
          {(["AM", "PM", "SUPPLEMENT"] as const).map((period) => <div key={period} className="p-5">
            <p className="mb-4 text-[9px] font-bold uppercase tracking-[.22em] text-ink/35">{period === "SUPPLEMENT" ? "Daily supplements" : `${period} routine`}</p>
            <div className="space-y-4">{routineItems.filter((item) => item.period === period).map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-3">
              <Checkbox checked={!!daily.completed[item.id]} onCheckedChange={(value) => setDaily({ ...daily, completed: { ...daily.completed, [item.id]: !!value } })} />
              <span className="min-w-0 flex-1"><span className={cn("block text-sm", daily.completed[item.id] && "text-ink/35 line-through")}>{item.name}</span><span className="block truncate text-[11px] text-ink/40">{item.detail}</span></span>
            </label>)}</div>
          </div>)}
        </CardContent></Card>
      </section>

      <section>
        {sectionTitle("Skin signal", "Quick check-in")}
        <Card><CardContent className="space-y-6">
          <MetricSlider label="Redness" value={daily.redness} onChange={(redness) => setDaily({ ...daily, redness })} low="Calm" high="Flared" />
          <MetricSlider label="Hydration" value={daily.hydration} onChange={(hydration) => setDaily({ ...daily, hydration })} low="Tight" high="Comfortable" />
          <div><div className="mb-3 flex items-end justify-between"><div><p className="text-sm font-medium">Active pustules</p><p className="text-[11px] text-ink/40">Count, don’t estimate severity</p></div><span className="font-serif text-3xl">{daily.pustules}</span></div>
            <div className="grid grid-cols-6 gap-2">{[0, 1, 2, 3, 4, 5].map((value) => <button key={value} onClick={() => setDaily({ ...daily, pustules: value })} className={cn("h-9 rounded-full border border-black/10 text-xs", daily.pustules === value && "border-ink bg-ink text-white")}>{value}{value === 5 ? "+" : ""}</button>)}</div>
          </div>
          <Button onClick={saveToday} className="w-full">Save today’s check-in <ChevronRight className="h-4 w-4" /></Button>
        </CardContent></Card>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Card><CardContent className="p-4"><p className="text-[10px] uppercase tracking-widest text-ink/35">7-day redness</p><p className="mt-2 font-serif text-2xl">{trend.length ? trend.at(-1)?.redness : "—"}<span className="ml-1 text-xs text-ink/35">/10</span></p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-[10px] uppercase tracking-widest text-ink/35">Routine</p><p className="mt-2 font-serif text-2xl">{checked}<span className="ml-1 text-xs text-ink/35">/5</span></p></CardContent></Card>
        </div>
      </section>
    </div>

    <section className="mt-8">{sectionTitle("Calendar", "Care rhythm")}
      <div className="grid grid-cols-7 gap-1.5">{weekDays().map((day) => { const clinic = clinicDates.find((item) => item.date === day.iso); return <div key={day.iso} className={cn("rounded-2xl border border-black/[.07] bg-white/35 px-1 py-3 text-center", day.iso === today && "border-ink bg-ink text-white")}><p className="text-[9px] uppercase text-current opacity-45">{day.day}</p><p className="mt-1 text-sm font-semibold">{day.number}</p>{clinic && <span className={cn("mx-auto mt-2 block h-1.5 w-1.5 rounded-full", day.iso === today ? "bg-champagne" : "bg-sage")} />}</div>; })}</div>
    </section>
  </div>;
}

function MetricSlider({ label, value, onChange, low, high }: { label: string; value: number; onChange: (value: number) => void; low: string; high: string }) {
  return <div><div className="mb-4 flex items-end justify-between"><div><p className="text-sm font-medium">{label}</p><p className="text-[11px] text-ink/40">{low} → {high}</p></div><span className="font-serif text-3xl">{value}<span className="text-xs text-ink/35">/10</span></span></div><Slider value={[value]} min={1} max={10} step={1} onValueChange={([next]) => onChange(next)} /></div>;
}

function Mirror({ setNotice }: { setNotice: (message: string) => void }) {
  const [photos, setPhotos] = useState<SkinPhoto[]>([]);
  const [tags, setTags] = useState<string[]>(["Chin"]);
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { listPhotos().then((items) => { setPhotos(items); setLeft(items.at(-1)?.id || ""); setRight(items[0]?.id || ""); }); }, []);
  const areas = ["Chin", "Forehead", "Left cheek", "Right cheek", "Full face"];

  const upload = async (file?: File) => {
    if (!file) return;
    try {
      const dataUrl = await compressPhoto(file);
      const number = photos.length + 1;
      const next: SkinPhoto = { id: crypto.randomUUID(), title: `Week ${number} · ${number % 2 ? "Post IPL" : "Healing"}`, date: today, tags, dataUrl };
      await savePhoto(next);
      const updated = [next, ...photos]; setPhotos(updated); setLeft(next.id); if (!right) setRight(next.id); setNotice("Progress photo saved privately");
    } catch { setNotice("Photo could not be saved"); }
  };

  const remove = async (id: string) => { await deletePhoto(id); setPhotos(photos.filter((photo) => photo.id !== id)); };
  const selectedLeft = photos.find((photo) => photo.id === left);
  const selectedRight = photos.find((photo) => photo.id === right);

  return <div className="animate-in">
    {sectionTitle("The mirror", "Visual progress", <Badge>{photos.length} entries</Badge>)}
    <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <div>
        <Card className="overflow-hidden border-dashed border-black/15 bg-white/30"><CardContent className="p-6 text-center">
          <button onClick={() => inputRef.current?.click()} className="group mx-auto grid aspect-[4/3] w-full place-items-center rounded-[1.1rem] border border-black/[.07] bg-[linear-gradient(145deg,rgba(111,125,104,.08),rgba(185,164,126,.08))]">
            <span><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-ink text-white transition-colors group-hover:bg-sage"><ImagePlus className="h-5 w-5" /></span><span className="mt-4 block font-serif text-xl">Add this week’s portrait</span><span className="mt-1 block text-xs text-ink/40">Camera or gallery · compressed on device</span></span>
          </button>
          <input ref={inputRef} className="hidden" type="file" accept="image/*" capture="user" onChange={(event) => upload(event.target.files?.[0])} />
          <div className="mt-5 text-left"><p className="mb-3 text-[9px] font-bold uppercase tracking-[.2em] text-ink/35">Tag areas</p><div className="flex flex-wrap gap-2">{areas.map((area) => <button key={area} onClick={() => setTags(tags.includes(area) ? tags.filter((tag) => tag !== area) : [...tags, area])} className={cn("rounded-full border border-black/10 px-3 py-2 text-[11px]", tags.includes(area) && "border-sage bg-sage text-white")}>#{area}</button>)}</div></div>
        </CardContent></Card>

        <div className="mt-6">{sectionTitle("Archive", "Weekly gallery")}
          {photos.length === 0 ? <Empty icon={Camera} title="No portraits yet" text="Your first upload will become the baseline." /> : <div className="grid grid-cols-2 gap-3">{photos.map((photo) => <div key={photo.id} className="group relative overflow-hidden rounded-2xl border border-black/[.08] bg-white/50"><img src={photo.dataUrl} alt={photo.title} className="aspect-[3/4] w-full object-cover" /><div className="p-3"><p className="truncate text-xs font-medium">{photo.title}</p><p className="mt-1 text-[10px] text-ink/40">{photo.tags.map((tag) => `#${tag}`).join(" ")}</p></div><button onClick={() => remove(photo.id)} aria-label="Delete photo" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div>}
        </div>
      </div>

      <section>{sectionTitle("Compare", "Before & after", <Badge>Side by side</Badge>)}
        <Card><CardContent className="p-3 md:p-5">
          <div className="grid grid-cols-2 gap-2 md:gap-4">
            <ComparePanel label="Before" photo={selectedRight} value={right} onChange={setRight} photos={photos} />
            <ComparePanel label="After" photo={selectedLeft} value={left} onChange={setLeft} photos={photos} />
          </div>
          <div className="mt-4 rounded-2xl bg-sage/[.07] p-4 text-xs leading-5 text-ink/55"><Info className="mr-2 inline h-4 w-4 text-sage" />Use the same light, angle, distance and time of day. Consistency is more useful than a flattering photo.</div>
        </CardContent></Card>
      </section>
    </div>
  </div>;
}

function ComparePanel({ label, photo, value, onChange, photos }: { label: string; photo?: SkinPhoto; value: string; onChange: (id: string) => void; photos: SkinPhoto[] }) {
  return <div><div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-black/[.04]">{photo ? <img src={photo.dataUrl} alt={photo.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center px-4 text-center text-xs text-ink/30">Add photos to compare</div>}<Badge className="absolute left-2 top-2 border-white/20 bg-black/45 text-white backdrop-blur">{label}</Badge></div><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-black/10 bg-white/60 px-2 text-[11px] outline-none"><option value="">Select week</option>{photos.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>;
}

function Ledger({ ledger, setLedger, setNotice }: { ledger: LedgerItem[]; setLedger: (items: LedgerItem[]) => void; setNotice: (message: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Skincare" as Category, price: "", purchaseDate: today, emptyDate: "" });
  const month = today.slice(0, 7);
  const monthly = ledger.filter((item) => item.purchaseDate.startsWith(month));
  const total = monthly.reduce((sum, item) => sum + item.price, 0);
  const categoryTotals = (["Clinic", "Skincare", "Supplement"] as Category[]).map((category) => ({ name: category === "Skincare" ? "Home care" : category, value: monthly.filter((item) => item.category === category).reduce((sum, item) => sum + item.price, 0), color: category === "Clinic" ? "#171A18" : category === "Skincare" ? "#6F7D68" : "#B9A47E" }));

  const add = () => {
    if (!form.name || !form.price) return;
    setLedger([{ id: crypto.randomUUID(), name: form.name, category: form.category, price: Number(form.price), purchaseDate: form.purchaseDate, emptyDate: form.emptyDate }, ...ledger]);
    setAdding(false); setForm({ name: "", category: "Skincare", price: "", purchaseDate: today, emptyDate: "" }); setNotice("Expense added to the ledger");
  };

  return <div className="animate-in">
    {sectionTitle("The ledger", "Cost intelligence", <Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add</Button>)}
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-2"><CardContent className="p-6 md:p-8"><div className="flex items-start justify-between"><div><p className="eyebrow">Monthly burn rate</p><p className="mt-3 font-serif text-4xl tracking-tight">{formatMoney(total)}</p><p className="mt-2 text-xs text-ink/40">Actual purchases · {new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date())}</p></div><div className="rounded-full bg-sage/[.1] p-3 text-sage"><TrendingDown className="h-5 w-5" /></div></div><div className="mt-8 h-px bg-black/[.07]" /><div className="mt-5 flex justify-between text-xs"><span className="text-ink/40">Transactions</span><span className="font-semibold">{monthly.length}</span></div></CardContent></Card>
      <Card><CardContent className="p-5"><p className="eyebrow">Distribution</p><div className="mt-1 grid h-40 place-items-center"><div className="relative h-28 w-28 rounded-full" style={{ background: total > 0 ? `conic-gradient(#171A18 0 ${categoryTotals[0].value / total * 100}%, #6F7D68 0 ${(categoryTotals[0].value + categoryTotals[1].value) / total * 100}%, #B9A47E 0 100%)` : "rgb(0 0 0 / .04)" }}><div className="absolute inset-4 grid place-items-center rounded-full bg-[#f5f2eb] text-center text-[10px] text-ink/40">{total > 0 ? <><span><strong className="block text-sm text-ink">{monthly.length}</strong>entries</span></> : <>Add a<br />purchase</>}</div></div></div><div className="space-y-2">{categoryTotals.map((item) => <div key={item.name} className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><span>{total ? Math.round(item.value / total * 100) : 0}%</span></div>)}</div></CardContent></Card>
    </div>

    <section className="mt-8">{sectionTitle("Inventory", "Products & treatments", <Badge>{ledger.length} items</Badge>)}
      <Card><CardContent className="divide-y divide-black/[.06] p-0">{ledger.map((item) => <div key={item.id} className="flex items-center gap-3 p-4 md:p-5"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/[.035]">{item.category === "Clinic" ? <FlaskConical className="h-4 w-4" /> : item.category === "Supplement" ? <Sparkles className="h-4 w-4" /> : <Package className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.name}</p><p className="mt-1 text-[10px] text-ink/40">{item.category}{item.emptyDate ? ` · est. empty ${shortDate(item.emptyDate)}` : ""}</p></div><div className="text-right"><p className="text-xs font-semibold">{item.price ? formatMoney(item.price) : "Add price"}</p>{item.purchaseDate && <p className="mt-1 text-[10px] text-ink/35">{shortDate(item.purchaseDate)}</p>}</div></div>)}</CardContent></Card>
    </section>

    {adding && <div className="fixed inset-0 z-50 grid items-end bg-black/35 p-3 backdrop-blur-sm md:place-items-center"><Card className="w-full max-w-md bg-[#f8f6f0]"><CardContent className="p-6"><div className="mb-6 flex items-center justify-between"><div><p className="eyebrow">New entry</p><h3 className="font-serif text-2xl">Record a purchase</h3></div><Button size="icon" variant="ghost" onClick={() => setAdding(false)}><X className="h-5 w-5" /></Button></div><div className="space-y-4"><Field label="Product or treatment"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Hasaki IPL session" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Category"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}><option>Skincare</option><option>Supplement</option><option>Clinic</option></select></Field><Field label="Price (VND)"><input inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/\D/g, "") })} placeholder="0" /></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Purchase date"><input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></Field><Field label="Est. empty date"><input type="date" value={form.emptyDate} onChange={(e) => setForm({ ...form, emptyDate: e.target.value })} /></Field></div><Button onClick={add} disabled={!form.name || !form.price} className="mt-2 w-full">Add to ledger</Button></div></CardContent></Card></div>}
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="form-field"><span>{label}</span>{children}</label>; }

function Plan({ clinicDates, installPrompt }: { clinicDates: (ReturnType<typeof clinicForWeek> & { date: string })[]; installPrompt: InstallPrompt | null }) {
  return <div className="animate-in">
    {sectionTitle("Care plan", "Low risk. High return.", <ShieldCheck className="h-6 w-6 text-sage" />)}
    <Card className="overflow-hidden bg-ink text-white"><CardContent className="p-6 md:p-8"><Badge className="border-champagne/25 bg-champagne/10 text-champagne">{skinProfile.phase}</Badge><h1 className="mt-5 font-serif text-4xl leading-none">{skinProfile.title}</h1><p className="mt-4 max-w-lg text-sm leading-6 text-white/50">{skinProfile.goal}. The “glass-skin” target comes after active inflammation is stable.</p><div className="mt-8 flex flex-wrap gap-2">{skinProfile.conditions.map((condition) => <span key={condition} className="rounded-full border border-white/10 px-3 py-2 text-[11px] text-white/65">{condition}</span>)}</div></CardContent></Card>

    <div className="mt-8 grid gap-7 lg:grid-cols-[1.15fr_.85fr]">
      <section>{sectionTitle("Hasaki Clinic", "Six-week cadence")}
        <Card><CardContent className="p-5"><div>{clinicDates.map((clinic, index) => <div key={clinic.week} className="relative flex gap-4 pb-6 last:pb-0"><div className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-sage/25 bg-[#f5f2eb] font-serif text-sm">{clinic.week}</div>{index < clinicDates.length - 1 && <div className="absolute left-[17px] top-9 h-[calc(100%-36px)] w-px bg-black/10" />}<div className="min-w-0 pt-0.5"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{clinic.treatment}</p><Badge>{shortDate(clinic.date)}</Badge></div><p className="mt-1 text-xs text-ink/40">{clinic.purpose} · Hasaki Clinic</p></div></div>)}</div></CardContent></Card>
      </section>
      <section className="space-y-4">{sectionTitle("Decision system", "Guardrails")}
        {[{ icon: Target, title: "One phase at a time", text: "Do not optimize texture while active inflammation is still the leading signal." }, { icon: AreaChart, title: "Measure weekly", text: "Use photos and trends; avoid judging progress from a single morning." }, { icon: CircleDollarSign, title: "Track real cost", text: "Only actual purchases count toward monthly burn rate—no invented estimates." }].map(({ icon: Icon, title, text }) => <Card key={title}><CardContent className="flex gap-4 p-5"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage/[.08] text-sage"><Icon className="h-4 w-4" /></div><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-ink/45">{text}</p></div></CardContent></Card>)}
        <Card className="border-champagne/20 bg-champagne/[.07]"><CardContent className="p-5"><p className="text-sm font-medium">Install on Samsung</p><p className="mt-2 text-xs leading-5 text-ink/45">Open the GitHub Pages link in Chrome, then tap ⋮ → <strong>Add to Home screen</strong> → Install.</p>{installPrompt && <Button className="mt-4 w-full" variant="secondary" onClick={() => installPrompt.prompt()}>Install Atelier Skin</Button>}</CardContent></Card>
      </section>
    </div>
  </div>;
}

function Empty({ icon: Icon, title, text }: { icon: typeof Camera; title: string; text: string }) {
  return <div className="rounded-2xl border border-dashed border-black/10 p-8 text-center"><Icon className="mx-auto h-5 w-5 text-ink/25" /><p className="mt-3 text-sm font-medium">{title}</p><p className="mt-1 text-xs text-ink/40">{text}</p></div>;
}

export default App;
