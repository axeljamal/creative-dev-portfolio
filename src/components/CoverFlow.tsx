// The work as a cover flow: tall cards on a curve, the one in the middle facing you, its neighbours turned away and
// stepped back. Slide them with a finger or the mouse and they follow, settling on the nearest; arrows, arrow keys
// or a tap on a side card do the same. A tap on the
// middle card's one button opens its case study. It wraps round, so there is always a card on each side.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { LuArrowDown, LuChevronLeft, LuChevronRight, LuVolume2, LuVolumeX, LuX } from "react-icons/lu";

export type FlowItem = {
  name: string;
  image?: string;
  video?: string;
  live?: string;
  sound?: boolean;
  kicker?: string;
  open?: string;
  /** a wide screenshot shown whole, as a window over a blurred copy of itself, rather than cropped to the card */
  fit?: boolean;
  /** a card with its own face (the About cards): drawn in place of a picture and caption; centre says whether it is the
   * middle card, the only one whose links and buttons can be reached */
  body?: (centre: boolean) => ReactNode;
};

// the cards are pinned round the outside of one ring, 23° apart, and the ring turns: x and depth in card widths
const STEP_DEG = 23;
const RING_X = 2.867; // 860px across for a 300px card
const RING_Z = 3.2;

const pad = (n: number) => String(n).padStart(2, "0");

// where a card sits on the ring at any distance f from the middle (in cards, fractional while sliding)
function place(f: number) {
  const a = (f * STEP_DEG * Math.PI) / 180;
  const af = Math.abs(f);
  return {
    x: RING_X * Math.sin(a),
    z: RING_Z * (Math.cos(a) - 1) - 0.067 * Math.min(af, 1),
    turn: f * STEP_DEG,
    // full round the front, half see-through on the third, gone round the back after that
    opacity: af <= 2 ? 1 : af <= 3 ? 1 - 0.5 * (af - 2) : Math.max(0, 0.5 - (af - 3)),
  };
}

export function CoverFlow({
  items,
  index,
  onIndex,
  open = false,
  onOpen,
  sound = false,
  onSound = () => {},
  label = "Projects",
  noun = "project",
  hint = "Slide the cards to browse. Open a project with the button on its card.",
}: {
  items: FlowItem[];
  index: number;
  onIndex: (i: number) => void;
  /** whether the middle project's case study is showing */
  open?: boolean;
  onOpen?: () => void;
  /** whether the visitor has turned the sound on: only the middle card is heard */
  sound?: boolean;
  onSound?: (on: boolean) => void;
  /** what the carousel is, what one card is, and the line beside the arrows */
  label?: string;
  noun?: string;
  hint?: string;
}) {
  const n = items.length;
  const go = (i: number) => onIndex(((i % n) + n) % n);
  const drag = useRef<{ x: number; moved: boolean; id: number } | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [pull, setPull] = useState(0); // how far the cards are being dragged, in steps (+ is towards the right)
  // whether the carousel is on screen (or nearly): live cards run only then
  const root = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const seen = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { rootMargin: "200px 0px" });
    seen.observe(el);
    return () => seen.disconnect();
  }, []);

  // one step is the distance between the middle card and its neighbour
  const step = () => (stage.current?.querySelector<HTMLElement>(".coverflow-card")?.offsetWidth ?? 300) * RING_X * Math.sin((STEP_DEG * Math.PI) / 180);

  // the shortest way round from the middle card to card i: -2 … +2 are shown, the rest wait out of sight
  const offset = (i: number) => {
    let d = (i - index) % n;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") go(index - 1);
    else if (e.key === "ArrowRight") go(index + 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(n - 1);
    else return;
    e.preventDefault();
  };

  // a slide: from the stage's own pointer, or handed over by a live card's page (whose pointer this page cannot see)
  const slideStart = (x: number, id: number) => {
    drag.current = { x, moved: false, id };
  };
  const slideMove = (x: number, id: number) => {
    const d = drag.current;
    if (!d || d.id !== id) return;
    const dx = x - d.x;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      if (id >= 0) stage.current?.setPointerCapture(id); // keep following, even off the cards
    }
    if (d.moved) setPull(dx / step());
  };
  const slideEnd = (x: number, id: number) => {
    const d = drag.current;
    if (!d || d.id !== id) return;
    if (d.moved) {
      // settle on the nearest card, with a flick counting as a step
      const steps = (x - d.x) / step();
      const by = Math.abs(steps) < 0.5 && Math.abs(x - d.x) > 30 ? Math.sign(steps) : Math.round(steps);
      if (by) go(index - by);
      // the click that follows a drag is swallowed below, then the drag is forgotten
      setTimeout(() => (drag.current = null), 0);
    } else drag.current = null;
    setPull(0);
  };
  const down = (e: PointerEvent) => {
    if (e.button === 0) slideStart(e.clientX, e.pointerId);
  };
  const move = (e: PointerEvent) => slideMove(e.clientX, e.pointerId);
  const up = (e: PointerEvent) => slideEnd(e.clientX, e.pointerId);
  // a live card hands its slides over as screen x; only the differences count, so screen x serves as well as page x
  const handed = (phase: "down" | "move" | "up", x: number) =>
    phase === "down" ? slideStart(x, -1) : phase === "move" ? slideMove(x, -1) : slideEnd(x, -1);
  const dragging = pull !== 0;

  // a sideways swipe on a trackpad turns the ring as the fingers move, no click needed, and settles when they stop
  const latest = useRef({ index, go });
  latest.current = { index, go };
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let acc = 0;
    let rest = 0;
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // up and down still scrolls the page
      e.preventDefault(); // and keeps the browser from going back a page
      acc -= e.deltaX;
      setPull(acc / step());
      clearTimeout(rest);
      rest = window.setTimeout(() => {
        const steps = acc / step();
        const by = Math.abs(steps) < 0.5 && Math.abs(acc) > 30 ? Math.sign(steps) : Math.round(steps);
        if (by) latest.current.go(latest.current.index - by);
        acc = 0;
        setPull(0);
      }, 140);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", wheel);
      clearTimeout(rest);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={root} className="coverflow" role="region" aria-roledescription="carousel" aria-label={label} onKeyDown={onKey}>
      <div
        ref={stage}
        className={`coverflow-stage${dragging ? " is-dragging" : ""}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => {
          drag.current = null;
          setPull(0);
        }}
        // the click that ends a slide is not a tap on whatever was under the finger (a link on an About card included)
        onClickCapture={(e) => {
          if (drag.current?.moved) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {items.map((item, i) => {
          const d = offset(i);
          const p = place(d + pull);
          const shown = p.opacity > 0;
          const centre = d === 0;
          return (
            <div
              key={item.name}
              className={`coverflow-card${centre ? " is-centre" : ""}${item.body ? " has-body" : ""}`}
              style={{
                transform: `translateX(calc(${p.x} * var(--cw))) translateZ(calc(${p.z} * var(--cw))) rotateY(${p.turn}deg)`,
                zIndex: 100 - Math.round(Math.abs(d + pull) * 10),
                opacity: p.opacity,
                pointerEvents: shown ? undefined : "none",
              }}
              aria-hidden={!shown || undefined}
              role="group"
              aria-roledescription="slide"
              aria-label={`${item.name}, ${i + 1} of ${n}`}
            >
              {item.body ? (
                <div className="coverflow-body">{item.body(centre)}</div>
              ) : item.image && item.fit ? (
                <span className="coverflow-fit" aria-hidden="true">
                  <img className="coverflow-fit-back" src={item.image} alt="" loading="lazy" draggable={false} />
                  <img className="coverflow-fit-shot" src={item.image} alt="" loading="lazy" draggable={false} />
                </span>
              ) : item.image ? (
                <img src={item.image} alt="" loading="lazy" draggable={false} />
              ) : (
                <span className="coverflow-blank" aria-hidden="true" />
              )}
              {/* the project playing, silent, on the cards round the front; the picture stays beneath while it loads */}
              {item.video && Math.abs(d) <= 2 && <CardVideo src={item.video} live={centre && sound && !open && !!item.sound} />}
              {/* the project running live, on the middle card only and only while the cards are on screen: each one is a
                  whole app, so the cards beside it show its still instead, and the open project runs the only copy */}
              {item.live && centre && onScreen && !open && (
                <CardLive
                  src={item.live}
                  live={centre && sound && !open && !!item.sound}
                  onSlide={centre ? handed : undefined}
                  onSound={centre ? onSound : undefined}
                />
              )}
              {!item.body && <span className="coverflow-shade" aria-hidden="true" />}
              <span className="coverflow-num" aria-hidden="true">
                {pad(i + 1)}
              </span>
              {/* a side card is one big target that brings it to the middle */}
              {!centre && shown && (
                <button
                  type="button"
                  className="coverflow-bring"
                  tabIndex={-1}
                  aria-label={`Show ${item.name}`}
                  onClick={(e) => (drag.current?.moved ? e.preventDefault() : go(i))}
                />
              )}
              {/* a live card carries its own switch, in its page: the tap must land there for its sound to play */}
              {centre && item.sound && item.video && !item.live && (
                <SoundButton on={sound} onToggle={() => (drag.current?.moved ? undefined : onSound(!sound))} />
              )}
              {!item.body && <span className="coverflow-text">
                <span className="coverflow-name">{item.name}</span>
                <span className="coverflow-kicker">{item.kicker}</span>
                {/* the one way into the case study */}
                {centre && onOpen && (
                  <button
                    type="button"
                    className="coverflow-cta"
                    aria-expanded={open}
                    aria-controls="work-detail"
                    onClick={(e) => (drag.current?.moved ? e.preventDefault() : onOpen())}
                  >
                    {open ? "Close" : (item.open ?? "Read the case study")}
                    {open ? <LuX aria-hidden="true" /> : <LuArrowDown aria-hidden="true" />}
                  </button>
                )}
              </span>}
            </div>
          );
        })}
      </div>

      <div className="coverflow-controls">
        <p className="coverflow-hint">{hint}</p>
        <button type="button" className="coverflow-arrow" onClick={() => go(index - 1)} aria-label={`Previous ${noun}`}>
          <LuChevronLeft aria-hidden="true" />
        </button>
        <p className="coverflow-count" aria-live="polite">
          <span className="sr-only">{items[index].name}, {noun} </span>
          <b>{pad(index + 1)}</b> / {pad(n)}
        </p>
        <button type="button" className="coverflow-arrow" onClick={() => go(index + 1)} aria-label={`Next ${noun}`}>
          <LuChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

const still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * a card's film: muted and looping, playing only while it is on screen. When it is the one being heard (live), it
 * starts again from the top with its sound, so a film is heard whole.
 */
export function CardVideo({ src, live = false, label }: { src: string; live?: boolean; label?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || still) return;
    const seen = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.2 });
    seen.observe(v);
    return () => seen.disconnect();
  }, []);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = !live;
    if (live) {
      v.currentTime = 0;
      v.play().catch(() => (v.muted = true)); // a browser that still says no keeps it silent rather than stopped
    }
  }, [live]);
  return (
    <video
      ref={ref}
      className="coverflow-video"
      src={src}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden={label ? undefined : true}
      aria-label={label}
    />
  );
}

/**
 * a card's live project: the page fills the card and plays on its own. It cannot be touched (the card is still slid
 * and opened as usual); sound on or off is sent to it, since a page in a frame cannot hear the tap itself.
 */
export function CardLive({
  src,
  live = false,
  label,
  onSlide,
  onSound,
}: {
  src: string;
  live?: boolean;
  label?: string;
  /** when set, the card takes touches: its page hands slides back here */
  onSlide?: (phase: "down" | "move" | "up", x: number) => void;
  /** its own sound switch was tapped */
  onSound?: (on: boolean) => void;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [drawn, setDrawn] = useState(false); // the still stays on top until the live page has drawn
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setDrawn(true), 700);
    return () => clearTimeout(t);
  }, [ready]);
  useEffect(() => {
    const w = ref.current?.contentWindow;
    if (w && ready) w.postMessage({ type: "marea-card", sound: live }, new URL(src).origin);
  }, [live, ready, src]);
  const hooks = useRef({ onSlide, onSound });
  hooks.current = { onSlide, onSound };
  useEffect(() => {
    const hear = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow || !e.data) return;
      if (e.data.type === "marea-card-drag") hooks.current.onSlide?.(e.data.phase, Number(e.data.x));
      if (e.data.type === "marea-card-sound") hooks.current.onSound?.(!!e.data.sound);
    };
    window.addEventListener("message", hear);
    return () => window.removeEventListener("message", hear);
  }, []);
  return (
    <iframe
      ref={ref}
      className={`coverflow-live${onSlide || onSound ? " is-touchable" : ""}${drawn ? " is-drawn" : ""}`}
      src={src}
      title={label ?? "The project, live"}
      allow="autoplay"
      tabIndex={-1}
      aria-hidden={label ? undefined : true}
      onLoad={() => setReady(true)}
    />
  );
}

/** the one switch for sound, on a card whose film has it; browsers only play sound after a tap like this one */
export function SoundButton({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="card-sound" aria-pressed={on} aria-label="Sound" onClick={onToggle}>
      {on ? <LuVolume2 aria-hidden="true" /> : <LuVolumeX aria-hidden="true" />}
      <span aria-hidden="true">{on ? "Sound on" : "Sound off"}</span>
    </button>
  );
}
