// Recording and playback of one run: where the boat was every tenth of a second from the gun. Pure.
import type { Pose } from "./types";

/** track: flat [x, z, yaw] every 0.1 s from the gun, x and z to 0.1, yaw to 0.01 */
export type Run = { time: number; splits: number[]; track: number[] };

const STEP = 0.1;
const TAU = Math.PI * 2;
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
/** a turn from a to b, the short way round, in (-π, π] */
const turn = (a: number, b: number) => {
  const d = (((b - a) % TAU) + TAU) % TAU;
  return d > Math.PI ? d - TAU : d;
};

/** Add every frame with the race time; samples are cut at 0.1 s steps (interpolated between frames), so the frame rate
 *  does not matter. Anything before the gun (t < 0) is ignored. */
export function recorder() {
  const track: number[] = [];
  let prev: { t: number; x: number; z: number; yaw: number } | null = null;
  return {
    add(t: number, p: Pose) {
      if (t < 0) return;
      const cur = { t, x: p.x, z: p.z, yaw: p.yaw };
      for (;;) {
        const k = track.length / 3, at = k * STEP;
        if (at > t + 1e-9) break;
        const a = prev ?? cur, span = cur.t - a.t, f = span > 1e-9 ? Math.min(1, Math.max(0, (at - a.t) / span)) : 1;
        track.push(r1(a.x + (cur.x - a.x) * f), r1(a.z + (cur.z - a.z) * f), r2(a.yaw + turn(a.yaw, cur.yaw) * f));
      }
      prev = cur;
    },
    done(time: number, splits: number[]): Run {
      return { time, splits: [...splits], track: [...track] };
    },
  };
}

/** where the run was at race time t: linear between samples, yaw by the shortest turn; null before 0 or after the end */
export function poseAt(run: Run, t: number): { x: number; z: number; yaw: number } | null {
  const n = Math.floor(run.track.length / 3);
  if (n === 0 || !(t >= 0) || t > (n - 1) * STEP + 1e-9) return null;
  const i = Math.min(Math.floor(t / STEP + 1e-9), n - 1), j = Math.min(i + 1, n - 1);
  const f = j === i ? 0 : Math.min(1, Math.max(0, t / STEP - i)), a = i * 3, b = j * 3, k = run.track;
  return { x: k[a] + (k[b] - k[a]) * f, z: k[a + 1] + (k[b + 1] - k[a + 1]) * f, yaw: k[a + 2] + turn(k[a + 2], k[b + 2]) * f };
}
