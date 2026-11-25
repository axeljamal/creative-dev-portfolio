import { test, expect } from "vitest";
import { stepHull } from "../../dua-pulau/world/hull";
import { COURSES } from "./course";
import { wrap180, yawOf } from "./geometry";
import { createRace, COUNTDOWN, moveFor } from "./race";
import { startRun } from "./start";
import { courseBox, effectiveWind, gustCount, gustScale, gustsAt, knotsAt, makeField, polar, sailSpeed, strength, twa, windAt, windFor } from "./wind";

/** open water: no rocks, nothing near */
const open = { rocks: [], near2: () => ({ d: 1e9, px: 0, pz: 0 }) };

test("polar: pinned points, symmetric, slow in the no-go zone", () => { expect(polar(0)).toBe(0.05); expect(polar(42)).toBe(0.62); expect(polar(110)).toBe(1); expect(polar(180)).toBe(0.72); expect(polar(36)).toBeCloseTo(0.37); expect(polar(20)).toBeLessThan(0.12); });
test("twa: heading east in a west wind is a dead run; heading west is head to wind", () => { expect(twa(0, 270)).toBeCloseTo(180); expect(twa(Math.PI, 270)).toBeCloseTo(0); expect(twa(Math.PI / 2, 270)).toBeCloseTo(90); });
test("strength clamps", () => { expect(strength(0)).toBe(0.75); expect(strength(22.5)).toBeCloseTo(1); expect(strength(80)).toBe(1.25); });
test("standard wind repeats exactly", () => { const a = makeField({ from: 225, kmh: 22 }, 23, false), b = makeField({ from: 225, kmh: 22 }, 23, false); expect(windAt(a, 10, 20, 37.5)).toEqual(windAt(b, 10, 20, 37.5)); expect(gustsAt(a, 12)).toEqual(gustsAt(b, 12)); });
test("shift stays within 15 degrees and a gust only adds", () => { const f = makeField({ from: 225, kmh: 22 }, 23, false); for (let t = 0; t < 200; t += 3) { const w = windAt(f, 0, 0, t); expect(Math.abs(wrap180(w.from - 225))).toBeLessThanOrEqual(15.001); expect(w.factor).toBeGreaterThanOrEqual(strength(22) - 1e-9); expect(w.factor).toBeLessThanOrEqual(strength(22) + 0.25 + 1e-9); } });
test("no weather: today's wind is the course's own", () => { const c = COURSES.lap; expect(windFor(c, "today", null)).toEqual(windFor(c, "standard", null)); });
test("head to wind and stopped, she can still be turned out and gathers way", () => {
  const st = { x: 0, z: 300, yaw: yawOf(270), v: 0, roll: 0 }, w = { from: 270, factor: 1 };
  for (let i = 0; i < 30 * 30; i++) stepHull(st, { turn: 1, thrust: 0 }, 1 / 30, open, { speed: sailSpeed(st.yaw, w) });
  expect(twa(st.yaw, 270)).toBeGreaterThan(42); expect(st.v).toBeGreaterThan(6);
});

// beyond the brief's seven: the parts of the field the game leans on
test("gusts: as many as cover about a quarter of the box (3 to 12), sized to it, each within its stated strength, inside the box", () => {
  expect(gustCount({ x: 0, z: 0, w: 700, h: 700 })).toBe(12);
  expect(gustCount({ x: 0, z: 0, w: 100, h: 100 })).toBe(3);
  expect(gustCount({ x: 0, z: 0, w: 400, h: 400 })).toBe(Math.round((0.25 * 400 * 400) / (Math.PI * 57.5 * 57.5)));
  expect(gustScale({ x: 0, z: 0, w: 700, h: 700 })).toBe(1);
  expect(gustScale({ x: 0, z: 0, w: 250, h: 150 })).toBeCloseTo(Math.sqrt((0.25 * 250 * 150) / (3 * Math.PI * 57 * 57)));
  for (const c of Object.values(COURSES)) {
    const box = courseBox(c), f = makeField(c.wind, c.seed, false, box), k = gustScale(box);
    for (const t of [0, 40, 333]) {
      const g = gustsAt(f, t);
      expect(g.length).toBe(gustCount(box));
      for (const p of g) {
        expect(p.r).toBeGreaterThanOrEqual(45 * k - 1e-9); expect(p.r).toBeLessThanOrEqual(70 * k + 1e-9);
        expect(p.add).toBeGreaterThanOrEqual(0.12); expect(p.add).toBeLessThanOrEqual(0.25);
        expect(Math.abs(p.x - box.x)).toBeLessThanOrEqual(box.w / 2); expect(Math.abs(p.z - box.z)).toBeLessThanOrEqual(box.h / 2);
      }
    }
  }
});
test("the course's box: its lines and marks, grown by 60", () => {
  // Island lap: marks from x −240 to −25 and z −115 to 115; the line at x −30, z 70 to 100
  expect(courseBox(COURSES.lap)).toEqual({ x: (-300 + 35) / 2, z: 0, w: 335, h: 350 });
  expect(windFor(COURSES.lap, "standard", null).box).toEqual(courseBox(COURSES.lap));
});
test("gusts cross the course: at the marks and mid-leg, a tenth to a half of the time", () => {
  for (const c of Object.values(COURSES)) {
    const f = windFor(c, "standard", null), mid = (l: { a: { x: number; z: number }; b: { x: number; z: number } }) => ({ x: (l.a.x + l.b.x) / 2, z: (l.a.z + l.b.z) / 2 });
    const route = [mid(c.start), ...c.marks, mid(c.finish)];
    const pts = [...c.marks.map((m) => ({ x: m.x, z: m.z })), ...route.slice(1).map((p, i) => ({ x: (p.x + route[i].x) / 2, z: (p.z + route[i].z) / 2 }))];
    let inside = 0, n = 0;
    for (let t = 0; t <= 120; t++) for (const p of pts) { n++; if (windAt(f, p.x, p.z, t).factor > strength(f.kmh) + 1e-9) inside++; }
    expect(inside / n, c.id).toBeGreaterThanOrEqual(0.1); expect(inside / n, c.id).toBeLessThanOrEqual(0.5);
  }
});
test("effective wind: today's only once today's weather has arrived", () => {
  expect(effectiveWind("today", { wind: 10, from: 90 })).toBe("today");
  expect(effectiveWind("today", null)).toBe("standard");
  expect(effectiveWind("standard", { wind: 10, from: 90 })).toBe("standard");
  expect(effectiveWind("standard", null)).toBe("standard");
});
test("startRun: 25 to 90 back, on the line's dir, at least 45° off the wind at the start of the countdown", () => {
  for (const c of Object.values(COURSES)) {
    const f = windFor(c, "standard", null), s = startRun(c, f, COUNTDOWN.sailing);
    const mid = { x: (c.start.a.x + c.start.b.x) / 2, z: (c.start.a.z + c.start.b.z) / 2 };
    expect(s.back, c.id).toBeGreaterThanOrEqual(25); expect(s.back, c.id).toBeLessThanOrEqual(90);
    expect(s.yaw, c.id).toBeCloseTo(Math.atan2(-c.start.dir.z, c.start.dir.x), 9);
    expect(twa(s.yaw, windAt(f, mid.x, mid.z, -COUNTDOWN.sailing).from), c.id).toBeGreaterThanOrEqual(45);
  }
});
test("the standard winds: every start line's dir at least 60° off the wind, so a 15° shift leaves it sailable", () => {
  expect(Object.values(COURSES).map((c) => [c.id, c.wind.from, c.wind.kmh])).toEqual([["sprint", 90, 22], ["lap", 45, 22], ["eight", 315, 22]]);
  for (const c of Object.values(COURSES)) expect(twa(Math.atan2(-c.start.dir.z, c.start.dir.x), c.wind.from), c.id).toBeGreaterThanOrEqual(60);
});
test("today's wind never forces an upwind start: turned by the least that puts the start's dir 60° off it", () => {
  for (const c of Object.values(COURSES)) {
    const dir = Math.atan2(-c.start.dir.z, c.start.dir.x);
    for (let from = 0; from < 360; from += 15) {
      const f = windFor(c, "today", { wind: 20, from }, 7), turn = Math.abs(wrap180(f.from - from));
      expect(twa(dir, f.from), `${c.id} ${from}`).toBeGreaterThanOrEqual(60 - 1e-6);
      // the least rotation: none if it was already off, else exactly to the 60° edge
      const was = twa(dir, from);
      expect(turn, `${c.id} ${from}`).toBeCloseTo(was >= 60 ? 0 : 60 - was, 6);
    }
  }
});
test("a Sailing start held on course: not over early at the gun, and started within 4 s of it", () => {
  for (const c of Object.values(COURSES)) {
    const f = windFor(c, "standard", null), grid = startRun(c, f, COUNTDOWN.sailing);
    const move = moveFor("sailing", f, (b, dt, speed) => void stepHull(b.pose, b.helm, dt, open, { speed }));
    const r = createRace({ course: c, mode: "sailing", countdown: COUNTDOWN.sailing, move, grid }, ["you"]); r.begin();
    let atGun: boolean | null = null, startedAt: number | null = null;
    for (let i = 0; i < (COUNTDOWN.sailing + 6) * 30 && startedAt === null; i++) {
      r.step(1 / 30);
      if (atGun === null && r.time() >= 0) atGun = r.player.prog.early;
      if (r.player.prog.started) startedAt = r.time();
    }
    expect(atGun, c.id).toBe(false);
    expect(startedAt, c.id).not.toBeNull(); expect(startedAt!, c.id).toBeLessThanOrEqual(4);
  }
});
test("gusts drift downwind, each at its own 4 to 8 units a second, not all alike", () => {
  // a wind from the west (270) blows towards the east: x grows, z stays
  const f = makeField({ from: 270, kmh: 22 }, 5, false);
  const a = gustsAt(f, 10), b = gustsAt(f, 11), speeds: number[] = [];
  a.forEach((g, i) => {
    if (Math.abs(g.x) > 340) return; // about to wrap
    expect(b[i].x - g.x).toBeGreaterThanOrEqual(4); expect(b[i].x - g.x).toBeLessThanOrEqual(8); expect(b[i].z - g.z).toBeCloseTo(0);
    speeds.push(b[i].x - g.x);
  });
  expect(Math.max(...speeds) - Math.min(...speeds)).toBeGreaterThan(0.5);
});
test("inside a gust the wind is stronger, most at its middle", () => {
  const f = makeField({ from: 225, kmh: 22 }, 23, false), g = gustsAt(f, 50)[0];
  const mid = windAt(f, g.x, g.z, 50).factor, edge = windAt(f, g.x + g.r * 0.9, g.z, 50).factor;
  expect(mid).toBeGreaterThanOrEqual(strength(22) + g.add - 1e-9);
  expect(edge).toBeLessThan(mid);
});
test("today's wind with weather: its direction and clamped strength, varying, seeded by the caller", () => {
  const f = windFor(COURSES.lap, "today", { wind: 60, from: 90 }, 20261124);
  expect(f).toEqual({ from: 90, kmh: 60, seed: 20261124, vary: true, box: courseBox(COURSES.lap) });
  expect(windAt(f, 0, 0, 0).factor).toBeGreaterThanOrEqual(1.25 - 1e-9);
  expect(windFor(COURSES.lap, "standard", { wind: 60, from: 90 })).toEqual(makeField(COURSES.lap.wind, COURSES.lap.seed, false, courseBox(COURSES.lap)));
});
test("sail speed: 13 × polar × factor", () => {
  expect(sailSpeed(yawOf(0), { from: 270, factor: 1 })).toBeCloseTo(13 * 0.97); // north in a west wind: a beam reach
  expect(sailSpeed(yawOf(90), { from: 270, factor: 1.2 })).toBeCloseTo(13 * 0.72 * 1.2); // a dead run
});
test("knots: km/h ÷ 1.852, rounded, and more in a gust", () => {
  const f = makeField({ from: 225, kmh: 22 }, 23, false);
  expect(knotsAt(f, { factor: strength(22) })).toBe(12);
  expect(knotsAt(f, { factor: strength(22) + 0.25 })).toBe(15);
});
