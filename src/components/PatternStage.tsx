// The Pattern Studio's card: the Studio's own patterns (its layout recipes and its Fibonacci blooms, content/patterns)
// laid as a cloth that leans in 3D, a new one every few seconds, with a few motifs floating in front as the page's own
// background does. Touch it and the ground takes a new colour, the pattern changes, and a gamelan note rings.
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { motifFile, pattern } from "../content/patterns";
import { MOTIFS, motifSrc } from "../welcome/motifs";
import { strike, unlock, type Strike } from "../welcome/sound";

const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// the grounds the card moves through when touched: Marea Dvīpa's own colours
const GROUNDS = ["#0e2a2e", "#5a2a1a", "#02213d", "#3b2f1c", "#1f5c63", "#2b1b2f"];
// the cloth is laid out at the card's own size, then scaled to the card on screen
const VW = 300, VH = 468;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
type Floater = { m: number; x: number; y: number; z: number; s: number; rot: number; spin: number; phase: number };
const floaters = (): Floater[] =>
  Array.from({ length: 3 }, (_, i) => ({
    m: Math.floor(Math.random() * MOTIFS.length),
    x: rand(0.15, 0.85),
    y: 0.3 + i * 0.18 + rand(-0.03, 0.03), // clear of the pattern's name at the top and the button at the foot
    z: rand(60, 160),
    s: rand(46, 86),
    rot: rand(-30, 30),
    spin: rand(-8, 8),
    phase: rand(0, Math.PI * 2),
  }));

export function PatternStage({ active }: { active: boolean }) {
  const [step, setStep] = useState(0); // which pattern: motif, layout and size all follow from it
  const [ground, setGround] = useState(0);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [float] = useState(floaters);
  const root = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLImageElement | null)[]>([]);
  const tilt = useRef({ tx: 0, ty: 0, rx: 0, ry: 0 });
  const heard = useRef(false); // once touched, the pattern changes ring softly too
  const taps = useRef(0);

  const cloth = useMemo(() => pattern(step, VW, VH), [step]);
  const [k, setK] = useState(1); // the card's width over the cloth's
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setK(el.clientWidth / VW || 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // a new pattern every few seconds while the card is in the middle
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => {
      setStep((s) => s + 1);
      if (heard.current) strike([{ k: "kettle", n: Math.floor(Math.random() * 7), v: 0.16, soft: true }]);
    }, 5600);
    return () => clearInterval(t);
  }, [active]);

  // the floating motifs drift and turn, and the scene leans towards the pointer
  useEffect(() => {
    if (!active || reduce) return;
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const el = root.current;
      if (!el || document.hidden) return;
      const t = now / 1000, w = el.clientWidth, h = el.clientHeight;
      float.forEach((f, i) => {
        const img = els.current[i];
        if (!img) return;
        const dx = Math.sin(t * 0.4 + f.phase) * 14, dy = Math.cos(t * 0.31 + f.phase) * 12;
        img.style.transform = `translate3d(${(f.x * w - f.s / 2 + dx).toFixed(1)}px, ${(f.y * h - f.s / 2 + dy).toFixed(1)}px, ${f.z}px) rotate(${(f.rot + t * f.spin).toFixed(1)}deg)`;
      });
      const T = tilt.current;
      T.rx += (T.ty - T.rx) * 0.06;
      T.ry += (T.tx - T.ry) * 0.06;
      if (scene.current) scene.current.style.transform = `rotateX(${T.rx.toFixed(2)}deg) rotateY(${T.ry.toFixed(2)}deg)`;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, float]);

  const lean = (e: PointerEvent) => {
    const r = root.current?.getBoundingClientRect();
    if (!r) return;
    tilt.current.tx = ((e.clientX - r.left) / r.width - 0.5) * 18;
    tilt.current.ty = -((e.clientY - r.top) / r.height - 0.5) * 14;
  };

  // a touch: a new ground, a new pattern, a note, and a ring where the finger landed
  const touch = (e: MouseEvent) => {
    if (!active) return;
    unlock();
    heard.current = true;
    const n = taps.current++;
    setGround((g) => (g + 1) % GROUNDS.length);
    setStep((s) => s + 1);
    const base = (n * 3) % 7;
    const notes: Strike[] =
      n % 4 === 3
        ? [{ k: "gong", n: (n % 2) as 0 | 1, v: 0.4 }, { k: "kettle", n: base, v: 0.28, at: 0.22 }]
        : [{ k: "kettle", n: base, v: 0.4 }, { k: "kettle", n: (base + 2) % 7, v: 0.24, at: 0.13, soft: true }];
    strike(notes);
    const r = root.current?.getBoundingClientRect();
    if (r) {
      const id = performance.now();
      setRipples((all) => [...all, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
      setTimeout(() => setRipples((all) => all.filter((p) => p.id !== id)), 900);
    }
  };

  return (
    <div
      ref={root}
      className="pattern-stage"
      style={{ background: GROUNDS[ground] }}
      onPointerMove={lean}
      onPointerLeave={() => Object.assign(tilt.current, { tx: 0, ty: 0 })}
      onClick={touch}
      aria-hidden="true"
    >
      <div className="pattern-depth">
        <div className="pattern-scene" ref={scene}>
          {/* the cloth: a fresh layer for each pattern, so it settles in; slightly larger than the card so its edges
              never show as it leans */}
          <div key={step} className="pattern-cloth" style={{ width: VW, height: VH, transform: `translateZ(-40px) scale(${(k * 1.12).toFixed(3)})` }}>
            {cloth.lines.length > 0 && (
              <svg className="pattern-lines" viewBox={`0 0 ${VW} ${VH}`} width={VW} height={VH}>
                {cloth.lines.map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </svg>
            )}
            {cloth.items.map((it, i) => (
              <img
                key={i}
                src={motifFile(it.m)}
                alt=""
                draggable={false}
                style={{
                  left: it.x,
                  top: it.y,
                  width: it.w,
                  height: it.h,
                  transform: `${it.rot ? `rotate(${it.rot.toFixed(1)}deg)` : ""}${it.flip ? " scaleX(-1)" : ""}` || undefined,
                  animationDelay: `${Math.min(i * 12, 600)}ms`,
                }}
              />
            ))}
          </div>
          {float.map((f, i) => (
            <img
              key={i}
              className="pattern-float"
              ref={(el) => {
                els.current[i] = el;
              }}
              src={motifSrc(MOTIFS[(f.m + step) % MOTIFS.length][0])}
              alt=""
              draggable={false}
              style={{ width: f.s, height: f.s, transform: `translate3d(${f.x * VW - f.s / 2}px, ${f.y * VH - f.s / 2}px, ${f.z}px)` }}
            />
          ))}
        </div>
      </div>
      <span key={`n${step}`} className="pattern-name">
        {cloth.title}
      </span>
      {ripples.map((p) => (
        <span key={p.id} className="pattern-ripple" style={{ left: p.x, top: p.y }} />
      ))}
    </div>
  );
}
