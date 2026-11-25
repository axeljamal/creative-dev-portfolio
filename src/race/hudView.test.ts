import { expect, test } from "vitest";
import { hudView, type HudIn } from "./hudView";
import { COURSES } from "./rules/course";
import { createRace, type Boat } from "./rules/race";

const still = (_b: Boat, _dt: number) => {};
const ROSTER = { ombak: { name: "Ombak", tint: 0x2f8f8a }, "sussex-maid": { name: "Sussex Maid", tint: 0xc8553d } };
const input = (o: Partial<HudIn> = {}): HudIn => {
  // just after the gun
  const race = createRace({ course: COURSES.lap, mode: "easy", countdown: 0, move: still }, ["you", "ombak", "sussex-maid"]);
  race.begin();
  race.step(0.01);
  return { race, course: COURSES.lap, mode: "easy", wind: null, viewBearing: 0, best: null, roster: ROSTER, rival: "ombak", ...o };
};

/** under way on the first leg, d short of the first mark's rounding point (-125, 129), on the line east of it */
const at = (b: Boat, d: number) => {
  b.prog = { ...b.prog, started: true };
  Object.assign(b.pose, { x: -125 + d, z: 129 });
};

test("standings: every boat in order, you marked, the rival tagged, and your place", () => {
  const i = input();
  // Ombak 26 nearer the mark than you, Sussex Maid level with you
  at(i.race.player, 60), at(i.race.boats[1], 34), at(i.race.boats[2], 60);
  const v = hudView(i);
  expect(v.standings.map((s) => [s.name, s.you, s.rival])).toEqual([["Ombak", false, true], ["You", true, false], ["Sussex Maid", false, false]]);
  expect(v.standings[0].tint).toBe(0x2f8f8a);
  expect(v.place).toBe(2);
  expect(v.fleet).toBe(3);
});

test("the gap: to the boat ahead in seconds at full speed, or to the boat behind when leading", () => {
  const i = input();
  at(i.race.player, 60), at(i.race.boats[1], 34), at(i.race.boats[2], 80); // 26 ÷ 13 = 2.0 s behind Ombak
  expect(hudView(i).lead).toEqual({ s: "+2.0 s", ahead: false, name: "Ombak" });
  at(i.race.player, 18.4); // now 15.6 ahead of Ombak: 1.2 s
  expect(hudView(i).lead).toEqual({ s: "+1.2 s", ahead: true, name: "Ombak" });
});

test("no gap before the gun", () => {
  const race = createRace({ course: COURSES.lap, mode: "easy", countdown: 5, move: still }, ["you", "ombak"]);
  race.begin();
  race.boats[1].pose.x -= 20;
  expect(hudView({ ...input(), race }).lead).toBeNull();
});

test("alone (Sailing, for now): first of one, and no gap", () => {
  const race = createRace({ course: COURSES.lap, mode: "sailing", countdown: 8, move: still }, ["you"]);
  const v = hudView({ ...input(), race, mode: "sailing", rival: null });
  expect(v.place).toBe(1);
  expect(v.fleet).toBe(1);
  expect(v.lead).toBeNull();
  expect(v.standings.map((s) => s.name)).toEqual(["You"]);
});

test("the next mark, its side, and how far off the bow it lies", () => {
  const i = input();
  const me = i.race.player.pose;
  // the first mark is at (-125, 115); point her straight at it
  me.yaw = Math.atan2(-(115 - me.z), -125 - me.x);
  const v = hudView(i);
  expect(v.next).toBe(0);
  expect(v.side).toBe("starboard");
  expect(v.turn).toBeCloseTo(0, 6);
  expect(v.marks).toBe(4);
});

test("the wind arrow is turned from the way the camera looks", () => {
  const v = hudView(input({ mode: "sailing", wind: { from: 250, kn: 12, set: "standard" }, viewBearing: 270 }));
  // blowing to 070, seen looking west: 160° clockwise from screen-up
  expect(v.wind).toEqual({ to: 160, kn: 12, set: "standard" });
});

test("the gap to the best at the mark just rounded shows for three seconds", () => {
  const i = input({ best: { time: 200, splits: [40, 90, 140, 180], track: [] } });
  const me = i.race.player;
  me.prog = { ...me.prog, started: true, leg: 1, splits: [41.5] };
  (i.race as { time: () => number }).time = () => 43;
  expect(hudView(i).gap).toBe("+1.50");
  (i.race as { time: () => number }).time = () => 44.6;
  expect(hudView(i).gap).toBeNull();
});
