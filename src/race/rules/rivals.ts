// The three computer-sailed rivals: who they are, and how each one steers round a course, in Easy and under sail. They
// sail under the same rules as the player: the same hull, a throttle no higher than full (under sail, no more speed
// than the wind gives the player on that heading), and the autopilot's own way round the islands and off the pier.
// What sets them apart is how hard they push (pace), how wide they swing round a mark (wide) and, under sail, how
// often they tack. Pure: no scene, no DOM. It brings the island terrain (and with it three.js) through the pilot, so
// the page loads it beside the world, not at once.
import { pilot, type PilotMem } from "../../dua-pulau/world/pilot";
import type { Isles } from "../../dua-pulau/world/isles";
import { heightAt } from "../../dua-pulau/world/terrain";
import { HULL_AT, HULL_R } from "./bump";
import { RAY, RAY_GAP, recoverAt, target } from "./course";
import { bearingOf, wrap180, yawOf } from "./geometry";
import type { Boat } from "./race";
import type { Course, Helm, Mark, Vec } from "./types";
import { CLOSE } from "./wind";

/** A rival. design: the pinisi she sails (race/boats.ts): the first one built, the cruising gaff-rigged one, or today's.
 *  stand: under sail, how close to land (or the pier, a groyne, the buoy) she stands on before she tacks away from it;
 *  the better sailor the closer. LOOK when not given. */
export type Rival = { id: string; name: string; tint: number; pace: number; wide: number; design: "original" | "cruising" | "current"; stand?: number };
// names and colours are proposals, drawn from Indonesian and Sussex seafaring: ombak, a wave; bintang laut, a starfish
export const RIVALS: Rival[] = [
  { id: "ombak", name: "Ombak", tint: 0x2f8f8a, pace: 0.86, wide: 26, design: "original", stand: 75 }, // the one a newcomer can beat
  { id: "sussex-maid", name: "Sussex Maid", tint: 0xc8553d, pace: 0.93, wide: 18, design: "cruising", stand: 60 },
  { id: "bintang-laut", name: "Bintang Laut", tint: 0x3a4f8f, pace: 0.98, wide: 13, design: "current", stand: 60 },
];
/** the rivals in their places on the grid, after the player's (the first): the best beside her, the easiest furthest
 *  off. In Easy and under sail alike; App.tsx and every fleet test race them in this order. */
export const GRID_FLEET: Rival[] = [...RIVALS].reverse();

/** the pilot's memory, and (under sail) which tack she is on (1: the wind on her port bow, −1: on her starboard) and
 *  when she last went about, race time */
export type RivalMem = PilotMem & { tack: 1 | -1; tackedAt: number };
export const newRivalMem = (): RivalMem => ({ isle: null, side: 0, tack: 1, tackedAt: -Infinity });

/** within this of a rounding point she eases to EASE × pace, to turn round it tighter */
const NEAR = 25, EASE = 0.6;
/** within this of her rounding point she stops steering round other boats */
const CROWD = 50;
/** past this off her bow (radians), the point she makes for is abaft the beam, and she eases to turn for it */
const ABAFT = Math.PI / 2;
/** how far back from the rounding point she lines up to round a mark (and behind a line to cross it), and how far
 *  ahead along the line through it she looks as she runs down it */
const GATE = 30, LEAD = 25;
/** how far inside a line's ends she aims to cross it */
const END = 6;

const dot = (u: Vec, v: Vec) => u.x * v.x + u.z * v.z;

/** the way she must be going as she crosses a mark's rounding ray for the rounding to count: across out, turning
 *  round the mark on the side it is left to (port: anticlockwise seen from above, as course.ts judges it) */
const across = (m: Mark): Vec => (m.side === "port" ? { x: m.out.z, z: -m.out.x } : { x: -m.out.z, z: m.out.x });

/** where to steer for now: across the start line, round the next mark, or over the finish */
function aimFor(r: Rival, b: Boat, c: Course, from?: number): { to: Vec; near: number } {
  const p = b.prog, at = { x: b.pose.x, z: b.pose.z };
  // the start and the finish: from behind the line and between its ends, straight across it from where she is; from
  // anywhere else, first to a point GATE behind its middle. Making for the middle itself, she may cross outside an end
  // and then circle the point she is making for, never reaching it.
  if (!p.started || p.leg >= c.marks.length) {
    const { a, b: e, dir } = p.started ? c.finish : c.start, len = Math.hypot(e.x - a.x, e.z - a.z), ux = (e.x - a.x) / len, uz = (e.z - a.z) / len;
    const along = (at.x - a.x) * ux + (at.z - a.z) * uz, back = -((at.x - a.x) * dir.x + (at.z - a.z) * dir.z), behind = back > 0;
    // under sail (from: the wind's bearing) straight across may be into the wind: from behind the line she makes
    // instead for the nearest point GATE beyond it that she can lay, and whose way to it crosses the line END inside
    // its ends
    if (from !== undefined && behind) {
      // on the tack she is on: the nearest point on the other side of the wind would have her tack at the line
      const hs = Math.sign(wrap180(bearingOf(b.pose.yaw) - from)) || 1;
      let best: Vec | null = null, bestD = Infinity;
      for (let u = END; u <= len - END; u += 2) {
        const q = { x: a.x + ux * u + dir.x * GATE, z: a.z + uz * u + dir.z * GATE }, dx = q.x - at.x, dz = q.z - at.z;
        const cross = along + (u - along) * (back / (back + GATE)), dd = Math.hypot(dx, dz);
        if (cross < END || cross > len - END || dd >= bestD) continue;
        const o = wrap180(bearingOf(Math.atan2(-dz, dx)) - from);
        if (Math.abs(o) < CLOSE + 3 || Math.sign(o) !== hs) continue;
        (best = q), (bestD = dd);
      }
      if (best) return { to: best, near: Infinity };
    }
    if (behind && along > 0 && along < len) {
      // straight across, but kept END inside the ends: the fleet of four starts with its outer boats 4 from them
      const at = Math.min(len - END, Math.max(END, along));
      return { to: { x: a.x + ux * at + dir.x * GATE, z: a.z + uz * at + dir.z * GATE }, near: Infinity };
    }
    return { to: { x: a.x + ux * (len / 2) - dir.x * GATE, z: a.z + uz * (len / 2) - dir.z * GATE }, near: Infinity };
  }
  // round the mark along a line: the line through her rounding point running the way she must cross the ray. Once she
  // is on the side she must come from, and out from the mark at least most of the way to her rounding point, she makes
  // for a point LEAD further along that line than she is, so she closes the line and runs down it across the ray. From
  // anywhere else (short of it, beyond the ray, or round the wrong side) she first makes for a point GATE back up the
  // line. Making straight for the rounding point instead, a schooner that cannot turn inside 20 m circles it, and may
  // cross the ray the wrong way or not at all; making for a fixed point beyond it, she can be caught turning to and fro.
  const m = c.marks[p.leg], d = across(m), R = { x: m.x + m.out.x * r.wide, z: m.z + m.out.z * r.wide };
  const rel = { x: at.x - m.x, z: at.z - m.z }, out = dot(rel, m.out), side = dot(rel, d);
  // under sail she cannot ease to turn tighter, so she turns onto that line sooner: no more than SAIL_OUT out
  // A point LEAD on from her moves with her, though, and beating she would lay it long before she could lay the mark:
  // under sail, while she is further than LEAD short of her rounding point, she makes for the rounding point itself
  const on = side < 0 && out >= (from === undefined ? r.wide * 0.6 : Math.min(r.wide * 0.6, SAIL_OUT));
  // (under sail SAIL_GATE back: GATE back up the line may be a beat, or among the strait's buoy and the pier)
  const k = on ? (from === undefined ? side + LEAD : Math.max(0, side + LEAD)) : from === undefined ? -GATE : -SAIL_GATE;
  const to = { x: R.x + d.x * k, z: R.z + d.z * k };
  return { to, near: Math.hypot(at.x - R.x, at.z - R.z) };
}

const isBoat = (k: object) => (k as { boat?: boolean }).boat === true;
/** close to her rounding point she holds her line round the mark and lets the hulls knock: steering round the others
 *  there sends the whole fleet milling about the buoy */
const seaFor = (isles: Pick<Isles, "rocks" | "near2">, near: number) => (near < CROWD ? { rocks: isles.rocks.filter((k) => !isBoat(k)), near2: isles.near2 } : isles);

/** another boat in her track: a disc of hers WAKE_L ahead at most, and within WAKE_W of her heading's line */
const WAKE_L = 40, WAKE_W = 12;
function boatAhead(b: Boat, isles: Pick<Isles, "rocks" | "near2">): boolean {
  const hx = Math.cos(b.pose.yaw), hz = -Math.sin(b.pose.yaw);
  return isles.rocks.some((k) => {
    if (!isBoat(k)) return false;
    const dx = k.ax - b.pose.x, dz = k.az - b.pose.z, ahead = dx * hx + dz * hz;
    return ahead > HULL_AT[0] && ahead < WAKE_L && Math.abs(dx * hz - dz * hx) < WAKE_W;
  });
}

const noBoats = (isles: Pick<Isles, "rocks" | "near2">) => ({ rocks: isles.rocks.filter((k) => !isBoat(k)), near2: isles.near2 });
/** under sail she steers round another boat only when it is within ABOARD of her, and only as far as her course for
 *  the next ABOARD: the pilot looks 70 ahead, and a boat ahead sailing the same way stays in that, so going round it
 *  the pilot's way would carry her far off her course (she cannot ease to let it by). yaw: her course clear of the
 *  land and the pier; sea: what she must keep clear of, boats and all. */
const ABOARD = 15;
function clearOfBoats(b: Boat, yaw: number, sea: Pick<Isles, "rocks" | "near2">): number {
  const boats = sea.rocks.filter((k) => isBoat(k) && Math.hypot(k.ax - b.pose.x, k.az - b.pose.z) < ABOARD);
  if (!boats.length) return yaw;
  const to = { x: b.pose.x + Math.cos(yaw) * ABOARD, z: b.pose.z - Math.sin(yaw) * ABOARD };
  return pilotYaw(b, to, { rocks: boats, near2: sea.near2 }, { isle: null, side: 0 } as RivalMem);
}

/** Easy: where to steer and how hard to push. thrust is r.pace, eased to 0.6 × pace within 25 of a rounding point
 *  (and while the point she is making for lies abaft her beam). */
export function easyHelm(r: Rival, b: Boat, c: Course, isles: Pick<Isles, "rocks" | "near2">, mem: RivalMem): Helm {
  if (b.prog.finishedAt !== null) return { turn: 0, thrust: 0 }; // over the line: let her run on and stop
  const { to, near } = aimFor(r, b, c);
  // the autopilot's steering (round the islands, off the pier), but not its throttle or its sharp swing: she holds her
  // pace as the player holds the throttle, and turns only as the player's helm can
  const { turn } = pilot(b.pose, to, seaFor(isles, near), mem);
  // and she eases too when the point she makes for is abaft her beam: at full speed a schooner turns in a circle some
  // 30 across, and a point inside it she would circle for ever
  const off = Math.abs(Math.atan2(Math.sin(Math.atan2(-(to.z - b.pose.z), to.x - b.pose.x) - b.pose.yaw), Math.cos(Math.atan2(-(to.z - b.pose.z), to.x - b.pose.x) - b.pose.yaw)));
  return { turn, thrust: near < NEAR || off > ABAFT ? r.pace * EASE : r.pace };
}

/** degrees off the wind a rival sails when she cannot lay her target (wind.ts's close-hauled) */
export { CLOSE };
/** seconds between tacks */
export const MIN_TACK = 8;
/** she looks LOOK ahead along her heading for land, every PROBE; deeper than SHOAL is clear water (as the pilot judges
 *  an island in the way) */
const LOOK = 60, PROBE = 10, SHOAL = -3.6;
/** how far she looks on each tack to judge which is the clearer */
const FAR = 150;
/** she tacks back towards the straight line from her last mark to her next once she is more than LANE off it */
const LANE = 90;
/** so the three do not sail one track: each rival below the best (by her place in RIVALS, Ombak first) turns back
 *  LANE_STEP sooner, and stands on past her layline OVER_STEP degrees further before she tacks for the mark. The
 *  better a sailor, the fewer tacks she makes and the less she overstands. */
const LANE_STEP = 25, OVER_STEP = 3;
/** settled on her tack: her bow on mem.tack's side, no more than SETTLE above close-hauled. She goes about only from
 *  within REACH below close-hauled: well off the wind she is reaching, and heads up before she would tack. */
const SETTLE = 5, REACH = 20;
/** she goes about by choice only with this much way on (units/s): tacked slower she hangs head to wind. Still head to
 *  wind with less than IRONS way on, STUCK seconds after her last tack, she gives the tack up and falls off the way her
 *  bow already lies. */
const WAY = 6, IRONS = 2, STUCK = 6;
/** with land ahead on both tacks she bears away at most BEAR degrees below close-hauled to clear it, then tacks: bearing
 *  away further, along a coast, can carry her round an island downwind of her course */
export const BEAR = 30;
/** degrees further off the wind than CLOSE she sails while she has too little way to tack, to build it */
const FOOT = 10;
/** within PINCH_IN of a mark she would just miss on this tack, she points higher than CLOSE to make it rather than tack:
 *  PINCH_STEP degrees for each place above the worst (Bintang Laut 6, Sussex Maid 3, Ombak none) */
const PINCH_IN = 60, PINCH_STEP = 3;
/** under sail, how far out from a mark (at most) she turns onto the line she rounds it along */
const SAIL_OUT = 4, SAIL_GATE = 20;

const side = (deg: number): 1 | -1 => (deg >= 0 ? 1 : -1);
const wrapRad = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** the helm that brings her round to heading yaw, with the pilot's own gain */
const steerFor = (b: Boat, yaw: number) => Math.max(-1, Math.min(1, wrapRad(yaw - b.pose.yaw) * 2.2));

/** how far she can sail on heading yaw before land, or anything standing in the water (the pier, the buoy, a groyne;
 *  not another boat), probing every PROBE; FAR if none that far */
function clearAhead(b: Boat, yaw: number, isles: Pick<Isles, "rocks" | "near2">): number {
  const hx = Math.cos(yaw), hz = -Math.sin(yaw);
  for (let s = PROBE; s <= FAR; s += PROBE) {
    const x = b.pose.x + hx * s, z = b.pose.z + hz * s;
    if (heightAt(x, z) > SHOAL || isles.rocks.some((k) => !isBoat(k) && isles.near2(k, x, z).d < k.r + HULL_R + 1)) return s;
  }
  return FAR;
}

/** the heading the pilot steers her on for the point to (round the island in the way, off the pier). It does not
 *  depend on her own heading, only on where she is, so it is read back from the pilot's turn: unclamped, that is
 *  2.2 × (the pilot's heading − hers); clamped, she is turned 0.45 rad towards it and asked again. */
function pilotYaw(b: Boat, to: Vec, sea: Pick<Isles, "rocks" | "near2">, mem: RivalMem): number {
  let y = Math.atan2(-(to.z - b.pose.z), to.x - b.pose.x);
  for (let i = 0; i < 10; i++) {
    const { turn } = pilot({ ...b.pose, yaw: y }, to, sea, mem);
    y += turn / 2.2;
    if (Math.abs(turn) < 1) break;
  }
  return y;
}

/** does she, sailing on from where she is on heading yaw, cross the line the way it is crossed, end (END unless
 *  given) inside its ends? */
function laysLine(b: Boat, l: Course["start"], yaw: number, end = END): boolean {
  const hx = Math.cos(yaw), hz = -Math.sin(yaw), toward = hx * l.dir.x + hz * l.dir.z;
  if (toward <= 0) return false;
  const back = -((b.pose.x - l.a.x) * l.dir.x + (b.pose.z - l.a.z) * l.dir.z);
  if (back <= 0) return false;
  const k = back / toward, x = b.pose.x + hx * k, z = b.pose.z + hz * k;
  const len = Math.hypot(l.b.x - l.a.x, l.b.z - l.a.z), along = ((x - l.a.x) * (l.b.x - l.a.x) + (z - l.a.z) * (l.b.z - l.a.z)) / len;
  return along >= end && along <= len - end;
}

/** does she, sailing on from where she is on heading yaw, cross mark m's rounding ray the way it is rounded, at least
 *  RAY_GAP + 2 out from the mark (and within RAY)? */
function laysRay(b: Boat, m: Mark, yaw: number): boolean {
  const hx = Math.cos(yaw), hz = -Math.sin(yaw), d = across(m), toward = hx * d.x + hz * d.z;
  if (toward <= 0) return false;
  const side = (b.pose.x - m.x) * d.x + (b.pose.z - m.z) * d.z;
  if (side >= 0) return false;
  const k = -side / toward, out = (b.pose.x + hx * k - m.x) * m.out.x + (b.pose.z + hz * k - m.z) * m.out.z;
  return out >= RAY_GAP + 2 && out <= RAY;
}

/** how far she is off the straight line from her last rounding point (or the start line's middle) to the next point she
 *  must make, and whether her heading takes her further off it */
function offLane(b: Boat, c: Course): { d: number; away: boolean } {
  const a = b.prog.leg > 0 ? recoverAt(c, b.prog) : { x: (c.start.a.x + c.start.b.x) / 2, z: (c.start.a.z + c.start.b.z) / 2 };
  const e = target(c, b.prog), len = Math.hypot(e.x - a.x, e.z - a.z) || 1, nx = -(e.z - a.z) / len, nz = (e.x - a.x) / len;
  const s = (b.pose.x - a.x) * nx + (b.pose.z - a.z) * nz, h = Math.cos(b.pose.yaw) * nx - Math.sin(b.pose.yaw) * nz;
  return { d: Math.abs(s), away: s * h > 0 };
}

/** Sailing: the heading to hold. Lays the target when it can; otherwise sails CLOSE off the wind on mem.tack and tacks
 *  when the target bears more than CLOSE on the other side, when land lies within her stand ahead, or when more than
 *  90 off the straight line from the last mark (90, 65 and 40 for Bintang Laut, Sussex Maid and Ombak). Her speed is
 *  the wind's (sailSpeed × pace, in the race's move): she only steers. w: the wind where she is now (shifts and gusts
 *  and all); t: race time.
 *
 *  Every tack waits MIN_TACK after the last, land or no land: within MIN_TACK of a tack, with land inside her stand
 *  ahead, she bears away (at most BEAR below close-hauled) and stands on rather than tack again. (The controller's
 *  ruling: this stricter reading replaces the brief's "unless land is ahead".) A tack by choice also needs WAY on.
 *
 *  The rules are tried in this order, and the first that decides the heading wins:
 *  1. finished: let go;
 *  2. tack bookkeeping: a gybe round a mark changes her tack; in irons she falls off the way her bow lies;
 *  3. at the gun, holding the course startRun set while it carries her over the start line between its ends;
 *  4. she can lay the target: steer for it (the pilot's way, round islands and boats close aboard), going about for
 *     it once it bears far enough past her layline;
 *  5. beating to a line: tack on the line's layline;
 *  6. beating to a mark from the side she rounds it from: pinch up to make it within PINCH_IN, else tack on its layline;
 *  7. otherwise, tack back into her lane, or off a boat close ahead in her track if the other tack is clear;
 *  8. land inside her stand ahead: tack if free and the other tack is clearer, else bear away up to BEAR, else (inside
 *     MIN_TACK) hold BEAR below close-hauled, else tack;
 *  9. too little way: foot FOOT below close-hauled;
 *  10. close-hauled on her tack. */
export function sailHelm(r: Rival, b: Boat, c: Course, w: { from: number; factor: number }, isles: Pick<Isles, "rocks" | "near2">, mem: RivalMem, t: number): Helm {
  if (b.prog.finishedAt !== null) return { turn: 0, thrust: 0 };
  // how many places below the best she is: 2 for Ombak, 0 for Bintang Laut and for anyone not in the roster
  const at = RIVALS.findIndex((q) => q.id === r.id), k = at < 0 ? 0 : RIVALS.length - 1 - at;
  const { to } = aimFor(r, b, c, w.from);
  // where her bow and the point lie from the wind, in degrees: + clockwise of it, − anticlockwise. Only if she could lay
  // the point straight does she ask the way she would steer in Easy (round the island in the way, off the pier): with
  // the point upwind she beats, and the land ahead turns her; the pilot's way round an island then may lead her the
  // long way round it, downwind and back
  const head = wrap180(bearingOf(b.pose.yaw) - w.from), direct = wrap180(bearingOf(Math.atan2(-(to.z - b.pose.z), to.x - b.pose.x)) - w.from);
  const py = Math.abs(direct) >= CLOSE ? clearOfBoats(b, pilotYaw(b, to, noBoats(isles), mem), isles) : 0;
  const off = Math.abs(direct) >= CLOSE ? wrap180(bearingOf(py) - w.from) : direct;
  const since = t - mem.tackedAt, stand = r.stand ?? LOOK;
  // she may come out on the other side of the wind without a tack, bearing away round a mark (a gybe): her tack is then
  // the side she is on. Not while a tack of her own is under way.
  if (Math.abs(head) >= CLOSE - SETTLE && side(head) !== mem.tack && since >= MIN_TACK) mem.tack = side(head);
  // in irons (head to wind with no way on, a tack that failed or a knock) she falls off the way her bow already lies,
  // rather than wait to be blown round through the wind
  if (Math.abs(head) < CLOSE - SETTLE && Math.abs(b.pose.v) < IRONS && since > STUCK) mem.tack = side(head);
  const settled = side(head) === mem.tack && Math.abs(head) >= CLOSE - SETTLE;
  // free to go about by choice: settled close-hauled (not reaching), with way on
  const way = settled && Math.abs(head) <= CLOSE + REACH && b.pose.v >= WAY;
  const goAbout = () => {
    mem.tack = mem.tack === 1 ? -1 : 1;
    mem.tackedAt = t;
    return true;
  };
  const close = () => yawOf(w.from + mem.tack * CLOSE);
  // the start or the finish line, when it is what she makes for
  const line = !b.prog.started ? c.start : b.prog.leg >= c.marks.length ? c.finish : null, mark = line ? null : c.marks[b.prog.leg];
  // at the gun she holds the course startRun set her while it carries her over the line between its ends: the wind
  // has shifted since the grid was laid out, and heading up to close-hauled may carry her past an end
  if (line === c.start && Math.abs(head) >= CLOSE - SETTLE && laysLine(b, line, b.pose.yaw, 1)) return { turn: 0, thrust: 0 };
  if (Math.abs(off) >= CLOSE) {
    // she can lay it. Does turning for it take her through the wind (a tack), or only away from it?
    const through = side(off) !== side(head) && Math.abs(head - off) < 180;
    // as in Easy: the pilot's way, and her approach to the mark. Not back onto the side she has just tacked from,
    // though: right on her layline the point flickers either side of it, and she would go about and straight back
    if (side(off) === mem.tack || (!through && since >= MIN_TACK)) return { turn: steerFor(b, py), thrust: 0 };
    // it lies across the wind on the other tack: she goes about for it once it bears far enough past her layline
    if (Math.abs(off) >= CLOSE + OVER_STEP * k && since >= MIN_TACK && way && goAbout()) return { turn: steerFor(b, py), thrust: 0 };
  } else if (line) {
    // beating up to the start or the finish line: she holds her tack while it would carry her over between the ends,
    // and goes about once the other tack would (a line's layline); the point across it moves with her, so it never
    // falls past her layline on its own
    if (!laysLine(b, line, close()) && laysLine(b, line, yawOf(w.from - mem.tack * CLOSE)) && since >= MIN_TACK && way) goAbout();
  } else if (mark && laysRay(b, mark, yawOf(w.from - mem.tack * CLOSE)) && !laysRay(b, mark, close())) {
    // beating up to a mark from the side she must round it from: the point she makes for moves along her rounding line
    // with her, so here too it never falls past her layline. She goes about once this tack would carry her across the
    // ray too close in to the mark (or not at all) and the other would carry her across it; though within PINCH_IN of
    // the mark, if pointing up as far as she dares makes it, she points up rather than tack twice more
    const pinch = yawOf(w.from + mem.tack * (CLOSE - PINCH_STEP * (RIVALS.length - 1 - k)));
    if (Math.hypot(b.pose.x - mark.x, b.pose.z - mark.z) < PINCH_IN && laysRay(b, mark, pinch)) return { turn: steerFor(b, pinch), thrust: 0 };
    if (since >= MIN_TACK && way) goAbout();
  } else if (since >= MIN_TACK && way && b.prog.started) {
    // she cannot lay it: back towards the line between the marks once she is too far off it; or off a boat close
    // ahead in her own track, rather than follow her up the beat and into her tack
    const l = offLane(b, c);
    if ((l.away && l.d > LANE - LANE_STEP * k) || (boatAhead(b, isles) && clearAhead(b, yawOf(w.from - mem.tack * CLOSE), isles) >= stand)) goAbout();
  }
  // close-hauled on her tack (footing a little while she has too little way to tack), unless land is ahead: then she
  // goes about if the other tack is clearer (and she has the way to); if it is not (a coast that curves across both),
  // she bears away on this one until her way is clear, rather than tack into it
  if (settled) {
    const now = clearAhead(b, b.pose.yaw, isles);
    if (now < stand) {
      // (bearing away from it, she is reaching, with way enough to come up and tack: she must not bear away for ever)
      const free = way || (b.pose.v >= WAY && Math.abs(head) > CLOSE + REACH);
      if (free && since >= MIN_TACK && clearAhead(b, yawOf(w.from - mem.tack * CLOSE), isles) > now) goAbout();
      else {
        for (let a = CLOSE + 10; a <= CLOSE + BEAR; a += 10) if (clearAhead(b, yawOf(w.from + mem.tack * a), isles) >= stand) return { turn: steerFor(b, yawOf(w.from + mem.tack * a)), thrust: 0 };
        // no clear water within BEAR of close-hauled: she tacks, though not straight back from a tack she has just made
        if (since < MIN_TACK) return { turn: steerFor(b, yawOf(w.from + mem.tack * (CLOSE + BEAR))), thrust: 0 };
        goAbout();
      }
      return { turn: steerFor(b, close()), thrust: 0 };
    }
    if (b.pose.v < WAY) return { turn: steerFor(b, yawOf(w.from + mem.tack * (CLOSE + FOOT))), thrust: 0 };
  }
  return { turn: steerFor(b, close()), thrust: 0 };
}

/** what her pilot must keep clear of: the water's own obstacles and every other boat still racing, each hull as the
 *  three discs bumping uses (a boat that has finished is out of the race, and out of the way). The pilot steers round a disc as round the strait's buoy, so she goes by another boat
 *  rather than through it. */
export function withFleet(isles: Pick<Isles, "rocks" | "near2">, boats: Boat[], self: Boat): Pick<Isles, "rocks" | "near2"> {
  const hulls = boats
    .filter((b) => b !== self && b.prog.finishedAt === null)
    .flatMap((b) => HULL_AT.map((o) => {
      const x = b.pose.x + Math.cos(b.pose.yaw) * o, z = b.pose.z - Math.sin(b.pose.yaw) * o;
      return { ax: x, az: z, bx: x, bz: z, r: HULL_R, boat: true };
    }));
  return { rocks: [...isles.rocks, ...hulls], near2: isles.near2 };
}

/** the easiest rival not yet beaten on this course and slot, else the hardest */
export function rivalFor(beaten: string[]): Rival {
  return RIVALS.find((r) => !beaten.includes(r.id)) ?? RIVALS[RIVALS.length - 1];
}
