// How a boat's handling (from Pinisi Yard's stats) changes her motion: pace her speed, turn her rate of turn, heel her
// lean, and a boat leaning past TENDER loses way. Out in open water north of the islands (sailing east, inside the 520 m limit), with no rocks.
import { expect, test } from "vitest";
import { stepHull, type Handling, type Hull } from "./hull";

const isles = { rocks: [], near2: () => ({ px: 0, pz: 0, d: 1e9 }) };
const at = (kit?: Handling): Hull => ({ x: -300, z: 380, yaw: 0, v: 0, roll: 0, kit });
const run = (st: Hull, turn: number, s: number) => {
  for (let i = 0; i < s * 30; i++) stepHull(st, { turn, thrust: 1 }, 1 / 30, isles);
  return st;
};

test("no kit sails as the pinisi always has", () => {
  expect(run(at(), 0, 20).v).toBeCloseTo(13, 0);
});
test("pace scales the speed she settles to, and the speed a race gives her", () => {
  expect(run(at({ pace: 1.08, turn: 1, heel: 1 }), 0, 20).v).toBeCloseTo(13 * 1.08, 0);
  const st = at({ pace: 0.9, turn: 1, heel: 1 });
  for (let i = 0; i < 600; i++) stepHull(st, { turn: 0, thrust: 0 }, 1 / 30, isles, { speed: 10 });
  expect(st.v).toBeCloseTo(9, 0);
});
test("turn sets how fast she comes round", () => {
  const quick = run(at({ pace: 1, turn: 1.3, heel: 1 }), 1, 3), slow = run(at({ pace: 1, turn: 0.75, heel: 1 }), 1, 3);
  expect(quick.yaw).toBeGreaterThan(slow.yaw * 1.5);
});
test("a tender boat heels further in a turn and loses way; a steady one keeps it", () => {
  const steady = run(at({ pace: 1, turn: 1, heel: 0.8 }), 0, 15), tender = run(at({ pace: 1, turn: 1, heel: 2 }), 0, 15);
  run(steady, 1, 6);
  run(tender, 1, 6);
  expect(Math.abs(tender.roll)).toBeGreaterThan(Math.abs(steady.roll) * 2);
  expect(tender.v).toBeLessThan(steady.v - 0.5);
});
