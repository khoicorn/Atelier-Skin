import { Plan, Product } from "../data";
import { formatDate, isISODate } from "./dates";
import { SkinPhoto } from "./photo-db";

/** One file holds everything: plan, products and photos. */
export type Backup = {
  app: "atelier-skin";
  version: 1;
  exportedAt: string;
  plan: Plan;
  products: Product[];
  photos: SkinPhoto[];
};

export const LAST_BACKUP_KEY = "atelier-last-backup";

export const backupFileName = (today: string) => `atelier-skin-backup-${today}.json`;

export const buildBackup = (plan: Plan, products: Product[], photos: SkinPhoto[], exportedAt: string): string =>
  JSON.stringify({ app: "atelier-skin", version: 1, exportedAt, plan, products, photos } satisfies Backup);

const NOT_A_BACKUP = "This file is not an Atelier Skin backup.";

export function parseBackup(text: string): { ok: true; data: Backup } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: NOT_A_BACKUP };
  }
  const data = raw as Partial<Backup>;
  if (!data || data.app !== "atelier-skin") return { ok: false, error: NOT_A_BACKUP };
  if (data.version !== 1) return { ok: false, error: "This backup was made by a newer version of the app. Update the app first." };
  const plan = data.plan;
  if (!plan || !isISODate(plan.startDate) || !Array.isArray(plan.entries)) return { ok: false, error: "The plan in this backup is damaged." };
  if (!Array.isArray(data.products)) return { ok: false, error: "The product list in this backup is damaged." };
  if (!Array.isArray(data.photos) || data.photos.some((photo) => !photo?.id || !isISODate(photo.date) || !String(photo.dataUrl).startsWith("data:image/"))) {
    return { ok: false, error: "The photos in this backup are damaged." };
  }
  return { ok: true, data: { ...(data as Backup), photos: data.photos.map((photo) => ({ ...photo, tags: photo.tags ?? [], note: photo.note ?? "" })) } };
}

/** "6 visits · 5 products · 3 photos · saved 6 Nov 2026" */
export const describeBackup = (data: Backup) =>
  `${data.plan.entries.length} visits · ${data.products.length} products · ${data.photos.length} photos · saved ${formatDate(data.exportedAt.slice(0, 10))}`;
