import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Droplet, Package, Pill, Plus } from "lucide-react";
import { EmptyState, PageHeader, PrivacyNote, ProductStatusPill } from "../../components/common";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Plan, Product } from "../../data";
import { addMonths, daysBetween, formatMonth, formatShort, monthOf } from "../../lib/dates";
import { averageMonthly, buySoon, monthSeries, pricedWithoutDate, productsBoughtIn, productsUsedIn } from "../../lib/spending";
import { cn, formatMoney, newId } from "../../lib/utils";
import { ProductSheet } from "./ProductSheet";
import { SpendChart } from "./SpendChart";

type Props = {
  products: Product[];
  setProducts: (update: (products: Product[]) => Product[]) => void;
  plan: Plan;
  today: string;
  notify: (message: string) => void;
};

type View = "inventory" | "month" | "history";

const statusOrder = { "almost-empty": 0, "in-use": 1, unopened: 2, finished: 3 } as const;

const blankProduct = (): Product => ({
  id: newId(), name: "", brand: "", category: "skincare", price: null,
  purchaseDate: "", openedDate: "", emptyDate: "", status: "unopened", note: ""
});

export function ProductsView({ products, setProducts, plan, today, notify }: Props) {
  const currentMonth = monthOf(today);
  const [month, setMonth] = useState(currentMonth);
  const [view, setView] = useState<View>("inventory");
  const [editing, setEditing] = useState<{ product: Product; isNew: boolean } | null>(null);

  const series = useMemo(() => monthSeries(plan, products, month, 6), [plan, products, month]);
  const selected = series[series.length - 1];
  const average = averageMonthly(monthSeries(plan, products, currentMonth, 6));

  const inventory = products.filter((item) => item.status !== "finished").sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  const bought = productsBoughtIn(products, month);
  const used = productsUsedIn(products, month, today);
  const finishedCount = products.length - inventory.length;
  const toBuy = buySoon(products, today);
  const undated = pricedWithoutDate(products);

  const save = (product: Product) => {
    setProducts((current) => current.some((item) => item.id === product.id) ? current.map((item) => (item.id === product.id ? product : item)) : [product, ...current]);
    notify(editing?.isNew ? "Product added" : "Product updated");
  };
  const remove = (id: string) => {
    setProducts((current) => current.filter((item) => item.id !== id));
    notify("Product removed");
  };
  const add = () => setEditing({ product: blankProduct(), isNew: true });
  const open = (product: Product) => setEditing({ product, isNew: false });

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow="My products"
        title="Products & cost"
        action={<Button size="icon" className="h-11 w-11 shrink-0" onClick={add} aria-label="Add product"><Plus className="h-5 w-5" strokeWidth={1.8} /></Button>}
      />

      {toBuy.length > 0 && (
        <section aria-label="Buy soon" className="mb-4 rounded-[1.5rem] border border-champagne/35 bg-champagne/[.1] p-2">
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#7A6440]">Buy soon · {toBuy.length}</p>
          {toBuy.map((item) => (
            <button key={item.id} type="button" onClick={() => open(item)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-white/50">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{item.name}</span>
                <span className="block truncate text-[11.5px] text-ink/55">{[runOutLine(item, today), item.note].filter(Boolean).join(" · ")}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink/35" />
            </button>
          ))}
        </section>
      )}

      {/* Monthly spending */}
      <Card>
        <CardContent className="p-5 md:p-7">
          <div className="flex items-center justify-between gap-2">
            <button type="button" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))} className="grid h-11 w-11 place-items-center rounded-full text-ink/55 hover:bg-black/[.04]">
              <ChevronLeft className="h-5 w-5" strokeWidth={1.6} />
            </button>
            <p className="text-center text-[11px] font-semibold uppercase tracking-[.18em] text-ink/50">{formatMonth(month)}</p>
            <button type="button" aria-label="Next month" disabled={month >= currentMonth} onClick={() => setMonth(addMonths(month, 1))} className="grid h-11 w-11 place-items-center rounded-full text-ink/55 hover:bg-black/[.04] disabled:opacity-25">
              <ChevronRight className="h-5 w-5" strokeWidth={1.6} />
            </button>
          </div>

          <div className="mt-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-ink/40">Total spent</p>
            <p className="mt-1 font-serif text-[2.6rem] leading-none tracking-[-.02em] tabular-nums">{formatMoney(selected.total)}</p>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3">
            <LegendValue swatch="bg-chart-clinic" label="Clinic services" value={selected.clinic} />
            <LegendValue swatch="bg-chart-products" label="Products" value={selected.products} />
          </dl>

          <div className="mt-6">
            <SpendChart series={series} selected={month} onSelect={setMonth} />
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-black/[.07] pt-4 text-xs">
            <span className="text-ink/50">Monthly burn rate, average</span>
            <span className="font-semibold tabular-nums">{average ? formatMoney(average) : "Not enough data"}</span>
          </div>
          <p className="mt-2 text-[11px] leading-4 text-ink/40">Clinic counts completed visits. Products count purchases with a price.</p>
          {undated.length > 0 && (
            <button type="button" onClick={() => setView("history")} className="mt-2 min-h-9 text-left text-[11px] leading-4 text-[#7A6440] underline decoration-champagne/50 underline-offset-2">
              {undated.length} priced {undated.length === 1 ? "product has" : "products have"} no purchase date, so {undated.length === 1 ? "it is" : "they are"} not counted. Add the date.
            </button>
          )}
        </CardContent>
      </Card>

      {/* Lists */}
      <div className="mt-8">
        <div role="tablist" aria-label="Product lists" className="grid grid-cols-3 gap-1 rounded-2xl border border-black/[.08] bg-white/45 p-1">
          {([
            ["inventory", `In stock · ${inventory.length}`],
            ["month", formatMonth(month).split(" ")[0]],
            ["history", "History"]
          ] as [View, string][]).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={cn("min-h-11 truncate rounded-xl px-2 text-[12.5px] font-medium", view === id ? "bg-ink text-white" : "text-ink/55 hover:bg-white/70")}>
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {view === "inventory" && (
            inventory.length ? <ProductList items={inventory} today={today} onOpen={open} />
              : <EmptyState icon={Package} title="Nothing in stock" text="Add the skincare and supplements you own." action={<Button onClick={add}><Plus className="h-4 w-4" />Add product</Button>} />
          )}

          {view === "month" && (
            <div className="space-y-6">
              <div>
                <p className="list-label">Bought in {formatMonth(month)} · {bought.length}</p>
                {bought.length ? <ProductList items={bought} today={today} onOpen={open} showPurchase /> : <p className="list-empty">No purchases recorded. Add a purchase date to a product to see it here.</p>}
              </div>
              <div>
                <p className="list-label">Used in {formatMonth(month)} · {used.length}</p>
                {used.length ? <ProductList items={used} today={today} onOpen={open} /> : <p className="list-empty">No products in use this month.</p>}
              </div>
            </div>
          )}

          {view === "history" && <History products={products} today={today} onOpen={open} finishedCount={finishedCount} />}
        </div>

        <Button variant="secondary" className="mt-4 h-12 w-full" onClick={add}><Plus className="h-4 w-4" />Add product</Button>
      </div>

      <PrivacyNote />

      {editing && <ProductSheet product={editing.product} isNew={editing.isNew} today={today} onSave={save} onDelete={remove} onClose={() => setEditing(null)} />}
    </div>
  );
}

function LegendValue({ swatch, label, value }: { swatch: string; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-black/[.06] bg-white/45 px-3.5 py-3">
      <dt className="flex items-center gap-2 text-[11px] text-ink/55"><span className={cn("h-2.5 w-2.5 shrink-0 rounded-[3px]", swatch)} />{label}</dt>
      <dd className="mt-1 truncate text-[15px] font-semibold tabular-nums">{formatMoney(value)}</dd>
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
  const meta = [item.brand, item.note].filter(Boolean).join(" · ");
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-start gap-3.5 px-4 py-4 text-left transition-colors hover:bg-white/50 md:px-5">
      <span className={cn("mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full", item.category === "supplement" ? "bg-champagne/[.14] text-[#8A7148]" : "bg-sage/[.1] text-sage")}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0 text-[15px] font-medium leading-snug">{item.name}</span>
          <ProductStatusPill status={item.status} />
        </span>
        {meta && <span className="mt-0.5 block truncate text-xs text-ink/50">{meta}</span>}
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-ink/50">
          {item.price !== null ? <span className="font-medium tabular-nums text-ink/80">{formatMoney(item.price)}</span> : <span className="text-[#8A7148]">Add price</span>}
          <span aria-hidden className="text-ink/20">·</span>
          <span>{dateLine(item, today, showPurchase)}</span>
        </span>
      </span>
    </button>
  );
}

function runOutLine(item: Product, today: string) {
  if (!item.emptyDate) return "Almost empty";
  const days = daysBetween(today, item.emptyDate);
  if (days < 0) return `Expected empty ${formatShort(item.emptyDate)}`;
  if (days === 0) return "Runs out today";
  return `Runs out in ~${days} ${days === 1 ? "day" : "days"} (${formatShort(item.emptyDate)})`;
}

function dateLine(item: Product, today: string, showPurchase?: boolean) {
  if (showPurchase && item.purchaseDate) return `Bought ${formatShort(item.purchaseDate)}`;
  if (item.status === "finished") return item.emptyDate ? `Finished ${formatShort(item.emptyDate)}` : "Finished";
  if (item.emptyDate) {
    const days = daysBetween(today, item.emptyDate);
    return days < 0 ? `Expected empty ${formatShort(item.emptyDate)}` : `Empty in ~${days} days`;
  }
  if (item.openedDate) return `Opened ${formatShort(item.openedDate)}`;
  if (item.purchaseDate) return `Bought ${formatShort(item.purchaseDate)}`;
  return "Add dates";
}

function History({ products, today, onOpen, finishedCount }: { products: Product[]; today: string; onOpen: (item: Product) => void; finishedCount: number }) {
  const dated = products.filter((item) => item.purchaseDate).sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
  const undated = products.filter((item) => !item.purchaseDate);
  const groups = new Map<string, Product[]>();
  dated.forEach((item) => groups.set(monthOf(item.purchaseDate), [...(groups.get(monthOf(item.purchaseDate)) ?? []), item]));

  if (!products.length) return <EmptyState icon={Package} title="No purchases yet" text="Products you add appear here by purchase month." />;

  return (
    <div className="space-y-6">
      <p className="text-[11px] text-ink/45">All products by purchase month{finishedCount ? `, including ${finishedCount} finished` : ""}.</p>
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
