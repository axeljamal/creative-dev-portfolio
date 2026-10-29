// The welcome film from Marea Dvīpa, made into the portfolio's opening: a full-screen 3D stage of batik motifs that
// land one by one at the golden angle, then the Work chapter on Marea Dvīpa itself (its Pattern Studio, the Bomba Rose
// growing its petal rings to Bunga Kaili, which you can spin and play, and its Media Lab), then a batik repeat.
// Tilt it with the pointer (or the phone), drag to turn it further, tap a motif to ring it. Captions run right to left;
// the controls float at the bottom and hide with the arrow, a tap on the scene or H.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject, type PointerEvent as RPointerEvent, type MouseEvent as RMouseEvent } from "react";
import { FaGithub } from "react-icons/fa6";
import { LuArrowDown, LuArrowRight, LuFileText } from "react-icons/lu";
import { profile } from "../content/profile";
import { buildTimeline, CARDS, COUNT, GA, gseq, type Caption, type Layout, type View } from "./timeline";
import { levels, strike, unlock, type Strike } from "./sound";
import { roseAt } from "./bungaKaili";
import { MOTIFS, motifSrc as src } from "./motifs";
import { createRose, drawRoseStage, hearAll, roseDown, roseMove, roseUp } from "./rose";
import "./welcome.css";

const TL = buildTimeline();
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fmt = (s: number) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

const motifAt = (i: number) => MOTIFS[i === 0 ? 0 : 1 + ((i - 1) % (MOTIFS.length - 1))];

function viewAt(t: number): View {
  let v = {} as View;
  for (const b of TL.beats) {
    if (b.t > t + 1e-6) break;
    v = { ...v, ...b.view };
  }
  return v;
}
const nextIndex = (t: number) => {
  const i = TL.beats.findIndex((b) => b.t > t + 1e-6);
  return i < 0 ? TL.beats.length : i;
};

type Item = { x: number; y: number; s: number; rot: number; z: number };

// every layout places the same COUNT motifs, so each one glides to its place in the next
function place(layout: Layout, w: number, h: number, seed: number): Item[] {
  const out: Item[] = [];
  const m = Math.min(w, h);
  const rnd = (i: number) => {
    const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  for (let i = 0; i < COUNT; i++) {
    if (layout === "bloom") {
      const c = (m * 0.47) / Math.sqrt(COUNT);
      const r = c * Math.sqrt(i + 0.4) * (w > h ? 1.25 : 1);
      const a = i * GA + seed;
      out.push({ x: w / 2 + Math.cos(a) * r * (w > h ? 1.3 : 1), y: h / 2 + Math.sin(a) * r, s: i === 0 ? m * 0.3 : m * (0.17 - (i / COUNT) * 0.06), rot: (a * 180) / Math.PI / 12, z: 0 });
    } else if (layout === "orbit") {
      const a = (i / COUNT) * Math.PI * 2 + seed * 0.6;
      const ring = i % 2 ? 1 : 0.84;
      out.push({ x: w / 2 + Math.cos(a) * w * 0.43 * ring, y: h * 0.46 + Math.sin(a) * h * 0.4 * ring, s: m * (i % 2 ? 0.1 : 0.13), rot: (rnd(i) - 0.5) * 30, z: 0 });
    } else if (layout === "lattice") {
      const cols = Math.max(3, Math.round(Math.sqrt((COUNT * w) / h)));
      const rows = Math.ceil(COUNT / cols);
      const cw = w / cols;
      const ch = h / rows;
      const col = i % cols;
      const row = Math.floor(i / cols);
      out.push({ x: cw * (col + 0.5), y: ch * (row + 0.5) + (col % 2 ? ch / 2 : 0) - ch / 4, s: Math.min(cw, ch) * 0.78, rot: col % 2 ? 180 : 0, z: 0 });
    } else {
      // stream: three drifting rows, tossed
      const row = i % 3;
      const col = Math.floor(i / 3);
      const cols = Math.ceil(COUNT / 3);
      out.push({ x: ((col + 0.5 + row * 0.33) / cols) * w * 1.1 - w * 0.05, y: h * (0.2 + row * 0.3) + (rnd(i) - 0.5) * h * 0.08, s: m * (0.11 + rnd(i + 9) * 0.05), rot: (rnd(i + 3) - 0.5) * 50, z: 0 });
    }
  }
  const big = Math.max(...out.map((it) => it.s));
  out.forEach((it, i) => {
    it.z = Math.round(30 + 90 * (it.s / big) + (i % 3) * 14); // larger motifs stand nearer
  });
  return out;
}

function useSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

const Icon = {
  play: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" /></svg>,
  pause: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>,
  soundOn: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>,
  soundOff: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>,
  fs: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z" /></svg>,
  hide: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  show: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

type Tick = { id: number; cap: Caption; out?: boolean };
type TickState = Tick & { x: number | null; w: number; done?: boolean };

export function Welcome() {
  const stageRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const RS = useRef(createRose());
  const [turn, setTurn] = useState(1);
  const barRef = useRef<HTMLElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const tickRef = useRef<HTMLDivElement>(null);
  const size = useSize(stageRef);
  const [view, setView] = useState<View>(() => viewAt(0));
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState(false);
  const [dock, setDock] = useState(true);
  const [isFs, setIsFs] = useState(false);
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [ctaGone, setCtaGone] = useState(false);
  const [active, setActive] = useState(true);
  const [tapped, setTapped] = useState<{ name: string; x: number; y: number; id: number } | null>(null);
  const T = useRef({ t: 0, next: 0, last: 0, playing: false, sound: false });
  const P = useRef({ tx: 0, ty: 0, rx: 0, ry: 0, down: null as [number, number] | null, moved: false, lastPointer: 0, tilt: false });
  const K = useRef({ items: [] as TickState[], id: 0 });

  const items = useMemo(() => (size.w && size.h ? place(view.layout, size.w, size.h, view.seed) : []), [view.layout, view.seed, size.w, size.h]);
  // the order motifs land in the bloom: nearest the centre first
  const rank = useMemo(() => {
    const r: number[] = [];
    items
      .map((it, i) => ({ i, d: Math.hypot(it.x - size.w / 2, it.y - size.h / 2) }))
      .sort((a, b) => a.d - b.d)
      .forEach(({ i }, k) => (r[i] = k));
    return r;
  }, [items, size.w, size.h]);

  const fire = (b: (typeof TL.beats)[number]) => {
    if (Object.keys(b.view).length) setView((v) => ({ ...v, ...b.view }));
    if (b.sound && T.current.sound) strike(b.sound);
  };
  function seek(t: number) {
    const S = T.current;
    S.t = Math.max(0, Math.min(TL.total - 0.01, t));
    S.next = nextIndex(S.t);
    K.current.items = [];
    setTicks([]);
    setView(viewAt(S.t));
  }
  function play(on: boolean) {
    T.current.playing = on;
    T.current.last = 0;
    setPlaying(on);
  }
  function setSoundOn(on: boolean) {
    if (on && !unlock()) on = false; // must run inside the tap, or phones stay silent
    T.current.sound = on;
    setSound(on);
  }
  function playWithSound() {
    setSoundOn(true);
    setCtaGone(true);
    seek(0);
    play(true);
  }

  // full screen: the stage itself, or a fixed overlay where the browser has no element full screen (iPhone)
  function toggleFs() {
    const el = stageRef.current as (HTMLElement & { webkitRequestFullscreen?: () => void }) | null;
    if (!el) return;
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
    if (el.classList.contains("pseudo-fs")) {
      el.classList.remove("pseudo-fs");
      setIsFs(false);
      return;
    }
    if (doc.fullscreenElement === el || doc.webkitFullscreenElement === el) {
      void (doc.exitFullscreen ? doc.exitFullscreen() : doc.webkitExitFullscreen?.());
      return;
    }
    const fallback = () => {
      el.classList.add("pseudo-fs");
      setIsFs(true);
    };
    if (el.requestFullscreen) el.requestFullscreen().catch(fallback);
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else fallback();
  }
  useEffect(() => {
    const on = () => setIsFs(!!document.fullscreenElement || !!stageRef.current?.classList.contains("pseudo-fs"));
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  // the film only runs while the stage is on screen
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.intersectionRatio > 0.35), { threshold: [0, 0.35, 0.7] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // each new caption enters the ticker from the right while the one before fades as it runs on
  const cap = view.caption;
  useEffect(() => {
    if (!cap) return;
    const K0 = K.current;
    const W = tickRef.current ? tickRef.current.clientWidth : 1000;
    K0.items = K0.items.filter((it) => it.x != null && it.x < W && !it.out);
    K0.items.forEach((it) => (it.out = true));
    K0.items.push({ id: ++K0.id, cap, x: null, w: 0 });
    setTicks(K0.items.map(({ id, cap, out }) => ({ id, cap, out })));
    const tm = setTimeout(() => {
      K0.items = K0.items.filter((it) => !it.out);
      setTicks(K0.items.map(({ id, cap }) => ({ id, cap })));
    }, 700);
    return () => clearTimeout(tm);
  }, [cap]);

  // one requestAnimationFrame loop while the stage is showing: the film clock, the ticker and the 3D tilt
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const loop = (now: number) => {
      const S = T.current;
      const dt = S.last ? Math.min(0.25, (now - S.last) / 1000) : 0;
      if (S.playing) {
        S.t += dt;
        while (S.next < TL.beats.length && TL.beats[S.next].t <= S.t) fire(TL.beats[S.next++]);
        if (S.t >= TL.total) {
          S.t = 0;
          S.next = 0;
        }
      }
      S.last = now;
      if (barRef.current) barRef.current.style.width = (S.t / TL.total) * 100 + "%";
      if (timeRef.current) timeRef.current.textContent = fmt(S.t) + " / " + fmt(TL.total);

      const K0 = K.current;
      const box = tickRef.current;
      if (box) {
        const W = box.clientWidth;
        const v = Math.max(110, Math.min(240, W * 0.16));
        const step = S.playing ? dt : 0;
        let dropped = false;
        for (const it of K0.items) {
          const el = box.querySelector<HTMLElement>(`[data-tick="${it.id}"]`);
          if (!el) continue;
          if (it.x == null) {
            it.w = el.offsetWidth;
            it.x = W * 0.92;
          } else it.x -= v * step;
          el.style.transform = `translate3d(${it.x.toFixed(1)}px,0,0)`;
          if (it.x + it.w < -40) {
            it.done = true;
            dropped = true;
          }
        }
        if (dropped) {
          K0.items = K0.items.filter((it) => !it.done);
          setTicks(K0.items.map(({ id, cap, out }) => ({ id, cap, out })));
        }
      }

      // 3D tilt: follows the pointer or the phone, sways gently when left alone
      const Pp = P.current;
      if (!reduceMotion) {
        const idle = now - Pp.lastPointer > 2500 && !Pp.tilt;
        const tx = idle ? Math.sin(now / 5200) * 5 : Pp.tx;
        const ty = idle ? Math.cos(now / 6100) * 3.5 : Pp.ty;
        Pp.ry += (tx - Pp.ry) * 0.07;
        Pp.rx += (ty - Pp.rx) * 0.07;
        if (sceneRef.current) sceneRef.current.style.transform = `rotateX(${Pp.rx.toFixed(2)}deg) rotateY(${Pp.ry.toFixed(2)}deg)`;
        if (cardRef.current) cardRef.current.style.transform = `translate(-50%,-50%) translateZ(160px) rotateX(${(Pp.rx * 1.6).toFixed(2)}deg) rotateY(${(Pp.ry * 1.6).toFixed(2)}deg)`;
        if (canvasRef.current) canvasRef.current.style.transform = `rotateX(${(Pp.rx * 0.5).toFixed(2)}deg) rotateY(${(Pp.ry * 0.5).toFixed(2)}deg)`;
      }

      // the Bomba Rose chapter: the rose as the ring section has grown it, the ensemble lit by the music
      const cv = canvasRef.current;
      const lt = S.t - TL.roseAct.start;
      if (cv && lt >= 0 && lt < TL.roseAct.dur) {
        const r = cv.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const W = Math.round(r.width * dpr);
        const H = Math.round(r.height * dpr);
        if (cv.width !== W || cv.height !== H) {
          cv.width = W;
          cv.height = H;
        }
        drawRoseStage(cv.getContext("2d")!, W, H, dpr, RS.current, roseAt(lt), levels(), dt);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    if (!reduceMotion && !T.current.playing) play(true);
    return () => {
      cancelAnimationFrame(raf);
      if (T.current.playing) play(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // phones: tilt by holding the phone at an angle (where the browser sends orientation without asking)
  useEffect(() => {
    if (!active || reduceMotion) return;
    const on = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      const Pp = P.current;
      Pp.tilt = true;
      Pp.tx = Math.max(-12, Math.min(12, e.gamma / 3));
      Pp.ty = Math.max(-10, Math.min(10, (45 - e.beta) / 4));
    };
    window.addEventListener("deviceorientation", on);
    return () => window.removeEventListener("deviceorientation", on);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === " " && (target === document.body || target === stageRef.current)) {
        e.preventDefault();
        play(!T.current.playing);
      } else if (k === "f" || k === "F") toggleFs();
      else if (k === "h" || k === "H") setDock((d) => !d);
      else if (k === "ArrowRight" || k === "ArrowLeft") {
        const i = TL.acts.findIndex((a) => a.id === viewAt(T.current.t).act);
        const n = TL.acts[Math.max(0, Math.min(TL.acts.length - 1, i + (k === "ArrowRight" ? 1 : -1)))];
        e.preventDefault();
        seek(n.start + 0.01);
      } else if (k === "Escape" && stageRef.current?.classList.contains("pseudo-fs")) toggleFs();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (!tapped) return;
    const tm = setTimeout(() => setTapped(null), 1400);
    return () => clearTimeout(tm);
  }, [tapped]);

  // pointer: hover tilts, drag turns further, a tap on a motif rings it, a tap elsewhere shows or hides the dock
  const inRose = () => view.overlay === "rose";
  const roseMotif = () => roseAt(Math.max(0, T.current.t - TL.roseAct.start));
  const local = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const ring = (evs: Strike[] | null) => {
    if (!evs || !evs.length) return;
    if (!T.current.sound) {
      setSoundOn(true); // playing the rose is a fine moment to start the sound
      setCtaGone(true);
    }
    strike(evs);
  };
  const onPointerMove = (e: RPointerEvent) => {
    if (RS.current.drag) {
      const [x, y] = local(e);
      roseMove(RS.current, x, y);
      P.current.moved = true;
      return;
    }
    const r = stageRef.current!.getBoundingClientRect();
    const Pp = P.current;
    if (e.pointerType === "touch" && !Pp.down) return;
    const k = Pp.down ? 2.2 : 1;
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    Pp.tx = Math.max(-26, Math.min(26, nx * 14 * k));
    Pp.ty = Math.max(-20, Math.min(20, -ny * 10 * k));
    Pp.lastPointer = performance.now();
    Pp.tilt = false;
    if (Pp.down && Math.hypot(e.clientX - Pp.down[0], e.clientY - Pp.down[1]) > 8) Pp.moved = true;
  };
  function onStageClick(e: RMouseEvent) {
    if (P.current.moved) {
      P.current.moved = false;
      return;
    }
    const target = e.target as HTMLElement;
    if (target.closest("button, a, .w-dock, .w-rose-ui")) return;
    if (inRose()) {
      const [x, y] = local(e);
      const evs = roseUp(RS.current, x, y, roseMotif()); // kettles and gongs around the rose
      if (evs) return ring(evs);
      setDock((d) => !d);
      return;
    }
    const m = target.closest<HTMLElement>(".w-m");
    if (m && !m.classList.contains("hide")) {
      m.classList.remove("ping");
      void m.offsetWidth;
      m.classList.add("ping");
      const i = Number(m.dataset.i) || 0;
      if (!T.current.sound) {
        setSoundOn(true); // a tap is a fine moment to start the sound
        setCtaGone(true);
      }
      strike([
        { k: "kettle", n: gseq(i), v: 0.42, oct: i % 2 === 1 },
        { k: "kettle", n: gseq(i + 2), v: 0.22, at: 0.14, soft: true },
      ]);
      const r = stageRef.current!.getBoundingClientRect();
      setTapped({ name: motifAt(i)[1], x: e.clientX - r.left, y: e.clientY - r.top, id: Date.now() });
      return;
    }
    setDock((d) => !d);
  }

  const actIdx = Math.max(0, TL.acts.findIndex((a) => a.id === view.act));
  const veil = view.overlay === "rose" ? 0.94 : view.dim ? (view.overlay === "card" ? 0.5 : 0.62) : 0;
  const card = view.overlay === "card" && view.card != null ? CARDS[view.card] : null;

  return (
    <section
      id="home"
      ref={stageRef}
      aria-labelledby="home-title"
      tabIndex={-1}
      className={"welcome w-stage" + (dock ? "" : " undocked")}
      style={{ "--ground": view.ground } as CSSProperties}
      onPointerMove={onPointerMove}
      onPointerDown={(e) => {
        P.current.moved = false;
        if (inRose() && !(e.target as HTMLElement).closest("button, a, .w-dock, .w-rose-ui")) {
          const [x, y] = local(e);
          if (roseDown(RS.current, x, y)) {
            e.currentTarget.setPointerCapture(e.pointerId);
            return;
          }
        }
        P.current.down = [e.clientX, e.clientY];
      }}
      onPointerUp={(e) => {
        if (RS.current.drag) {
          const [x, y] = local(e);
          ring(roseUp(RS.current, x, y, roseMotif()));
          P.current.moved = true; // the click that follows is the rose's, not the dock's
          return;
        }
        P.current.down = null;
        if (P.current.lastPointer) P.current.lastPointer = performance.now();
      }}
      onPointerLeave={() => {
        P.current.lastPointer = 0;
        P.current.down = null;
      }}
      onClick={onStageClick}
    >
      <div className="w-3d" aria-hidden="true">
        <div className="w-scene" ref={sceneRef}>
          <div className="w-drift">
            <div className="w-ground" />
            <div className="w-texture" />
            {items.map((it, i) => {
              const hidden = view.reveal != null && rank[i] >= view.reveal;
              const [m] = motifAt(i);
              return (
                <div
                  key={i}
                  data-i={i}
                  className={"w-m" + (hidden ? " hide" : "")}
                  style={{ left: it.x, top: it.y, width: it.s, height: it.s, transform: `translate(-50%,-50%) translateZ(${it.z}px) rotate(${it.rot.toFixed(1)}deg)` }}
                >
                  <img src={src(m)} alt="" draggable={false} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="w-veil" style={{ opacity: veil }} />

      <div className={"w-3d w-rose-wrap" + (view.overlay === "rose" ? " on" : "")} aria-hidden="true">
        <canvas ref={canvasRef} className="w-rose" />
      </div>

      {card && (
        <div className="w-3d w-card-wrap" aria-hidden="true">
          <div className="w-card" ref={cardRef} key={card.name}>
            <img src={card.image} alt="" />
            <div className="w-card-cap">
              <span className="w-eyebrow">{card.eyebrow}</span>
              <strong>{card.name}</strong>
            </div>
          </div>
        </div>
      )}

      {view.overlay === "rose" && (
        <div className="w-rose-ui" role="group" aria-label="Play with the Bomba Rose">
          <div className="w-eyebrow">Marea Dvīpa · play the Bomba Rose</div>
          <p>Drag the rose to spin it. Tap a ring to hear its petals, the heart for a gong, or any kettle and gong around it.</p>
          <div className="w-rose-row">
            <span className="lbl">Turn between rings</span>
            {([[1, "Golden 137.5°"], [0, "No turn"]] as const).map(([v, n]) => (
              <button
                key={v}
                type="button"
                className={"w-pill" + (turn === v ? " on" : "")}
                aria-pressed={turn === v}
                onClick={() => {
                  setTurn(v);
                  RS.current.spinTarget = v;
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <button className="w-pill solid" type="button" onClick={() => ring(hearAll(RS.current, roseMotif()))}>
            Hear the rings
          </button>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {cap ? cap.head + ". " + (cap.body ?? "") : ""}
      </p>

      {/* the name is always in the page for screen readers and search; the title card shows it on screen */}
      <div className={"w-title" + (view.overlay === "title" ? "" : " off")}>
        <img src={src("ntina-mark--gold")} alt="" />
        <div className="w-eyebrow">{profile.location} · Portfolio</div>
        <h1 id="home-title">{profile.name}</h1>
        <p>{profile.title}</p>
      </div>

      {view.overlay === "end" && (
        <div className="w-end">
          <div className="w-eyebrow">{profile.title}</div>
          <h2>Let’s make something people want to touch.</h2>
          <div className="w-end-go">
            <a className="w-btn solid" href="#work">
              View work <LuArrowRight aria-hidden="true" />
            </a>
            <a className="w-btn" href={profile.cv} target="_blank" rel="noopener noreferrer">
              <LuFileText aria-hidden="true" /> CV
            </a>
            <a className="w-btn" href={profile.links.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <FaGithub aria-hidden="true" />
            </a>
          </div>
        </div>
      )}

      <div className="w-ticker" ref={tickRef} aria-hidden="true">
        {ticks.map(({ id, cap: c, out }) => (
          <div key={id} className={"w-tick" + (out ? " out" : "")} data-tick={id}>
            <span className="h">{c.head}</span>
            <span className="e">{c.eyebrow}</span>
            {c.body && <span className="b">{c.body}</span>}
            <span className="sep">✦</span>
          </div>
        ))}
      </div>

      {tapped && (
        <div key={tapped.id} className="w-tapped" style={{ left: tapped.x, top: tapped.y }}>
          {tapped.name}
        </div>
      )}

      {!sound && !ctaGone && (
        <button className="w-sound-cta" type="button" onClick={playWithSound}>
          {Icon.soundOn} Play with sound
        </button>
      )}

      <div className="w-dock" role="group" aria-label="Film controls" hidden={!dock}>
        <button className="w-ic solid" type="button" onClick={() => play(!playing)} aria-label={playing ? "Pause" : "Play"} title={playing ? "Pause (Space)" : "Play (Space)"}>
          {playing ? Icon.pause : Icon.play}
        </button>
        <div className="w-acts" role="group" aria-label="Chapters">
          {TL.acts.map((a, i) => (
            <button
              key={a.id}
              type="button"
              className={"w-act" + (i === actIdx ? " now" : i < actIdx ? " done" : "")}
              aria-current={i === actIdx ? "step" : undefined}
              title={a.label}
              onClick={() => {
                seek(a.start + 0.01);
                if (!T.current.playing) play(true);
              }}
            >
              <i />
              <span>{a.label}</span>
            </button>
          ))}
          <div className="w-bar" aria-hidden="true">
            <i ref={barRef} />
          </div>
        </div>
        <span className="w-time" ref={timeRef}>
          0:00
        </span>
        <button
          className={"w-ic" + (sound ? " on" : "")}
          type="button"
          aria-pressed={sound}
          aria-label="Sound"
          title={sound ? "Sound on" : "Sound off"}
          onClick={() => {
            setSoundOn(!sound);
            setCtaGone(true);
          }}
        >
          {sound ? Icon.soundOn : Icon.soundOff}
        </button>
        <button className="w-ic" type="button" aria-label={isFs ? "Exit full screen" : "Full screen"} title="Full screen (F)" onClick={toggleFs}>
          {Icon.fs}
        </button>
        <span className="w-div" aria-hidden="true" />
        <a className="w-room-btn" href="#work">
          Enter portfolio <LuArrowDown aria-hidden="true" />
        </a>
        <button className="w-ic ghost" type="button" aria-label="Hide controls" title="Hide controls (H)" onClick={() => setDock(false)}>
          {Icon.hide}
        </button>
      </div>
      {!dock && (
        <button
          className="w-handle"
          type="button"
          aria-label="Show controls"
          title="Show controls (H)"
          onClick={(e) => {
            e.stopPropagation();
            setDock(true);
          }}
        >
          {Icon.show}
        </button>
      )}
    </section>
  );
}
