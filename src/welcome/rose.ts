// The Bomba Rose chapter, ported from Marea Dvīpa's welcome: the rose growing its petal rings in the centre while the
// ring section of Bunga Kaili plays, drawn on a canvas with the Media Lab's own drawRose(). Around it sit the seven
// kakula kettles and two gongs, lit by the music; a golden-angle seed field turns behind. Spin the rose, tap a ring to
// hear its petals, tap the heart for a gong, tap a kettle or gong to play it, and switch the golden turn off.
import { GA } from "./tempo";
import type { Strike } from "./sound";

const TAU = Math.PI * 2;
const PHI = (1 + Math.sqrt(5)) / 2;
const RING_R = [0.84, 0.6, 0.38, 0.22];
const KAILI = [440, 523.25, 587.33, 659.26, 783.99, 880, 987.77];
const GOLD = "#E0C27E";
const GOLD2 = "#C39B65";
const LINE2 = "#4A4032";
const PAPER = "#F4EEE3";
// Buya Bomba ink: gold on black
const INK = { a: "#C9A35A", b: "#E0C27E", c: "#B08A45", line: "#0E0C09", heart: "#0E0C09", spiral: "#E0C27E" };

export type RoseMotif = { rings: number[]; prog: number[]; heart: number; ring: number; bar: number };
export type Levels = { kettle: number[]; gong: number[]; drum: number };
type Burst = { x: number; y: number; vx: number; vy: number; life: number; r: number; color: string };
type Geo = { cx: number; cy: number; s: number; kettles: [number, number, number][]; gongs: [number, number, number][]; dpr: number };

export function createRose() {
  return {
    rot: 0, vel: 0, spin: 1, spinTarget: 1, clock: 0,
    ringFlash: [0, 0, 0, 0], kFlash: [0, 0, 0, 0, 0, 0, 0], gFlash: [0, 0], heartFlash: 0,
    bursts: [] as Burst[], queue: [] as { k: number; at: number }[],
    drag: null as null | { last: number; t: number; moved: boolean; x: number; y: number },
    geo: null as Geo | null,
  };
}
export type Rose = ReturnType<typeof createRose>;

function lens(c: CanvasRenderingContext2D, len: number, wid: number) {
  c.beginPath();
  c.moveTo(-len / 2, 0);
  c.quadraticCurveTo(0, -wid, len / 2, 0);
  c.quadraticCurveTo(0, wid, -len / 2, 0);
  c.closePath();
}

// petal rings, outer to inner, each turned by the golden angle from the ring outside it, then the golden-spiral heart
function drawRose(c: CanvasRenderingContext2D, s: number, m: RoseMotif, spin: number) {
  const lw = Math.max(0.8, s * 0.014);
  const DEP = [0.22, 0.19, 0.32, 0.26];
  c.save();
  c.lineJoin = "round";
  c.lineCap = "round";
  m.rings.forEach((n, k) => {
    const pr = m.prog[k];
    if (!(pr > 0)) return;
    const r = RING_R[k] * s;
    const off = k * GA * spin - Math.PI / 2;
    const shown = Math.ceil(n * pr - 1e-6);
    for (let j = 0; j < shown; j++) {
      const a = off + (j * TAU) / n;
      const grow = Math.min(1, n * pr - j);
      c.save();
      c.translate(Math.cos(a) * r, Math.sin(a) * r);
      if (k < 2) {
        c.rotate(a + Math.PI / 2);
        c.scale(grow, grow);
        c.beginPath();
        c.ellipse(0, 0, ((Math.PI * r) / n) * 1.12, DEP[k] * s * 0.5, 0, 0, TAU);
        c.fillStyle = INK.a;
      } else {
        c.rotate(a + 0.35);
        c.scale(grow, grow);
        lens(c, DEP[k] * s * 1.15, DEP[k] * s * 0.55);
        c.fillStyle = INK.c;
      }
      c.fill();
      c.strokeStyle = INK.line;
      c.lineWidth = lw;
      c.stroke();
      c.restore();
    }
  });
  if (m.heart > 0) {
    const hr = s * 0.17 * Math.min(1, m.heart * 1.6);
    c.fillStyle = INK.heart;
    c.beginPath();
    c.arc(0, 0, hr, 0, TAU);
    c.fill();
    c.strokeStyle = INK.line;
    c.lineWidth = lw;
    c.stroke();
    const b = Math.log(PHI) / (Math.PI / 2);
    const maxT = 4.4 * Math.PI * Math.min(1, m.heart);
    c.strokeStyle = INK.spiral;
    c.lineWidth = Math.max(0.8, s * 0.03);
    c.beginPath();
    for (let th = 0, first = true; th <= maxT; th += 0.08) {
      const rr = hr * 0.05 * Math.exp(b * th * 0.55);
      if (rr > hr * 0.82) break;
      if (first) c.moveTo(Math.cos(th) * rr, Math.sin(th) * rr);
      else c.lineTo(Math.cos(th) * rr, Math.sin(th) * rr);
      first = false;
    }
    c.stroke();
  }
  c.restore();
}

// notes for ring k, the way the Media Lab's "Hear the rings" plays them: each petal's angle picks a kettle of the Kaili set
function ringNotes(k: number, n: number, spin: number, start = 0): Strike[] {
  const out: Strike[] = [];
  for (let j = 0; j < n; j++) {
    let a = (k * GA * spin + (j * TAU) / n) % TAU;
    if (a < 0) a += TAU;
    const i = Math.floor((a / TAU) * 7) % 7;
    out.push({ k: "kettle", n: i, f: KAILI[i], v: 0.4 - k * 0.04, soft: k >= 2, at: start + (j * 0.9) / Math.max(3, n) });
  }
  return out;
}

function burst(R: Rose, x: number, y: number, n: number, spread: number, color: string) {
  for (let i = 0; i < n; i++) {
    const a = i * GA + Math.random() * 0.4;
    const sp = spread * (0.5 + Math.random() * 0.8);
    R.bursts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, r: 1.5 + Math.random() * 2.5, color });
  }
  if (R.bursts.length > 500) R.bursts.splice(0, R.bursts.length - 500);
}

/** one frame, in device pixels */
export function drawRoseStage(g: CanvasRenderingContext2D, W: number, H: number, dpr: number, R: Rose, m: RoseMotif, lv: Levels, dt: number) {
  R.clock += dt;
  const cx = W / 2;
  const cy = H * 0.45;
  const s = Math.min(W * (W < H ? 0.31 : 0.25), H * 0.25);
  const { kettle, gong, drum } = lv;

  // physics: the rose keeps turning slowly, carries a flick, and eases into or out of the golden turn
  if (!R.drag) {
    R.rot += (R.vel + 0.05) * dt;
    R.vel *= Math.pow(0.94, dt * 60);
  }
  R.spin += (R.spinTarget - R.spin) * Math.min(1, dt * 3);
  R.ringFlash = R.ringFlash.map((v) => Math.max(0, v - dt * 1.6));
  R.kFlash = R.kFlash.map((v) => Math.max(0, v - dt * 2.4));
  R.gFlash = R.gFlash.map((v) => Math.max(0, v - dt * 0.9));
  R.heartFlash = Math.max(0, R.heartFlash - dt * 1.2);
  R.queue = R.queue.filter((q) => {
    if (R.clock >= q.at) {
      R.ringFlash[q.k] = 1;
      return false;
    }
    return true;
  });

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);

  // a golden-angle seed field turning behind everything, brightening with the kettles
  const c = Math.max(W, H) * 0.036;
  g.fillStyle = GOLD2;
  for (let i = 1; i < 420; i++) {
    const r = c * Math.sqrt(i);
    const a = i * GA + R.rot * 0.25 + R.clock * 0.02;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue;
    const near = Math.max(0, 1 - r / (s * 4.5));
    const lit = kettle[i % 7];
    g.globalAlpha = 0.05 + near * 0.12 + lit * 0.35 * near;
    g.beginPath();
    g.arc(x, y, (1 + near * 1.6 + lit * 1.5) * dpr, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;

  // the gongs bloom a halo behind the rose
  const halo = Math.max(gong[0], gong[1], R.gFlash[0], R.gFlash[1], R.heartFlash * 0.8);
  const hg = g.createRadialGradient(cx, cy, s * 0.3, cx, cy, s * (1.5 + halo * 0.35));
  hg.addColorStop(0, `rgba(224,194,126,${0.1 + halo * 0.22})`);
  hg.addColorStop(1, "rgba(224,194,126,0)");
  g.fillStyle = hg;
  g.beginPath();
  g.arc(cx, cy, s * 1.9, 0, TAU);
  g.fill();

  // ring guides: where each ring will sit, the growing one brightest
  m.rings.forEach((_, k) => {
    const f = R.ringFlash[k];
    const cur = k === m.ring && m.prog[k] < 1;
    g.strokeStyle = f > 0 ? GOLD : GOLD2;
    g.globalAlpha = 0.12 + (cur ? 0.25 : 0) + f * 0.7;
    g.lineWidth = (1 + f * 3) * dpr;
    g.setLineDash(cur ? [3 * dpr, 6 * dpr] : []);
    g.beginPath();
    g.arc(cx, cy, RING_R[k] * s, 0, TAU);
    g.stroke();
  });
  g.setLineDash([]);
  g.globalAlpha = 1;

  // the rose, breathing with the drum
  const pulse = 1 + drum * 0.025 + R.heartFlash * 0.05 + Math.max(...R.ringFlash) * 0.02;
  g.save();
  g.translate(cx, cy);
  g.rotate(R.rot);
  g.scale(pulse, pulse);
  drawRose(g, s, m, R.spin);
  g.restore();

  // the ensemble: seven kakula kettles around the rose, two gongs at its sides
  const kr = s * 1.3;
  const kSize = Math.max(7 * dpr, s * 0.06);
  const kettles: [number, number, number][] = [];
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + Math.PI / 7 + (i * TAU) / 7;
    const x = cx + Math.cos(a) * kr;
    const y = cy + Math.sin(a) * kr;
    const lvl = Math.max(kettle[i], R.kFlash[i]);
    kettles.push([x, y, kSize * 1.8]);
    g.fillStyle = LINE2;
    g.beginPath();
    g.arc(x, y, kSize, 0, TAU);
    g.fill();
    g.strokeStyle = GOLD2;
    g.globalAlpha = 0.5;
    g.lineWidth = dpr;
    g.beginPath();
    g.arc(x, y, kSize * 0.45, 0, TAU);
    g.stroke();
    g.globalAlpha = 1;
    if (lvl > 0.01) {
      g.globalAlpha = lvl;
      g.fillStyle = GOLD;
      g.beginPath();
      g.arc(x, y, kSize * (1 + lvl * 0.35), 0, TAU);
      g.fill();
      g.globalAlpha = lvl * 0.35;
      g.beginPath();
      g.arc(x, y, kSize * (1.6 + lvl), 0, TAU);
      g.fill();
      g.globalAlpha = 1;
    }
  }
  const gx = Math.min(s * 1.95, W / 2 - s * 0.25);
  const gR = s * 0.14;
  const gongs: [number, number, number][] = [];
  [-1, 1].forEach((side, n) => {
    const x = cx + side * gx;
    const lvl = Math.max(gong[n], R.gFlash[n]);
    gongs.push([x, cy, gR * 1.4]);
    g.strokeStyle = LINE2;
    g.lineWidth = 3 * dpr;
    g.beginPath();
    g.arc(x, cy, gR, 0, TAU);
    g.stroke();
    g.beginPath();
    g.arc(x, cy, gR * 0.3, 0, TAU);
    g.fillStyle = LINE2;
    g.fill();
    if (lvl > 0.01) {
      g.globalAlpha = lvl;
      g.strokeStyle = GOLD;
      g.lineWidth = (2 + lvl * 3) * dpr;
      g.beginPath();
      g.arc(x, cy, gR * (1 + lvl * 0.4), 0, TAU);
      g.stroke();
      g.globalAlpha = 1;
    }
  });

  // sparks from taps
  for (const b of R.bursts) {
    b.x += b.vx * dt * dpr;
    b.y += b.vy * dt * dpr;
    b.vx *= 0.96;
    b.vy = b.vy * 0.96 + 30 * dt;
    b.life -= dt * 0.9;
    if (b.life <= 0) continue;
    g.globalAlpha = b.life;
    g.fillStyle = b.color;
    g.beginPath();
    g.arc(b.x, b.y, b.r * dpr * b.life, 0, TAU);
    g.fill();
  }
  R.bursts = R.bursts.filter((b) => b.life > 0);
  g.globalAlpha = 1;

  // where we are in the making
  const done = m.prog[3] >= 1;
  const label = done ? m.rings.join(" · ") + (R.spinTarget ? " · golden turn" : " · no turn") : `Ring ${m.ring + 1} · ${m.rings[m.ring]} petals`;
  g.font = `500 ${Math.round(13 * dpr)}px 'IBM Plex Mono', Menlo, monospace`;
  g.textAlign = "center";
  g.fillStyle = GOLD;
  g.fillText(label.toUpperCase(), cx, cy - kr - 4 * dpr);
  g.fillStyle = PAPER;
  g.globalAlpha = 0.55;
  g.font = `400 ${Math.round(11 * dpr)}px 'IBM Plex Mono', Menlo, monospace`;
  g.fillText(`BAR ${Math.min(16, Math.floor(m.bar) + 1)} / 16 · BUNGA KAILI`, cx, cy - kr + 14 * dpr);
  g.globalAlpha = 1;

  R.geo = {
    cx: cx / dpr, cy: cy / dpr, s: s / dpr, dpr,
    kettles: kettles.map(([x, y, r]) => [x / dpr, y / dpr, r / dpr]),
    gongs: gongs.map(([x, y, r]) => [x / dpr, y / dpr, r / dpr]),
  };
}

// pointer input, in CSS pixels relative to the canvas; returns true when the rose took the gesture
export function roseDown(R: Rose, x: number, y: number) {
  const G = R.geo;
  if (!G || Math.hypot(x - G.cx, y - G.cy) > G.s * 1.05) return false;
  R.drag = { last: Math.atan2(y - G.cy, x - G.cx), t: performance.now(), moved: false, x, y };
  R.vel = 0;
  return true;
}
export function roseMove(R: Rose, x: number, y: number) {
  const D = R.drag;
  const G = R.geo;
  if (!D || !G) return;
  if (Math.hypot(x - D.x, y - D.y) > 6) D.moved = true;
  const a = Math.atan2(y - G.cy, x - G.cx);
  const now = performance.now();
  let da = a - D.last;
  if (da > Math.PI) da -= TAU;
  if (da < -Math.PI) da += TAU;
  R.rot += da;
  R.vel = R.vel * 0.6 + (da / Math.max(0.008, (now - D.t) / 1000)) * 0.4;
  D.last = a;
  D.t = now;
}
/** ends a drag; a tap (no movement) plays what was tapped. Returns sound to play, or null. */
export function roseUp(R: Rose, x: number, y: number, m: RoseMotif) {
  const D = R.drag;
  R.drag = null;
  if (D && D.moved) {
    R.vel = Math.max(-9, Math.min(9, R.vel));
    return null;
  }
  return roseTap(R, x, y, m);
}
// a tap: on a ring plays its petals, on the heart rings a gong, on a kettle or gong plays it
export function roseTap(R: Rose, x: number, y: number, m: RoseMotif): Strike[] | null {
  const G = R.geo;
  if (!G) return null;
  const dpr = G.dpr;
  for (let i = 0; i < G.kettles.length; i++) {
    const [kx, ky, kr] = G.kettles[i];
    if (Math.hypot(x - kx, y - ky) < kr) {
      R.kFlash[i] = 1;
      burst(R, kx * dpr, ky * dpr, 14, 140, GOLD);
      return [{ k: "kettle", n: i, v: 0.5 }];
    }
  }
  for (let n = 0; n < G.gongs.length; n++) {
    const [gx, gy, gr] = G.gongs[n];
    if (Math.hypot(x - gx, y - gy) < gr) {
      R.gFlash[n] = 1;
      burst(R, gx * dpr, gy * dpr, 22, 110, GOLD2);
      return [{ k: "gong", n: n as 0 | 1, v: 0.55 }];
    }
  }
  const d = Math.hypot(x - G.cx, y - G.cy) / G.s;
  if (d > 1.05) return null;
  if (d < 0.17 && m.heart > 0) {
    R.heartFlash = 1;
    burst(R, G.cx * dpr, G.cy * dpr, 34, 220, GOLD);
    return [{ k: "gong", n: 0, v: 0.45 }, { k: "kettle", n: 0, v: 0.35, at: 0.2 }, { k: "kettle", n: 4, v: 0.3, at: 0.4 }];
  }
  let best = -1;
  let bd = 1e9;
  RING_R.forEach((r, k) => {
    const dd = Math.abs(d - r);
    if (dd < bd && m.prog[k] > 0) {
      bd = dd;
      best = k;
    }
  });
  if (best < 0) return null;
  R.ringFlash[best] = 1;
  burst(R, x * dpr, y * dpr, 10 + m.rings[best], 160, GOLD);
  return ringNotes(best, m.rings[best], R.spinTarget);
}
/** all four rings, outer to inner, each lighting as it plays */
export function hearAll(R: Rose, m: RoseMotif): Strike[] {
  const out: Strike[] = [];
  let at = 0;
  m.rings.forEach((n, k) => {
    R.queue.push({ k, at: R.clock + at });
    out.push(...ringNotes(k, n, R.spinTarget, at));
    at += 1.15;
  });
  return out;
}
