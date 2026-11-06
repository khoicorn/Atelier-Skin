import { describe, expect, it } from "vitest";
import { createDefaultPlan, initialProducts, Plan, Product } from "../data";
import { buildBackup, describeBackup, parseBackup } from "./backup";
import { formatShort } from "./dates";
import { exifDate } from "./exif";
import {
  changeStartDate, datedEntries, isMoved, lastWeek, latestUnrated, newExtraDefaults, nextService, pinIfClosed,
  planWeeks, plannedIn, serviceStats, verdict, visitsIn, visitsThatMove
} from "./plan";
import { averageFullMonths, productsFinishedIn } from "./spending";
import { parseVND } from "./utils";

const plan = createDefaultPlan();
const dateOf = (p: Plan, week: number) => datedEntries(p).find((entry) => entry.week === week && !entry.extra)?.date;

describe("price typing", () => {
  it.each([
    ["1.200.000", 1_200_000], ["1200000", 1_200_000], ["850k", 850_000], ["850K", 850_000], ["1tr1", 1_100_000],
    ["1tr", 1_000_000], ["1,5tr", 1_500_000], ["1.5tr", 1_500_000], ["1tr25", 1_250_000], ["2 triệu", 2_000_000],
    ["1k5", 1_500], ["258.000 ₫", 258_000], ["", null], ["abc", null], ["12a", null]
  ])("%s → %s", (text, value) => expect(parseVND(text)).toBe(value));
});

describe("dates show the year only when it differs", () => {
  it("formats", () => {
    expect(formatShort("2026-11-29", "2026-11-06")).toBe("29 Nov");
    expect(formatShort("2027-11-29", "2026-11-06")).toBe("29 Nov 2027");
  });
});

describe("first clinic date changes are safe", () => {
  it("keeps completed visits on their date and moves only open ones", () => {
    expect(visitsThatMove(plan)).toHaveLength(5);
    const moved = changeStartDate(plan, "2026-11-07");
    expect(dateOf(moved, 1)).toBe("2026-10-31");
    expect(dateOf(moved, 2)).toBe("2026-11-14");
    expect(isMoved(moved, moved.entries[0])).toBe(true);
  });

  it("pins a visit when it is completed or skipped, not when it is open", () => {
    const week2 = plan.entries[1];
    expect(pinIfClosed(plan, { ...week2, status: "completed" }).customDate).toBe("2026-11-07");
    expect(pinIfClosed(plan, { ...week2, status: "booked" }).customDate).toBeUndefined();
    expect(isMoved(plan, pinIfClosed(plan, { ...week2, status: "completed" }))).toBe(false);
  });
});

describe("extra visits", () => {
  const extra = { ...newExtraDefaults(plan, "x", "2026-11-09"), service: "Acne extraction", status: "booked" as const, time: "09:30" };
  const withExtra: Plan = { ...plan, entries: [...plan.entries, extra] };

  it("start dated, in week 2, outside the plan rhythm", () => {
    expect(extra).toMatchObject({ extra: true, customDate: "2026-11-09", week: 2, clinic: "Hasaki Clinic" });
  });

  it("do not extend the plan or the week progress", () => {
    expect(lastWeek(withExtra)).toBe(6);
    expect(planWeeks(withExtra)).toHaveLength(6);
    expect(isMoved(withExtra, extra)).toBe(false);
  });

  it("show up as the next service and in month forecasts", () => {
    expect(nextService(withExtra, "2026-11-08")?.service).toBe("Acne extraction");
    expect(plannedIn(withExtra, "2026-11").count).toBe(5);
  });
});

describe("month questions", () => {
  it("forecasts open visits left in a month", () => {
    expect(plannedIn(plan, "2026-11")).toEqual({ count: 4, known: 0, missingPrices: 4 });
  });
  it("lists completed visits in a month", () => {
    expect(visitsIn(plan, "2026-10").map((entry) => entry.week)).toEqual([1]);
    expect(visitsIn(plan, "2026-11")).toHaveLength(0);
  });
  it("averages full months only, leaving out the running month", () => {
    expect(averageFullMonths(plan, initialProducts, "2026-11")).toBe(1_508_000);
    expect(averageFullMonths(plan, initialProducts, "2026-10")).toBe(0);
  });
  it("lists products that ran out in a month", () => {
    const items: Product[] = [{ ...initialProducts[4], status: "finished", emptyDate: "2026-11-13" }];
    expect(productsFinishedIn(items, "2026-11")).toHaveLength(1);
    expect(productsFinishedIn(items, "2026-10")).toHaveLength(0);
  });
});

describe("rating", () => {
  it("finds the latest unrated visit", () => {
    expect(latestUnrated(plan, "2026-11-06")?.week).toBe(1);
    expect(latestUnrated(plan, "2027-02-01")).toBeUndefined();
  });
  it("waits for 2 ratings before judging", () => {
    const one: Plan = { ...plan, entries: plan.entries.map((entry) => entry.week === 1 ? { ...entry, result: "better" } : entry) };
    expect(verdict(serviceStats(one)[0])).toMatch(/Rate one more/);
    const two: Plan = { ...one, entries: one.entries.map((entry) => entry.week === 3 ? { ...entry, status: "completed", result: "better" } : entry) };
    expect(verdict(serviceStats(two)[0])).toBe("Mostly better so far.");
  });
});

describe("backup", () => {
  const photo = { id: "p1", title: "Week 1", date: "2026-10-31", tags: ["Chin"], note: "", dataUrl: "data:image/jpeg;base64,AAAA" };

  it("round-trips plan, products and photos", () => {
    const parsed = parseBackup(buildBackup(plan, initialProducts, [photo], "2026-11-06T09:00:00.000Z"));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.plan).toEqual(plan);
    expect(parsed.data.products).toEqual(initialProducts);
    expect(parsed.data.photos).toEqual([photo]);
    expect(describeBackup(parsed.data)).toBe("6 visits · 5 products · 1 photos · saved 6 Nov 2026");
  });

  it("rejects files that are not a valid backup", () => {
    expect(parseBackup("not json")).toMatchObject({ ok: false });
    expect(parseBackup(JSON.stringify({ app: "other" }))).toMatchObject({ ok: false });
    expect(parseBackup(JSON.stringify({ app: "atelier-skin", version: 2 }))).toMatchObject({ ok: false, error: expect.stringMatching(/newer version/) });
    const badPhoto = buildBackup(plan, initialProducts, [{ ...photo, dataUrl: "javascript:alert(1)" }], "2026-11-06T09:00:00.000Z");
    expect(parseBackup(badPhoto)).toMatchObject({ ok: false, error: expect.stringMatching(/photos/) });
  });
});

/** Builds a minimal JPEG whose EXIF block holds DateTimeOriginal. */
function jpegWithExif(date: string, little = true): ArrayBuffer {
  const tiff: number[] = [];
  const u16 = (value: number) => (little ? [value & 0xff, value >> 8] : [value >> 8, value & 0xff]);
  const u32 = (value: number) => (little ? [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, value >>> 24] : [value >>> 24, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]);
  // Header (8) + IFD0 with 1 entry (2 + 12 + 4 = 18) => Exif IFD at 26, 1 entry (18) => string at 44.
  tiff.push(...(little ? [0x49, 0x49] : [0x4d, 0x4d]), ...u16(42), ...u32(8));
  tiff.push(...u16(1), ...u16(0x8769), ...u16(4), ...u32(1), ...u32(26), ...u32(0));
  tiff.push(...u16(1), ...u16(0x9003), ...u16(2), ...u32(20), ...u32(44), ...u32(0));
  tiff.push(...[...`${date.replace(/-/g, ":")} 08:15:00`].map((char) => char.charCodeAt(0)), 0);
  const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const bytes = [0xff, 0xd8, 0xff, 0xe1, (app1.length + 2) >> 8, (app1.length + 2) & 0xff, ...app1, 0xff, 0xda, 0, 2];
  return new Uint8Array(bytes).buffer;
}

describe("photo date from EXIF", () => {
  it("reads DateTimeOriginal in both byte orders", () => {
    expect(exifDate(jpegWithExif("2026-10-30"))).toBe("2026-10-30");
    expect(exifDate(jpegWithExif("2026-10-30", false))).toBe("2026-10-30");
  });
  it("returns null for non-JPEG or missing EXIF", () => {
    expect(exifDate(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).toBeNull();
    expect(exifDate(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]).buffer)).toBeNull();
  });
});
