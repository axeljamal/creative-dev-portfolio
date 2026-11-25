import { test, expect } from "vitest";
import type { Run } from "./ghost";
import { DEFAULT_PREFS, openStore, slotOf, type Kv } from "./store";

const mem = (): Kv & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
};
const run = (t: number): Run => ({ time: t, splits: [], track: [0, 0, 0, 1, 1, 0] });

test("no storage: nothing is kept and nothing throws", () => {
  const s = openStore(null, "2026-11-24");
  expect(s.offer("lap", "easy", run(60))).toBe(true);
  expect(s.best("lap", "easy")).toBeNull();
  expect(s.prefs()).toEqual(DEFAULT_PREFS);
  s.setPrefs({ ghost: false });
});
test("storage that throws on write or holds bad JSON behaves like no storage", () => {
  const kv: Kv = { getItem: () => "{oops", setItem: () => { throw new Error("full"); }, removeItem: () => { throw new Error("no"); } };
  const s = openStore(kv, "d");
  expect(s.best("lap", "easy")).toBeNull();
  expect(s.prefs()).toEqual(DEFAULT_PREFS);
  expect(s.offer("lap", "easy", run(60))).toBe(true);
  expect(() => s.setPrefs({ muted: true })).not.toThrow();
  const bad: Kv = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); }, removeItem: () => {} };
  expect(openStore(bad, "d").best("lap", "easy")).toBeNull();
});
test("a slower run does not replace the best", () => {
  const s = openStore(mem(), "d");
  s.offer("lap", "easy", run(60));
  expect(s.offer("lap", "easy", run(61))).toBe(false);
  expect(s.best("lap", "easy")!.time).toBe(60);
  expect(s.offer("lap", "easy", run(59))).toBe(true);
  expect(s.best("lap", "easy")!.time).toBe(59);
});
test("slots are separate", () => {
  const s = openStore(mem(), "d");
  s.offer("lap", "easy", run(60));
  expect(s.best("lap", "sailing-standard")).toBeNull();
  expect(s.best("sprint", "easy")).toBeNull();
});
test("today's-wind bests last the day only", () => {
  const kv = mem();
  openStore(kv, "2026-11-24").offer("lap", "sailing-today", run(90));
  expect(openStore(kv, "2026-11-24").best("lap", "sailing-today")!.time).toBe(90);
  expect(openStore(kv, "2026-11-25").best("lap", "sailing-today")).toBeNull();
  expect(openStore(kv, "2026-11-25").offer("lap", "sailing-today", run(120))).toBe(true);
});
test("a stored value that is not a well-formed run is treated as absent", () => {
  const kv = mem();
  const key = "race:v1:best:lap:easy";
  for (const v of [{ time: "9", splits: [], track: [] }, { time: 9, splits: [], track: [1, 2] }, { time: null, splits: [], track: [] }, { time: 9, splits: [1, "x"], track: [] }, { time: 9, splits: [], track: [0, NaN, 0] }, [], "x", 3, null]) {
    kv.data.set(key, JSON.stringify(v));
    expect(openStore(kv, "d").best("lap", "easy")).toBeNull();
  }
  kv.data.set(key, JSON.stringify(run(70)));
  expect(openStore(kv, "d").best("lap", "easy")!.time).toBe(70);
});
test("prefs persist, merge with defaults and ignore garbage", () => {
  const kv = mem();
  openStore(kv, "d").setPrefs({ ghost: false, quality: "low" });
  expect(openStore(kv, "d").prefs()).toEqual({ ...DEFAULT_PREFS, ghost: false, quality: "low" });
  kv.data.set("race:v1:prefs", JSON.stringify({ ghost: "yes", course: 4, mode: "sailing" }));
  expect(openStore(kv, "d").prefs()).toEqual({ ...DEFAULT_PREFS, mode: "sailing" });
});
test("slotOf", () => {
  expect(slotOf("easy", "today")).toBe("easy");
  expect(slotOf("sailing", "standard")).toBe("sailing-standard");
  expect(slotOf("sailing", "today")).toBe("sailing-today");
});
test("a stored beaten list keyed __proto__ is skipped, and cannot reach the prototype", () => {
  const kv = mem();
  kv.data.set("race:v1:prefs", '{"beaten":{"__proto__":["polluted"],"lap:easy":["a"]}}');
  const p = openStore(kv, "d").prefs();
  expect(Object.getPrototypeOf(p.beaten)).toBe(Object.prototype);
  expect(Object.hasOwn(p.beaten, "__proto__")).toBe(false);
  expect(p.beaten).toEqual({ "lap:easy": ["a"] });
  expect(({} as Record<string, unknown>).polluted).toBeUndefined();
});
