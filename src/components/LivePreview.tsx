// Interactive previews for the work cards. A project that is online runs live inside its card as soon as the card scrolls
// into view: the real app, animating on its own in a scaled frame (a desktop window or a phone), behind the screenshot until
// it is up. A touch hands it the pointer, so you can use the app in the card; a tap on "Done" (or Escape) hands it back, so the
// page still scrolls. Out of view, the app is unloaded again. A project with only a screenshot gets a slow pan and a magnifier
// that follows the pointer. The 3D demo, with neither, gets a small cube that turns with the pointer.
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { LuArrowUpRight, LuHand, LuPlay, LuSearch, LuX } from "react-icons/lu";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const saveData = !!(navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData;
const AUTO = !reduceMotion && !saveData; // otherwise the live app waits for a press
const BAR = 36; // the frame's address bar, in px

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}
const domainOf = (url: string) => { try { return new URL(url).host.replace(/^www\./, ""); } catch { return url; } };

export type Frame = "desktop" | "phone";
export type ReelMessage = { windfallReel: boolean | "running" | "done"; path?: string; eta?: number };
type LiveProps = { name: string; image: string; url: string; frame?: Frame; alt?: string; handsAtStart?: boolean; handsRequest?: number; onHands?: (on: boolean) => void; reel?: boolean; active?: boolean; go?: { n: number; path: string } | null; onReel?: (m: ReelMessage) => void };
/** the app is asked to run itself, with sound (it reads this from its address) */
/** the app runs itself (a teaser, screen to screen, with sound) and is told the screen to jump to */
const reelSrc = (u: string) => u.replace(/\/$/, "") + "/?reel=1&sound=1";
// in development, VITE_DEMO_ORIGIN=http://localhost:8083 shows a local build of the demo in its place
const DEMO_DEV = import.meta.env.DEV ? (import.meta.env.VITE_DEMO_ORIGIN as string | undefined) : undefined;
const devSrc = (u: string) => (DEMO_DEV && u.startsWith("https://demo.marea-dvipa.uk") ? DEMO_DEV + u.slice("https://demo.marea-dvipa.uk".length) : u);
type Slot = { id: number; url: string; loaded: boolean };

/** the project itself, live in the card */
export function LivePreview({ name, image, url, frame = "desktop", alt, handsAtStart = false, handsRequest = 0, onHands, reel = false, active = true, go = null, onReel }: LiveProps) {
  const src = devSrc(reel ? reelSrc(url) : url);
  const [ref, width] = useWidth<HTMLDivElement>();
  const [wanted, setWanted] = useState(handsAtStart); // the card is on screen (or the app was asked for)
  const [up, setUp] = useState(false); // the app has loaded
  const [hands, setHands] = useState(handsAtStart); // the pointer belongs to the app
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [slots, setSlots] = useState<Slot[]>([{ id: 0, url: src, loaded: false }]); // the page showing, and the next one loading behind it
  const [turn, setTurn] = useState(0); // the phone turns a little each time a new page arrives
  const phone = useRef<HTMLDivElement>(null);
  const height = Math.round(width * 0.625); // 16:10, like the screenshots
  const base = frame === "phone" ? { w: 390, h: 780 } : { w: 1280, h: 800 };
  const scale = frame === "phone" ? ((height - BAR) * 0.94) / base.h : width / base.w;
  const frameH = frame === "phone" ? base.h : Math.round((height - BAR) / Math.max(scale, 0.0001));

  // on screen: load the app; well off screen: let it go
  useEffect(() => {
    const el = ref.current;
    if (!el || !AUTO) return;
    const io = new IntersectionObserver(([e]) => { if (e.intersectionRatio >= 0.4) setWanted(true); else if (e.intersectionRatio === 0) { setWanted(false); setUp(false); setHands(false); setSlots((s) => [{ ...s[s.length - 1], loaded: false }]); } }, { threshold: [0, 0.4] });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  // a new page: load it behind the current one, then cross-fade when it is up
  useEffect(() => { setSlots((s) => (s[s.length - 1].url === src ? s : [...s.slice(-1), { id: s[s.length - 1].id + 1, url: src, loaded: false }])); }, [src]);
  // the app runs itself while the teaser is on and the pointer is the page's, and stops while you have it; it reports its own timing back
  const origin = (() => { try { return new URL(devSrc(url)).origin; } catch { return ""; } })();
  useEffect(() => {
    if (!reel || !origin) return;
    ref.current?.querySelectorAll("iframe").forEach((f) => { try { f.contentWindow?.postMessage({ windfallReel: active && !hands, sound: true }, origin); } catch { /* not up yet */ } });
  }, [reel, origin, active, hands, slots, ref]);
  // a screen chip: the app is sent to that screen in place, no reload
  useEffect(() => {
    if (!reel || !origin || !go) return;
    ref.current?.querySelectorAll("iframe").forEach((f) => { try { f.contentWindow?.postMessage({ windfallGo: go.path }, origin); } catch { /* not up yet */ } });
  }, [reel, origin, go, ref]);
  useEffect(() => {
    if (!reel || !origin || !onReel) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== origin || !e.data || !("windfallReel" in e.data)) return;
      const mine = ref.current ? [...ref.current.querySelectorAll("iframe")].some((f) => f.contentWindow === e.source) : false; // this card's frame, not another card's
      if (mine) onReel(e.data as ReelMessage);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [reel, origin, onReel, ref]);
  const arrived = (id: number) => { setSlots((s) => s.map((x) => (x.id === id ? { ...x, loaded: true } : x))); setUp(true); setTurn((t) => t + 1); window.setTimeout(() => setSlots((s) => s.filter((x) => x.id >= id)), 700); };
  // the pointer is asked for (a screen chip was tapped)
  useEffect(() => { if (handsRequest) { setWanted(true); setHands(true); } }, [handsRequest]);
  useEffect(() => { if (onHands) onHands(hands); }, [hands, onHands]);
  // Escape anywhere on the page gives the pointer back (keys pressed inside the app stay with the app)
  useEffect(() => {
    if (!hands) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setHands(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hands]);
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (reduceMotion || e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
  };
  const sandbox = "allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock";
  const iframes = (w: number, h: number) => slots.map((sl, i) => (
    <iframe key={sl.id} title={`${name}, live`} src={sl.url} width={w} height={h} className="absolute top-0 left-0 border-0 transition-opacity duration-700"
      style={{ width: w, height: h, opacity: sl.loaded || i === 0 ? 1 : 0, zIndex: i, pointerEvents: hands && i === slots.length - 1 ? "auto" : "none" }}
      sandbox={sandbox} allow="autoplay; fullscreen" onLoad={() => arrived(sl.id)} />
  ));
  const phoneTilt = reduceMotion ? "" : ` rotateY(${(tilt.x * 10).toFixed(2)}deg) rotateX(${(-tilt.y * 6).toFixed(2)}deg)`;
  return (
    <div ref={ref} className={"group relative aspect-[16/10] w-full overflow-hidden bg-[#0e0c09] transition-shadow " + (hands ? "ring-2 ring-[#e0c27e]" : "")} data-state={hands ? "hands" : up ? "live" : wanted ? "loading" : "idle"}
      onPointerMove={onMove} onPointerLeave={() => setTilt({ x: 0, y: 0 })} onKeyDown={(e) => { if (e.key === "Escape" && hands) setHands(false); }}>
      {/* the frame: an address bar and the app, scaled */}
      {wanted && (
        <div className="absolute inset-0 flex flex-col">
          <div className="flex shrink-0 items-center gap-2 bg-[#17140f] px-3 text-[12px] text-white/80" style={{ height: BAR }}>
            <span className="flex gap-1" aria-hidden="true"><i className="size-2 rounded-full bg-[#d9654b]" /><i className="size-2 rounded-full bg-[#e0c27e]" /><i className="size-2 rounded-full bg-[#9fd3b6]" /></span>
            <span className="min-w-0 flex-1 truncate font-mono">{domainOf(url)}{up ? "" : " · loading…"}</span>
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-7 items-center gap-1 rounded-full px-2 hover:bg-white/10" aria-label={`Open ${name} in a new tab`}><LuArrowUpRight aria-hidden="true" /> Open</a>
            {hands && <button type="button" onClick={() => setHands(false)} className="inline-flex min-h-7 items-center gap-1 rounded-full bg-white/10 px-2 hover:bg-white/20" aria-label="Give the pointer back to the page"><LuX aria-hidden="true" /> Done</button>}
          </div>
          <div className="relative flex-1 overflow-hidden bg-[#0e0c09]" style={{ perspective: 1200 }}>
            {frame === "phone" ? (
              <div ref={phone} className={"absolute top-[3%] left-1/2 " + (reduceMotion ? "" : turn % 2 ? "phone-turn-a" : "phone-turn-b")} style={{ width: base.w, height: base.h, transform: `translateX(-50%) scale(${scale})${phoneTilt}`, transformOrigin: "top center", transformStyle: "preserve-3d" }}>
                <div className="relative size-full overflow-hidden rounded-[36px] border-[6px] border-[#2a241b] bg-black shadow-2xl">{iframes(base.w, base.h)}</div>
              </div>
            ) : (
              <div className="absolute top-0 left-0" style={{ width: base.w, height: frameH, transform: `scale(${scale})`, transformOrigin: "0 0" }}>{iframes(base.w, frameH)}</div>
            )}
          </div>
        </div>
      )}
      {/* the poster: the screenshot, leaning with the pointer, until the app is up */}
      <div className={"absolute inset-0 transition-opacity duration-700 " + (up ? "pointer-events-none opacity-0" : "opacity-100")} aria-hidden={up}>
        <img src={image} alt={alt ?? `Screenshot of ${name}`} loading="lazy" className="size-full object-cover object-top transition-transform duration-700 ease-out" style={{ transform: `translate(${(-tilt.x * 2).toFixed(2)}%, ${(-tilt.y * 2).toFixed(2)}%) scale(1.04)` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" aria-hidden="true" />
        {!wanted && (
          <button type="button" onClick={() => setWanted(true)} className="glass-clear glass-lens absolute bottom-4 left-1/2 inline-flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full px-5 text-[15px] font-semibold text-white transition hover:brightness-110" aria-label={`Run ${name} live, inside this card`}>
            <LuPlay aria-hidden="true" className="relative z-2" /><span className="relative z-2">{AUTO ? "Run it here" : "Run it live"}</span><span className="relative z-2 text-[12px] font-medium opacity-80">{domainOf(url)}</span>
          </button>
        )}
        {wanted && !up && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-[13px] text-white/80" aria-live="polite">Loading {name}…</div>}
      </div>
      {/* the hand-over: one touch and the app takes the pointer */}
      {up && !hands && (
        <button type="button" onClick={() => setHands(true)} className="absolute inset-0 flex cursor-pointer items-end justify-center bg-transparent pb-4" aria-label={`Use ${name} inside this card`}>
          <span className="glass-clear glass-lens inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-[14px] font-semibold text-white opacity-90 transition group-hover:opacity-100">
            <LuHand aria-hidden="true" className="relative z-2" /><span className="relative z-2">Touch to use it</span>
          </span>
        </button>
      )}
    </div>
  );
}
export const PREVIEWS_RUN = AUTO;

/** a screenshot that pans slowly on its own, with a magnifier that follows the pointer (a tap toggles it on touch) */
export function ImageExplorer({ name, image, alt }: { name: string; image: string; alt?: string }) {
  const [on, setOn] = useState(false);
  const [at, setAt] = useState({ x: 50, y: 50 });
  const move = (e: RPointerEvent<HTMLDivElement>) => { const r = e.currentTarget.getBoundingClientRect(); setAt({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); };
  return (
    <div className="group relative aspect-[16/10] w-full overflow-hidden bg-[#0e0c09]" data-state={on ? "zoom" : "idle"}
      onPointerMove={(e) => { move(e); if (e.pointerType !== "touch" && !reduceMotion) setOn(true); }}
      onPointerLeave={() => setOn(false)}
      onClick={(e) => { if ((e.target as HTMLElement).closest("button")) return; setOn((v) => !v); }}>
      <img src={image} alt={alt ?? `Screenshot of ${name}`} loading="lazy" className={"size-full object-cover object-top transition-transform duration-300 ease-out " + (on || reduceMotion ? "" : "preview-pan")}
        style={on ? { transform: "scale(2)", transformOrigin: `${at.x.toFixed(1)}% ${at.y.toFixed(1)}%` } : undefined} />
      <button type="button" onClick={() => setOn((v) => !v)} aria-pressed={on}
        className={"glass-clear glass-lens absolute bottom-4 left-1/2 inline-flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full px-5 text-[15px] font-semibold text-white transition " + (on ? "opacity-0 group-hover:opacity-100" : "")}>
        <LuSearch aria-hidden="true" className="relative z-2" /><span className="relative z-2">{on ? "Done" : "Look closer"}</span>
      </button>
    </div>
  );
}

/** the 3D demo's own small demo: a cube that turns with the pointer and keeps turning on its own */
export function CubeDemo({ name }: { name: string }) {
  const [rot, setRot] = useState({ x: -20, y: 30 });
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (held || reduceMotion) return;
    let raf = 0, last = 0;
    const loop = (now: number) => { const dt = last ? (now - last) / 1000 : 0; last = now; setRot((r) => ({ x: r.x, y: r.y + dt * 24 })); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [held]);
  const faces = [["front", "rotateY(0deg)"], ["back", "rotateY(180deg)"], ["right", "rotateY(90deg)"], ["left", "rotateY(-90deg)"], ["top", "rotateX(90deg)"], ["bottom", "rotateX(-90deg)"]];
  return (
    <div className="relative grid aspect-[16/10] w-full cursor-grab place-items-center overflow-hidden bg-[radial-gradient(circle_at_30%_20%,var(--sun),var(--accent)_45%,var(--leaf))] active:cursor-grabbing" role="img" aria-label={`${name}: a cube you can turn`}
      style={{ perspective: 900, touchAction: "none" }}
      onPointerDown={(e) => { setHeld(true); e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerUp={() => setHeld(false)} onPointerCancel={() => setHeld(false)}
      onPointerMove={(e) => { if (!held) return; setRot((r) => ({ x: Math.max(-80, Math.min(80, r.x - e.movementY * 0.5)), y: r.y + e.movementX * 0.5 })); }}>
      <div style={{ position: "relative", width: 128, height: 128, transformStyle: "preserve-3d", transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)` }}>
        {faces.map(([f, tf]) => (
          <div key={f} className="grid place-items-center rounded-2xl border border-white/50 bg-white/20 text-[11px] font-mono uppercase tracking-widest text-white shadow-[inset_0_0_24px_rgb(255_255_255/0.25)]"
            style={{ position: "absolute", left: 0, top: 0, width: 128, height: 128, transform: `${tf} translateZ(64px)`, backfaceVisibility: "visible" }}>{f}</div>
        ))}
      </div>
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[12px] text-white/80">Drag to turn</span>
    </div>
  );
}
