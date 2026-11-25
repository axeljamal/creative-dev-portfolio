import { test, expect } from "vitest";
import { COURSES, recoverAt, target } from "./course";
import { bearingOf, wrap180, yawOf } from "./geometry";
import { COUNTDOWN, createRace, gridFor, moveFor, recover, stuck, type Boat } from "./race";
import { CLOSE, makeField, sailSpeed, twa, windAt } from "./wind";

const DEG = Math.PI / 180;

/** the world stand-in: she turns at 0.4 rad/s at full helm and goes along her heading at thrust × 13 */
const move = (b: Boat, dt: number) => {
  b.pose.yaw += b.helm.turn * 0.4 * dt;
  b.pose.v = b.helm.thrust * 13;
  b.pose.x += Math.cos(b.pose.yaw) * b.pose.v * dt;
  b.pose.z -= Math.sin(b.pose.yaw) * b.pose.v * dt;
};

test("easy: boats are held until the gun", () => {
  const r = createRace({ course: COURSES.sprint, mode: "easy", countdown: 5, move }, ["you"]); r.begin();
  const x0 = r.player.pose.x; r.player.helm = { turn: 0, thrust: 1 };
  for (let i = 0; i < 4 * 30; i++) r.step(1 / 30);
  expect(r.phase()).toBe("countdown"); expect(r.player.pose.x).toBe(x0);
});
test("the clock is the sum of steps: a long gap between frames adds only its dt", () => {
  const r = createRace({ course: COURSES.sprint, mode: "easy", countdown: 5, move }, ["you"]); r.begin();
  for (let i = 0; i < 6 * 20; i++) r.step(0.05);
  expect(r.time()).toBeCloseTo(1, 5);
});
test("a boat driven round the sprint finishes with one split and a time", () => {
  const c = COURSES.sprint;
  const r = createRace({ course: c, mode: "easy", countdown: 5, move }, ["you"]); r.begin();
  for (let i = 0; i < 120 * 30 && r.phase() !== "finished"; i++) {
    const me = r.player, to = target(c, me.prog);
    // compass bearing to the target, then how far off her heading it lies (positive: to port)
    const want = (Math.atan2(to.x - me.pose.x, -(to.z - me.pose.z)) / DEG + 360) % 360;
    const err = wrap180(bearingOf(me.pose.yaw) - want);
    me.helm = { turn: Math.max(-1, Math.min(1, err / 30)), thrust: 1 };
    r.step(1 / 30);
  }
  expect(r.phase()).toBe("finished");
  expect(r.player.prog.splits.length).toBe(1);
  expect(r.player.prog.finishedAt).toBeGreaterThan(15);
});
test("gridFor puts every boat behind the line, facing it", () => {
  for (const p of gridFor(COURSES.lap, 4)) { expect((p.x - COURSES.lap.start.a.x) * COURSES.lap.start.dir.x).toBeLessThan(0); expect(bearingOf(p.yaw)).toBeCloseTo(270); }
});
test("gridFor sets boats 14 apart along the line, 25 behind it, at rest", () => {
  const g = gridFor(COURSES.lap, 3);
  expect(Math.hypot(g[1].x - g[0].x, g[1].z - g[0].z)).toBeCloseTo(14);
  for (const p of g) { expect(p.x).toBeCloseTo(-30 + 25); expect(p.v).toBe(0); }
});
test("the race starts on the card and the countdown begins only when asked", () => {
  const r = createRace({ course: COURSES.lap, mode: "easy", countdown: 5, move }, ["you", "b"]);
  expect(r.phase()).toBe("card"); r.step(1); expect(r.phase()).toBe("card");
  r.begin(); expect(r.phase()).toBe("countdown"); expect(r.time()).toBeCloseTo(-5);
  for (let i = 0; i < 5 * 20 + 1; i++) r.step(0.05);
  expect(r.phase()).toBe("racing");
  expect(r.boats.length).toBe(2); expect(r.player).toBe(r.boats[0]);
});
test("sailing: boats may move during the countdown", () => {
  const r = createRace({ course: COURSES.lap, mode: "sailing", countdown: 20, move }, ["you"]); r.begin();
  const x0 = r.player.pose.x; r.player.helm = { turn: 0, thrust: 0.2 };
  r.step(0.5);
  expect(r.phase()).toBe("countdown"); expect(r.player.pose.x).not.toBe(x0);
});
test("order puts the boat with less of the course left first", () => {
  const r = createRace({ course: COURSES.lap, mode: "easy", countdown: 5, move }, ["you", "b"]);
  r.boats[1].pose.x -= 10; // nearer the line
  expect(r.order()).toEqual([1, 0]);
});
test("moveFor: Easy passes no speed; Sailing passes the wind's speed for her heading, place and time", () => {
  const got: (number | undefined)[] = [];
  const rec = (_b: Boat, _dt: number, speed?: number) => void got.push(speed);
  const f = makeField({ from: 270, kmh: 22 }, 23, false);
  const b = createRace({ course: COURSES.lap, mode: "sailing", countdown: 20, move }, ["you"]).player;
  b.pose.yaw = yawOf(0);
  moveFor("easy", f, rec)(b, 0.1, 5);
  moveFor("sailing", f, rec)(b, 0.1, 5);
  expect(got[0]).toBeUndefined();
  expect(got[1]).toBe(sailSpeed(b.pose.yaw, windAt(f, b.pose.x, b.pose.z, 5)));
});
test("moveFor with a pace: under sail each boat gets the wind's speed times her own pace; Easy still passes none", () => {
  const got: (number | undefined)[] = [];
  const rec = (_b: Boat, _dt: number, speed?: number) => void got.push(speed);
  const f = makeField({ from: 270, kmh: 22 }, 23, false);
  const [you, her] = createRace({ course: COURSES.lap, mode: "sailing", countdown: 20, move }, ["you", "ombak"]).boats;
  you.pose.yaw = her.pose.yaw = yawOf(0);
  const pace = (b: Boat) => (b.id === "ombak" ? 0.86 : 1);
  moveFor("sailing", f, rec, pace)(you, 0.1, 5);
  moveFor("sailing", f, rec, pace)(her, 0.1, 5);
  moveFor("easy", f, rec, pace)(her, 0.1, 5);
  expect(got[0]).toBe(sailSpeed(you.pose.yaw, windAt(f, you.pose.x, you.pose.z, 5)));
  expect(got[1]).toBeCloseTo(0.86 * sailSpeed(her.pose.yaw, windAt(f, her.pose.x, her.pose.z, 5)), 12);
  expect(got[2]).toBeUndefined();
});
test("sailing: with the wind's move, she cannot sail straight into it", () => {
  // the world stand-in eased to the given speed, as stepHull does: head to wind she never gets going
  const f = makeField({ from: 270, kmh: 22 }, 23, false);
  const eased = (b: Boat, dt: number, speed?: number) => { b.pose.v += ((speed ?? 0) - b.pose.v) * dt * 0.55; b.pose.x += Math.cos(b.pose.yaw) * b.pose.v * dt; b.pose.z -= Math.sin(b.pose.yaw) * b.pose.v * dt; };
  const r = createRace({ course: COURSES.lap, mode: "sailing", countdown: 20, move: moveFor("sailing", f, eased) }, ["you"]); r.begin();
  r.player.pose.yaw = yawOf(270);
  for (let i = 0; i < 10 * 30; i++) r.step(1 / 30);
  expect(r.player.pose.v).toBeLessThan(13 * 0.12 * 1.3);
});
test("gridFor with back and yaw: the middle boat, sailing straight on, meets the middle of the line after back", () => {
  const c = COURSES.sprint, yaw = yawOf(307), [p] = gridFor(c, 1, 58, yaw);
  expect(p.yaw).toBe(yaw); expect(p.v).toBe(0);
  expect(p.x + Math.cos(yaw) * 58).toBeCloseTo(150); expect(p.z - Math.sin(yaw) * 58).toBeCloseTo(117);
  const g = gridFor(c, 2, 58, yaw);
  expect(Math.hypot(g[1].x - g[0].x, g[1].z - g[0].z)).toBeCloseTo(14);
});
test("COUNTDOWN: 5 in Easy, 8 under sail", () => { expect(COUNTDOWN).toEqual({ easy: 5, sailing: 8 }); });

// ---------- back on course ----------
const at = (c: typeof COURSES.lap) => ({ x: (c.start.a.x + c.start.b.x) / 2, z: (c.start.a.z + c.start.b.z) / 2 });

test("recover before any mark puts her behind the start line, stopped, facing it", () => {
  for (const c of Object.values(COURSES)) {
    const r = createRace({ course: c, mode: "easy", countdown: 5, move }, ["you"]), b = r.player, m = at(c);
    b.pose = { x: 999, z: -999, yaw: 2, v: 9, roll: 0.3 };
    recover(b, c, null);
    expect((b.pose.x - m.x) * c.start.dir.x + (b.pose.z - m.z) * c.start.dir.z, c.id).toBeLessThan(0);
    expect(b.pose.v).toBe(0); expect(b.pose.roll).toBe(0);
    expect(bearingOf(b.pose.yaw)).toBeCloseTo(bearingOf(Math.atan2(-c.start.dir.z, c.start.dir.x)));
  }
});
test("recover after a mark puts her at its rounding point, stopped, pointing at the next", () => {
  const c = COURSES.lap, r = createRace({ course: c, mode: "easy", countdown: 5, move }, ["you"]), b = r.player;
  b.prog = { ...b.prog, started: true, armed: true, leg: 2, splits: [10, 20] };
  b.pose.v = 6;
  recover(b, c, null);
  const m = c.marks[1];
  expect(b.pose.x).toBeCloseTo(m.x + m.out.x * 14); expect(b.pose.z).toBeCloseTo(m.z + m.out.z * 14);
  expect(b.pose.v).toBe(0);
  const to = target(c, b.prog);
  expect(wrap180(bearingOf(b.pose.yaw) - bearingOf(Math.atan2(-(to.z - b.pose.z), to.x - b.pose.x)))).toBeCloseTo(0);
});
test("recover in Sailing with the target dead upwind points her CLOSE off the wind", () => {
  const c = COURSES.lap, r = createRace({ course: c, mode: "sailing", countdown: 8, move }, ["you"]), b = r.player;
  b.prog = { ...b.prog, started: true, armed: true, leg: 2, splits: [10, 20] };
  // the wind straight from her next mark, as seen from where she is put back
  const from = recoverAt(c, b.prog), to = target(c, b.prog);
  const up = bearingOf(Math.atan2(-(to.z - from.z), to.x - from.x));
  recover(b, c, { from: up, factor: 1 });
  expect(twa(b.pose.yaw, up)).toBeCloseTo(CLOSE);
  // and a target she can lay is steered for straight
  recover(b, c, { from: (up + 180) % 360, factor: 1 });
  expect(wrap180(bearingOf(b.pose.yaw) - up)).toBeCloseTo(0);
});
test("recover in Sailing takes the nearer side of the wind", () => {
  const c = COURSES.lap, r = createRace({ course: c, mode: "sailing", countdown: 8, move }, ["you"]), b = r.player;
  b.prog = { ...b.prog, started: true, armed: true, leg: 2, splits: [10, 20] };
  const from = recoverAt(c, b.prog), to = target(c, b.prog), up = bearingOf(Math.atan2(-(to.z - from.z), to.x - from.x));
  // the wind 20° clockwise of the target: the target lies anticlockwise of the wind, so she goes CLOSE anticlockwise of it
  recover(b, c, { from: (up + 20) % 360, factor: 1 });
  expect(wrap180(bearingOf(b.pose.yaw) - (up + 20))).toBeCloseTo(-CLOSE);
  recover(b, c, { from: (up + 340) % 360, factor: 1 });
  expect(wrap180(bearingOf(b.pose.yaw) - (up + 340))).toBeCloseTo(CLOSE);
});
test("stuck: 6 s of almost no way after the gun, and not before it", () => {
  const slow = (mode: "easy" | "sailing", thrust: number, secs: number, r = createRace({ course: COURSES.lap, mode, countdown: 5, move }, ["you"])) => {
    r.begin();
    r.player.helm = { turn: 0, thrust };
    for (let i = 0; i < secs * 30; i++) r.step(1 / 30);
    return r;
  };
  // 0.3 units/s: the countdown (5 s) and 5.9 s after the gun is not enough; 6 s after the gun is
  expect(stuck(slow("easy", 0.3 / 13, 5 + 5.9))).toBe(false);
  expect(stuck(slow("easy", 0.3 / 13, 5 + 6.1))).toBe(true);
  // under sail she may lie still all the countdown; that does not count
  const s = slow("sailing", 0, 5 - 0.1);
  expect(s.phase()).toBe("countdown"); expect(stuck(s)).toBe(false);
  expect(stuck(slow("sailing", 0, 5 + 3))).toBe(false);
  // way above 1 unit/s inside the 6 s starts it again
  const r = slow("easy", 0.3 / 13, 5 + 4);
  r.player.helm = { turn: 0, thrust: 2 / 13 };
  r.step(1 / 30);
  r.player.helm = { turn: 0, thrust: 0.3 / 13 };
  for (let i = 0; i < 4 * 30; i++) r.step(1 / 30);
  expect(stuck(r)).toBe(false);
  for (let i = 0; i < 2.1 * 30; i++) r.step(1 / 30);
  expect(stuck(r)).toBe(true);
  // and once put back on course she has six more seconds before it is offered again
  r.unstick();
  expect(stuck(r)).toBe(false);
});
