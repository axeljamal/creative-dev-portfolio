// The Sailing start: where to set the fleet so a boat that holds its course crosses the line just after the gun. It
// steps the real hull, so it imports hull.ts, which brings the island terrain and with it three.js. That is why it
// lives here and not in wind.ts: the page loads wind.ts at once, and this file only with the world (App imports it
// beside world.ts), so three.js still arrives only with the world. Pure: no DOM, no clock.
import { stepHull } from "../../dua-pulau/world/hull";
import type { Course } from "./types";
import { sailSpeed, windAt, type WindField } from "./wind";

const OPEN = { rocks: [], near2: () => ({ d: 1e9, px: 0, pz: 0 }) };

/** The Sailing start: the heading the fleet starts on, and how far behind the line to set it, so that a boat holding
 *  that heading from rest crosses the line about a second after the gun. yaw: the line's dir as a heading (every
 *  course's wind, and today's as windFor turns it, keeps that at least 60° off the wind, so even a 15° shift leaves it
 *  sailable). back: the way she makes in countdown + 1 s from rest on that heading (the real hull, stepped at 1/30 s
 *  in the wind along her way), within 25 to 90. */
export function startRun(c: Course, f: WindField, countdown: number): { back: number; yaw: number } {
  const mid = { x: (c.start.a.x + c.start.b.x) / 2, z: (c.start.a.z + c.start.b.z) / 2 };
  const yaw = Math.atan2(-c.start.dir.z, c.start.dir.x);
  const hx = Math.cos(yaw), hz = -Math.sin(yaw), DT = 1 / 30, steps = Math.round((countdown + 1) / DT);
  // where she sails depends on where she starts, which depends on how far she sails: twice round settles it
  let back = 25;
  for (let pass = 0; pass < 2; pass++) {
    const st = { x: mid.x - hx * back, z: mid.z - hz * back, yaw, v: 0, roll: 0 };
    let made = 0;
    for (let i = 0; i < steps; i++) {
      const x0 = st.x, z0 = st.z;
      stepHull(st, { turn: 0, thrust: 0 }, DT, OPEN, { speed: sailSpeed(st.yaw, windAt(f, st.x, st.z, -countdown + i * DT)) });
      made += (st.x - x0) * hx + (st.z - z0) * hz;
    }
    back = Math.min(90, Math.max(25, made));
  }
  return { back, yaw };
}
