import { test, expect } from "vitest";
import { heightAt } from "../../dua-pulau/world/terrain";
import { COURSES, advance, newProgress, remaining } from "./course";

test("every course point lies in deep water and every out and dir is a unit vector", () => {
  for (const c of Object.values(COURSES)) {
    for (const p of [c.start.a, c.start.b, c.finish.a, c.finish.b, ...c.marks]) expect(heightAt(p.x, p.z)).toBeLessThan(-3.6);
    for (const v of [c.start.dir, c.finish.dir, ...c.marks.map((m) => m.out)]) expect(Math.hypot(v.x, v.z)).toBeCloseTo(1);
  }
});
test("port rounding: passing west of a west-facing ray heading south counts; heading north does not", () => {
  const c = COURSES.sprint, m = c.marks[0], p = { ...newProgress(), started: true };
  expect(advance(c, p, { x: m.x - 20, z: m.z - 5 }, { x: m.x - 20, z: m.z + 5 }, 9).leg).toBe(1);
  expect(advance(c, p, { x: m.x - 20, z: m.z + 5 }, { x: m.x - 20, z: m.z - 5 }, 9).leg).toBe(0);
});
test("the start does not count before the gun, nor backwards", () => {
  const c = COURSES.sprint, east = { x: 155, z: 115 }, west = { x: 145, z: 115 };
  expect(advance(c, newProgress(), east, west, -1).started).toBe(false);
  expect(advance(c, newProgress(), west, east, 2).started).toBe(false);
  expect(advance(c, newProgress(), east, west, 2).started).toBe(true);
});
test("over the line at the gun: must come back before the start counts", () => {
  const c = COURSES.sprint;
  let p = advance(c, newProgress(), { x: 141, z: 115 }, { x: 140, z: 115 }, 0);
  expect(p.early).toBe(true); expect(p.started).toBe(false);
  p = advance(c, p, { x: 140, z: 115 }, { x: 156, z: 115 }, 3); expect(p.early).toBe(false);
  p = advance(c, p, { x: 156, z: 115 }, { x: 144, z: 115 }, 5); expect(p.started).toBe(true);
});
test("the finish counts only after every mark", () => {
  const c = COURSES.sprint, w = { x: 145, z: 115 }, e = { x: 155, z: 115 };
  const p = { ...newProgress(), started: true };
  expect(advance(c, p, w, e, 20).finishedAt).toBeNull();
  expect(advance(c, { ...p, leg: 1, splits: [15] }, w, e, 31.5).finishedAt).toBe(31.5);
});
test("a mark out of turn does not count", () => {
  const c = COURSES.lap, m = c.marks[1], p = { ...newProgress(), started: true };
  expect(advance(c, p, { x: m.x - 20, z: m.z + 5 }, { x: m.x - 20, z: m.z - 5 }, 9).leg).toBe(0);
});
test("remaining shrinks along the course and is 0 when finished", () => {
  const c = COURSES.sprint, p = { ...newProgress(), started: true };
  expect(remaining(c, p, { x: 140, z: 115 })).toBeGreaterThan(remaining(c, p, { x: 60, z: 115 }));
  expect(remaining(c, { ...p, leg: 1, finishedAt: 30 }, { x: 160, z: 115 })).toBe(0);
});
test("a started boat that drifts back over the start and crosses it again does not restart, split or finish", () => {
  const c = COURSES.sprint, east = { x: 155, z: 115 }, west = { x: 145, z: 115 };
  let p = advance(c, newProgress(), east, west, 2);
  expect(p.started).toBe(true);
  p = advance(c, p, west, east, 4);
  const again = advance(c, p, east, west, 6);
  expect(again).toEqual({ ...newProgress(), armed: true, started: true });
});
test("on the lap, a started boat on its first leg crossing the start-finish line does not finish", () => {
  const c = COURSES.lap, east = { x: -25, z: 85 }, west = { x: -35, z: 85 };
  const p = { ...newProgress(), armed: true, started: true };
  const q = advance(c, p, east, west, 3);
  expect(q.finishedAt).toBeNull(); expect(q.leg).toBe(0);
});
test("a boat exactly on the start line at the gun, stepping along dir, has started", () => {
  const c = COURSES.eight, on = { x: 0, z: 130 }, over = { x: 1, z: 130 };
  const p = advance(c, newProgress(), on, over, 0);
  expect(p.early).toBe(false); expect(p.started).toBe(true);
  // and the same for every course: on the line, a step along dir starts her
  for (const k of Object.values(COURSES)) {
    const m = { x: (k.start.a.x + k.start.b.x) / 2, z: (k.start.a.z + k.start.b.z) / 2 };
    const q = advance(k, newProgress(), m, { x: m.x + k.start.dir.x, z: m.z + k.start.dir.z }, 0);
    expect(q.started).toBe(true);
  }
});
test("over the line at the gun and back behind it in the same step: not early", () => {
  const c = COURSES.sprint;
  const p = advance(c, newProgress(), { x: 141, z: 115 }, { x: 152, z: 115 }, 0);
  expect(p.early).toBe(false); expect(p.started).toBe(false);
});
