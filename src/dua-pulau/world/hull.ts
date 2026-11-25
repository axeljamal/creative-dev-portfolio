// How the pinisi's hull moves through the water and keeps off whatever is solid: one step of her motion, then the
// shallows and every rock pushing her back out. It knows nothing of the scene or the page (it runs in node), so the
// portfolio world, the race game and the tests all drive the same boat.
import type { Isles } from "./isles";
import { clamp } from "./num";
import { heightAt } from "./terrain";

/** where she is and how she lies: yaw 0 = east, turning to the north; v her speed ahead (m/s); roll her heel */
export type Hull = { x: number; z: number; yaw: number; v: number; roll: number };
/** turn −1…1 (positive to port), thrust −0.4…1; swing: under her own pilot she may turn smartly even with little way on */
export type Steer = { turn: number; thrust: number; swing?: number };

/** the hull's half-beam at o metres forward of midships (−14 stern … +14 bow) */
export const beamAt = (o: number) => 3.6 * Math.pow(Math.sin(Math.PI * (0.08 + 0.92 * clamp((o + 14) / 28, 0, 1))), 0.6) + 0.3;

/** one step of motion and collision. speed: when given, st.v eases to it and thrust is ignored. Returns true if she
 *  touched land or an obstacle (her way is then cut by 18%). */
export function stepHull(st: Hull, s: Steer, dt: number, isles: Pick<Isles, "rocks" | "near2">, opts: { speed?: number } = {}): boolean {
  const { rocks, near2 } = isles, { thrust } = s, swing = s.swing ?? 0;
  const turn = clamp(s.turn, -1, 1);
  st.yaw += turn * dt * 0.3 * Math.max(swing * 1.6, 0.35 + Math.min(1, Math.abs(st.v) / 7)); // a 28 m schooner turns slowly
  if (opts.speed !== undefined) st.v += (opts.speed - st.v) * dt * 0.55;
  else st.v += (thrust * 13 - st.v) * dt * (thrust ? 0.55 : 0.4);
  st.roll += (turn * Math.min(1, Math.abs(st.v) / 9) * 0.1 - st.roll) * Math.min(1, dt * 2);
  const fx = Math.cos(st.yaw), fz = -Math.sin(st.yaw);
  st.x += fx * st.v * dt;
  st.z += fz * st.v * dt;
  // keep her afloat: the shallows push the hull back out to sea
  let hitLand = false;
  for (const o of [12, 0, -11]) {
    const px = st.x + fx * o, pz = st.z + fz * o, h = heightAt(px, pz);
    if (h > -2.2) {
      const gx = heightAt(px + 1, pz) - heightAt(px - 1, pz), gz = heightAt(px, pz + 1) - heightAt(px, pz - 1), gl = Math.hypot(gx, gz) || 1;
      const push = Math.min(3, (h + 2.2) * 0.8);
      st.x -= (gx / gl) * push;
      st.z -= (gz / gl) * push;
      hitLand = true;
    }
  }
  // and nothing in the water passes through her: test the hull from bow to stern against every rock
  for (let o = 13; o >= -13; o -= 2.6) {
    const px = st.x + fx * o, pz = st.z + fz * o, hb = beamAt(o);
    for (const k of rocks) {
      const n = near2(k, px, pz), gap = k.r + hb - n.d;
      if (gap > 0) {
        const nx = n.d > 1e-4 ? (px - n.px) / n.d : -fx, nz = n.d > 1e-4 ? (pz - n.pz) / n.d : -fz;
        st.x += nx * gap;
        st.z += nz * gap;
        hitLand = true;
      }
    }
  }
  if (hitLand) st.v *= 0.82;
  const far = Math.hypot(st.x, st.z);
  if (far > 520) {
    st.x *= 520 / far;
    st.z *= 520 / far;
    st.v *= 0.9;
  }
  return hitLand;
}
