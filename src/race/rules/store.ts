// Everything that touches storage. Storage arrives as `kv` (or null); every read and write is guarded, so a missing,
// blocked, full or garbled store behaves like an empty one. Imports no DOM and no three.js at run time.
import type { Quality } from "../../dua-pulau/world/stage";
import type { Run } from "./ghost";
import type { CourseId, Mode, WindSet } from "./types";

export type Slot = "easy" | "sailing-standard" | "sailing-today";
export const slotOf = (mode: Mode, wind: WindSet): Slot => (mode === "easy" ? "easy" : wind === "today" ? "sailing-today" : "sailing-standard");

export type Kv = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type Prefs = {
  course: CourseId; mode: Mode; wind: WindSet; ghost: boolean; muted: boolean;
  beaten: Record<string, string[]>; cupBest: Record<Slot, number | null>; quality: Quality | null;
};
export const DEFAULT_PREFS: Prefs = {
  course: "lap", mode: "easy", wind: "today", ghost: true, muted: false, beaten: {},
  cupBest: { easy: null, "sailing-standard": null, "sailing-today": null }, quality: null,
};

const PREFS_KEY = "race:v1:prefs";
const bestKey = (c: CourseId, s: Slot) => `race:v1:best:${c}:${s}`;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const nums = (v: unknown): v is number[] => Array.isArray(v) && v.every((n) => typeof n === "number" && Number.isFinite(n));
function wellFormed(v: unknown): v is Run {
  return isObj(v) && typeof v.time === "number" && Number.isFinite(v.time) && v.time > 0 && nums(v.splits) && nums(v.track) && v.track.length % 3 === 0;
}
const oneOf = <T extends string>(v: unknown, ok: readonly T[]): v is T => typeof v === "string" && (ok as readonly string[]).includes(v);

function cleanPrefs(raw: unknown): Prefs {
  const p: Prefs = { ...DEFAULT_PREFS, beaten: {}, cupBest: { ...DEFAULT_PREFS.cupBest } };
  if (!isObj(raw)) return p;
  if (oneOf(raw.course, ["sprint", "lap", "eight"] as const)) p.course = raw.course;
  if (oneOf(raw.mode, ["easy", "sailing"] as const)) p.mode = raw.mode;
  if (oneOf(raw.wind, ["standard", "today"] as const)) p.wind = raw.wind;
  if (typeof raw.ghost === "boolean") p.ghost = raw.ghost;
  if (typeof raw.muted === "boolean") p.muted = raw.muted;
  if (oneOf(raw.quality, ["high", "medium", "low"] as const)) p.quality = raw.quality;
  // a "__proto__" key from JSON.parse is an own property; assigning it would set beaten's prototype instead, so skip it
  if (isObj(raw.beaten))
    for (const [k, v] of Object.entries(raw.beaten)) if (k !== "__proto__" && Array.isArray(v) && v.every((s) => typeof s === "string")) p.beaten[k] = v;
  if (isObj(raw.cupBest)) for (const s of ["easy", "sailing-standard", "sailing-today"] as const) {
    const n = raw.cupBest[s];
    if (typeof n === "number" && Number.isFinite(n)) p.cupBest[s] = n;
  }
  return p;
}

export function openStore(kv: Kv | null, today: string) {
  const read = (key: string): unknown => {
    try {
      const s = kv?.getItem(key);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  };
  const write = (key: string, v: unknown) => {
    try {
      kv?.setItem(key, JSON.stringify(v));
    } catch {
      // full, blocked or gone: play on without keeping it
    }
  };
  const best = (course: CourseId, slot: Slot): Run | null => {
    const v = read(bestKey(course, slot));
    if (!wellFormed(v)) return null;
    if (slot === "sailing-today" && (v as Run & { day?: unknown }).day !== today) return null;
    return { time: v.time, splits: v.splits, track: v.track };
  };
  return {
    best,
    /** keeps the run if it beats the stored one (or none is stored); returns true if it did */
    offer(course: CourseId, slot: Slot, run: Run): boolean {
      const old = best(course, slot);
      if (old && !(run.time < old.time)) return false;
      write(bestKey(course, slot), slot === "sailing-today" ? { ...run, day: today } : run);
      return true;
    },
    prefs: (): Prefs => cleanPrefs(read(PREFS_KEY)),
    setPrefs(p: Partial<Prefs>) {
      write(PREFS_KEY, { ...cleanPrefs(read(PREFS_KEY)), ...p });
    },
  };
}
