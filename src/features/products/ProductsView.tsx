import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Droplet, Package, Pill, Plus } from "lucide-react";
import type { Notify } from "../../App";
import { EmptyState, ProductStatusPill, SectionHeader } from "../../components/common";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Plan, Product } from "../../data";
import { addMonths, daysBetween, formatMonth, formatShort, monthOf } from "../../lib/dates";
import { pastOpenServices, plannedIn, visitsIn } from "../../lib/plan";
import {
  averageFullMonths, buySoon, monthSeries, pricedWithoutDate, productsBoughtIn, productsFinishedIn, productsUsedIn
} from "../../lib/spending";
import { cn, formatMoney, newId } from "../../lib/utils";
import { ProductSheet } from "./ProductSheet";
import { SpendChart } from "./SpendChart";

type Props = {
  products: Product[];
  setProducts: (update: (products: Product[]) => Product[]) => void;
  plan: Plan;
  today: string;
  notify: Notify;
  onOpenPlan: () => void;
};

type View = "inventory" | "month" | "history";

const statusOrder = { "almost-empty": 0, "in-use": 1, unopened: 2, finished: 3 } as const;

const blankProduct = (today: string): Product => ({
  id: newId(), name: "", brand: "", category: "skincare", price: null,
  purchaseDate: today, openedDate: "", emptyDate: "", status: "unopened", note: ""
});

export function ProductsView({ products, setProducts, plan, today, notify, onOpenPlan }: Props) {
  const currentMonth = monthOf(today);
  const [month, setMonth] = useState(currentMonth);
  const [view, setView] = useState<View>("inventory");
  const [editing, setEditing] = useState<{ product: Product; isNew: boolean } | null>(null);

  const series = useMemo(() => monthSeries(plan, products, month, 6), [plan, products, month]);
  const selected = series[series.length - 1];
  const average = averageFullMonths(plan, products, currentMonth);
  const stillPlanned = month >= currentMonth ? plannedIn(plan, month) : null;
  const unconfirmed = pastOpenServices(plan, today).filter((entry) => monthOf(entry.date) === month).length;
  const undated = pricedWithoutDate(products);
  const toBuy = buySoon(products, today);
  const inventory = products.filter((item) => item.status !== "finished").sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  const monthName = formatMonth(month).split(" ")[0];

  const save = (product: Product) => {
    setProducts((current) => current.some((item) => item.id === product.id) ? current.map((item) => (item.id === product.id ? product : item)) : [product, ...current]);
    notify(editing?.isNew ? "Product added" : "Product updated");
  };
  const remove = (product: Product) => {
    const index = products.findIndex((item) => item.id === product.id);
    setProducts((current) => current.filter((item) => item.id !== product.id));
    notify(`${product.name} removed`, () => setProducts((current) => [...current.slice(0, index), product, ...current.slice(index)]));
  };
  const add = () => setEditing({ product: blankProduct(today), isNew: true });
  const open = (product: Product) => setEditing({ product, isNew: false });

  return (
    <div className="animate-in">
      <div className="grid grid-cols-1 gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-3">
          {toBuy.length > 0 && (
            <section aria-label="Buy soon" className="rounded-[1.5rem] border border-champagne/45 bg-champagne/[.1] p-1.5">
              <p className="label px-3 pb-0.5 pt-2 !text-[#6E5A38]">Buy soon · {toBuy.length}</p>
              {toBuy.map((item) => (
                <button key={item.id} type="button" onClick={() => open(item)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left hover:bg-white/50">
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium">{item.name}</span>
                    <span className="block truncate text-[13px] text-ink/70">{runOutLine(item, today)}{item.note ? ` · ${item.note}` : ""}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink/40" />
                </button>
              ))}
            </section>
          )}

          {/* Monthly spending */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <button type="button" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))} className="grid h-11 w-11 place-items-center rounded-full text-ink/65 hover:bg-black/[.04]">
                  <ChevronLeft className="h-5 w-5" strokeWidth={1.6} />
                </button>
                <p className="text-[13px] font-semibold">{formatMonth(month)}</p>
                <button type="button" aria-label="Next month" disabled={month >= currentMonth} onClick={() => setMonth(addMonths(month, 1))} className="grid h-11 w-11 place-items-center rounded-full text-ink/65 hover:bg-black/[.04] disabled:opacity-25">
                  <ChevronRight className="h-5 w-5" strokeWidth={1.6} />
                </button>
              </div>
              <p className="mt-0.5 text-center font-serif text-[2.15rem] leading-none tracking-[-.01em] tabular-nums" aria-label={`Total spent ${formatMoney(selected.total)}`}>{formatMoney(selected.total)}</p>
              <dl className="mt-2.5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[13px]">
                <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-chart-clinic" /><dt className="text-ink/65">Clinic</dt><dd className="font-semibold tabular-nums">{formatMoney(selected.clinic)}</dd></div>
                <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-chart-products" /><dt className="text-ink/65">Products</dt><dd className="font-semibold tabular-nums">{formatMoney(selected.products)}</dd></div>
              </dl>
              <div className="mt-3">
                <SpendChart series={series} selected={month} onSelect={setMonth} />
              </div>
              <div className="mt-3 space-y-1.5 border-t border-black/[.07] pt-3 text-[13px] leading-5">
                {stillPlanned && stillPlanned.count > 0 && (
                  <button type="button" onClick={onOpenPlan} className="block w-full text-left text-ink/75">
                    Still planned in {monthName}: <span className="font-medium text-ink">{stillPlanned.count} {stillPlanned.count === 1 ? "visit" : "visits"}</span>
                    {stillPlanned.known ? ` · ${formatMoney(stillPlanned.known)} known` : ""}
                    {stillPlanned.missingPrices ? ` · ${stillPlanned.missingPrices} without price` : ""}
                  </button>
                )}
                {unconfirmed > 0 && (
                  <button type="button" onClick={onOpenPlan} className="block w-full text-left font-medium text-[#6E5A38]">
                    {unconfirmed} past {unconfirmed === 1 ? "visit is" : "visits are"} not marked completed, so not counted. Review
                  </button>
                )}
                {undated.length > 0 && (
                  <button type="button" onClick={() => setView("history")} className="block w-full text-left font-medium text-[#6E5A38]">
                    {undated.length} priced {undated.length === 1 ? "product has" : "products have"} no purchase date, so not counted. Add the date
                  </button>
                )}
                <p className="flex justify-between gap-3 text-ink/70">
                  <span>Average per month</span>
                  <span className="font-semibold tabular-nums text-ink">{average ? formatMoney(average) : "After the first full month"}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lists */}
        <section>
          <SectionHeader title="Products" action={<Button size="sm" variant="secondary" className="h-11 px-4 text-[13px]" onClick={add}><Plus className="h-4 w-4" />Add product</Button>} />
          <div role="tablist" aria-label="Product lists" className="grid grid-cols-3 gap-1 rounded-2xl border border-black/[.08] bg-white/45 p-1">
            {([["inventory", `In stock · ${inventory.length}`], ["month", monthName], ["history", "History"]] as [View, string][]).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={cn("min-h-11 truncate rounded-xl px-2 text-[13px] font-medium", view === id ? "bg-ink text-white" : "text-ink/65 hover:bg-white/70")}>
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {view === "inventory" && (
              inventory.length ? <ProductList items={inventory} today={today} onOpen={open} />
                : <EmptyState icon={Package} title="Nothing in stock" text="Add the skincare and supplements you own." action={<Button onClick={add}><Plus className="h-4 w-4" />Add product</Button>} />
            )}
            {view === "month" && <MonthLists plan={plan} products={products} month={month} today={today} onOpen={open} />}
            {view === "history" && <History products={products} today={today} onOpen={open} />}
          </div>
        </section>
      </div>

      {editing && <ProductSheet product={editing.product} isNew={editing.isNew} today={today} onSave={save} onDelete={remove} onClose={() => setEditing(null)} />}
    </div>
  );
}

function MonthLists({ plan, products, month, today, onOpen }: { plan: Plan; products: Product[]; month: string; today: string; onOpen: (item: Product) => void }) {
  const name = formatMonth(month);
  const visits = visitsIn(plan, month);
  const bought = productsBoughtIn(products, month);
  const finished = productsFinishedIn(products, month);
  const used = productsUsedIn(products, month, today);
  return (
    <div className="space-y-6">
      <div>
        <p className="list-label">Clinic visits in {name} · {visits.length}</p>
        {visits.length ? (
          <Card>
            <ul className="divide-y divide-black/[.06]">
              {visits.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium">{entry.service}</span>
                    <span className="block text-[13px] text-ink/65">{formatShort(entry.date)}{entry.clinic ? ` · ${entry.clinic}` : ""}</span>
                  </span>
                  <span className="shrink-0 text-[13px] font-medium tabular-nums">{entry.price !== null ? formatMoney(entry.price) : <span className="text-[#7A6440]">Add price</span>}</span>
                </li>
              ))}
            </ul>
          </Card>
        ) : <p className="list-empty">No completed clinic visits this month.</p>}
      </div>
      <div>
        <p className="list-label">Bought in {name} · {bought.length}</p>
        {bought.length ? <ProductList items={bought} today={today} onOpen={onOpen} showPurchase /> : <p className="list-empty">No purchases recorded this month.</p>}
      </div>
      {finished.length > 0 && (
        <div>
          <p className="list-label">Finished in {name} · {finished.length}</p>
          <ProductList items={finished} today={today} onOpen={onOpen} />
        </div>
      )}
      <div>
        <p className="list-label">Used in {name} · {used.length}</p>
        <p className="px-1 text-[13px] leading-6 text-ink/75">{used.length ? used.map((item) => item.name).join(" · ") : "No products in use this month."}</p>
      </div>
    </div>
  );
}

function ProductList({ items, today, onOpen, showPurchase }: { items: Product[]; today: string; onOpen: (item: Product) => void; showPurchase?: boolean }) {
  return (
    <Card>
      <ul className="divide-y divide-black/[.06]">
        {items.map((item) => <li key={item.id}><ProductRow item={item} today={today} onOpen={() => onOpen(item)} showPurchase={showPurchase} /></li>)}
      </ul>
    </Card>
  );
}

function ProductRow({ item, today, onOpen, showPurchase }: { item: Product; today: string; onOpen: () => void; showPurchase?: boolean }) {
  const Icon = item.category === "supplement" ? Pill : Droplet;
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/50">
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", item.category === "supplement" ? "bg-champagne/[.16] text-[#7A6440]" : "bg-sage/[.12] text-[#4B5E45]")}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate text-[15px] font-medium">{item.name}</span>
          <span className={cn("shrink-0 text-[13px] tabular-nums", item.price !== null ? "font-medium" : "text-[#7A6440]")}>{item.price !== null ? formatMoney(item.price) : "Add price"}</span>
        </span>
        <span className="mt-1 flex items-center gap-2">
          <ProductStatusPill status={item.status} />
          <span className="truncate text-[13px] text-ink/65">{[item.brand, dateLine(item, today, showPurchase)].filter(Boolean).join(" · ")}</span>
        </span>
      </span>
    </button>
  );
}

function runOutLine(item: Product, today: string) {
  if (!item.emptyDate) return "Almost empty";
  const days = daysBetween(today, item.emptyDate);
  if (days < 0) return `Expected empty ${formatShort(item.emptyDate, today)}`;
  if (days === 0) return "Runs out today";
  return `Runs out in ~${days} ${days === 1 ? "day" : "days"} (${formatShort(item.emptyDate, today)})`;
}

function dateLine(item: Product, today: string, showPurchase?: boolean) {
  if (showPurchase && item.purchaseDate) return `Bought ${formatShort(item.purchaseDate, today)}`;
  if (item.status === "finished") return item.emptyDate ? `Finished ${formatShort(item.emptyDate, today)}` : "Finished";
  if (item.emptyDate) {
    const days = daysBetween(today, item.emptyDate);
    return days < 0 ? `Expected empty ${formatShort(item.emptyDate, today)}` : `Empty in ~${days} days`;
  }
  if (item.openedDate) return `Opened ${formatShort(item.openedDate, today)}`;
  if (item.purchaseDate) return `Bought ${formatShort(item.purchaseDate, today)}`;
  return "Add dates";
}

function History({ products, today, onOpen }: { products: Product[]; today: string; onOpen: (item: Product) => void }) {
  const dated = products.filter((item) => item.purchaseDate).sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
  const undated = products.filter((item) => !item.purchaseDate);
  const groups = new Map<string, Product[]>();
  dated.forEach((item) => groups.set(monthOf(item.purchaseDate), [...(groups.get(monthOf(item.purchaseDate)) ?? []), item]));

  if (!products.length) return <EmptyState icon={Package} title="No purchases yet" text="Products you add appear here by purchase month." />;

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([month, items]) => (
        <div key={month}>
          <p className="list-label flex justify-between"><span>{formatMonth(month)}</span><span className="tabular-nums">{formatMoney(items.reduce((sum, item) => sum + (item.price ?? 0), 0))}</span></p>
          <ProductList items={items} today={today} onOpen={onOpen} showPurchase />
        </div>
      ))}
      {undated.length > 0 && (
        <div>
          <p className="list-label">No purchase date · {undated.length}</p>
          <ProductList items={undated} today={today} onOpen={onOpen} />
        </div>
      )}
    </div>
  );
}
