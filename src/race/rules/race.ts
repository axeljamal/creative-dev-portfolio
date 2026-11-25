// The race as a state machine, with no rendering: the card, the countdown, the race and the finish. The world is
// injected as cfg.move, so the same rules run in the browser and in the tests.
import { bump } from "./bump";
import { advance, newProgress, recoverAt, remaining, target } from "./course";
import { bearingOf, wrap180, yawOf } from "./geometry";
import type { Course, Helm, Mode, Pose, Progress } from "./types";
import { CLOSE, sailSpeed, windAt, type WindField } from "./wind";

export type Phase = "card" | "countdown" | "racing" | "finished";
export type Boat = { id: string; pose: Pose & { roll: number }; prog: Progress; helm: Helm };
export type RaceCfg = {
  course: Course; mode: Mode; countdown: number; move: (b: Boat, dt: number, t: number) => void;
  /** where the grid stands: back behind the line, on heading yaw (Sailing's startRun); the Easy grid if left out */
  grid?: { back: number; yaw: number };
  /** two boats' hulls have just met (they have been pushed apart and slowed): for the bump sound */
  onBump?: (a: Boat, b: Boat) => void;
};
export type Race = {
  phase(): Phase; /** race time in seconds; negative during the countdown */ time(): number;
  boats: Boat[]; player: Boat;
  /** leave the card and begin the countdown */ begin(): void;
  step(dt: number): void;
  /** indices into boats, leader first */ order(): number[];
  /** race seconds, running, since the gun, that the player has made less than STILL_WAY units a second (0 before the
   *  gun, and after she finishes) */ still(): number;
  /** start that count again: she has just been put back on course */ unstick(): void;
};

export const COUNTDOWN: Record<Mode, number> = { easy: 5, sailing: 8 };
/** hulls that touch again within this many seconds of last touching are still together: no new knock */
const REKNOCK_S = 0.5;
/** under this way made good, units a second, she is getting nowhere; for STUCK_S running, she is stuck */
export const STILL_WAY = 1, STUCK_S = 6;

/** the move for the mode. Easy: the world's own (her thrust drives her). Sailing: the speed she settles to is the
 *  wind's, at her heading and where she is at race time t, times her pace (1 for the player; a rival's own, below 1),
 *  so her throttle does nothing and only the helm matters. In Easy a rival's pace is in her thrust instead. */
export function moveFor(mode: Mode, field: WindField | null, move: (b: Boat, dt: number, speed?: number) => void, pace: (b: Boat) => number = () => 1): RaceCfg["move"] {
  if (mode === "easy" || !field) return (b, dt) => void move(b, dt);
  return (b, dt, t) => void move(b, dt, sailSpeed(b.pose.yaw, windAt(field, b.pose.x, b.pose.z, t)) * pace(b));
}

/** n boats abreast, 14 apart along the line, at rest on heading yaw (default: dir as a heading), each back (default 25)
 *  behind the line measured along that heading, so a boat sailing straight on meets the line; the middle one meets
 *  its middle */
export function gridFor(c: Course, n: number, back = 25, yaw = Math.atan2(-c.start.dir.z, c.start.dir.x)): Pose[] {
  const { a, b } = c.start;
  const hx = Math.cos(yaw), hz = -Math.sin(yaw); // the heading as a direction: yaw 0 east, turning to the north
  const mx = (a.x + b.x) / 2 - hx * back, mz = (a.z + b.z) / 2 - hz * back;
  const len = Math.hypot(b.x - a.x, b.z - a.z) || 1, ux = (b.x - a.x) / len, uz = (b.z - a.z) / len;
  return Array.from({ length: n }, (_, i) => {
    const o = (i - (n - 1) / 2) * 14;
    return { x: mx + ux * o, z: mz + uz * o, yaw, v: 0 };
  });
}

/** ids[0] is the player */
export function createRace(cfg: RaceCfg, ids: string[]): Race {
  const { course, mode, move } = cfg;
  const grid = cfg.grid ? gridFor(course, ids.length, cfg.grid.back, cfg.grid.yaw) : gridFor(course, ids.length);
  const boats: Boat[] = ids.map((id, i) => ({ id, pose: { ...grid[i], roll: 0 }, prog: newProgress(), helm: { turn: 0, thrust: 0 } }));
  const player = boats[0];
  let phase: Phase = "card", time = -cfg.countdown;
  /** race seconds, running, that the player has made less than STILL_WAY since the gun */
  let still = 0;
  /** when each pair of boats (i × n + j) last touched, race time */
  const lastTouch = new Map<number, number>();

  return {
    phase: () => phase,
    time: () => time,
    boats,
    player,
    begin() {
      if (phase === "card") phase = "countdown";
    },
    step(dt) {
      if (phase === "card") return;
      time += dt;
      if (phase === "countdown" && time >= 0) phase = "racing";
      // in Easy the fleet is held on the line until the gun; in Sailing it may manoeuvre behind it
      if (phase === "countdown" && mode === "easy") return;
      // every boat moves, then every pair whose hulls meet is pushed apart, and only then is each one's way along the
      // course judged, so a bump that carries a boat over a line or round a mark counts as her own sailing would
      const p0 = boats.map((b) => ({ x: b.pose.x, z: b.pose.z }));
      for (const b of boats) move(b, dt, time);
      // boats that have finished are out of the race and pass clear; between the rest, a knock slows both once, as they meet; while they stay together (touching again within REKNOCK_S) they are
      // only kept apart, so two hulls grinding side by side do not stop dead
      for (let i = 0; i < boats.length; i++)
        for (let j = i + 1; j < boats.length; j++) {
          if (boats[i].prog.finishedAt !== null || boats[j].prog.finishedAt !== null) continue;
          const pair = i * boats.length + j, was = time - (lastTouch.get(pair) ?? -Infinity) < REKNOCK_S;
          if (!bump(boats[i].pose, boats[j].pose, !was)) continue;
          lastTouch.set(pair, time);
          if (!was) cfg.onBump?.(boats[i], boats[j]);
        }
      boats.forEach((b, i) => (b.prog = advance(course, b.prog, p0[i], { x: b.pose.x, z: b.pose.z }, time)));
      // the way she made this step (bumps and the shore included), against race time: no wall clock
      if (phase === "racing" && dt > 0) {
        const made = Math.hypot(player.pose.x - p0[0].x, player.pose.z - p0[0].z) / dt;
        still = made < STILL_WAY ? still + dt : 0;
      }
      if (phase === "racing" && player.prog.finishedAt !== null) phase = "finished";
    },
    order() {
      // finished boats by their time; then those racing by the course they have left; then any not yet over the start,
      // by how far behind the line they are. Boats level on all of that keep their order in the fleet.
      const { a, dir } = course.start;
      const tier = (b: Boat) => (b.prog.finishedAt !== null ? 0 : b.prog.started ? 1 : 2);
      const key = boats.map((b) =>
        b.prog.finishedAt !== null ? b.prog.finishedAt : b.prog.started ? remaining(course, b.prog, b.pose) : (a.x - b.pose.x) * dir.x + (a.z - b.pose.z) * dir.z,
      );
      return boats.map((_, i) => i).sort((i, j) => tier(boats[i]) - tier(boats[j]) || key[i] - key[j] || i - j);
    },
    still: () => (phase === "racing" ? still : 0),
    unstick() {
      still = 0;
    },
  };
}

/** true when, since the gun, the player has made less than 1 unit/s for 6 s running */
export function stuck(r: Race): boolean {
  return r.phase() === "racing" && r.still() >= STUCK_S - 1e-9;
}

/** put a boat back: stopped at recoverAt, on a heading it can sail towards its target (in Sailing, CLOSE off the wind on
 *  the nearer side if the target lies in the no-go zone). Before the start her target is the line: she faces along its
 *  dir. w: the wind where she is put back (Sailing), or null (Easy). */
export function recover(b: Boat, c: Course, w: { from: number; factor: number } | null): void {
  const at = recoverAt(c, b.prog), to = target(c, b.prog);
  let yaw = b.prog.started ? Math.atan2(-(to.z - at.z), to.x - at.x) : Math.atan2(-c.start.dir.z, c.start.dir.x);
  if (w) {
    const off = wrap180(bearingOf(yaw) - w.from);
    if (Math.abs(off) < CLOSE) yaw = yawOf(w.from + (off < 0 ? -CLOSE : CLOSE));
  }
  Object.assign(b.pose, { x: at.x, z: at.z, yaw, v: 0, roll: 0 });
}
