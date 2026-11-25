import { expect, test } from "vitest";
import { beamAt, stepHull } from "../../dua-pulau/world/hull";
import { heightAt } from "../../dua-pulau/world/terrain";
import { HULL_AT, HULL_R } from "./bump";
import { COURSES, newProgress } from "./course";
import { ROCKS, WATER, near2 } from "./fixtures/water";
import { bearingOf, wrap180, yawOf } from "./geometry";
import { COUNTDOWN, createRace, gridFor, moveFor, type Boat } from "./race";
import { BEAR, CLOSE, GRID_FLEET, MIN_TACK, RIVALS, easyHelm, newRivalMem, rivalFor, sailHelm, withFleet, type Rival } from "./rivals";
import { startRun } from "./start";
import type { Course } from "./types";
import { makeField, sailSpeed, twa, windAt, windFor } from "./wind";

// the water the game has: the land is heightAt's, and the pier, the strait's buoy and the groynes are the running
// page's own (fixtures/rocks.json), measured with isles.ts's capsule distance
const isles = WATER;
/** open water, for the unit tests that count what withFleet adds */
const open = { rocks: [] as typeof WATER.rocks, near2 };
const DT = 1 / 30;

/** how far her hull is inside an obstacle in the water (the pier, a groyne, the strait's buoy), at the worst: 0 or less
 *  when clear. Measured on stepHull's own hull (hull.ts), not bump.ts's three discs: stepHull keeps the water's
 *  obstacles out by testing points every 2.6 from 13 forward to 13 aft, each with the half-beam beamAt gives there
 *  (3.9 amidships, about 2.7 at 9 forward and 3.2 at 9 aft), and bump.ts's discs (3.4 at ±9) stand out past that
 *  shape at the ends. So a hull resting against the pier, pushed clear by stepHull, still has a disc 0.7 into it;
 *  "no hull inside an obstacle" is stepHull's shape clear of each rock's capsule. */
const inside = (p: Boat["pose"]) => {
  const fx = Math.cos(p.yaw), fz = -Math.sin(p.yaw);
  let worst = -Infinity;
  for (let o = 13; o >= -13; o -= 2.6)
    for (const k of ROCKS) worst = Math.max(worst, k.r + beamAt(o) - near2(k, p.x + fx * o, p.z + fz * o).d);
  return worst;
};
/** the half unit allowed inside an obstacle: stepHull pushes her out after the move, rock by rock and point by point,
 *  so one push may leave an earlier point a little in */
const GIVE = 0.5;

/** the stand-in for a player sailing as well as she can: the rivals' helm at full pace */
const you: Rival = { id: "you", name: "You", tint: 0, pace: 1, wide: 14, design: "current", stand: 50 };

/** one rival alone on the course at 30 Hz, on the real hull: her finish time, and the worst she did on the way */
function sail(c: Course, r: Rival) {
  const race = createRace({ course: c, mode: "easy", countdown: 5, move: (b: Boat, dt: number) => void stepHull(b.pose, b.helm, dt, isles) }, [r.id]);
  race.begin();
  const b = race.player, mem = newRivalMem();
  let worstH = -Infinity, worstIn = -Infinity, still = 0, longestStill = 0;
  for (let i = 0; i < (5 + 300) / DT && b.prog.finishedAt === null; i++) {
    if (race.phase() === "racing") b.helm = easyHelm(r, b, c, isles, mem);
    race.step(DT);
    if (race.time() <= 0) continue;
    worstH = Math.max(worstH, heightAt(b.pose.x, b.pose.z));
    worstIn = Math.max(worstIn, inside(b.pose));
    still = Math.abs(b.pose.v) < 1 ? still + DT : 0;
    longestStill = Math.max(longestStill, still);
  }
  return { time: b.prog.finishedAt, worstH, worstIn, longestStill, leg: b.prog.leg };
}

test("each rival, driven by easyHelm, finishes every course without grounding or stalling", () => {
  for (const c of Object.values(COURSES)) for (const r of RIVALS) {
    const s = sail(c, r);
    expect(s.time, `${r.id} on ${c.id}: leg ${s.leg}`).not.toBeNull();
    expect(s.time!).toBeLessThan(300);
    expect(s.worstH, `${r.id} on ${c.id} touched ground`).toBeLessThan(-1.5);
    expect(s.worstIn, `${r.id} on ${c.id} inside an obstacle`).toBeLessThanOrEqual(GIVE);
    expect(s.longestStill, `${r.id} on ${c.id} stalled`).toBeLessThanOrEqual(8);
  }
});

test("pace orders the fleet", () => {
  const t = Object.fromEntries(RIVALS.map((r) => [r.id, sail(COURSES.lap, r).time!]));
  expect(t.ombak).toBeGreaterThan(t["sussex-maid"]);
  expect(t["sussex-maid"]).toBeGreaterThan(t["bintang-laut"]);
});

test("easyHelm never pushes harder than her pace, and eases to 0.6 × pace near a rounding point", () => {
  const c = COURSES.lap, r = RIVALS[0];
  const race = createRace({ course: c, mode: "easy", countdown: 0, move: (b: Boat, dt: number) => void stepHull(b.pose, b.helm, dt, isles) }, [r.id]);
  race.begin();
  const b = race.player, mem = newRivalMem();
  const seen = new Set<number>();
  for (let i = 0; i < 120 / DT && b.prog.finishedAt === null; i++) {
    b.helm = easyHelm(r, b, c, isles, mem);
    expect(b.helm.thrust).toBeLessThanOrEqual(r.pace);
    expect(b.helm.thrust).toBeGreaterThanOrEqual(0);
    seen.add(Math.round((b.helm.thrust / r.pace) * 100));
    race.step(DT);
  }
  expect(seen.has(100)).toBe(true);
  expect(seen.has(60)).toBe(true);
});

test("the fleet of four fits inside the start line's ends, every boat in deep water", () => {
  for (const c of Object.values(COURSES)) {
    const { a, b } = c.start, len = Math.hypot(b.x - a.x, b.z - a.z), ux = (b.x - a.x) / len, uz = (b.z - a.z) / len;
    for (const p of gridFor(c, 4)) {
      const along = (p.x - a.x) * ux + (p.z - a.z) * uz;
      expect(along).toBeGreaterThan(3);
      expect(along).toBeLessThan(len - 3);
      expect(heightAt(p.x, p.z)).toBeLessThan(-3);
    }
  }
});

test("racing together, with a player sailing as well as she can, the whole fleet finishes every course, knocking now and then but never locked together", () => {
  for (const c of Object.values(COURSES)) {
    const crew = [you, ...GRID_FLEET];
    let knocks = 0;
    const race = createRace({ course: c, mode: "easy", countdown: 5, move: (b: Boat, dt: number) => void stepHull(b.pose, b.helm, dt, isles), onBump: () => void knocks++ }, crew.map((r) => r.id));
    race.begin();
    const mems = crew.map(() => newRivalMem()), still = crew.map(() => 0), longest = crew.map(() => 0);
    for (let i = 0; i < (5 + 300) / DT && race.boats.some((b) => b.prog.finishedAt === null); i++) {
      if (race.phase() !== "countdown") race.boats.forEach((b, k) => (b.helm = easyHelm(crew[k], b, c, withFleet(isles, race.boats, b), mems[k])));
      race.step(DT);
      if (race.time() <= 0) continue;
      race.boats.forEach((b, k) => {
        if (b.prog.finishedAt !== null) return;
        still[k] = Math.abs(b.pose.v) < 1 ? still[k] + DT : 0;
        longest[k] = Math.max(longest[k], still[k]);
        expect(heightAt(b.pose.x, b.pose.z), `${b.id} on ${c.id} touched ground`).toBeLessThan(-1.5);
        expect(inside(b.pose), `${b.id} on ${c.id} inside an obstacle at ${race.time().toFixed(1)}`).toBeLessThanOrEqual(GIVE);
      });
    }
    race.boats.forEach((b, k) => {
      expect(b.prog.finishedAt, `${b.id} on ${c.id}: leg ${b.prog.leg}`).not.toBeNull();
      expect(longest[k], `${b.id} on ${c.id} stalled`).toBeLessThanOrEqual(8);
    });
    expect(knocks, `${c.id}: ${knocks} knocks`).toBeLessThan(20);
  }
});

test("withFleet: every other boat still racing becomes three discs in the water; she and the finished are left out", () => {
  const race = createRace({ course: COURSES.lap, mode: "easy", countdown: 5, move: () => {} }, ["you", "a", "b"]);
  race.boats[2].prog = { ...race.boats[2].prog, finishedAt: 60 };
  const w = withFleet(open, race.boats, race.player);
  expect(w.rocks.length).toBe(3);
  expect(w.rocks.map((k) => Math.round(k.ax))).toEqual([-5 - 9, -5, -5 + 9]); // a, heading west: bow, midships, stern
  expect(w.near2).toBe(near2);
});

test("rivalFor: easiest unbeaten, then the hardest", () => {
  expect(rivalFor([]).id).toBe("ombak");
  expect(rivalFor(["ombak"]).id).toBe("sussex-maid");
  expect(rivalFor(["ombak", "sussex-maid", "bintang-laut"]).id).toBe("bintang-laut");
});

test("the roster: names, colours, paces and designs as proposed", () => {
  expect(RIVALS.map((r) => [r.id, r.name, r.tint, r.pace, r.wide, r.design, r.stand])).toEqual([
    ["ombak", "Ombak", 0x2f8f8a, 0.86, 26, "original", 75],
    ["sussex-maid", "Sussex Maid", 0xc8553d, 0.93, 18, "cruising", 60],
    ["bintang-laut", "Bintang Laut", 0x3a4f8f, 0.98, 13, "current", 60],
  ]);
});

// ---------- under sail ----------

const STILL = { turn: 0, thrust: 0 };
/** the side of the wind her bow is on (+ the wind on her port bow, − on her starboard), 0 within 10° of head to wind:
 *  a tack is a change from one side to the other */
const sideOf = (yaw: number, from: number) => {
  const a = wrap180(bearingOf(yaw) - from);
  return Math.abs(a) < 10 ? 0 : Math.sign(a);
};
type Log = { startedAt: number | null; worstH: number; worstIn: number; still: number; longestStill: number; pinch: number; longestPinch: number; tacks: number; side: number; locked: number; longestLock: number };
/** are two hulls touching: any of one's three discs (bump.ts's) overlapping any of the other's */
const touching = (p: Boat["pose"], q: Boat["pose"]) =>
  HULL_AT.some((i) => HULL_AT.some((j) => Math.hypot(p.x + Math.cos(p.yaw) * i - q.x - Math.cos(q.yaw) * j, p.z - Math.sin(p.yaw) * i - q.z + Math.sin(q.yaw) * j) < 2 * HULL_R));

/** a fleet under sail at 30 Hz in the course's standard wind, from the 8 s countdown on startRun's grid of four: each boat
 *  holds her starting course until the gun, then sails by sailHelm. at: each boat's place in the row of four. fleet:
 *  whether they steer round one another (they bump either way, when more than one is racing). */
function underSail(c: Course, crew: Rival[], at: number[], fleet = false) {
  const f = windFor(c, "standard", null), grid = startRun(c, f, COUNTDOWN.sailing), row = gridFor(c, 4, grid.back, grid.yaw);
  const pace = new Map(crew.map((r) => [r.id, r.pace]));
  const move = moveFor("sailing", f, (b, dt, speed) => void stepHull(b.pose, b.helm, dt, isles, { speed }), (b) => pace.get(b.id)!);
  const race = createRace({ course: c, mode: "sailing", countdown: COUNTDOWN.sailing, grid, move }, crew.map((r) => r.id));
  race.boats.forEach((b, k) => (b.pose = { ...row[at[k]], roll: 0 }));
  race.begin();
  const mems = crew.map(() => newRivalMem());
  const log: Log[] = crew.map(() => ({ startedAt: null, worstH: -Infinity, worstIn: -Infinity, still: 0, longestStill: 0, pinch: 0, longestPinch: 0, tacks: 0, side: 0, locked: 0, longestLock: 0 }));
  for (let i = 0; i < (COUNTDOWN.sailing + 480) / DT && race.boats.some((b) => b.prog.finishedAt === null); i++) {
    const t = race.time(), racing = race.phase() !== "countdown";
    race.boats.forEach((b, k) => (b.helm = racing ? sailHelm(crew[k], b, c, windAt(f, b.pose.x, b.pose.z, t), fleet ? withFleet(isles, race.boats, b) : isles, mems[k], t) : STILL));
    race.step(DT);
    const now = race.time();
    if (now <= 0) continue;
    race.boats.forEach((b, k) => {
      const l = log[k];
      if (b.prog.started && l.startedAt === null) l.startedAt = now;
      if (b.prog.finishedAt !== null) return;
      const from = windAt(f, b.pose.x, b.pose.z, now).from, s = sideOf(b.pose.yaw, from);
      if (s && l.side && s !== l.side) l.tacks++;
      if (s) l.side = s;
      l.worstH = Math.max(l.worstH, heightAt(b.pose.x, b.pose.z));
      l.worstIn = Math.max(l.worstIn, inside(b.pose));
      l.still = Math.abs(b.pose.v) < 1 ? l.still + DT : 0;
      l.longestStill = Math.max(l.longestStill, l.still);
      l.pinch = twa(b.pose.yaw, from) < 38 ? l.pinch + DT : 0;
      l.longestPinch = Math.max(l.longestPinch, l.pinch);
      // hull to hull with any boat still racing, every step in a row
      l.locked = race.boats.some((o) => o !== b && o.prog.finishedAt === null && touching(b.pose, o.pose)) ? l.locked + DT : 0;
      l.longestLock = Math.max(l.longestLock, l.locked);
    });
  }
  return race.boats.map((b, k) => ({ id: b.id, time: b.prog.finishedAt, leg: b.prog.leg, ...log[k] }));
}

test("under sail, the fleet of four stands abreast on the line's dir, inside its ends, in deep water with open water ahead", () => {
  for (const c of Object.values(COURSES)) {
    const { a, b } = c.start, len = Math.hypot(b.x - a.x, b.z - a.z), ux = (b.x - a.x) / len, uz = (b.z - a.z) / len;
    const g = startRun(c, windFor(c, "standard", null), COUNTDOWN.sailing), hx = Math.cos(g.yaw), hz = -Math.sin(g.yaw);
    for (const p of gridFor(c, 4, g.back, g.yaw)) {
      const along = (p.x - a.x) * ux + (p.z - a.z) * uz;
      expect(along, c.id).toBeGreaterThan(3);
      expect(along, c.id).toBeLessThan(len - 3);
      // from her place on the grid, over the line and 60 beyond it: deeper than the pilot's shoal
      for (let d = 0; d <= g.back + 60; d += 5) expect(heightAt(p.x + hx * d, p.z + hz * d), `${c.id} at ${d}`).toBeLessThan(-3.6);
    }
  }
});

const soloRuns = new Map<string, ReturnType<typeof underSail>[0]>();
/** one rival alone under sail, from her own place on the grid (GRID_FLEET's, after the player's, as in the game) */
const solo = (c: Course, r: Rival) => {
  const key = `${c.id}:${r.id}`;
  if (!soloRuns.has(key)) soloRuns.set(key, underSail(c, [r], [GRID_FLEET.indexOf(r) + 1])[0]);
  return soloRuns.get(key)!;
};
/** the clean reference lap under sail: the stand-in player helm below (sailHelm at pace 1) alone on the Island lap
 *  under the standard wind, from the first place on the grid, measured at 82.3 s */
const REF_LAP = 82.3;

test("each rival alone finishes every course under the standard wind within 480 s, without grounding, stalling or sailing in the no-go zone", () => {
  for (const c of Object.values(COURSES))
    for (const r of RIVALS) {
      const s = solo(c, r), who = `${r.id} on ${c.id}`;
      expect(s.startedAt, `${who} never started`).not.toBeNull();
      expect(s.startedAt!, `${who} started late`).toBeLessThanOrEqual(6);
      expect(s.time, `${who}: leg ${s.leg}`).not.toBeNull();
      expect(s.time!, who).toBeLessThanOrEqual(480);
      expect(s.worstH, `${who} touched ground`).toBeLessThan(-1.5);
      expect(s.worstIn, `${who} inside an obstacle`).toBeLessThanOrEqual(GIVE);
      expect(s.longestPinch, `${who} pinched`).toBeLessThanOrEqual(10);
      expect(s.longestStill, `${who} stalled`).toBeLessThanOrEqual(10);
    }
});

test("alone under sail, the three finish in pace order on every course: Bintang Laut, then Sussex Maid, then Ombak", () => {
  for (const c of Object.values(COURSES)) {
    const [o, m, b] = RIVALS.map((r) => solo(c, r).time!);
    expect(b, c.id).toBeLessThan(m);
    expect(m, c.id).toBeLessThan(o);
  }
});

test("the reference lap: the stand-in helm alone on the Island lap under sail is 82.3 s, within half a second", () => {
  const [s] = underSail(COURSES.lap, [you], [0]);
  expect(s.time!).toBeCloseTo(REF_LAP, 0);
});

test("alone on the Island lap under sail, Bintang Laut is within 6% of the reference lap, and Ombak at least 12% slower than it", () => {
  expect(solo(COURSES.lap, RIVALS[2]).time!).toBeLessThanOrEqual(REF_LAP * 1.06);
  expect(solo(COURSES.lap, RIVALS[0]).time!).toBeGreaterThanOrEqual(REF_LAP * 1.12);
});

test("dead upwind she tacks rather than pinching", () => {
  // open water south of the islands; the mark 300 dead upwind of her, and she starts at rest, head to wind
  const f = makeField({ from: 270, kmh: 22 }, 5, false), r = RIVALS[0], m = { x: -200, z: 250 };
  const line = { a: { x: 100, z: 225 }, b: { x: 100, z: 275 }, dir: { x: -1, z: 0 } };
  const c: Course = { id: "sprint", name: "Upwind", start: line, finish: line, marks: [{ ...m, side: "port", out: { x: 1, z: 0 } }], wind: { from: 270, kmh: 22 }, seed: 5 };
  const b: Boat = { id: r.id, pose: { x: 100, z: 250, yaw: yawOf(270), v: 0, roll: 0 }, prog: { ...newProgress(), started: true, armed: true }, helm: STILL };
  const mem = newRivalMem();
  let tacks = 0, side = 0, closest = Infinity, pinch = 0, longestPinch = 0;
  for (let t = 0; t < 120 && closest >= 30; t += DT) {
    const w = windAt(f, b.pose.x, b.pose.z, t);
    b.helm = sailHelm(r, b, c, w, isles, mem, t);
    stepHull(b.pose, b.helm, DT, isles, { speed: sailSpeed(b.pose.yaw, w) * r.pace });
    const s = sideOf(b.pose.yaw, w.from);
    if (s && side && s !== side) tacks++;
    if (s) side = s;
    pinch = twa(b.pose.yaw, w.from) < 38 ? pinch + DT : 0;
    longestPinch = Math.max(longestPinch, pinch);
    closest = Math.min(closest, Math.hypot(b.pose.x - m.x, b.pose.z - m.z));
  }
  expect(closest).toBeLessThan(30);
  expect(tacks).toBeGreaterThanOrEqual(2);
  expect(tacks).toBeLessThanOrEqual(12);
  expect(longestPinch).toBeLessThanOrEqual(10);
});

test("land ahead just after a tack: she does not tack again inside MIN_TACK, bears away no more than BEAR, and in the next 30 s neither grounds nor stalls", () => {
  // the wind from the north; the mark far upwind, so she cannot lay it and beats. She is close-hauled on the tack that
  // points her north-east, at the western island's south shore, and tacked onto it 2 s ago
  const f = makeField({ from: 0, kmh: 22 }, 5, false), r = RIVALS[2], stand = r.stand!, m = { x: -125, z: -400 };
  const line = { a: { x: -150, z: 200 }, b: { x: -100, z: 200 }, dir: { x: 0, z: -1 } };
  const c: Course = { id: "sprint", name: "Upwind", start: line, finish: line, marks: [{ ...m, side: "port", out: { x: 1, z: 0 } }], wind: { from: 0, kmh: 22 }, seed: 5 };
  let shore = 0;
  while (heightAt(-125, shore) >= -3.6) shore++;
  const yaw = yawOf(CLOSE), hx = Math.cos(yaw), hz = -Math.sin(yaw), at = { x: -125 - hx * 40, z: shore - hz * 40 };
  const b: Boat = { id: r.id, pose: { ...at, yaw, v: 8, roll: 0 }, prog: { ...newProgress(), started: true, armed: true }, helm: STILL };
  const mem = { ...newRivalMem(), tack: 1 as const, tackedAt: -2 };
  // the setting is what it says: she is in deep water, with land inside her stand dead ahead
  expect(heightAt(at.x, at.z)).toBeLessThan(-3.6);
  let landAt = Infinity;
  for (let d = 10; d <= stand; d += 5) if (heightAt(at.x + hx * d, at.z + hz * d) >= -3.6) landAt = Math.min(landAt, d);
  expect(landAt).toBeLessThanOrEqual(stand);
  let worstH = -Infinity, worstIn = -Infinity, still = 0, longestStill = 0, widest = 0;
  for (let t = 0; t < 30; t += DT) {
    const w = windAt(f, b.pose.x, b.pose.z, t);
    b.helm = sailHelm(r, b, c, w, isles, mem, t);
    stepHull(b.pose, b.helm, DT, isles, { speed: sailSpeed(b.pose.yaw, w) * r.pace });
    if (t + 2 < MIN_TACK) {
      // inside MIN_TACK of the tack 2 s before: the same tack, her bow on its side, no further off the wind than BEAR below close-hauled
      expect(mem.tack, `at ${t.toFixed(1)}`).toBe(1);
      expect(mem.tackedAt).toBe(-2);
      const head = wrap180(bearingOf(b.pose.yaw) - w.from);
      expect(head, `at ${t.toFixed(1)}`).toBeGreaterThan(0);
      widest = Math.max(widest, head);
    }
    worstH = Math.max(worstH, heightAt(b.pose.x, b.pose.z));
    worstIn = Math.max(worstIn, inside(b.pose));
    still = Math.abs(b.pose.v) < 1 ? still + DT : 0;
    longestStill = Math.max(longestStill, still);
  }
  // (a degree for the helm settling onto the heading it steers for)
  expect(widest).toBeLessThanOrEqual(CLOSE + BEAR + 1);
  expect(worstH).toBeLessThan(-1.5);
  expect(worstIn).toBeLessThanOrEqual(GIVE);
  expect(longestStill).toBeLessThanOrEqual(10);
});

test("the pinned numbers under sail: CLOSE 47° off the wind, MIN_TACK 8 s between tacks", () => {
  expect([CLOSE, MIN_TACK]).toEqual([47, 8]);
});

// the fleet as the game races it: the player in the first place on the grid, then GRID_FLEET
const fleetUnderSail = (c: Course) => underSail(c, [you, ...GRID_FLEET], [0, 1, 2, 3], true);
const fleetRuns = new Map<string, ReturnType<typeof underSail>>();
const fleetOn = (c: Course) => fleetRuns.get(c.id) ?? (fleetRuns.set(c.id, fleetUnderSail(c)), fleetRuns.get(c.id)!);

test("racing together under sail, with a player sailing as well as she can, the whole fleet finishes every course within 480 s; none grounds, none is slower than 1 u/s for more than 10 s, and no two are hull to hull for more than 5 s", () => {
  for (const c of Object.values(COURSES))
    for (const s of fleetOn(c)) {
      expect(s.time, `${s.id} on ${c.id}: leg ${s.leg}`).not.toBeNull();
      expect(s.time!, `${s.id} on ${c.id}`).toBeLessThanOrEqual(480);
      expect(s.worstH, `${s.id} on ${c.id} touched ground`).toBeLessThan(-1.5);
      expect(s.worstIn, `${s.id} on ${c.id} inside an obstacle`).toBeLessThanOrEqual(GIVE);
      expect(s.longestStill, `${s.id} on ${c.id} stalled`).toBeLessThanOrEqual(10);
      expect(s.longestLock, `${s.id} on ${c.id} locked to another hull`).toBeLessThanOrEqual(5);
    }
});

test("racing together under sail, Bintang Laut finishes ahead of Ombak on every course", () => {
  for (const c of Object.values(COURSES)) {
    const t = Object.fromEntries(fleetOn(c).map((s) => [s.id, s.time ?? Infinity]));
    expect(t["bintang-laut"], c.id).toBeLessThan(t.ombak);
  }
});
