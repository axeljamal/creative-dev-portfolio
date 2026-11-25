// The race world's water for the tests: the obstacles the game has (rocks.json, read from the running page) and the
// capsule distance isles.ts measures them with. Land is heightAt's, as in the game.
import rocksJson from "./rocks.json";

export type Rock = { ax: number; az: number; bx: number; bz: number; r: number };
export const ROCKS: Rock[] = rocksJson;

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
/** nearest point of a rock to (x, z), and how far off it is: isles.ts's near2, line for line */
export const near2 = (k: Rock, x: number, z: number) => {
  const vx = k.bx - k.ax, vz = k.bz - k.az, l2 = vx * vx + vz * vz;
  const u = l2 ? clamp(((x - k.ax) * vx + (z - k.az) * vz) / l2, 0, 1) : 0;
  const px = k.ax + vx * u, pz = k.az + vz * u;
  return { px, pz, d: Math.hypot(x - px, z - pz) };
};

/** the water as isles.ts hands it to the hull and the pilot */
export const WATER = { rocks: ROCKS, near2 };
