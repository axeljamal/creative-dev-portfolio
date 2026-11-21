// The sound of Dua Pulau. The instruments are the welcome film's own (Marea Dvīpa's kettles, gongs and drum, and the
// kolintang's wooden bars for Windfall's D major pentatonic); the sea, the wind and the strait's drone are made here.
// Both tunings stand on the same D and share its fifth, A, so one can fade into the other as the boat crosses.
import { strike, unlock } from "../../welcome/sound";

const WF = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25];
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sea: GainNode | null = null;
let seaF: BiquadFilterNode | null = null;
let drone: GainNode | null = null;
let muted = false;

/** must run inside the tap that lights the lamp */
export function startAudio() {
  unlock();
  if (ctx) return void ctx.resume();
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  const c = new AC();
  master = c.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(c.destination);
  // the sea: two bands of looping noise, one low and rolling, one a hiss of foam, swelling slowly
  const buf = c.createBuffer(1, c.sampleRate * 3, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    last = (last + 0.03 * (Math.random() * 2 - 1)) / 1.03; // brown-ish noise
    d[i] = last * 4.5;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  seaF = c.createBiquadFilter();
  seaF.type = "lowpass";
  seaF.frequency.value = 500;
  sea = c.createGain();
  sea.gain.value = 0;
  const swell = c.createOscillator(), swellG = c.createGain();
  swell.frequency.value = 0.11;
  swellG.gain.value = 0.05;
  swell.connect(swellG).connect(sea.gain);
  src.connect(seaF).connect(sea).connect(master);
  src.start();
  swell.start();
  // the strait: a low D and the A above it, the two notes both tunings share
  drone = c.createGain();
  drone.gain.value = 0;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 500;
  drone.connect(lp).connect(master);
  [73.42, 110, 146.83, 220.4].forEach((f, i) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = i < 2 ? "sine" : "triangle";
    o.frequency.value = f;
    g.gain.value = i < 2 ? 0.5 : 0.12;
    o.connect(g).connect(drone!);
    o.start();
  });
  ctx = c;
}

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  if (ctx && master) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.06);
}
/** hidden tabs and closed worlds fall silent */
export function setAway(away: boolean) {
  if (!ctx) return;
  if (away) void ctx.suspend();
  else void ctx.resume();
}

/** every frame: how fast she sails (0…1) and how deep in the strait she is (0…1) */
export function ambience(speed: number, strait: number, lit: number) {
  if (!ctx || !sea || !seaF || !drone) return;
  const t = ctx.currentTime;
  sea.gain.setTargetAtTime((0.1 + speed * 0.12) * lit, t, 0.4);
  seaF.frequency.setTargetAtTime(380 + speed * 900, t, 0.4);
  drone.gain.setTargetAtTime((0.012 + strait * 0.05) * lit, t, 0.8);
}

const live = () => !muted;
export const kettle = (n: number, v = 0.4, at = 0) => live() && strike([{ k: "kettle", n: ((n % 7) + 7) % 7, v, at }]);
export const gong = (v = 0.5, at = 0) => live() && strike([{ k: "gong", n: 0, v, at }]);
export const bar = (i: number, v = 0.4, at = 0) => live() && strike([{ k: "kolintang", n: i % 7, f: WF[i % 7], v, at }]);
export const bump = () => live() && strike([{ k: "drum", n: "dum", v: 0.7 }]);

/** the lamp catches: a gong, then the kettles climb */
export function lampLit() {
  gong(0.6);
  [0, 2, 3, 4, 6].forEach((n, i) => kettle(n, 0.34, 0.9 + i * 0.24));
}
/** arriving somewhere: kettles and a gong in the west, wooden bars in the east, both at the medallion */
export function arrive(island: "md" | "wf" | "strait") {
  if (island !== "wf") {
    gong(0.42);
    [0, 3, 4, 6].forEach((n, i) => kettle(n, 0.3, 0.12 + i * 0.13));
  }
  if (island !== "md") [0, 2, 3, 5].forEach((n, i) => bar(n, 0.36, (island === "strait" ? 0.7 : 0) + i * 0.11));
}
/** Pip says hello */
export function boop() {
  if (!ctx || !master || muted) return;
  const t = ctx.currentTime + 0.01, o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(520, t);
  o.frequency.exponentialRampToValueAtTime(880, t + 0.12);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.2, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.3);
}

// a wandering tune that never repeats: it leans on D and A, and takes its notes from whichever waters she is in
let step = 0;
const WALK = [0, 3, 4, 3, 6, 4, 3, 1, 0, 4, 3, 5, 4, 2, 3, 0];
export function phrase(east: number) {
  step++;
  if (Math.random() < 0.42) return;
  const n = WALK[(step + Math.floor(Math.random() * 2)) % WALK.length];
  if (Math.random() < east) bar(n, 0.2);
  else kettle(n, 0.19);
  if (step % 16 === 0 && east < 0.5) gong(0.22);
}
