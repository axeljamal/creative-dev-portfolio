// The two islands' shorelines as the course chart draws them: for each island, the point where the land meets the sea
// along every few degrees round its centre. Worked out once from the same height function the boats collide with.
import { ISLANDS, heightAt } from "../dua-pulau/world/terrain";
import type { Vec } from "./rules/types";

const RAYS = 60;
let kept: Vec[][] | null = null;

export function shores(): Vec[][] {
  if (kept) return kept;
  kept = ISLANDS.map((I) => {
    const pts: Vec[] = [];
    for (let i = 0; i < RAYS; i++) {
      const a = (i / RAYS) * Math.PI * 2, cx = Math.cos(a), cz = Math.sin(a);
      // walk in from well offshore to the first dry ground
      let r = I.r * 1.7;
      while (r > 4 && heightAt(I.x + cx * r, I.z + cz * r) < 0) r -= 2;
      pts.push({ x: I.x + cx * r, z: I.z + cz * r });
    }
    return pts;
  });
  return kept;
}
