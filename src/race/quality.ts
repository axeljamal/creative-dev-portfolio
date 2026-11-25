// The device quality check's verdict: how smooth the title screen ran, as a quality tier for the world. Pure.
import type { Quality } from "../dua-pulau/world/stage";

/** frames dropped from the start: shaders compiling and textures uploading make the first ones slow on any device */
const SETTLE = 20;

/** from frame times in ms measured on the title screen (first 20 dropped): median ≤ 20 (50 frames a second or better)
 *  high, ≤ 34 (30 or better) medium, else low. A screen never draws faster than it refreshes, so on the common 60 Hz
 *  one a perfect run reads 16.7 ms: the bounds sit above that. With nothing left to measure, "medium". */
export function tierFrom(frameMs: number[]): Quality {
  const kept = frameMs.slice(SETTLE).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!kept.length) return "medium";
  const k = kept.length, median = k % 2 ? kept[(k - 1) / 2] : (kept[k / 2 - 1] + kept[k / 2]) / 2;
  return median <= 20 ? "high" : median <= 34 ? "medium" : "low";
}
