import { useState } from "react";
import { DeleteButton } from "../../components/common";
import { Button } from "../../components/ui/button";
import { DateInput, Field, MoneyInput, Segmented } from "../../components/ui/field";
import { closeSheet, isChanged, Sheet } from "../../components/ui/sheet";
import { Product, PRODUCT_CATEGORIES, PRODUCT_STATUSES, ProductStatus } from "../../data";

type Props = {
  product: Product;
  isNew: boolean;
  today: string;
  onSave: (product: Product) => void;
  onDelete: (product: Product) => void;
  onClose: () => void;
};

const futureHint = (date: string, today: string) => (date && date > today ? <span className="text-clay">This date is in the future.</span> : undefined);

export function ProductSheet({ product, isNew, today, onSave, onDelete, onClose }: Props) {
  const [draft, setDraft] = useState<Product>(product);
  const set = (patch: Partial<Product>) => setDraft((current) => ({ ...current, ...patch }));
  const valid = draft.name.trim().length > 0;
  const finished = draft.status === "finished";

  const setStatus = (status: ProductStatus) => {
    const patch: Partial<Product> = { status };
    // Finishing a product records today as the empty date, unless a past date is already set.
    if (status === "finished" && (!draft.emptyDate || draft.emptyDate > today)) patch.emptyDate = today;
    if ((status === "in-use" || status === "almost-empty") && !draft.openedDate) patch.openedDate = today;
    set(patch);
  };

  const save = () => {
    if (!valid) return;
    onSave({ ...draft, name: draft.name.trim(), brand: draft.brand.trim(), note: draft.note.trim() });
    closeSheet(onClose);
  };

  return (
    <Sheet
      eyebrow={isNew ? "New product" : draft.brand || "Product"}
      title={isNew ? "Add product" : "Edit product"}
      onClose={onClose}
      dirty={isChanged(draft, product)}
      footer={
        <div className="flex items-center gap-2">
          {!isNew && <DeleteButton onDelete={() => { onDelete(product); closeSheet(onClose); }} />}
          <Button className="h-12 flex-1" onClick={save} disabled={!valid}>{isNew ? "Add product" : "Save changes"}</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Product name">
          <input value={draft.name} onChange={(event) => set({ name: event.target.value })} placeholder="e.g. Ultra Facial Cleanser" />
        </Field>
        <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
          <Field label="Brand">
            <input value={draft.brand} onChange={(event) => set({ brand: event.target.value })} placeholder="e.g. Kiehl’s" />
          </Field>
          <Field label="Price (VND)">
            <MoneyInput value={draft.price} onChange={(price) => set({ price })} />
          </Field>
        </div>

        <div>
          <p className="field-label">Category</p>
          <Segmented label="Category" options={PRODUCT_CATEGORIES} value={draft.category} onChange={(category) => category && set({ category })} />
        </div>

        <div>
          <p className="field-label">Status</p>
          <Segmented label="Status" columns={2} options={PRODUCT_STATUSES} value={draft.status} onChange={(status) => status && setStatus(status)} />
        </div>

        <Field label="Purchase date" hint={futureHint(draft.purchaseDate, today) ?? "Needed to count the price in a month."}>
          <DateInput label="Purchase date" optional value={draft.purchaseDate} onChange={(purchaseDate) => set({ purchaseDate })} />
        </Field>
        <Field label="Opened date" hint={futureHint(draft.openedDate, today)}>
          <DateInput label="Opened date" optional value={draft.openedDate} onChange={(openedDate) => set({ openedDate })} />
        </Field>
        <Field label={finished ? "Finished on" : "Estimated empty date"} hint={finished ? futureHint(draft.emptyDate, today) : "A guess is fine. Update it when the product runs out."}>
          <DateInput label={finished ? "Finished on" : "Estimated empty date"} optional value={draft.emptyDate} onChange={(emptyDate) => set({ emptyDate })} />
        </Field>

        <Field label="Note">
          <textarea rows={2} maxLength={240} value={draft.note} onChange={(event) => set({ note: event.target.value })} placeholder="e.g. Green cap, 50 ml" />
        </Field>
      </div>
    </Sheet>
  );
}
