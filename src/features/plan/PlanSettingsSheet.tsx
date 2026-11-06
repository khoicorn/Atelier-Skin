import { useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { DeleteButton } from "../../components/common";
import { Button } from "../../components/ui/button";
import { Field } from "../../components/ui/field";
import { closeSheet, Sheet } from "../../components/ui/sheet";
import { DEFAULT_PHASE, Plan } from "../../data";
import { exportLegacy, legacySummary, removeLegacy } from "../../lib/migrate";

export type InstallPrompt = Event & { prompt: () => Promise<void> };

type Props = {
  plan: Plan;
  onSave: (patch: Pick<Plan, "phase">) => void;
  onClose: () => void;
  installPrompt: InstallPrompt | null;
  notify: (message: string) => void;
};

export function PlanSettingsSheet({ plan, onSave, onClose, installPrompt, notify }: Props) {
  const [phase, setPhase] = useState(plan.phase);
  const [legacy, setLegacy] = useState(() => legacySummary(localStorage));

  const download = () => {
    const blob = new Blob([exportLegacy(localStorage)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement("a"), { href: url, download: "atelier-skin-v1-backup.json" });
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Sheet
      eyebrow="Settings"
      title="Plan settings"
      onClose={onClose}
      footer={<Button className="h-12 w-full" onClick={() => { onSave({ phase: phase.trim() || DEFAULT_PHASE }); closeSheet(onClose); }}>Save</Button>}
    >
      <div className="space-y-6">
        <Field label="Treatment phase" hint="Shown at the top of your plan.">
          <input value={phase} onChange={(event) => setPhase(event.target.value)} placeholder={DEFAULT_PHASE} />
        </Field>

        <div className="rounded-2xl border border-black/[.08] bg-white/40 p-4">
          <p className="flex items-center gap-2 text-sm font-medium"><Smartphone className="h-4 w-4 text-sage" strokeWidth={1.7} /> Install on your phone</p>
          <p className="mt-1.5 text-xs leading-5 text-ink/50">In Chrome, tap ⋮ then <strong className="font-medium text-ink/70">Add to Home screen</strong>. The app then works offline.</p>
          {installPrompt && <Button variant="secondary" className="mt-3 h-11 w-full" onClick={() => installPrompt.prompt()}>Install Atelier Skin</Button>}
        </div>

        {legacy.hasAny && (
          <div className="rounded-2xl border border-black/[.08] bg-white/40 p-4">
            <p className="text-sm font-medium">Data from the old version</p>
            <p className="mt-1.5 text-xs leading-5 text-ink/50">
              {legacy.dailyCheckIns} daily check-ins and {legacy.ledgerItems} old ledger items are still stored. The app no longer uses them. Your products and plan were already copied over.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" className="h-11" onClick={download}><Download className="h-4 w-4" /> Download backup</Button>
              <DeleteButton label="Remove old data" onConfirm={() => { removeLegacy(localStorage); setLegacy(legacySummary(localStorage)); notify("Old data removed"); }} />
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
