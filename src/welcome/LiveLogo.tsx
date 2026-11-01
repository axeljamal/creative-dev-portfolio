// The living mark from Marea Dvīpa, made into the portfolio's way in. The logo's layers (public/logo, day and night sets)
// are placed by layout.json and shown whole. Left alone it keeps moving: the waves bob, the birds fly their loops, the palms
// sway, the frangipani pulses, the pavilion breathes. It leans with the pointer, each layer at its own depth. While the mark's
// own gamelan plays, `live()` hands in each layer's reveal and the ensemble's levels, and the mark builds itself to the music.
// Every part answers a touch with a spring and a note, found by the layers' own pixels. Each part is also a door into the
// portfolio: hover names it and says where it leads, a tap opens a small card, a second tap (or Enter) goes there.
import { useEffect, useRef, useState, type KeyboardEvent as RKeyboardEvent, type PointerEvent as RPointerEvent } from "react";
import type { Strike } from "./sound";

export type Guide = { to: string; blurb: string; href?: string; act?: string; sound?: boolean; external?: boolean };
export type Live = { R: Record<string, number>; ghost: number; breath: boolean; lv: { kettle: number[]; gong: number[]; drum: number } | null };
type Point = { clientX: number; clientY: number };
type Props = {
  className?: string;
  set: "day" | "night";
  live?: () => Live | null;
  guide?: Record<string, Guide>;
  onTap?: (name: string, label: string, evs: Strike[], e: Point) => void;
  onHold?: (on: boolean) => void;
  onGo?: (g: Guide, name: string) => void;
  label?: string;
};

const LAYOUT: [string, number, number, number, number][] = [["mountains", 0.0156, 0.4844, 0.9531, 0.1719], ["gate-left", 0.3438, 0.125, 0.1094, 0.2031], ["gate-right", 0.5469, 0.125, 0.1094, 0.2031], ["palm-left", 0.1406, 0.25, 0.2031, 0.2031], ["palm-right", 0.6406, 0.25, 0.2188, 0.2031],
  ["pier", 0.0313, 0.6094, 0.1719, 0.0938], ["railing", 0.7969, 0.625, 0.1719, 0.0781], ["pebbles", 0, 0.3711, 1, 0.4287], ["pavilion", 0.2188, 0.1875, 0.5625, 0.5625], ["flower-left", 0.125, 0.4375, 0.1563, 0.3125], ["flower-right", 0.7188, 0.4375, 0.1563, 0.3125],
  ["wave-left", 0.0156, 0.6875, 0.375, 0.1094], ["wave-right", 0.6094, 0.6875, 0.3594, 0.1094], ["bird-a", 0.1094, 0.4219, 0.0625, 0.0469], ["bird-b", 0.0781, 0.4844, 0.0469, 0.0313], ["bird-c", 0.8281, 0.4219, 0.0781, 0.0469]];
const TOP = 0.125, HGT = 0.675; // the scene without the wordmark spans this much of the logo's square
const LABEL: Record<string, string> = { mountains: "The mountains", "gate-left": "Candi bentar", "gate-right": "Candi bentar", "palm-left": "A palm", "palm-right": "A palm", pier: "The pier", railing: "The railing", pebbles: "The pebbles", pavilion: "The pavilion",
  "flower-left": "Frangipani", "flower-right": "Frangipani", "wave-left": "The sea", "wave-right": "The sea", "bird-a": "A bird", "bird-b": "A bird", "bird-c": "A bird" };
const DEPTH: Record<string, number> = { mountains: 0.35, pebbles: 0.6, pier: 0.7, railing: 0.7, "gate-left": 0.8, "gate-right": 0.8, "palm-left": 0.9, "palm-right": 0.9, pavilion: 1, "flower-left": 1.2, "flower-right": 1.2, "wave-left": 1.3, "wave-right": 1.3, "bird-a": 1.1, "bird-b": 1.05, "bird-c": 1.1 };
const ORIGIN: Record<string, string> = { "palm-left": "50% 100%", "palm-right": "50% 100%", "flower-left": "50% 100%", "flower-right": "50% 100%", pavilion: "50% 90%", "gate-left": "50% 100%", "gate-right": "50% 100%", pier: "0% 100%", railing: "100% 100%" };
// the order the keyboard walks the parts
const WALK = ["pavilion", "gate-left", "gate-right", "palm-left", "palm-right", "flower-left", "flower-right", "mountains", "pier", "railing", "wave-left", "wave-right", "pebbles", "bird-a", "bird-b", "bird-c"];
// what each part does when touched: a spring impulse (s scale, r turn, y lift, x push, fly) and the notes it rings
type Touch = { s?: number; r?: number; y?: number; x?: number; fly?: number; evs: Strike[] };
const TOUCH: Record<string, Touch> = {
  pavilion: { s: 0.09, y: -6, evs: [{ k: "gong", n: 0, v: 0.45 }, { k: "kettle", n: 0, v: 0.35, at: 0.2 }, { k: "kettle", n: 4, v: 0.3, at: 0.4 }] },
  "gate-left": { x: -10, y: -4, evs: [{ k: "gong", n: 1, v: 0.4 }] }, "gate-right": { x: 10, y: -4, evs: [{ k: "gong", n: 1, v: 0.4 }] },
  "palm-left": { r: -0.28, evs: [{ k: "kettle", n: 3, v: 0.45 }, { k: "kettle", n: 4, v: 0.25, at: 0.15, soft: true }] }, "palm-right": { r: 0.28, evs: [{ k: "kettle", n: 4, v: 0.45 }, { k: "kettle", n: 3, v: 0.25, at: 0.15, soft: true }] },
  "flower-left": { s: 0.3, evs: [{ k: "kettle", n: 5, v: 0.45, oct: true }] }, "flower-right": { s: 0.3, evs: [{ k: "kettle", n: 2, v: 0.45, oct: true }] },
  "wave-left": { y: -8, s: 0.08, evs: [{ k: "drum", n: "dum", v: 0.5 }, { k: "kettle", n: 1, v: 0.25, at: 0.1, soft: true }] }, "wave-right": { y: -8, s: 0.08, evs: [{ k: "drum", n: "dum", v: 0.5 }, { k: "kettle", n: 2, v: 0.25, at: 0.1, soft: true }] },
  mountains: { y: -4, evs: [{ k: "gong", n: 0, v: 0.5 }] },
  pebbles: { y: -2, s: 0.02, evs: [{ k: "drum", n: "mute", v: 0.4 }, { k: "drum", n: "dum", v: 0.3, at: 0.12 }] },
  pier: { r: 0.08, evs: [{ k: "kettle", n: 0, v: 0.4 }] }, railing: { r: -0.08, evs: [{ k: "kettle", n: 1, v: 0.4 }] },
  "bird-a": { fly: 1, evs: [{ k: "kettle", n: 6, v: 0.35, oct: true }, { k: "kettle", n: 5, v: 0.25, at: 0.12, oct: true, soft: true }] },
  "bird-b": { fly: 1, evs: [{ k: "kettle", n: 5, v: 0.35, oct: true }] },
  "bird-c": { fly: -1, evs: [{ k: "kettle", n: 6, v: 0.35, oct: true }, { k: "kettle", n: 4, v: 0.25, at: 0.12, oct: true, soft: true }] },
};
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const eo = (x: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
const HOT = "drop-shadow(0 0 10px rgb(224 194 126 / 0.95)) drop-shadow(0 0 2px rgb(224 194 126 / 0.9)) drop-shadow(0 10px 18px rgb(0 0 0 / 0.45))";

type Spring = Record<string, number>;
function spring(st: Spring, key: string, k: number, c: number, dt: number) { // one damped spring per property, settling back to rest
  const v = (st[key + "v"] || 0) + (-k * (st[key] || 0) - c * (st[key + "v"] || 0)) * dt;
  st[key + "v"] = v; st[key] = (st[key] || 0) + v * dt;
}
type Motion = { x: number; y: number; s: number; r: number; sy: number };
// the idle life of each layer at time t (seconds): x, y in % of the layer, s scale, r radians, sy a vertical scale for the birds' wings
function idle(name: string, t: number): Motion {
  const o: Motion = { x: 0, y: 0, s: 1, r: 0, sy: 1 };
  if (reduceMotion) return o;
  switch (name) {
    case "wave-left": o.x = Math.sin(t * 1.1) * 1.6; o.y = Math.sin(t * 2.2) * 2; break;
    case "wave-right": o.x = -Math.sin(t * 1.1 + 0.6) * 1.6; o.y = Math.sin(t * 2.2 + 1) * 2; break;
    case "mountains": o.y = Math.sin(t * 0.5) * 0.4; break;
    case "pavilion": o.s = 1 + Math.sin(t * 1.6) * 0.006; break;
    case "gate-left": case "gate-right": o.y = Math.sin(t * 0.8) * 0.5; break;
    case "palm-left": o.r = Math.sin(t * 0.9) * 0.035; break;
    case "palm-right": o.r = -Math.sin(t * 0.9 + 1.2) * 0.035; break;
    case "flower-left": o.s = 1 + Math.sin(t * 1.3) * 0.025; break;
    case "flower-right": o.s = 1 + Math.sin(t * 1.3 + 2) * 0.025; break;
    case "bird-a": o.x = Math.sin(t * 0.35) * 90; o.y = -Math.abs(Math.sin(t * 0.7)) * 40; o.sy = 1 + Math.sin(t * 9) * 0.14; break;
    case "bird-b": o.x = Math.cos(t * 0.28) * 70; o.y = Math.sin(t * 0.56) * 30; o.sy = 1 + Math.sin(t * 8 + 1) * 0.14; break;
    case "bird-c": o.x = -Math.sin(t * 0.32 + 1) * 80; o.y = -Math.abs(Math.sin(t * 0.64 + 1)) * 36; o.sy = 1 + Math.sin(t * 9.5 + 2) * 0.14; break;
    default: break;
  }
  return o;
}
// how a layer arrives while the reel reveals it (e = eased reveal), and how it moves with the ensemble (k kettles, g gongs, dr drum)
function arrive(name: string, e: number, k: number[], g: number[], dr: number): Omit<Motion, "sy"> {
  const o = { x: 0, y: 0, s: 1, r: 0 };
  switch (name) {
    case "mountains": o.y = (1 - e) * 55; o.s = 1 + g[0] * 0.02; break;
    case "pebbles": o.y = (1 - e) * 12; break;
    case "wave-left": o.x = -(1 - e) * 70; o.y = -dr * 12; break;
    case "wave-right": o.x = (1 - e) * 70; o.y = -dr * 12; break;
    case "pier": case "railing": o.y = (1 - e) * 35; break;
    case "pavilion": o.y = (1 - e) * 27; o.s = 1 + Math.max(k[0], k[1], k[2]) * 0.015; break;
    case "gate-left": o.x = (1 - e) * 60; o.y = -g[1] * 5; break;
    case "gate-right": o.x = -(1 - e) * 60; o.y = -g[1] * 5; break;
    case "palm-left": o.s = e; o.r = -(k[3] + k[4]) * 0.05; break;
    case "palm-right": o.s = e; o.r = (k[3] + k[4]) * 0.05; break;
    case "flower-left": o.s = e * (1 + k[5] * 0.04); break;
    case "flower-right": o.s = e * (1 + k[2] * 0.04); break;
    case "bird-a": case "bird-b": o.x = -(1 - e) * 550; o.y = -k[6] * 15; break;
    case "bird-c": o.x = (1 - e) * 550; o.y = -k[6] * 15; break;
    default: break;
  }
  return o;
}

type Pix = { d: Uint8ClampedArray; w: number; h: number } | null;
type State = { px: number; py: number; tx: number; ty: number; t0: number; st: Record<string, Spring>; pix: Record<string, Pix>; holdTm: number; R: Record<string, number> | null; lv: Record<string, number>; hot: string | null; cardAt: number };

export function LiveLogo({ className, set, live, guide, onTap, onHold, onGo, label }: Props) {
  const box = useRef<HTMLDivElement>(null), inner = useRef<HTMLDivElement>(null), els = useRef<Record<string, HTMLImageElement | null>>({});
  const S = useRef<State>({ px: 0, py: 0, tx: 0, ty: 0, t0: 0, st: {}, pix: {}, holdTm: 0, R: null, lv: {}, hot: null, cardAt: 0 });
  const [hot, setHot] = useState<string | null>(null); // the part under the pointer or the keyboard
  const [card, setCard] = useState<string | null>(null); // the part whose card is open
  const art = set === "day" ? "day" : "night";

  useEffect(() => { S.current.pix = {}; }, [art]); // the pixels change with the set
  useEffect(() => {
    const st = S.current; LAYOUT.forEach((L) => { st.st[L[0]] = st.st[L[0]] || {}; });
    let raf = 0, last = 0;
    const loop = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
      if (!st.t0) st.t0 = now; const t = (now - st.t0) / 1000;
      st.px += (st.tx - st.px) * 0.08; st.py += (st.ty - st.py) * 0.08;
      const L = live ? live() : null, lv = L && L.lv ? L.lv : null, sm = st.lv;
      const K = [0, 1, 2, 3, 4, 5, 6].map((i) => { const tgt = lv ? lv.kettle[i] : 0; sm["k" + i] = (sm["k" + i] || 0) + (tgt - (sm["k" + i] || 0)) * 0.3; return sm["k" + i]; });
      const G = [0, 1].map((i) => { const tgt = lv ? lv.gong[i] : 0; sm["g" + i] = (sm["g" + i] || 0) + (tgt - (sm["g" + i] || 0)) * 0.2; return sm["g" + i]; });
      sm.dr = (sm.dr || 0) + ((lv ? lv.drum : 0) - (sm.dr || 0)) * 0.3;
      st.R = L ? L.R : null;
      if (inner.current) inner.current.style.transform = L && L.breath ? "scale(" + (1 + sm.dr * 0.012).toFixed(4) + ")" : "";
      LAYOUT.forEach((Lr) => {
        const name = Lr[0], node = els.current[name]; if (!node) return;
        const sp = st.st[name], fly = sp.fly || 0, slow = name.indexOf("bird") === 0;
        spring(sp, "s", 90, 9, dt); spring(sp, "r", 70, 8, dt); spring(sp, "y", 110, 10, dt); spring(sp, "x", slow ? 10 : 110, slow ? 3.2 : 10, dt);
        const r = L ? L.R[name] || 0 : 1, e = L ? eo(Math.min(1, r)) : 1, alpha = L ? (L.ghost ? L.ghost : Math.min(1, r * 1.5)) : 1;
        const i = idle(name, t), a = L ? arrive(name, L.ghost ? 1 : e, K, G, sm.dr) : { x: 0, y: 0, s: 1, r: 0 };
        const px = st.px * DEPTH[name] * 1.4, py = st.py * DEPTH[name] * 0.9;
        sp.ix = i.x * e + a.x + px; sp.iy = i.y * e + a.y + py; // where the idle life, the reel and the lean have taken it, for the hit test
        const x = sp.ix + (sp.x || 0) + fly, y = sp.iy + (sp.y || 0), s = (i.s - 1) * e + a.s + (sp.s || 0), rr = i.r * e + a.r + (sp.r || 0);
        node.style.opacity = alpha.toFixed(3);
        node.style.transform = "translate(" + x.toFixed(2) + "%," + y.toFixed(2) + "%) rotate(" + rr.toFixed(3) + "rad) scale(" + s.toFixed(3) + "," + (s * i.sy).toFixed(3) + ")";
        const want = name === st.hot ? HOT : "";
        if (node.dataset.hot !== want) { node.dataset.hot = want; node.style.filter = want; }
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [live]);

  // which part is under a point: the top-most layer whose own pixels are opaque there, else the smallest whose outline holds it
  function hit(clientX: number, clientY: number): string | null {
    const st = S.current, el = box.current; if (!el) return null;
    const r = el.getBoundingClientRect(), nx = (clientX - r.left) / r.width, ny = (clientY - r.top) / r.height;
    let inside: string | null = null, insideArea = 1e9;
    for (let i = LAYOUT.length - 1; i >= 0; i--) {
      const L = LAYOUT[i], name = L[0], x0 = L[1], y0 = (L[2] - TOP) / HGT, w = L[3], h = L[4] / HGT;
      if (st.R && !(st.R[name] > 0)) continue; // not revealed yet
      const sp = st.st[name] || {}, fx = (((sp.x || 0) + (sp.fly || 0) + (sp.ix || 0)) / 100) * w, fy = (((sp.y || 0) + (sp.iy || 0)) / 100) * h;
      const lx = (nx - x0 - fx) / w, ly = (ny - y0 - fy) / h; if (lx < 0 || lx > 1 || ly < 0 || ly > 1) continue;
      if (w * h < insideArea) { inside = name; insideArea = w * h; }
      const img = els.current[name]; if (!img || !img.naturalWidth) continue;
      let pix = st.pix[name];
      if (pix === undefined) {
        try { const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext("2d", { willReadFrequently: true })!; g.drawImage(img, 0, 0); pix = st.pix[name] = { d: g.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height }; }
        catch { pix = st.pix[name] = null; }
      }
      if (!pix) return name; // if the pixels cannot be read, the box will do
      const a = pix.d[(Math.min(pix.h - 1, Math.floor(ly * pix.h)) * pix.w + Math.min(pix.w - 1, Math.floor(lx * pix.w))) * 4 + 3];
      if (a > 24) return name;
    }
    return inside;
  }
  function setHotPart(name: string | null) { if (name !== S.current.hot) { S.current.hot = name; setHot(name); } }
  // a touch: the spring, the note, and the part's door into the portfolio (a second touch within a moment goes through it)
  function touch(name: string, e: Point) {
    const st = S.current, sp = st.st[name], tc = TOUCH[name]; if (!sp || !tc) return;
    if (tc.s) sp.sv = (sp.sv || 0) + tc.s * 14; if (tc.r) sp.rv = (sp.rv || 0) + tc.r * 12; if (tc.y) sp.yv = (sp.yv || 0) + tc.y * 16; if (tc.x) sp.xv = (sp.xv || 0) + tc.x * 16;
    if (tc.fly) sp.xv = (sp.xv || 0) + tc.fly * 260;
    if (onTap) onTap(name, LABEL[name], tc.evs, e);
    const g = guide && guide[name];
    if (g) { const now = performance.now(); if (card === name && now - st.cardAt < 3000) { if (onGo) onGo(g, name); setCard(null); } else { setCard(name); st.cardAt = now; } }
    else setCard(null);
    setHotPart(name);
  }
  const hold = (on: boolean) => { const st = S.current; clearTimeout(st.holdTm); if (on) { if (onHold) onHold(true); } else st.holdTm = window.setTimeout(() => { if (onHold) onHold(false); }, 1500); };
  const centre = (name: string) => { const L = LAYOUT.find((x) => x[0] === name)!; return { left: (L[1] + L[3] / 2) * 100 + "%", top: ((L[2] - TOP) / HGT) * 100 + "%" }; };
  const onKey = (e: RKeyboardEvent<HTMLDivElement>) => {
    const k = e.key, el = box.current; if (!el) return;
    if (!el.matches(":focus-visible")) return; // focus that came from a tap leaves the keys to the film (arrows step its chapters)
    if (k === "ArrowRight" || k === "ArrowLeft") {
      e.preventDefault(); e.stopPropagation();
      const i = WALK.indexOf(S.current.hot || ""), nx = WALK[(i + (k === "ArrowRight" ? 1 : WALK.length - 1) + (i < 0 && k === "ArrowLeft" ? 1 : 0)) % WALK.length];
      setHotPart(nx); if (guide && guide[nx]) { setCard(nx); S.current.cardAt = performance.now() + 1e9; } else setCard(null);
    } else if (k === "Enter" || k === " ") {
      e.preventDefault(); e.stopPropagation();
      const name = card || S.current.hot || "pavilion", r = el.getBoundingClientRect(), g = guide && guide[name];
      if (card && g && onGo) { onGo(g, name); setCard(null); } else touch(name, { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
    } else if (k === "Escape") { setCard(null); setHotPart(null); }
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const el = box.current; if (!el) return;
    const r = el.getBoundingClientRect(); S.current.tx = ((e.clientX - r.left) / r.width - 0.5) * 2; S.current.ty = ((e.clientY - r.top) / r.height - 0.5) * 2; hold(true);
    if (e.pointerType !== "touch") setHotPart(hit(e.clientX, e.clientY));
  };
  const g = hot && guide ? guide[hot] : null, cg = card && guide ? guide[card] : null;

  return (
    <div ref={box} className={"w-logo" + (className ? " " + className : "")} role="group" tabIndex={0}
      aria-label={label || "Marea Dvīpa: a pavilion by the sea. Touch its parts to hear them; each one leads into the portfolio. Arrow keys walk the parts, Enter goes."}
      onPointerMove={onMove} onPointerEnter={() => hold(true)}
      onPointerLeave={() => { S.current.tx = 0; S.current.ty = 0; hold(false); setHotPart(null); }}
      onPointerDown={(e) => { hold(true); const name = hit(e.clientX, e.clientY); if (name) { e.stopPropagation(); touch(name, e); } else setCard(null); }}
      onPointerUp={() => hold(false)} onKeyDown={onKey}>
      <div ref={inner} className="w-logo-in" aria-hidden="true">
        {LAYOUT.map((L) => (
          <img key={L[0]} ref={(n) => { els.current[L[0]] = n; }} src={"/logo/" + art + "/" + L[0] + ".png"} alt="" draggable={false} data-layer={L[0]}
            style={{ left: L[1] * 100 + "%", top: ((L[2] - TOP) / HGT) * 100 + "%", width: L[3] * 100 + "%", height: (L[4] / HGT) * 100 + "%", transformOrigin: ORIGIN[L[0]] || "50% 50%" }} />
        ))}
      </div>
      {hot && !card && (
        <div className="w-logo-hint" aria-hidden="true"><span className="n">{LABEL[hot]}</span>{g && <span className="t">→ {g.to}</span>}</div>
      )}
      {card && cg && (
        <div className="w-logo-card" style={centre(card)} role="dialog" aria-label={LABEL[card] + ": " + cg.to} onPointerDown={(e) => e.stopPropagation()}>
          <span className="w-eyebrow">{LABEL[card]}</span>
          <strong>{cg.to}</strong>
          <p>{cg.blurb}</p>
          <button type="button" className="w-pill solid" onClick={(e) => { e.stopPropagation(); if (onGo) onGo(cg, card); setCard(null); }}>{cg.sound ? "Toggle sound" : cg.external ? "Open" : "Go"}</button>
        </div>
      )}
    </div>
  );
}
