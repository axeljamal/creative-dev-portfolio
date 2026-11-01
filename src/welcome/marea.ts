// Marea, the mark's own piece from the Marea Dvīpa Media Lab, in the manner of Balinese gong kebyar: 40 bars at 112 bpm,
// one section per layer of the mark. The rules it keeps, so that it stays in tune with itself:
//  1. One scale, exact octaves. Pelog selisir (ding dong deng dung dang) from ding = E4; every part, the gongs included.
//  2. One source melody per section. The pokok (core melody) is read from it, and the kotekan, jegogan and reyong are built
//     from the pokok, so no part can clash with another.
//  3. A phrase is a gong cycle of two bars: the gong ageng marks the arrival on the first beat of the even bar, where the melody
//     holds a pokok tone; the odd bar moves toward it. Every section ends on ding.
//  4. The melody moves by step; a leap is answered by a step back.
//  5. Kotekan: polos on the beat, sangsih between, never together, short notes; the beat always gets the pokok tone.
//  6. Ombak: each kettle's partner beats against it at five a second across the whole set.
//  7. Levels of scale (jegogan in halves, ugal in beats, kotekan in sixteenths), question and answer, a breath (the angsel)
//     before the close. All synthesized; no traditional piece is quoted.
import type { Strike } from "./sound";

export const BPM_M = 112;
export const BEAT_M = 60 / BPM_M;
export const BAR_M = BEAT_M * 4;
export const MAREA_BARS = 40;
export const MAREA_SECS = MAREA_BARS * BAR_M;
export type Timed = Strike & { t: number };

const SEL = [0, 1, 3, 7, 8]; // pelog selisir in semitones from ding
const OMBAK_HZ = 5; // the paired instrument's beat rate
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** pelog index p (0..4 ding..dang, 5..9 the octave above, negatives below) to a frequency */
export function pf(p: number) {
  const o = Math.floor(p / 5), d = ((p % 5) + 5) % 5;
  return 329.63 * Math.pow(2, (SEL[d] + o * 12) / 12);
}

type Bar = [number, number, number][]; // [beat, pelog index, beats]
// melodies: even bars begin with the arrival, odd bars move toward the next one
const THEME: Bar[] = [
  [[0, 5, 2], [2, 6, 0.5], [2.5, 7, 0.5], [3, 8, 1]], [[0, 8, 1], [1, 7, 1], [2, 6, 0.5], [2.5, 7, 0.5], [3, 8, 1]], [[0, 8, 2], [2, 7, 1], [3, 6, 1]], [[0, 5, 1], [1, 6, 1], [2, 7, 0.5], [2.5, 8, 0.5], [3, 9, 1]],
  [[0, 7, 2], [2, 8, 0.5], [2.5, 9, 0.5], [3, 8, 1]], [[0, 7, 1], [1, 6, 1], [2, 5, 1], [3, 4, 1]], [[0, 5, 2], [2, 4, 1], [3, 3, 1]], [[0, 4, 1], [1, 3, 1], [2, 4, 1], [3, 5, 0.5], [3.5, 6, 0.5]],
];
const GARDEN: Bar[] = [
  [[0, 7, 2], [2, 8, 1], [3, 9, 1]], [[0, 9, 1], [1, 8, 1], [2, 9, 0.5], [2.5, 10, 0.5], [3, 9, 1]], [[0, 9, 2], [2, 8, 1], [3, 7, 1]], [[0, 8, 1], [1, 7, 1], [2, 6, 1], [3, 7, 1]],
  [[0, 8, 2], [2, 9, 0.5], [2.5, 8, 0.5], [3, 7, 1]], [[0, 6, 1], [1, 7, 1], [2, 8, 1], [3, 7, 1]], [[0, 5, 2], [2, 6, 1], [3, 7, 1]], [[0, 6, 1], [1, 5, 1], [2, 4, 1], [3, 5, 1]],
];
const BIRDS: Bar[] = [[[0, 7, 2], [2, 8, 1], [3, 9, 1]], [[0, 9, 1], [1, 8, 0.5], [1.5, 7, 0.5], [2, 8, 2]], [[0, 7, 2], [2, 6, 1], [3, 5, 1]], [[0, 6, 1], [1, 7, 1], [2, 6, 1], [3, 5, 1]]];
const CLOSE: Bar[] = [[[0, 5, 4]]];
const POKOK_SEA = [[0, 0, 0, 1], [2, 2, 1, 1], [0, 0, 3, 3], [2, 2, 1, 1], [0, 0, 1, 1], [3, 3, 2, 2], [0, 0, 0, 0], [1, 1, 0, 0]];
/** the pokok of a melody: the tone sounding on each beat */
function pokokOf(bars: Bar[]) {
  let last = 5;
  return bars.map((bar) => [0, 1, 2, 3].map((bt) => { for (const nt of bar) if (nt[0] <= bt + 1e-6) last = nt[1]; return last; }));
}

export function composeMarea(): Timed[] {
  const E: Timed[] = [];
  const T = (bar: number, beat: number) => bar * BAR_M + beat * BEAT_M;
  const K = (t: number, p: number, v: number, beats: number, o: { soft?: boolean; damp?: boolean; short?: boolean; pair?: boolean } = {}) =>
    E.push({ t, k: "kettle", n: ((p % 7) + 7) % 7, f: pf(p), v, soft: !!o.soft, pairHz: o.pair === false ? 0 : OMBAK_HZ, d: o.damp ? 0.14 : o.short ? 0.2 : clamp(beats * BEAT_M * (o.soft ? 2.4 : 1.8), 0.25, 2.2) });
  // the ugal: the lead; a long note is approached from the scale tone below, lightly
  const ugal = (bars: Bar[], at: number, v: number) => bars.forEach((bar, i) => bar.forEach((nt) => { const t0 = T(at + i, nt[0]); if (nt[2] >= 2 && nt[0] > 0) K(t0 - BEAT_M * 0.25, nt[1] - 1, v * 0.25, 0.25, { short: true }); K(t0, nt[1], v, nt[2]); }));
  // kotekan on the pokok: polos plays the tone and its upper neighbour on the even sixteenths, sangsih the next two tones on the odd ones
  const kotekan = (at: number, pokok: number[][], v: number, up = 0) => pokok.forEach((bar, i) => { for (let s = 0; s < 16; s++) { const pk = bar[Math.floor(s / 4)] + up, polos = s % 2 === 0, off = polos ? [0, 1][(s / 2) % 2] : [2, 1][((s - 1) / 2) % 2]; K(T(at + i, s / 4), pk + off, v * (s % 4 === 0 ? 1.15 : 0.8), 0.25, { short: true }); } });
  // norot: the gentle figuration for the sea, the pokok tone and its upper neighbour trading in eighths
  const norot = (at: number, pokok: number[][], v: number) => pokok.forEach((bar, i) => { for (let e8 = 0; e8 < 8; e8++) { const pk = bar[Math.floor(e8 / 2)]; K(T(at + i, e8 / 2), pk + (e8 % 2), v * (e8 % 2 ? 0.75 : 1), 0.5, { short: true }); } });
  // jegogan hold the pokok two octaves down in half-bars; calung double it an octave down, lightly
  const jegogan = (at: number, pokok: number[][], level: number) => pokok.forEach((bar, i) => [0, 2].forEach((bt) => { const pk = bar[bt]; E.push({ t: T(at + i, bt), k: "bassgong", f: pf(pk - 10), v: 0.4 * level }); E.push({ t: T(at + i, bt), k: "kolintang", n: ((pk % 7) + 7) % 7, f: pf(pk - 5), v: 0.13 * level }); }));
  const kempli = (at: number, n: number, level: number) => { for (let b = 0; b < n; b++) for (let bt = 0; bt < 4; bt++) K(T(at + b, bt), 8, 0.12 * level, 0.25, { damp: true, pair: false }); };
  // the gong cycle, two bars: gong ageng (ding, two octaves down) on the even bar, kempur (dung below) on the odd, klentong (ding above) on the half
  const gongs = (at: number, n: number, level: number) => { for (let b = 0; b < n; b++) { E.push(b % 2 === 0 ? { t: T(at + b, 0), k: "gong", n: 0, f: pf(-10), v: 0.42 * level } : { t: T(at + b, 0), k: "gong", n: 1, f: pf(-7), v: 0.24 * level }); E.push({ t: T(at + b, 2), k: "gong", n: 1, f: pf(5), v: 0.07 * level }); } };
  const kendang = (at: number, n: number, level: number, light = false) => {
    const pat: [number, "dum" | "tak", number][] = light ? [[0, "dum", 0.4], [2, "dum", 0.3], [3, "tak", 0.3]] : [[0, "dum", 0.44], [0.75, "tak", 0.3], [1.5, "tak", 0.34], [2, "dum", 0.36], [2.5, "tak", 0.22], [3.25, "tak", 0.34], [3.5, "dum", 0.26]];
    for (let b = 0; b < n; b++) pat.forEach((h) => E.push({ t: T(at + b, h[0]), k: "drum", n: h[1], v: h[2] * level * (b % 2 ? 0.9 : 1) }));
  };
  const cengceng = (at: number, n: number, level: number) => { for (let b = 0; b < n; b++) { for (let e8 = 1; e8 < 8; e8 += 2) E.push({ t: T(at + b, e8 / 2), k: "clap", v: 0.11 * level }); if (b % 2 === 0) E.push({ t: T(at + b, 0), k: "clap", v: 0.2 * level }); } };
  const suling = (bars: Bar[], at: number, v: number) => bars.forEach((bar, i) => bar.forEach((nt) => E.push({ t: T(at + i, nt[0]), k: "tatali", f: pf(nt[1]), v, d: nt[2] * BEAT_M * 0.92 })));
  const waves = (at: number, n: number, level: number) => { for (let b = 0; b < n; b++) for (let e8 = 0; e8 < 8; e8++) { const sw = 0.5 + 0.5 * Math.sin((e8 / 8) * Math.PI); E.push({ t: T(at + b, e8 / 2), k: "shaker", v: (e8 % 2 ? 0.1 : 0.18) * sw * level }); } };
  // kebyar: the set strikes together on ding and dung through three octaves, with the gong and the cymbals
  const kebyar = (bar: number, beat: number, v: number) => { [0, 3, 5, 8, 10].forEach((p, i) => K(T(bar, beat) + i * 0.005, p, v * (i < 2 ? 1 : 0.7), 1.5)); E.push({ t: T(bar, beat), k: "gong", n: 0, f: pf(-10), v: 0.5 }); E.push({ t: T(bar, beat), k: "clap", v: 0.28 }); E.push({ t: T(bar, beat), k: "drum", n: "dum", v: 0.5 }); };
  const PK_THEME = pokokOf(THEME), PK_GARDEN = pokokOf(GARDEN), PK_BIRDS = pokokOf(BIRDS), PK_MARK = pokokOf(THEME.slice(0, 7).concat(CLOSE));

  // Title 0-3: two kebyar strikes out of silence, then the suling alone over the kempli and the sea
  kebyar(0, 0, 0.4); kebyar(0, 2.5, 0.32); kempli(2, 2, 0.8); waves(1, 3, 0.5);
  suling([[], [], [[0, 7, 2], [2, 6, 1], [3, 5, 1]], [[0, 5, 4]]], 0, 0.3);
  // The sea 4-11: the pokok on the jegogan, norot rocking above it, the gong cycle, the kendang softly
  jegogan(4, POKOK_SEA, 0.9); norot(4, POKOK_SEA, 0.24); kempli(4, 8, 0.8); gongs(4, 8, 0.9); kendang(4, 8, 0.55, true); waves(4, 8, 0.8);
  suling([[], [], [[0, 7, 2], [2, 6, 2]], [[0, 5, 4]]], 8, 0.26);
  // The pavilion 12-19: the theme on the ugal over full kotekan; the kempur parts the gates
  ugal(THEME, 12, 0.5); kotekan(12, PK_THEME, 0.18); jegogan(12, PK_THEME, 1); kempli(12, 8, 0.9); gongs(12, 8, 1); kendang(12, 8, 0.8); waves(12, 8, 0.3);
  // The garden 20-27: the garden theme, higher; the reyong doubles the kotekan an octave up; ceng-ceng lightly; the suling closes the phrase
  ugal(GARDEN, 20, 0.5); kotekan(20, PK_GARDEN, 0.16); kotekan(20, PK_GARDEN, 0.08, 5); jegogan(20, PK_GARDEN, 1); kempli(20, 8, 0.9); gongs(20, 8, 1); kendang(20, 8, 0.85); cengceng(20, 8, 0.5); waves(20, 8, 0.3);
  suling([[], [], [], [], [], [], [[2, 6, 2]], [[0, 5, 4]]], 20, 0.24);
  // The birds 28-31: the suling sings over jegogan and kempli; dung and dang flutter above
  suling(BIRDS, 28, 0.34); jegogan(28, PK_BIRDS, 0.8); kempli(28, 4, 0.7); gongs(28, 4, 0.8); waves(28, 4, 0.3);
  for (let b = 28; b < 32; b++) for (let e8 = 1; e8 < 8; e8 += 2) K(T(b, e8 / 2), e8 % 4 === 1 ? 8 : 9, 0.14, 0.25, { short: true });
  // The mark 32-39: everyone; an angsel on bar 37 (the set stops for a breath, the kendang calls), the arrival on 38, the close on 39
  ugal(THEME.slice(0, 7).concat(CLOSE), 32, 0.55); kotekan(32, PK_MARK, 0.2); kotekan(32, PK_MARK, 0.09, 5); jegogan(32, PK_MARK, 1.05); kempli(32, 8, 1); gongs(32, 8, 1.05); kendang(32, 8, 1); cengceng(32, 8, 0.8); waves(32, 8, 0.45);
  suling([[], [], [], [], [[0, 7, 2], [2, 6, 2]], [[0, 5, 4]], [], []], 32, 0.24);
  const a0 = T(37, 1.5) - 1e-6, a1 = T(38, 0) - 1e-6;
  const kept = E.filter((e) => !(e.t >= a0 && e.t < a1) || e.k === "shaker");
  E.length = 0; E.push(...kept);
  ([[37, 2, "tak"], [37, 2.5, "tak"], [37, 3, "dum"], [37, 3.5, "tak"]] as [number, number, "dum" | "tak"][]).forEach((c) => E.push({ t: T(c[0], c[1]), k: "drum", n: c[2], v: 0.4 }));
  kebyar(38, 0, 0.34); kebyar(39, 0, 0.42); E.push({ t: T(39, 0), k: "tatali", f: pf(5), v: 0.3, d: BAR_M * 0.9 });
  return E.sort((a, b) => a.t - b.t);
}

/** a strike from the film or a touch, moved into the song's own scale: the seven kakula kettles become ding dong deng dung dang ding' deng',
 * a given pitch goes to the nearest pelog tone, the gongs to gong ageng and kempur */
export function tune(e: Strike): Strike {
  if (e.k === "kettle") {
    let p: number;
    if (e.f) { let best = 1e9; p = 0; for (let q = -5; q <= 14; q++) { const d = Math.abs(Math.log(e.f / pf(q))); if (d < best) { best = d; p = q; } } }
    else p = [0, 1, 2, 3, 4, 5, 7][((e.n % 7) + 7) % 7] + (e.oct ? 5 : 0);
    return { ...e, f: pf(p), oct: false, pairHz: OMBAK_HZ, n: ((p % 7) + 7) % 7 };
  }
  if (e.k === "gong") return { ...e, f: e.n ? pf(-7) : pf(-10) };
  return e;
}

// the mark's reel: how far each layer has arrived at lt seconds into the song, and whether the mark breathes
export type Reveal = { R: Record<string, number>; ghost: number; breath: boolean; scene: string };
export const LAYERS = ["mountains", "gate-left", "gate-right", "palm-left", "palm-right", "pier", "railing", "pebbles", "pavilion", "flower-left", "flower-right", "wave-left", "wave-right", "bird-a", "bird-b", "bird-c"];
const SCENES: [string, number][] = [["title", 4], ["sea", 8], ["pavilion", 8], ["garden", 8], ["birds", 4], ["mark", 8]];
const ramp = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);
export function logoReveal(lt: number): Reveal {
  let at = 0, scene = "mark", local = lt;
  for (const [id, bars] of SCENES) { const d = bars * BAR_M; if (lt < at + d) { scene = id; local = lt - at; break; } at += d; }
  const R: Record<string, number> = {}, all = () => LAYERS.forEach((n) => (R[n] = 1));
  const out: Reveal = { R, ghost: 0, breath: false, scene };
  if (scene === "title") { all(); out.ghost = 0.14; }
  else if (scene === "sea") { R.pebbles = ramp(local, 0.3, 2); R["wave-left"] = R["wave-right"] = ramp(local, 1.5, 3.5); R.mountains = ramp(local, 4.2, 7); }
  else if (scene === "pavilion") { ["pebbles", "wave-left", "wave-right", "mountains"].forEach((n) => (R[n] = 1)); R.pier = ramp(local, 0.5, 2); R.railing = ramp(local, 0.7, 2.2); R.pavilion = ramp(local, 1.5, 4.5); R["gate-left"] = R["gate-right"] = ramp(local, 4.3, 7); out.breath = true; }
  else if (scene === "garden") { ["pebbles", "wave-left", "wave-right", "mountains", "pier", "railing", "pavilion", "gate-left", "gate-right"].forEach((n) => (R[n] = 1)); R["palm-left"] = ramp(local, 0.5, 3); R["palm-right"] = ramp(local, 1, 3.5); R["flower-left"] = ramp(local, 3.5, 6); R["flower-right"] = ramp(local, 4, 6.5); out.breath = true; }
  else if (scene === "birds") { all(); R["bird-a"] = ramp(local, 0.3, 2.5); R["bird-b"] = ramp(local, 0.8, 3); R["bird-c"] = ramp(local, 1.3, 3.5); out.breath = true; }
  else { all(); R.wordmark = scene === "mark" ? ramp(local, 0.5, 2.5) : 1; out.breath = true; }
  return out;
}
