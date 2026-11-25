// Two small numeric helpers the world's modules share. Nothing here touches the page, so the boat's motion and its
// pilot can be tested in node.
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
/** an angle brought into (−π, π] */
export const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
