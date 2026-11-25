import type { Vec } from "./types";

const DEG = 180 / Math.PI;

/** to (−180, 180] */
export const wrap180 = (deg: number): number => {
  const d = ((((deg + 180) % 360) + 360) % 360) - 180; // [−180, 180)
  return d === -180 ? 180 : d;
};

/** compass degrees, 0..360 (0 north, 90 east); yaw 0 = east, increasing towards north */
export const bearingOf = (yaw: number): number => (((90 - yaw * DEG) % 360) + 360) % 360;

/** inverse of bearingOf, radians */
export const yawOf = (bearing: number): number => ((90 - bearing) / DEG);

const cross = (o: Vec, a: Vec, b: Vec) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);

/**
 * Does the step p0→p1 cross the segment a–b?
 * A point exactly on the line through a–b counts as the non-positive side, so a step
 * that ends on the line has crossed it (when it began on the positive side), and the
 * next step off the line on the same side does not cross again. No crossing is missed
 * or counted twice.
 */
export function segCross(p0: Vec, p1: Vec, a: Vec, b: Vec): boolean {
  const s0 = cross(a, b, p0);
  const s1 = cross(a, b, p1);
  if (s0 <= 0 === s1 <= 0) return false;
  const k = s0 / (s0 - s1);
  const x = p0.x + (p1.x - p0.x) * k;
  const z = p0.z + (p1.z - p0.z) * k;
  const dx = b.x - a.x, dz = b.z - a.z;
  const u = ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz);
  return u >= 0 && u <= 1;
}
