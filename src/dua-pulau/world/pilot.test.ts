import { expect, test } from "vitest";
import { stepHull } from "./hull";
import { pilot } from "./pilot";
import { heightAt } from "./terrain";

type Rock = { ax: number; az: number; bx: number; bz: number; r: number };
/** nearest point of a capsule to (x, z), and how far off it is: the same maths as isles.ts */
const near2 = (k: Rock, x: number, z: number) => {
  const vx = k.bx - k.ax, vz = k.bz - k.az, l2 = vx * vx + vz * vz;
  const u = l2 ? Math.min(1, Math.max(0, ((x - k.ax) * vx + (z - k.az) * vz) / l2)) : 0;
  const px = k.ax + vx * u, pz = k.az + vz * u;
  return { px, pz, d: Math.hypot(x - px, z - pz) };
};
const isles = { rocks: [] as Rock[], near2 };

test("clear water: steers straight for the point", () => {
  const s = pilot({ x: 0, z: 300, yaw: 0, v: 8, roll: 0 }, { x: 200, z: 300 }, isles, { isle: null, side: 0 });
  expect(Math.abs(s.turn)).toBeLessThan(0.05);
  expect(s.thrust).toBe(1);
});

test("an island in the way: she turns off the straight course", () => {
  const s = pilot({ x: -260, z: 0, yaw: 0, v: 8, roll: 0 }, { x: 0, z: 0 }, isles, { isle: null, side: 0 });
  expect(Math.abs(s.turn)).toBeGreaterThan(0.2);
});

test("driven for 120 s she passes the island without grounding", () => {
  const st = { x: -260, z: 0, yaw: 0, v: 0, roll: 0 }, mem = { isle: null, side: 0 };
  for (let i = 0; i < 120 * 30; i++) {
    stepHull(st, pilot(st, { x: 0, z: 0 }, isles, mem), 1 / 30, isles);
    expect(heightAt(st.x, st.z)).toBeLessThan(-1.5);
  }
  expect(Math.hypot(st.x, st.z)).toBeLessThan(20);
});
