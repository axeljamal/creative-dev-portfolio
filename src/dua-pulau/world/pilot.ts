// The pinisi's own pilot: where to steer for a point at sea. Straight for it in clear water; round the island that
// stands in the way, keeping to one side of it; and off the end of a pier rather than into it. It knows nothing of the
// scene or the page (it runs in node). Arriving is the caller's business: the pilot only steers.
import type { Hull, Steer } from "./hull";
import type { Isles } from "./isles";
import { clamp, wrap } from "./num";
import { ISLANDS, heightAt, type Island } from "./terrain";

/** what the pilot remembers between steps: the island she is rounding, and on which side (1 or −1) */
export type PilotMem = { isle: Island | null; side: number };

/** the island that stands between two points at sea, if one does: the first land the straight course meets */
const blocked = (x0: number, z0: number, x1: number, z1: number) => {
  const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 6);
  for (let i = 1; i < n; i++) {
    const x = x0 + ((x1 - x0) * i) / n, z = z0 + ((z1 - z0) * i) / n;
    if (heightAt(x, z) > -3.6) return ISLANDS.reduce((a, b) => (Math.hypot(x - a.x, z - a.z) / a.r < Math.hypot(x - b.x, z - b.z) / b.r ? a : b));
  }
  return null;
};

/** today's autopilot steering for a point, without the arrival check */
export function pilot(st: Hull, target: { x: number; z: number }, isles: Pick<Isles, "rocks" | "near2">, mem: PilotMem): Steer {
  const { rocks, near2 } = isles;
  // steer for the point; if an island is in the way, follow its coast round until the way is clear
  const d = target, dx = d.x - st.x, dz = d.z - st.z, dist = Math.hypot(dx, dz);
  let vx = dx / dist, vz = dz / dist;
  const I = blocked(st.x, st.z, d.x, d.z);
  if (I) {
    // round the island that is in the way (not merely the nearest one), keeping to one side of it until the way is clear
    const rx = st.x - I.x, rz = st.z - I.z, r = Math.hypot(rx, rz), ring = I.r * 1.5 + 12;
    const tx = -rz / r, tz = rx / r;
    if (mem.isle !== I) {
      mem.isle = I;
      mem.side = tx * vx + tz * vz >= 0 ? 1 : -1;
    }
    const pull = clamp((ring - r) / 22, -1, 1);
    vx = tx * mem.side + (rx / r) * pull;
    vz = tz * mem.side + (rz / r) * pull;
    const l = Math.hypot(vx, vz) || 1;
    vx /= l;
    vz /= l;
  } else mem.isle = null;
  // the pier (anything large in the water) lies across her course, whether she is heading straight for the mooring
  // or rounding an island (the bandstand's pier reaches out past the coast she follows): keep a beam's length off
  // it and work round it on the side her course already favours, instead of pressing into it
  for (const k of rocks) {
    if (k.r < 2.5) continue;
    const clear = k.r + 7;
    let cut = false;
    for (let s = 0; s <= Math.min(dist, 70) && !cut; s += 3) cut = near2(k, st.x + vx * s, st.z + vz * s).d < clear;
    if (!cut) continue;
    const n = near2(k, st.x, st.z), nx = (st.x - n.px) / (n.d || 1), nz = (st.z - n.pz) / (n.d || 1);
    const len = Math.hypot(k.bx - k.ax, k.bz - k.az);
    if (len > 1) {
      // a pier runs out from the land, so the only way round is past its seaward end: make for a point clear beyond it
      const sea = heightAt(k.ax, k.az) < heightAt(k.bx, k.bz), ex = sea ? k.ax : k.bx, ez = sea ? k.az : k.bz;
      const ux = (ex - (sea ? k.bx : k.ax)) / len, uz = (ez - (sea ? k.bz : k.az)) / len;
      let wx = ex + ux * (clear + 4), wz = ez + uz * (clear + 4);
      // past the pier's whole length, head and all, not only this stretch of it
      for (let i = 0; i < 20 && rocks.some((q) => q.r >= 2.5 && near2(q, wx, wz).d < q.r + 9); i++) (wx += ux * 3), (wz += uz * 3);
      vx = wx - st.x + nx * clamp(clear + 3 - n.d, 0, 6);
      vz = wz - st.z + nz * clamp(clear + 3 - n.d, 0, 6);
    } else {
      let tx = -nz, tz = nx;
      if (tx * vx + tz * vz < 0) (tx = -tx), (tz = -tz);
      const pull = clamp((clear + 3 - n.d) / 6, -0.6, 1);
      vx = tx + nx * pull;
      vz = tz + nz * pull;
    }
    const l = Math.hypot(vx, vz) || 1;
    vx /= l;
    vz /= l;
    break;
  }
  const off = wrap(Math.atan2(-vz, vx) - st.yaw);
  const turn = clamp(off * 2.2, -1, 1);
  // her course lies astern (she has just cast off, bows to the shore): back away and swing round before making sail
  const thrust = Math.abs(off) > 1.25 ? -0.4 : dist < 45 ? 0.45 : Math.abs(turn) > 0.8 ? 0.5 : 1;
  const swing = Math.abs(off) > 0.5 ? 0.85 : 0;
  return { turn, thrust, swing };
}
