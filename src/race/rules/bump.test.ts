import { expect, test } from "vitest";
import { bump } from "./bump";
import { COURSES } from "./course";
import { createRace, type Boat } from "./race";

test("overlapping hulls are pushed apart and slowed", () => {
  const a = { x: 0, z: 0, yaw: 0, v: 10 }, b = { x: 3, z: 2, yaw: 0, v: 10 };
  expect(bump(a, b)).toBe(true);
  expect(bump({ ...a }, { ...b })).toBe(false);
  expect(a.v).toBe(8.5);
  expect(b.v).toBe(8.5);
});

test("hulls well apart are left alone", () => {
  const a = { x: 0, z: 0, yaw: 0, v: 10 }, b = { x: 0, z: 30, yaw: 0, v: 10 };
  expect(bump(a, b)).toBe(false);
  expect(a.v).toBe(10);
});

test("the push is shared equally: the midpoint between them stays put", () => {
  const a = { x: 0, z: 0, yaw: 0, v: 5 }, b = { x: 1, z: 4, yaw: 0.3, v: 5 };
  const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
  bump(a, b);
  expect((a.x + b.x) / 2).toBeCloseTo(mx, 9);
  expect((a.z + b.z) / 2).toBeCloseTo(mz, 9);
});

test("bow to stern: two boats in line ahead, overlapping end to end, are parted", () => {
  const a = { x: 0, z: 0, yaw: 0, v: 10 }, b = { x: 22, z: 0, yaw: 0, v: 4 };
  expect(bump(a, b)).toBe(true);
  expect(b.x - a.x).toBeGreaterThan(22);
});

/** the world stand-in: every boat goes straight on at thrust × 13 */
const straight = (b: Boat, dt: number) => {
  b.pose.v = b.helm.thrust * 13;
  b.pose.x += Math.cos(b.pose.yaw) * b.pose.v * dt;
  b.pose.z -= Math.sin(b.pose.yaw) * b.pose.v * dt;
};

test("the race bumps every pair of its boats after moving them, and says so", () => {
  const met: string[] = [];
  const r = createRace({ course: COURSES.lap, mode: "easy", countdown: 0, move: straight, onBump: (a, b) => void met.push(`${a.id}+${b.id}`) }, ["you", "b", "c"]);
  r.begin();
  for (const b of r.boats) b.helm = { turn: 0, thrust: 1 };
  // b alongside you, overlapping; c well clear
  r.boats[1].pose.x = r.player.pose.x - 4;
  r.boats[1].pose.z = r.player.pose.z + 2;
  r.step(1 / 30);
  expect(met).toEqual(["you+b"]);
  expect(r.player.pose.v).toBeCloseTo(13 * 0.85, 9);
  expect(r.boats[1].pose.v).toBeCloseTo(13 * 0.85, 9);
  expect(r.boats[2].pose.v).toBe(13);
});

test("hulls that stay together are kept apart but lose way only as they meet", () => {
  const met: string[] = [];
  const r = createRace({ course: COURSES.lap, mode: "easy", countdown: 0, move: (b: Boat) => void (b.pose.x -= 4), onBump: (a, b) => void met.push(`${a.id}+${b.id}`) }, ["you", "b"]);
  r.begin();
  // b pressed against your side, both at 10: each step moves you 4 west and b is pushed back into you
  r.boats[1].pose.x = r.player.pose.x;
  r.boats[1].pose.z = r.player.pose.z + 5;
  r.boats.forEach((b) => (b.pose.v = 10));
  r.step(1 / 30);
  r.boats[1].pose.z = r.player.pose.z + 5;
  r.step(1 / 30);
  expect(met).toEqual(["you+b"]);
  expect(r.player.pose.v).toBeCloseTo(8.5, 9);
  // parted for a while, then meeting again: a second knock
  r.boats[1].pose.z = r.player.pose.z + 40;
  for (let i = 0; i < 20; i++) r.step(1 / 30);
  r.boats[1].pose.z = r.player.pose.z + 5;
  r.step(1 / 30);
  expect(met).toEqual(["you+b", "you+b"]);
});

test("bump with slow: false parts them without slowing", () => {
  const a = { x: 0, z: 0, yaw: 0, v: 10 }, b = { x: 3, z: 2, yaw: 0, v: 10 };
  expect(bump(a, b, false)).toBe(true);
  expect(a.v).toBe(10);
  expect(bump(a, b)).toBe(false);
});

test("order: finished by time, then by distance left, then the unstarted by distance to the line; level boats keep their order", () => {
  const r = createRace({ course: COURSES.lap, mode: "easy", countdown: 5, move: straight }, ["you", "b", "c", "d"]);
  // all on the grid, level with the line: the order is the grid's
  for (const b of r.boats) b.pose.x = r.boats[0].pose.x;
  expect(r.order()).toEqual([0, 1, 2, 3]);
  r.boats[3].prog = { ...r.boats[3].prog, started: true, leg: 4, finishedAt: 80 };
  r.boats[1].prog = { ...r.boats[1].prog, started: true, leg: 4, finishedAt: 75 };
  r.boats[2].prog = { ...r.boats[2].prog, started: true, leg: 1 };
  expect(r.order()).toEqual([1, 3, 2, 0]);
});
