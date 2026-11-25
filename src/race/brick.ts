// The Regatta in bricks (/bricks/race/), and the boat from Pinisi Yard. The page reads which world it is from its
// path. In bricks, the player sails the boat they built in the yard: the design shared in ?boat=, or else the one the
// yard kept on this device. She is built by the yard's own builder and scaled to the racing pinisi's length (28 m),
// so the hull's handling, the course and the rivals are all unchanged.
// This file stays light (no three.js): the page reads it up front; the builder is in world.ts, in the world's chunk.
import { clean, decode, type Design } from "../yard/design";

/** true on /bricks/race/ */
export const BRICK = typeof location !== "undefined" && location.pathname.startsWith("/bricks");

/** the key Pinisi Yard keeps the last design under (src/yard/App.tsx) */
const YARD_KEY = "pinisi-yard-design";

/** the yard boat to race: one shared in the link, or the one built on this device; null if neither */
export function yardDesign(): Design | null {
  const code = new URLSearchParams(location.search).get("boat");
  const shared = code ? decode(code) : null;
  if (shared) return shared;
  try {
    const saved = localStorage.getItem(YARD_KEY);
    return saved ? clean(JSON.parse(saved)) : null;
  } catch {
    return null;
  }
}
