// The wind for Sailing mode, as numbers: how fast she goes at each angle to it, how strong it is, where the gusts are
// and how the direction shifts. Pure and deterministic given its inputs: no clock, no Math.random, no three.js, no DOM.
// Anything random comes from a small generator seeded by the caller.
import { bearingOf, wrap180 } from "./geometry";
import type { Course, Vec, WindSet } from "./types";

/** [true wind angle in degrees, share of top speed]; between points the curve is a straight line */
export const POLAR: [number, number][] = [[0, 0.05], [30, 0.12], [42, 0.62], [60, 0.82], [90, 0.97], [110, 1], [135, 0.93], [160, 0.8], [180, 0.72]];
const TOP = 13;
/** close-hauled: degrees off the wind a boat sails when she cannot lay her target, as the rivals do and as a boat put
 *  back on course is pointed. Here, not in rivals.ts, so that race.ts can use it without bringing the rivals' pilot
 *  (and with it three.js) into the page's first chunk. */
export const CLOSE = 47;

/** share of top speed at a true wind angle; either side of the wind is the same */
export const polar = (twaDeg: number): number => {
  const a = Math.min(180, Math.abs(wrap180(twaDeg)));
  for (let i = 1; i < POLAR.length; i++) {
    const [a1, s1] = POLAR[i];
    if (a <= a1) {
      const [a0, s0] = POLAR[i - 1];
      return a === a1 ? s1 : s0 + ((s1 - s0) * (a - a0)) / (a1 - a0);
    }
  }
  return POLAR[POLAR.length - 1][1];
};

/** the angle between her heading and where the wind comes from, 0 (head to wind) … 180 (dead downwind) */
export const twa = (yaw: number, from: number): number => Math.abs(wrap180(from - bearingOf(yaw)));

/** 0.75 at 10 km/h or less, 1.25 at 35 km/h or more, linear between; 1 at 22.5 */
export const strength = (kmh: number): number => (kmh <= 10 ? 0.75 : kmh >= 35 ? 1.25 : 0.75 + ((kmh - 10) / 25) * 0.5);

export type Gust = { x: number; z: number; r: number; add: number };
/** box: where the gusts live, centre and size; they drift and wrap inside it */
export type Box = { x: number; z: number; w: number; h: number };
export type WindField = { from: number; kmh: number; seed: number; vary: boolean; box: Box };

/** with no box given, a 700 square on the origin */
export const makeField = (base: { from: number; kmh: number }, seed: number, vary: boolean, box: Box = { x: 0, z: 0, w: 700, h: 700 }): WindField => ({
  from: base.from, kmh: base.kmh, seed, vary, box: { ...box },
});

/** the course's gust box: the bounding box of its start line, finish line and marks, grown by 60 on every side */
export function courseBox(c: Course): Box {
  const pts: Vec[] = [c.start.a, c.start.b, c.finish.a, c.finish.b, ...c.marks];
  const xs = pts.map((p) => p.x), zs = pts.map((p) => p.z), G = 60;
  const x0 = Math.min(...xs) - G, x1 = Math.max(...xs) + G, z0 = Math.min(...zs) - G, z1 = Math.max(...zs) + G;
  return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, h: z1 - z0 };
}

/** mulberry32: a tiny seeded generator, 0 ≤ n < 1 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DRIFT0 = 4, DRIFT1 = 8, SHIFT = 15, SHIFT_PERIOD = 70, R0 = 45, R1 = 70;
const DEG = Math.PI / 180;
/** n into [c − size/2, c + size/2) */
const wrapIn = (n: number, c: number, size: number) => ((((n - c + size / 2) % size) + size) % size) - size / 2 + c;

/** how many gusts a box holds: enough to cover about a quarter of it at their nominal size, at least 3 and at most 12 */
export const gustCount = (b: Box): number => {
  const mean = (R0 + R1) / 2;
  return Math.min(12, Math.max(3, Math.round((0.25 * b.w * b.h) / (Math.PI * mean * mean))));
};
/** what every gust's radius is multiplied by: 1, or less in a box too small for its gusts at full size, so that
 *  together they still cover about a quarter of it */
export const gustScale = (b: Box): number => Math.min(1, Math.sqrt((0.25 * b.w * b.h) / (gustCount(b) * Math.PI * 57 * 57)));

/** what the seed fixes for a field: each gust's start, size and strength, and the phase of the shift */
function seeded(f: WindField) {
  const rnd = mulberry32(f.seed), b = f.box, k = gustScale(b);
  const gusts = Array.from({ length: gustCount(b) }, () => ({
    x: b.x + (rnd() - 0.5) * b.w, z: b.z + (rnd() - 0.5) * b.h, r: (R0 + rnd() * (R1 - R0)) * k, add: 0.12 + rnd() * 0.13, drift: DRIFT0 + rnd() * (DRIFT1 - DRIFT0),
  }));
  const phase = f.vary ? rnd() * Math.PI * 2 : 0;
  return { gusts, phase };
}

/** the gust patches at time t: radius 45 to 70 (times gustScale in a small box), add 0.12 to 0.25, each drifting downwind at its own 4 to 8 units/s and wrapping inside
 *  the field's box, as many as cover about a quarter of it */
export function gustsAt(f: WindField, t: number): Gust[] {
  // downwind: the bearing the wind blows towards (from + 180), as x east, z south
  const dx = -Math.sin(f.from * DEG), dz = Math.cos(f.from * DEG), b = f.box;
  return seeded(f).gusts.map((g) => ({ x: wrapIn(g.x + dx * g.drift * t, b.x, b.w), z: wrapIn(g.z + dz * g.drift * t, b.z, b.h), r: g.r, add: g.add }));
}

export function windAt(f: WindField, x: number, z: number, t: number): { from: number; factor: number } {
  const { phase } = seeded(f);
  const from = (((f.from + SHIFT * Math.sin((2 * Math.PI * t) / SHIFT_PERIOD + phase)) % 360) + 360) % 360;
  // the strongest gust the point lies in, falling off linearly to its edge (overlapping gusts do not add up)
  let add = 0;
  for (const g of gustsAt(f, t)) {
    const d = Math.hypot(x - g.x, z - g.z);
    if (d < g.r) add = Math.max(add, g.add * (1 - d / g.r));
  }
  return { from, factor: strength(f.kmh) + add };
}

/** the speed she settles to under sail */
export const sailSpeed = (yaw: number, w: { from: number; factor: number }): number => TOP * polar(twa(yaw, w.from)) * w.factor;

/** the local wind's speed in knots, as the HUD shows it: the field's km/h, raised in a gust as factor is */
export const knotsAt = (f: WindField, w: { factor: number }): number => Math.round((f.kmh * (w.factor / strength(f.kmh))) / 1.852);

/** the wind setting a race is really sailed in: "today" only if today's weather has arrived, else "standard". Decided
 *  when the race is configured; it picks the field, the best-times slot, the ghost and the labels alike. */
export const effectiveWind = (set: WindSet, weather: { wind: number; from: number } | null): WindSet => (set === "today" && weather ? "today" : "standard");

/** today's wind never forces an upwind start: least the start line's dir heading lies off it, in degrees */
export const START_OFF = 60;
/** the day's direction, turned by the smallest amount that puts the start line's dir heading at least START_OFF off
 *  the wind; as it comes if it already is */
export function offStart(c: Course, from: number): number {
  const dir = bearingOf(Math.atan2(-c.start.dir.z, c.start.dir.x)), off = wrap180(from - dir);
  if (Math.abs(off) >= START_OFF) return from;
  return (((dir + (off < 0 ? -START_OFF : START_OFF)) % 360) + 360) % 360;
}

/** the wind to race in: today's if it arrived (its direction turned by offStart), else the course's own. seed: today's
 *  (the caller's date-based seed); the course's own seed if left out. Its gusts live in the course's box. */
export function windFor(c: Course, set: WindSet, weather: { wind: number; from: number } | null, seed: number = c.seed): WindField {
  if (effectiveWind(set, weather) === "today" && weather) return makeField({ from: offStart(c, weather.from), kmh: weather.wind }, seed, true, courseBox(c));
  return makeField(c.wind, c.seed, false, courseBox(c));
}
