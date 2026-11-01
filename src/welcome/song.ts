// The song player: a score of timed strikes, scheduled a little ahead against the audio clock from wherever the film is,
// so the music follows the film's clock (and its seeks and loops) without drifting. With sound off nothing is scheduled,
// but the position still moves, so turning the sound on joins the song where it is.
import { audioTime, playAt, type Strike } from "./sound";

type Timed = Strike & { t: number };
let EV: Timed[] = [];
let LEN = 0;
let from = 0; // the song position scheduled so far

export function setSong(events: Timed[], length: number) {
  EV = events.slice().sort((a, b) => a.t - b.t);
  LEN = length;
  from = 0;
}
/** forget what was scheduled: the next tick starts again from the position it is given */
export function songReset(pos: number) {
  from = pos;
}
const lowerBound = (x: number) => { let lo = 0, hi = EV.length; while (lo < hi) { const m = (lo + hi) >> 1; if (EV[m].t < x) lo = m + 1; else hi = m; } return lo; };
/** schedule everything between the last tick and `pos` plus a little lookahead; pos is the position in the song, 0..LEN */
export function songTick(pos: number, enabled: boolean, lookahead = 0.3) {
  if (!EV.length) return;
  if (pos < from - 0.5) from = pos; // a seek back, or the song going round again
  const to = Math.min(LEN, pos + lookahead);
  const now = audioTime();
  if (enabled && now != null && to > from) for (let i = lowerBound(from); i < EV.length && EV[i].t < to; i++) playAt(EV[i], now + (EV[i].t - pos));
  from = Math.max(from, to);
}
