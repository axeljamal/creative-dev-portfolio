// The welcome's instruments, ported from the Marea Dvīpa Media Lab: seven kakula kettles, two tawa-tawa gongs, the
// gimba drum, gamba-gamba (wooden bars), low gongs and the loom, synthesized with Web Audio into a small open-pavilion
// reverb. Nothing loads; it all runs on oscillators and noise.

export type Strike =
  | { k: "kettle"; n: number; v: number; at?: number; oct?: boolean; soft?: boolean; f?: number; d?: number }
  | { k: "gong"; n: 0 | 1; v: number; at?: number; f?: number }
  | { k: "drum"; n: "dum" | "tak"; v: number; at?: number }
  | { k: "kolintang"; n: number; f: number; v: number; at?: number }
  | { k: "bassgong"; f: number; v: number; at?: number }
  | { k: "beater" | "shuttle"; v: number; at?: number };

// the kettles drift a few cents from true; the tuning is Marea Dvīpa's own
const ROOT = 293.66;
const CENTS = [0, 300, 500, 700, 1000, 1200, 1400];
const DRIFT = [8, -12, 5, -6, 14, -4, 10];

let ctx: AudioContext | null = null;
let bus: GainNode | null = null;
let noise: AudioBuffer | null = null;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const c = new AC();
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 2.5;
  const makeup = c.createGain();
  makeup.gain.value = 1.5; // phone speakers need level
  const lim = c.createDynamicsCompressor();
  lim.threshold.value = -2.5;
  lim.knee.value = 0;
  lim.ratio.value = 20;
  comp.connect(makeup).connect(lim).connect(c.destination);

  const dry = c.createGain();
  dry.connect(comp);
  const conv = c.createConvolver();
  const len = Math.floor(c.sampleRate * 2.6);
  const ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  conv.buffer = ir;
  const wet = c.createGain();
  wet.gain.value = 0.32;
  dry.connect(wet).connect(conv).connect(comp);

  const nb = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  noise = nb;
  ctx = c;
  bus = dry;
  return c;
}

/** Start audio. Must run inside a tap or click, or phones stay silent. */
export function unlock(): boolean {
  const c = ensure();
  if (!c) return false;
  try {
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) session.type = "playback"; // iOS: play through the silent switch
  } catch {
    // older browsers
  }
  void c.resume();
  const src = c.createBufferSource();
  src.buffer = c.createBuffer(1, 1, 22050);
  src.connect(c.destination);
  src.start(0);
  return true;
}

function env(g: GainNode, when: number, peak: number, atk: number, dec: number) {
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(peak, when + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, when + atk + dec);
}

function tone(when: number, f: number, peak: number, atk: number, dec: number, type: OscillatorType = "sine", f0?: number) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  if (f0) {
    o.frequency.setValueAtTime(f0, when);
    o.frequency.exponentialRampToValueAtTime(f, when + Math.min(0.3, dec * 0.3));
  } else o.frequency.setValueAtTime(f, when);
  env(g, when, peak, atk, dec);
  o.connect(g).connect(bus!);
  o.start(when);
  o.stop(when + atk + dec + 0.05);
}

function noiseHit(when: number, peak: number, dec: number, type: BiquadFilterType, freq: number, q = 1, sweepTo?: number) {
  const c = ctx!;
  const s = c.createBufferSource();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  s.buffer = noise;
  s.loop = true;
  f.type = type;
  f.frequency.setValueAtTime(freq, when);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, when + dec);
  f.Q.value = q;
  env(g, when, peak, 0.003, dec);
  s.connect(f).connect(g).connect(bus!);
  s.start(when, Math.random() * 0.5);
  s.stop(when + dec + 0.05);
}

// when each kettle, gong and the drum last sounded (audio clock), so the stage can light them with the music
const hits = { kettle: [-9, -9, -9, -9, -9, -9, -9], gong: [-9, -9], drum: -9 };

function play(e: Strike, when: number) {
  const v = e.v;
  if (e.k === "kettle") hits.kettle[e.n % 7] = Math.max(hits.kettle[e.n % 7], when);
  else if (e.k === "gong") hits.gong[e.n] = Math.max(hits.gong[e.n], when);
  else if (e.k === "drum") hits.drum = Math.max(hits.drum, when);
  if (e.k === "kolintang") {
    tone(when, e.f, v * 0.5, 0.002, 0.55);
    tone(when, e.f * 3.92, v * 0.16, 0.001, 0.12);
    tone(when, e.f * 9.2, v * 0.05, 0.001, 0.04);
    noiseHit(when, v * 0.1, 0.018, "bandpass", 1800, 1);
  } else if (e.k === "bassgong") {
    tone(when, e.f, v * 0.7, 0.006, 1.4, "sine", e.f * 1.01);
    tone(when, e.f * 2, v * 0.3, 0.004, 0.8);
    tone(when, e.f * 3.01, v * 0.12, 0.003, 0.4);
  } else if (e.k === "beater") {
    tone(when, 92, v * 0.6, 0.002, 0.12, "sine", 150);
    noiseHit(when, v * 0.35, 0.05, "bandpass", 520, 2.5);
  } else if (e.k === "shuttle") {
    noiseHit(when, v * 0.6, 0.32, "bandpass", 1300, 2.2, 3400);
  } else if (e.k === "kettle") {
    // bossed kettle gong: strong fundamental, a near-unison beat and two inharmonic partials
    const f = e.f ?? ROOT * Math.pow(2, (CENTS[e.n] + DRIFT[e.n]) / 1200) * (e.oct ? 2 : 1);
    const d = e.d ?? 1.5;
    const atk = e.soft ? 0.012 : 0.004;
    tone(when, f, v * 0.5, atk, d, "sine", f * 1.004);
    tone(when, f * 1.0035, v * 0.22, atk, d * 0.9);
    tone(when, f * 2.76, v * (e.soft ? 0.06 : 0.14), 0.002, d * 0.35);
    if (!e.soft) tone(when, f * 5.4, v * 0.05, 0.002, d * 0.15);
    noiseHit(when, v * (e.soft ? 0.035 : 0.12), 0.025, "bandpass", e.soft ? 1800 : 2600, 1.2);
  } else if (e.k === "gong") {
    // hanging gong: low, slow bloom, beating pair
    const f = e.f ?? (e.n ? 110 : 98);
    tone(when, f, v * 0.55, 0.02, 5.5, "sine", f * 1.015);
    tone(when, f * 1.006, v * 0.4, 0.02, 5);
    tone(when, f * 2.01, v * 0.3, 0.015, 3.4);
    tone(when, f * 2.98, v * 0.18, 0.01, 2.2);
    tone(when, f * 4.1, v * 0.09, 0.01, 1.4);
  } else if (e.k === "drum" && e.n === "dum") {
    tone(when, 72, v * 0.9, 0.003, 0.36, "sine", 150);
    tone(when, 180, v * 0.3, 0.003, 0.18, "triangle", 260);
    noiseHit(when, v * 0.22, 0.05, "lowpass", 900, 0.7);
  } else if (e.k === "drum") {
    tone(when, 210, v * 0.5, 0.002, 0.12, "sine", 330);
    noiseHit(when, v * 0.3, 0.06, "bandpass", 1800, 1.4);
  }
}

/** Ring these now, each `at` seconds later. Silent until unlock() has run. */
export function strike(evs: Strike[]) {
  if (!ctx || !bus || ctx.state !== "running") return;
  const now = ctx.currentTime + 0.01;
  for (const e of evs) play(e, now + (e.at ?? 0));
}

/** How brightly each kettle, gong and the drum is sounding now, 0–1, for drawing the ensemble. */
export function levels() {
  const now = ctx && ctx.state === "running" ? ctx.currentTime : -99;
  const glow = (t: number, dec: number) => (now >= t ? Math.exp(-(now - t) / dec) : 0);
  return {
    kettle: hits.kettle.map((t) => glow(t, 0.35)),
    gong: hits.gong.map((t) => glow(t, 1.4)),
    drum: glow(hits.drum, 0.12),
  };
}
