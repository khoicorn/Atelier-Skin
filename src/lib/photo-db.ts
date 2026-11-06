export type SkinPhoto = {
  id: string;
  title: string;
  date: string;
  tags: string[];
  dataUrl: string;
  note?: string;
  createdAt?: number;
};

const DB_NAME = "atelier-skin-private";
const STORE = "photos";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));
    transaction.oncomplete = () => { db.close(); resolve(request.result); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

/** Newest first. */
export async function listPhotos(): Promise<SkinPhoto[]> {
  const photos = await run<SkinPhoto[]>("readonly", (store) => store.getAll());
  return photos.map((photo) => ({ ...photo, tags: photo.tags ?? [], note: photo.note ?? "" })).sort(byNewest);
}

export const byNewest = (a: SkinPhoto, b: SkinPhoto) => b.date.localeCompare(a.date) || (b.createdAt ?? 0) - (a.createdAt ?? 0);

/** Adds or replaces a photo entry. */
export const savePhoto = (photo: SkinPhoto) => run("readwrite", (store) => store.put(photo)).then(() => undefined);

export const deletePhoto = (id: string) => run("readwrite", (store) => store.delete(id)).then(() => undefined);

/** Replaces every stored photo in one transaction (used by restore). Nothing changes if it fails. */
export async function replaceAllPhotos(photos: SkinPhoto[]) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    store.clear();
    photos.forEach((photo) => store.put(photo));
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
    transaction.onabort = () => { db.close(); reject(transaction.error); };
  });
}

/** Resizes on the device to at most 1280 px and re-encodes as JPEG. The original never leaves the phone. */
export async function compressPhoto(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("This file is not a readable image"));
      img.src = url;
    });
    const max = 1280;
    const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not available");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}
