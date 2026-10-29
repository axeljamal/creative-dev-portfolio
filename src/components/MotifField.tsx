import { useEffect, useRef, useState } from "react";
import { MOTIFS, motifSrc } from "../welcome/motifs";
import { strike, unlock, type Strike } from "../welcome/sound";
import { gseq } from "../welcome/timeline";
import "./motif-field.css";

// Marea Dvīpa's motifs floating in a 3D field behind the portfolio. They drift, turn, tilt with the pointer and move
// at their own depth as you scroll. Tap one where nothing else is: a random event rings out, each with its own sound.
// The motif takes a new colour, turns into another motif or floats away, or the colours behind the page shift.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;
// clicks on these stay theirs: links, controls, text, cards and the welcome film
const OWN = "a, button, input, textarea, select, label, form, summary, nav, p, h1, h2, h3, h4, li, dd, dt, img, .glass, .glass-strong, .glass-clear, #home";
// tints for a recoloured motif, and the grounds the aurora behind the page moves through (Marea Dvīpa's own)
const HUES = [35, 160, 200, 290, 330];
const GROUNDS = [
  { accent: "#1f5c63", sun: "#2a6f74", leaf: "#02213d" },
  { accent: "#9c4a2f", sun: "#e0c27e", leaf: "#4a4032" },
  { accent: "#02213d", sun: "#c39b65", leaf: "#2a6f74" },
  { accent: "#c39b65", sun: "#e0c27e", leaf: "#1f5c63" },
];
type Event = "recolour" | "swap" | "float" | "ground";
const EVENTS: [Event, number][] = [["recolour", 0.3], ["swap", 0.25], ["float", 0.3], ["ground", 0.15]];

type Item = { id: number; m: number; hue: number | null; x: number; y0: number; z: number; s: number; rot: number; spin: number; phase: number; away: number; gen: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
function spawn(id: number, gen = 0): Item {
  const z = rand(-320, 120);
  const near = (z + 320) / 440; // 0 far … 1 near
  let x = rand(0.04, 0.96);
  let size = 60 + near * 90 + rand(0, 30);
  // on wide screens most motifs float in the margins beside the content (max-w-6xl), where they stay in view
  const vw = window.innerWidth;
  const margin = (vw - 1152) / 2;
  if (margin > 90 && id % 3 !== 0) {
    const g = margin / vw;
    x = Math.random() < 0.5 ? rand(0.2, 0.8) * g : 1 - rand(0.2, 0.8) * g;
    size = Math.min(size, margin * 0.9);
  }
  return {
    id, gen, m: Math.floor(Math.random() * MOTIFS.length), hue: null,
    x, y0: Math.random(), z, s: size,
    rot: rand(-30, 30), spin: rand(-4, 4), phase: rand(0, TAU), away: 0,
  };
}
const pick = () => {
  let r = Math.random();
  for (const [e, w] of EVENTS) if ((r -= w) <= 0) return e;
  return "recolour";
};

export function MotifField() {
  const count = window.innerWidth < 640 ? 9 : window.innerWidth >= 1280 ? 26 : 16;
  const [items, setItems] = useState<Item[]>(() => Array.from({ length: count }, (_, i) => spawn(i)));
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const sceneRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<number, HTMLDivElement>());
  const tilt = useRef({ tx: 0, ty: 0, rx: 0, ry: 0 });
  const ground = useRef(-1);
  const taps = useRef(0);

  // one loop: drift, turn, depth parallax as the page scrolls, and the pointer tilt
  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      const t = now / 1000;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const L = vh * 1.5; // each motif wraps round a band a little taller than the screen
      for (const it of itemsRef.current) {
        const el = els.current.get(it.id);
        if (!el) continue;
        const near = (it.z + 320) / 440;
        const k = reduceMotion ? 0 : 0.15 + near * 0.45;
        let y = (((it.y0 * L - window.scrollY * k) % L) + L) % L - vh * 0.25;
        const dx = reduceMotion ? 0 : Math.sin(t * 0.3 + it.phase) * 24;
        const dy = reduceMotion ? 0 : Math.cos(t * 0.23 + it.phase) * 16;
        let scale = 1;
        let opacity = 1;
        if (it.away) {
          // floating away: up, a little larger, fading
          const p = Math.min(1, (now - it.away) / 2400);
          const e = p * p * (3 - 2 * p);
          y -= e * vh * 0.7;
          scale = 1 + e * 0.5;
          opacity = 1 - e;
        }
        el.style.opacity = String(opacity);
        el.style.transform = `translate3d(${(it.x * vw + dx - it.s / 2).toFixed(1)}px, ${(y + dy).toFixed(1)}px, ${it.z.toFixed(0)}px) rotate(${(it.rot + (reduceMotion ? 0 : t * it.spin)).toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      }
      const T = tilt.current;
      T.rx += (T.ty - T.rx) * 0.05;
      T.ry += (T.tx - T.ry) * 0.05;
      if (sceneRef.current && !reduceMotion) sceneRef.current.style.transform = `rotateX(${T.rx.toFixed(2)}deg) rotateY(${T.ry.toFixed(2)}deg)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // the motif under a point, if nothing of the page is there to take the click
  const hit = (x: number, y: number, target: EventTarget | null) => {
    if (target instanceof Element && target.closest(OWN)) return null;
    const el = document.elementsFromPoint(x, y).find((e) => e.classList.contains("mf-m")) as HTMLElement | undefined;
    if (!el) return null;
    const it = itemsRef.current.find((i) => i.id === Number(el.dataset.id));
    return it && !it.away ? it : null;
  };

  useEffect(() => {
    let pending = false;
    const onMove = (e: PointerEvent) => {
      tilt.current.tx = (e.clientX / window.innerWidth - 0.5) * 8;
      tilt.current.ty = -(e.clientY / window.innerHeight - 0.5) * 6;
      if (pending || e.pointerType !== "mouse") return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        document.documentElement.classList.toggle("mf-hover", !!hit(e.clientX, e.clientY, e.target));
      });
    };
    const onClick = (e: MouseEvent) => {
      const it = hit(e.clientX, e.clientY, e.target);
      if (it) happen(it, e.clientX, e.clientY);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("click", onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(id: number, change: Partial<Item>) {
    setItems((all) => all.map((i) => (i.id === id ? { ...i, ...change } : i)));
  }

  function happen(it: Item, x: number, y: number) {
    unlock(); // a tap is a gesture, so the sound can start
    const n = taps.current++;
    const base = gseq(it.id * 3 + n);
    const event = pick();
    let sound: Strike[] = [];
    let label = MOTIFS[it.m][1];
    if (event === "recolour") {
      const hues = HUES.filter((h) => h !== it.hue);
      update(it.id, { hue: hues[Math.floor(Math.random() * hues.length)] });
      sound = [{ k: "kettle", n: base, v: 0.42 }, { k: "kettle", n: (base + 2) % 7, v: 0.24, at: 0.14, soft: true }];
    } else if (event === "swap") {
      let m = it.m;
      while (m === it.m) m = Math.floor(Math.random() * MOTIFS.length);
      update(it.id, { m, gen: it.gen + 1 });
      label = MOTIFS[m][1];
      sound = [{ k: "kettle", n: base, v: 0.4, oct: true }, { k: "drum", n: "tak", v: 0.3, at: 0.09 }, { k: "kettle", n: (base + 4) % 7, v: 0.3, at: 0.18 }];
    } else if (event === "float") {
      update(it.id, { away: performance.now() });
      // after it has gone, a new motif drifts in somewhere else
      setTimeout(() => setItems((all) => all.map((i) => (i.id === it.id ? spawn(it.id, it.gen + 1) : i))), 2600);
      sound = [0, 2, 4, 6].map((d, i): Strike => ({ k: "kettle", n: (base + d) % 7, v: 0.34 - i * 0.04, oct: i === 3, at: i * 0.11 }));
      label = MOTIFS[it.m][1] + " floats away";
    } else {
      ground.current = (ground.current + 1) % GROUNDS.length;
      const g = GROUNDS[ground.current];
      const aurora = document.querySelector<HTMLElement>(".aurora");
      if (aurora) for (const [key, value] of Object.entries(g)) aurora.style.setProperty(`--${key}`, value);
      sound = [{ k: "gong", n: (n % 2) as 0 | 1, v: 0.45 }, { k: "kettle", n: base, v: 0.3, at: 0.25 }];
      label = "New ground";
    }
    strike(sound);
    sparkle(x, y, label, it.hue);
  }

  // a ring, a burst of gold and the motif's name where it was tapped
  function sparkle(x: number, y: number, label: string, hue: number | null) {
    const fx = fxRef.current;
    if (!fx) return;
    const made: HTMLElement[] = [];
    const add = (cls: string, style: Record<string, string>, text?: string) => {
      const el = document.createElement("span");
      el.className = cls;
      for (const [k, v] of Object.entries(style)) el.style.setProperty(k, v);
      if (text) el.textContent = text;
      fx.appendChild(el);
      made.push(el);
    };
    add("mf-ring", { left: `${x}px`, top: `${y}px` });
    for (let i = 0; i < 12; i++) {
      const a = i * 2.39996 + Math.random() * 0.4;
      const r = rand(40, 90);
      add("mf-spark", { left: `${x}px`, top: `${y}px`, "--dx": `${(Math.cos(a) * r).toFixed(0)}px`, "--dy": `${(Math.sin(a) * r).toFixed(0)}px`, filter: hue == null ? "none" : `hue-rotate(${hue}deg)` });
    }
    add("mf-label", { left: `${x}px`, top: `${y}px` }, label);
    setTimeout(() => made.forEach((el) => el.remove()), 1500);
  }

  return (
    <>
    <div className="mf" aria-hidden="true">
      <div className="mf-scene" ref={sceneRef}>
        {items.map((it) => (
          <div
            key={it.id}
            data-id={it.id}
            ref={(el) => {
              if (el) els.current.set(it.id, el);
              else els.current.delete(it.id);
            }}
            className="mf-m"
            style={{ width: it.s, height: it.s, filter: it.hue == null ? undefined : `hue-rotate(${it.hue}deg) saturate(1.35)` }}
          >
            <img key={`${it.m}-${it.gen}`} src={motifSrc(MOTIFS[it.m][0])} alt="" draggable={false} />
          </div>
        ))}
      </div>
    </div>
    {/* taps answer above the page, so the ring and the name are never hidden behind a card */}
    <div className="mf-fx" ref={fxRef} aria-hidden="true" />
    </>
  );
}
