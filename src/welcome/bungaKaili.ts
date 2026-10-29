// The ring section of Bunga Kaili, Marea Dvīpa's original flower song for a synthesized Kaili kakula ensemble
// (bars 20–35 of the Bomba Rose reel), ported from the Media Lab. The rose plays itself: each petal ring's count
// becomes a Euclidean rhythm (13, 8, 5 and 3 onsets in 16), its notes picked by the golden angle and kept on the
// chord, over gamba-gamba, low gongs, gimba drums and the loom. A minor on the Kaili seven-tone set, 138 bpm.
import { BAR, BEAT, GA } from "./tempo";
import type { Strike } from "./sound";

export const RINGS = [13, 8, 5, 3];
export const KAILI_BARS = 16;

const PITCH = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 493.88, 523.25, 587.33, 659.26, 783.99, 880.0, 987.77];
const PCS = [9, 0, 2, 4, 7, 9, 11, 0, 2, 4, 7, 9, 11];
const DR = [2, -3, 4, -2, 3, 2, -3, 3, -2, 4, -3, 2, -2]; // each kettle drifts a few cents
const CHP: Record<string, number[]> = { Am: [9, 0, 4], F: [5, 9, 0], C: [0, 4, 7], G: [7, 11, 2], E7: [4, 8, 11, 2] };
const RING_CH = ["Am", "Am", "F", "F", "C", "C", "G", "G", "Am", "Am", "F", "F", "E7", "E7", "E7", "E7"];

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const pcF = (pc: number, oct: number) => 261.63 * Math.pow(2, pc / 12) * Math.pow(2, oct - 4);
const F = (p: number) => PITCH[p] * Math.pow(2, DR[p] / 1200);
const T = (bar: number, beat: number) => bar * BAR + beat * BEAT;
/** k onsets spread evenly over n steps */
const euclid = (k: number, n: number, rot = 0) => Array.from({ length: n }, (_, i) => (((i + rot) % n) * k) % n < k);
const tones = (ch: string, lo: number, hi: number) => PCS.map((pc, i) => (CHP[ch].includes(pc) ? i : -1)).filter((p) => p >= lo && p <= hi);

export type Timed = Strike & { t: number };

export function ringScore(): Timed[] {
  const E: Timed[] = [];
  const K = (t: number, p: number, v: number, beats: number, soft: boolean) =>
    E.push({ t, k: "kettle", n: p % 7, f: F(p), v, soft, d: clamp(beats * BEAT * (soft ? 2.6 : 2), 0.25, 2.2) });

  // the rose plays itself, on the grid: ring n = Euclidean n-in-16, twice per ring (4 bars)
  let prev = 9;
  let idx = 0;
  RINGS.forEach((n, ring) => {
    const pat = euclid(n, 16);
    for (let rep = 0; rep < 2; rep++)
      for (let s = 0; s < 16; s++) {
        if (!pat[s]) continue;
        const e8 = rep * 16 + s;
        const bar = ring * 4 + Math.floor(e8 / 8);
        const ct = tones(RING_CH[bar], 5, 12);
        const gi = 5 + Math.floor((((idx++ * GA) % (Math.PI * 2)) / (Math.PI * 2)) * 8);
        let best = ct[0];
        let score = 1e9;
        for (const p of ct) {
          const sc = Math.abs(p - gi) + 0.8 * Math.abs(p - prev);
          if (sc < score) {
            score = sc;
            best = p;
          }
        }
        K(T(bar, (e8 % 8) / 2), best, (0.42 - ring * 0.03) * (s === 0 ? 1.15 : 1), (2 / n) * 4, ring >= 2);
        prev = best;
      }
    E.push({ t: T(ring * 4, 0), k: "gong", n: (ring % 2) as 0 | 1, f: ring % 2 ? 164.81 : 110, v: 0.32 });
  });

  RING_CH.forEach((c, i) => {
    // gamba-gamba: soft wooden chord figures an octave under the kettles
    for (const [beat, which] of [[0, 0], [2, 1]]) {
      const pc = CHP[c][Math.min(which, CHP[c].length - 1)];
      let f = pcF(pc, 4);
      if (f > 400) f /= 2;
      E.push({ t: T(i, beat), k: "kolintang", n: pc % 7, f, v: (beat % 1 ? 0.16 : 0.22) * 0.6 });
    }
    // low gongs on the root
    let f = pcF(CHP[c][0], 2);
    if (f < 80) f *= 2;
    E.push({ t: T(i, 0), k: "bassgong", f, v: 0.42 * 0.75 * 0.85 });
    // the loom: the cloth being woven, 5-in-8
    euclid(5, 8).forEach((on, e8) => {
      if (on) E.push({ t: T(i, e8 / 2), k: e8 % 4 === 0 ? "beater" : "shuttle", v: (e8 % 4 === 0 ? 0.36 : 0.14) * 0.5 * 1.8 });
    });
    // gimba: low strokes 3-in-8, slaps on 2 and 4; halved for the last ring, into the heart
    const level = (i < 12 ? 0.6 : 0.5) * 0.62;
    if (i >= 12) {
      E.push({ t: T(i, 0), k: "drum", n: "dum", v: 0.4 * level });
      E.push({ t: T(i, 2), k: "drum", n: "tak", v: 0.3 * level });
    } else {
      euclid(3, 8).forEach((on, e8) => {
        if (on) E.push({ t: T(i, e8 / 2), k: "drum", n: "dum", v: (e8 === 0 ? 0.46 : 0.32) * level });
      });
      for (const bt of [1, 3]) E.push({ t: T(i, bt), k: "drum", n: "tak", v: 0.4 * level });
    }
  });
  return E.sort((a, b) => a.t - b.t);
}

/** the Bomba Rose as the ring section grows it: ring by ring, 4 bars each, then the golden-spiral heart */
export function roseAt(lt: number) {
  const d = KAILI_BARS * BAR;
  const ramp = (a: number, b: number) => clamp((lt - a) / (b - a), 0, 1);
  return {
    rings: RINGS,
    prog: RINGS.map((_, k) => ramp(k * 4 * BAR + 0.05, (k + 1) * 4 * BAR - 0.3)),
    heart: ramp(d - 2.5, d - 1),
    ring: Math.min(3, Math.floor(lt / (4 * BAR))),
    bar: lt / BAR,
  };
}
