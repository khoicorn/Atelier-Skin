import { useEffect, useRef, useState } from "react";
import { Download, HardDriveDownload, Share2, ShieldAlert, ShieldCheck, Smartphone, Upload } from "lucide-react";
import type { Notify } from "../../App";
import { PrivacyNote } from "../../components/common";
import { Button } from "../../components/ui/button";
import { DateInput, Field } from "../../components/ui/field";
import { closeSheet, isChanged, Sheet } from "../../components/ui/sheet";
import { DEFAULT_PHASE, Plan, Product } from "../../data";
import { Backup, backupFileName, buildBackup, describeBackup, parseBackup } from "../../lib/backup";
import { daysBetween, formatDate } from "../../lib/dates";
import { exportLegacy, LEGACY_KEYS, legacySummary, removeLegacy } from "../../lib/migrate";
import { listPhotos, replaceAllPhotos } from "../../lib/photo-db";
import { changeStartDate, visitsThatMove } from "../../lib/plan";

export type InstallPrompt = Event & { prompt: () => Promise<void> };

type Props = {
  plan: Plan;
  setPlan: (update: Plan | ((plan: Plan) => Plan)) => void;
  products: Product[];
  setProducts: (products: Product[]) => void;
  today: string;
  lastBackup: string;
  setLastBackup: (date: string) => void;
  installPrompt: InstallPrompt | null;
  notify: Notify;
  onRestored: () => void;
  onClose: () => void;
};

const saveFile = (file: File) => {
  const url = URL.createObjectURL(file);
  const link = Object.assign(document.createElement("a"), { href: url, download: file.name });
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export function SettingsSheet({ plan, setPlan, products, setProducts, today, lastBackup, setLastBackup, installPrompt, notify, onRestored, onClose }: Props) {
  const initial = { phase: plan.phase, startDate: plan.startDate };
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Backup | null>(null);
  const [restoreError, setRestoreError] = useState("");
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [legacy, setLegacy] = useState(() => legacySummary(localStorage));
  const fileRef = useRef<HTMLInputElement>(null);
  const canShareFiles = typeof navigator.canShare === "function";

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
  }, []);

  const startChanged = form.startDate !== plan.startDate;
  const moving = startChanged ? visitsThatMove(plan).length : 0;

  const makeFile = async () => {
    const photos = await listPhotos();
    const json = buildBackup(plan, products, photos, new Date().toISOString());
    return { file: new File([json], backupFileName(today), { type: "application/json" }), photos: photos.length };
  };

  const backup = async (share: boolean) => {
    setBusy(true);
    try {
      const { file, photos } = await makeFile();
      if (share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Atelier Skin backup" });
      } else {
        saveFile(file);
      }
      setLastBackup(today);
      notify(`Backup saved · ${photos} ${photos === 1 ? "photo" : "photos"}`);
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") notify(share ? "Sharing failed. Use Save backup file." : "Backup failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const pickRestore = async (file?: File) => {
    setRestoreError("");
    if (!file) return;
    const result = parseBackup(await file.text());
    if (result.ok) setPending(result.data);
    else setRestoreError(result.error);
  };

  const restore = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await replaceAllPhotos(pending.photos);
      setPlan(pending.plan);
      setProducts(pending.products);
      onRestored();
      notify("Backup restored");
      closeSheet(onClose);
    } catch {
      setRestoreError("Restore failed. Your current data was not changed.");
    } finally {
      setBusy(false);
    }
  };

  const removeOldData = () => {
    const saved = Object.values(LEGACY_KEYS).map((key) => [key, localStorage.getItem(key)] as const);
    removeLegacy(localStorage);
    setLegacy(legacySummary(localStorage));
    notify("Old data removed", () => {
      saved.forEach(([key, value]) => value !== null && localStorage.setItem(key, value));
      setLegacy(legacySummary(localStorage));
    });
  };

  const save = () => {
    setPlan((current) => ({ ...(startChanged ? changeStartDate(current, form.startDate) : current), phase: form.phase.trim() || DEFAULT_PHASE }));
    notify(startChanged ? `Plan dates updated · ${moving} ${moving === 1 ? "visit" : "visits"} moved` : "Settings saved");
    closeSheet(onClose);
  };

  const backupAge = lastBackup ? daysBetween(lastBackup, today) : null;

  return (
    <Sheet
      eyebrow="Settings"
      title="Your data & plan"
      onClose={onClose}
      dirty={isChanged(form, initial)}
      footer={<Button className="h-12 w-full" onClick={save} disabled={!isChanged(form, initial)}>Save changes</Button>}
    >
      <div className="space-y-7">
        {/* Backup */}
        <section className="rounded-2xl border border-black/[.08] bg-white/45 p-4">
          <p className="flex items-center gap-2 text-[15px] font-medium"><HardDriveDownload className="h-4 w-4 text-sage" strokeWidth={1.7} /> Backup</p>
          <p className="mt-1.5 text-[13px] leading-5 text-ink/70">
            {backupAge === null ? "No backup yet." : `Last backup ${formatDate(lastBackup)}${backupAge > 0 ? ` (${backupAge} ${backupAge === 1 ? "day" : "days"} ago)` : " (today)"}.`}{" "}
            One file holds your plan, products and photos. Keep it in Google Drive or Zalo. On a new phone, install the app and restore it.
          </p>
          <div className="mt-3 grid gap-2">
            <Button className="h-12" disabled={busy} onClick={() => backup(false)}><Download className="h-4 w-4" />Save backup file</Button>
            {canShareFiles && <Button variant="secondary" className="h-12" disabled={busy} onClick={() => backup(true)}><Share2 className="h-4 w-4" />Send backup to Drive or Zalo</Button>}
            <Button variant="secondary" className="h-12" disabled={busy} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />Restore from file</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => { pickRestore(event.target.files?.[0]); event.target.value = ""; }} />
          </div>
          {restoreError && <p role="alert" className="mt-3 text-[13px] text-clay">{restoreError}</p>}
          {pending && (
            <div role="alertdialog" aria-label="Replace data" className="mt-3 rounded-xl border border-clay/30 bg-clay/[.06] p-3">
              <p className="text-[13px] font-medium">Replace everything on this device with this backup?</p>
              <p className="mt-1 text-xs text-ink/70">{describeBackup(pending)}</p>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" className="h-11 flex-1" onClick={() => setPending(null)}>Cancel</Button>
                <Button className="h-11 flex-1 bg-clay hover:bg-clay/90" disabled={busy} onClick={restore}>Replace</Button>
              </div>
            </div>
          )}
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-ink/65">
            {persisted ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sage" /> : <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#8A7148]" />}
            {persisted ? "This browser will not clear your data on its own." : "This browser may clear data when the phone is low on space. Installing the app helps. A backup file is the safe copy."}
          </p>
        </section>

        {/* Plan */}
        <section className="space-y-4">
          <Field label="Treatment phase">
            <input value={form.phase} onChange={(event) => setForm({ ...form, phase: event.target.value })} placeholder={DEFAULT_PHASE} />
          </Field>
          <Field
            label="First clinic date (week 1)"
            hint={startChanged ? `${moving} upcoming ${moving === 1 ? "visit moves" : "visits move"}. Completed visits and visits you moved by hand keep their date.` : "Each next week is 7 days later."}
          >
            <DateInput label="First clinic date" value={form.startDate} onChange={(startDate) => startDate && setForm({ ...form, startDate })} />
          </Field>
        </section>

        <section className="rounded-2xl border border-black/[.08] bg-white/45 p-4">
          <p className="flex items-center gap-2 text-[15px] font-medium"><Smartphone className="h-4 w-4 text-sage" strokeWidth={1.7} /> Install on your phone</p>
          <p className="mt-1.5 text-[13px] leading-5 text-ink/70">In Chrome, tap ⋮ then <strong className="font-medium text-ink">Add to Home screen</strong>. The app then opens full screen and works offline.</p>
          {installPrompt && <Button variant="secondary" className="mt-3 h-11 w-full" onClick={() => installPrompt.prompt()}>Install Atelier Skin</Button>}
        </section>

        {legacy.hasAny && (
          <section className="rounded-2xl border border-black/[.08] bg-white/45 p-4">
            <p className="text-[15px] font-medium">Data from the old version</p>
            <p className="mt-1.5 text-[13px] leading-5 text-ink/70">
              {legacy.dailyCheckIns} daily check-ins and {legacy.ledgerItems} old ledger items are still stored. The app no longer uses them.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" className="h-11" onClick={() => saveFile(new File([exportLegacy(localStorage)], "atelier-skin-v1-backup.json", { type: "application/json" }))}>
                <Download className="h-4 w-4" /> Download
              </Button>
              <Button variant="ghost" className="h-11 text-ink/70" onClick={removeOldData}>Remove old data</Button>
            </div>
          </section>
        )}

        <PrivacyNote />
      </div>
    </Sheet>
  );
}
