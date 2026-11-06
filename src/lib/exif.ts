import { isISODate, localISO } from "./dates";

/**
 * Reads the day a JPEG photo was taken from its EXIF data ("YYYY-MM-DD").
 * Looks for DateTimeOriginal, then DateTimeDigitized, then DateTime. Returns null if absent.
 */
export function exifDate(buffer: ArrayBuffer): string | null {
  try {
    const view = new DataView(buffer);
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;
    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      const marker = view.getUint16(offset);
      if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return null;
      const size = view.getUint16(offset + 2);
      if (marker === 0xffe1 && offset + 10 <= view.byteLength && view.getUint32(offset + 4) === 0x45786966) {
        return readTiffDate(view, offset + 10, Math.min(view.byteLength, offset + 2 + size));
      }
      offset += 2 + size;
    }
  } catch {
    // Damaged or unusual file.
  }
  return null;
}

function readTiffDate(view: DataView, start: number, end: number): string | null {
  const little = view.getUint16(start) === 0x4949;
  const u16 = (at: number) => view.getUint16(at, little);
  const u32 = (at: number) => view.getUint32(at, little);
  if (u16(start + 2) !== 42) return null;

  const findTag = (ifd: number, tag: number) => {
    if (ifd + 2 > end) return null;
    const count = u16(ifd);
    for (let index = 0; index < count; index += 1) {
      const entry = ifd + 2 + index * 12;
      if (entry + 12 > end) return null;
      if (u16(entry) === tag) return entry;
    }
    return null;
  };

  const ifd0 = start + u32(start + 4);
  const exifPointer = findTag(ifd0, 0x8769);
  const exifIfd = exifPointer ? start + u32(exifPointer + 8) : null;
  const entry = (exifIfd && (findTag(exifIfd, 0x9003) ?? findTag(exifIfd, 0x9004))) ?? findTag(ifd0, 0x0132);
  if (!entry) return null;

  const count = u32(entry + 4);
  const valueAt = count > 4 ? start + u32(entry + 8) : entry + 8;
  if (valueAt + 10 > end) return null;
  let text = "";
  for (let index = 0; index < Math.min(count, 19); index += 1) text += String.fromCharCode(view.getUint8(valueAt + index));
  const match = text.match(/^(\d{4}):(\d{2}):(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

/** The day a picked photo was taken: EXIF first, then the file's date, never later than today. */
export async function photoTakenDate(file: File, today: string): Promise<string> {
  const valid = (date: string | null): date is string => !!date && isISODate(date) && date >= "2000-01-01" && date <= today;
  try {
    const fromExif = exifDate(await file.slice(0, 256 * 1024).arrayBuffer());
    if (valid(fromExif)) return fromExif;
  } catch {
    // Fall through to the file date.
  }
  const fromFile = file.lastModified ? localISO(new Date(file.lastModified)) : null;
  return valid(fromFile) ? fromFile : today;
}
