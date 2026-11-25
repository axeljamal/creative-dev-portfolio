// Boat against boat: each hull is three circles along her centreline (bow, midships, stern). Where two hulls' circles
// overlap they are pushed apart, half each, and both lose way. No rules, no penalties. Pure: no scene, no DOM.
import type { Pose } from "./types";

/** the radius of each of a hull's circles, and where they sit forward of midships (bow +, stern −) */
export const HULL_R = 3.4, HULL_AT = [9, 0, -9];

const MIN = HULL_R * 2;
/** what is left of her way after a bump */
const KEEP = 0.85;

/** the deepest overlap between a's circles and b's: how deep, and the unit normal from a to b */
function deepest(a: Pose, b: Pose): { depth: number; nx: number; nz: number } | null {
  const ax = Math.cos(a.yaw), az = -Math.sin(a.yaw), bx = Math.cos(b.yaw), bz = -Math.sin(b.yaw);
  let best: { depth: number; nx: number; nz: number } | null = null;
  for (const oa of HULL_AT)
    for (const ob of HULL_AT) {
      const dx = b.x + bx * ob - (a.x + ax * oa), dz = b.z + bz * ob - (a.z + az * oa), d = Math.hypot(dx, dz), depth = MIN - d;
      if (depth <= 0 || (best && depth <= best.depth)) continue;
      // circles exactly on top of one another: part them across a's beam
      best = d > 1e-9 ? { depth, nx: dx / d, nz: dz / d } : { depth, nx: az, nz: -ax };
    }
  return best;
}

/** if the hulls overlap, push them apart equally, slow both to 85%, and return true. slow: false only parts them (for
 *  hulls still touching from the step before: the knock costs way once, not on every step they grind together) */
export function bump(a: Pose, b: Pose, slow = true): boolean {
  let o = deepest(a, b);
  if (!o) return false;
  // each push clears the deepest overlap; another pair of circles may still touch, so go again until none does
  for (let i = 0; i < 12 && o; i++, o = deepest(a, b)) {
    const h = o.depth / 2 + 1e-6;
    a.x -= o.nx * h;
    a.z -= o.nz * h;
    b.x += o.nx * h;
    b.z += o.nz * h;
  }
  if (slow) {
    a.v *= KEEP;
    b.v *= KEEP;
  }
  return true;
}
