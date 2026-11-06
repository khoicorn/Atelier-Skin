import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Check, Package, ScanFace, Settings2 } from "lucide-react";
import { createDefaultPlan, initialProducts, Plan, Product } from "./data";
import { MirrorView } from "./features/mirror/MirrorView";
import { PlanView } from "./features/plan/PlanView";
import { ProductsView } from "./features/products/ProductsView";
import { InstallPrompt, SettingsSheet } from "./features/settings/SettingsSheet";
import { useLocalStorage } from "./hooks/use-local-storage";
import { LAST_BACKUP_KEY } from "./lib/backup";
import { daysBetween, todayISO } from "./lib/dates";
import { STORAGE_KEYS } from "./lib/migrate";
import { cn } from "./lib/utils";

export type Tab = "plan" | "products" | "mirror";
export type Notify = (message: string, undo?: () => void) => void;

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

/**
 * Tabs live in browser history: Products and Mirror sit one step above Plan,
 * so the Android back gesture returns to Plan before it leaves the app.
 */
function useTabs() {
  const [tab, setTab] = useState<Tab>(() => (window.history.state?.tab as Tab) || "plan");
  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      if (event.state?.atelierSheet) return;
      setTab((event.state?.tab as Tab) || "plan");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((next: Tab) => {
    const onBase = !window.history.state?.tab;
    if (next === "plan") {
      if (onBase) setTab("plan");
      else window.history.back();
    } else {
      if (onBase) window.history.pushState({ tab: next }, "");
      else window.history.replaceState({ tab: next }, "");
      setTab(next);
    }
    window.scrollTo({ top: 0 });
  }, []);

  return [tab, go] as const;
}

type Toast = { id: number; message: string; undo?: () => void };

export default function App() {
  const today = useToday();
  const [tab, go] = useTabs();
  const [plan, setPlan] = useLocalStorage<Plan>(STORAGE_KEYS.plan, () => createDefaultPlan());
  const [products, setProducts] = useLocalStorage<Product[]>(STORAGE_KEYS.products, initialProducts);
  const [lastBackup, setLastBackup] = useLocalStorage<string>(LAST_BACKUP_KEY, "");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const toastId = useRef(0);

  const notify = useCallback<Notify>((message, undo) => setToast({ id: ++toastId.current, message, undo }), []);

  useEffect(() => {
    const handler = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.undo ? 8000 : 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const backupDue = !lastBackup || daysBetween(lastBackup, today) > 30;

  return (
    <div className="min-h-dvh bg-ivory text-ink">
      <div aria-hidden className="ambient ambient-one" />
      <div aria-hidden className="ambient ambient-two" />

      <header className="sticky top-0 z-30 border-b border-black/[.06] bg-ivory/85 pt-[env(safe-area-inset-top)] backdrop-blur-2xl">
        <div className="shell flex h-14 items-center justify-between gap-4">
          <button type="button" onClick={() => go("plan")} className="min-w-0 font-serif text-[1.5rem] font-medium leading-none tracking-[-.02em]">
            Atelier Skin
          </button>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => go(id)}
                aria-current={tab === id ? "page" : undefined}
                className={cn("h-10 rounded-full px-4 text-sm font-medium transition-colors", tab === id ? "bg-ink text-white" : "text-ink/65 hover:bg-black/[.04] hover:text-ink")}
              >
                {label}
              </button>
            ))}
          </nav>
          <button type="button" onClick={() => setSettingsOpen(true)} aria-label={backupDue ? "Settings and backup (backup recommended)" : "Settings and backup"} className="relative -mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/70 hover:bg-black/[.04]">
            <Settings2 className="h-5 w-5" strokeWidth={1.6} />
            {backupDue && <span aria-hidden className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-champagne ring-2 ring-ivory" />}
          </button>
        </div>
      </header>

      <main className="shell relative pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 md:pb-16 md:pt-8">
        {tab === "plan" && <PlanView key={dataVersion} plan={plan} setPlan={setPlan} today={today} notify={notify} onCompare={() => go("mirror")} />}
        {tab === "products" && <ProductsView key={dataVersion} products={products} setProducts={setProducts} plan={plan} today={today} notify={notify} onOpenPlan={() => go("plan")} />}
        {tab === "mirror" && <MirrorView key={dataVersion} plan={plan} today={today} notify={notify} />}
      </main>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[440px] px-3 pb-[max(.6rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="grid grid-cols-3 gap-1 rounded-[1.4rem] border border-black/10 bg-paper/90 p-1.5 backdrop-blur-2xl">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              aria-current={tab === id ? "page" : undefined}
              className={cn("flex min-h-[3.5rem] flex-col items-center justify-center gap-1 rounded-[1.05rem] text-xs font-semibold transition-colors", tab === id ? "bg-ink text-white" : "text-ink/60 hover:text-ink")}
            >
              <Icon className="h-[19px] w-[19px]" strokeWidth={1.6} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {toast && (
        <div role="status" key={toast.id} className="toast fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[45] mx-auto flex w-[calc(100%-2rem)] max-w-sm items-center gap-3 rounded-2xl bg-ink py-2 pl-4 pr-2 text-[13px] text-white md:bottom-6">
          <Check className="h-4 w-4 shrink-0 text-champagne" />
          <span className="min-w-0 flex-1 truncate py-1.5">{toast.message}</span>
          {toast.undo && (
            <button type="button" onClick={() => { toast.undo?.(); setToast(null); }} className="h-10 shrink-0 rounded-xl px-3 font-semibold text-champagne hover:bg-white/10">
              Undo
            </button>
          )}
        </div>
      )}

      {settingsOpen && (
        <SettingsSheet
          plan={plan}
          setPlan={setPlan}
          products={products}
          setProducts={setProducts}
          today={today}
          lastBackup={lastBackup}
          setLastBackup={setLastBackup}
          installPrompt={installPrompt}
          notify={notify}
          onRestored={() => setDataVersion((version) => version + 1)}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
