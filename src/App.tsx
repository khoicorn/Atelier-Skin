import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Check, Package, ScanFace } from "lucide-react";
import { createDefaultPlan, initialProducts, Plan, Product } from "./data";
import { MirrorView } from "./features/mirror/MirrorView";
import { InstallPrompt } from "./features/plan/PlanSettingsSheet";
import { PlanView } from "./features/plan/PlanView";
import { ProductsView } from "./features/products/ProductsView";
import { useLocalStorage } from "./hooks/use-local-storage";
import { todayISO } from "./lib/dates";
import { STORAGE_KEYS } from "./lib/migrate";
import { cn } from "./lib/utils";

type Tab = "plan" | "products" | "mirror";

const NAV: { id: Tab; label: string; icon: typeof CalendarDays }[] = [
  { id: "plan", label: "Plan", icon: CalendarDays },
  { id: "products", label: "Products", icon: Package },
  { id: "mirror", label: "Mirror", icon: ScanFace }
];

/** Today's date. Refreshes when the app comes back to the foreground on a new day. */
function useToday() {
  const [today, setToday] = useState(todayISO);
  useEffect(() => {
    const refresh = () => setToday(todayISO());
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);
  return today;
}

export default function App() {
  const today = useToday();
  const [tab, setTab] = useState<Tab>("plan");
  const [plan, setPlan] = useLocalStorage<Plan>(STORAGE_KEYS.plan, () => createDefaultPlan());
  const [products, setProducts] = useLocalStorage<Product[]>(STORAGE_KEYS.products, initialProducts);
  const [notice, setNotice] = useState("");
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const notify = useCallback((message: string) => setNotice(message), []);

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

  const go = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-dvh bg-ivory text-ink">
      <div aria-hidden className="ambient ambient-one" />
      <div aria-hidden className="ambient ambient-two" />

      <header className="sticky top-0 z-30 border-b border-black/[.06] bg-ivory/80 px-4 pb-3 pt-[max(.9rem,env(safe-area-inset-top))] backdrop-blur-2xl md:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <button type="button" onClick={() => go("plan")} className="min-w-0 text-left" aria-label="Atelier Skin, go to plan">
            <p className="font-serif text-[1.55rem] font-medium leading-none tracking-[-.02em]">Atelier Skin</p>
            <p className="mt-1 text-[9px] font-semibold uppercase tracking-[.24em] text-ink/45">Private skincare ledger</p>
          </button>
          <div aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink font-serif text-sm text-ivory">NH</div>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-7 md:px-8 md:pt-10">
        {tab === "plan" && <PlanView plan={plan} setPlan={setPlan} today={today} notify={notify} onCompare={() => go("mirror")} installPrompt={installPrompt} />}
        {tab === "products" && <ProductsView products={products} setProducts={setProducts} plan={plan} today={today} notify={notify} />}
        {tab === "mirror" && <MirrorView plan={plan} today={today} notify={notify} />}
      </main>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[440px] px-3 pb-[max(.6rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-3 gap-1 rounded-[1.4rem] border border-black/10 bg-paper/90 p-1.5 backdrop-blur-2xl">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              aria-current={tab === id ? "page" : undefined}
              className={cn("flex min-h-[3.6rem] flex-col items-center justify-center gap-1 rounded-[1.05rem] text-[11px] font-semibold tracking-wide transition-colors", tab === id ? "bg-ink text-white" : "text-ink/50 hover:text-ink")}
            >
              <Icon className="h-[19px] w-[19px]" strokeWidth={1.6} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {notice && (
        <div role="status" className="toast fixed left-1/2 top-[calc(5rem+env(safe-area-inset-top))] z-[60] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs text-white">
          <Check className="h-4 w-4 shrink-0" />
          <span className="truncate">{notice}</span>
        </div>
      )}
    </div>
  );
}
