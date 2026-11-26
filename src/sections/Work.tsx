import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { FaGithub } from "react-icons/fa6";
import { LuArrowUpRight, LuChevronLeft, LuChevronRight, LuPause, LuPlay, LuX } from "react-icons/lu";
import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { CardLive, CardVideo, CoverFlow, SoundButton } from "../components/CoverFlow";
import { PatternStage } from "../components/PatternStage";
import { Section } from "../components/Section";
import { caseStudies, earlierWork, type CaseStudy } from "../content/work";
import { profile } from "../content/profile";
import { CubeDemo, ImageExplorer, LivePreview, PREVIEWS_RUN, type ReelMessage } from "../components/LivePreview";

// three.js and the models arrive with this card, not with the page
const ModelStage = lazy(() => import("../three/ModelStage"));

// all the work on one ring, which wraps round: Windfall first, in the middle when the page opens, with the latest
// work on both sides of it. The ring's last cards sit to Windfall's left, so the two games close the ring, after the
// earlier bootcamp projects (which open the same way)
type Work = CaseStudy & { earlier?: boolean };
const CLOSE_THE_RING = ["Dua Pulau in Bricks", "Dua Pulau Regatta"];
const work: Work[] = [
  ...caseStudies.filter((c) => !CLOSE_THE_RING.includes(c.name)),
  ...earlierWork.map((p) => ({
    name: p.name,
    image: p.image,
    role: "Bootcamp project, 2023. Earlier work",
    stack: [],
    problem: "",
    approach: p.details,
    result: "",
    pageLink: p.pageLink,
    sourceLink: p.sourceLink,
    preview: { url: p.pageLink, frame: "desktop" as const },
    earlier: true,
  })),
  ...CLOSE_THE_RING.map((name) => caseStudies.find((c) => c.name === name)).filter((c): c is CaseStudy => !!c),
];

// each card's line under its name: who and when, from the start of its role ("Team project, 2026")
const flow = work.map((c) => ({ name: c.name, image: c.cardImage ?? c.image, video: c.video, live: c.live, sound: c.sound, scene: c.cardScene === "patterns" ? (active: boolean) => <PatternStage active={active} /> : undefined, kicker: c.role.split(". ")[0], open: c.earlier ? "Open the project" : undefined, fit: c.earlier }));

export function Work() {
  const [pick, setPick] = useState(0);
  const [open, setOpen] = useState(false);
  const [sound, setSound] = useState(false); // off until the visitor asks: one switch for the cards and the open project
  const earlier = !!work[pick].earlier;
  return (
    <Section id="work" eyebrow="Case studies" title="Selected work" ownHeading>
      {/* the heading sits over the cards, and says which part of the ring is in the middle */}
      <header className="work-heading">
        <p className="font-mono text-xs font-medium tracking-[0.14em] text-accent-solid uppercase">
          {earlier ? "Bootcamp projects" : "Case studies"}
        </p>
        <h2 id="work-title" className="title-3d mt-2 font-display text-5xl font-semibold sm:text-6xl" aria-live="polite">
          <span key={earlier ? "earlier" : "selected"} className="work-heading-title">
            {earlier ? "Earlier work" : "Selected work"}
          </span>
        </h2>
        {/* the same work as a place to visit: a 3D world, on its own page so it never slows this one */}
        <p className="work-sail">
          Sail to this work in{" "}
          <a href="/">Dua Pulau</a>, or race round its islands in the{" "}
          <a href="/race/">Regatta</a>.
        </p>
      </header>
      <CoverFlow
        items={flow}
        index={pick}
        onIndex={setPick}
        open={open}
        onOpen={() => setOpen(true)}
        sound={sound}
        onSound={setSound}
      />
      {open && <ProjectView index={pick} onIndex={setPick} onClose={() => setOpen(false)} sound={sound} onSound={setSound} />}

    </Section>
  );
}

// a project's live preview: tabs of live pages, one live page, a picture to explore, or the 3D model
function StudyPreview({ study }: { study: CaseStudy }) {
  return (
    <>
        {study.previews && study.image ? (
        <PreviewTabs study={study} />
      ) : study.preview && study.image ? (
        <LivePreview name={study.name} image={study.image} url={study.preview.url} frame={study.preview.frame} />
      ) : study.image ? (
        <ImageExplorer name={study.name} image={study.image} />
      ) : (
        <Suspense fallback={<div className="aspect-[16/10] w-full bg-[#0e0c09]" />}>
          <ModelStage name={study.name} fallback={<CubeDemo name={study.name} />} />
        </Suspense>
      )}
    </>
  );
}

// the open project, as on the album page it is modelled on: the card slides from the middle of the carousel to the
// left and grows, the case study fills the right, and a bar at the foot holds the live project and the way to the next
function ProjectView({
  index,
  onIndex,
  onClose,
  sound,
  onSound,
}: {
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  sound: boolean;
  onSound: (on: boolean) => void;
}) {
  const study = work[index];
  const n = work.length;
  const card = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [shut, setShut] = useState(false);
  const [dir, setDir] = useState(0); // which way the last change went, so the new card slides in from that side
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const step = useCallback(
    (by: number) => {
      setDir(by);
      onIndex((index + by + n) % n);
    },
    [index, n, onIndex],
  );
  const reduce = typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // slide: start the big card where the carousel's middle card is, then let it travel to its place
  useEffect(() => {
    const from = document.querySelector(".coverflow-card.is-centre")?.getBoundingClientRect();
    const el = card.current;
    if (el && from && !reduce) {
      const to = el.getBoundingClientRect();
      el.animate(
        [
          { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`, borderRadius: "22px" },
          { transform: "none" },
        ],
        { duration: 650, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    }
    closeBtn.current?.focus({ preventScroll: true });
    const back = document.activeElement;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      (document.querySelector(".coverflow-cta") as HTMLElement | null)?.focus({ preventScroll: true });
      void back;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = useCallback(() => {
    if (reduce) return onClose();
    setShut(true);
    setTimeout(onClose, 320);
  }, [onClose, reduce]);

  // a sideways trackpad swipe moves to the next project or the one before, one per swipe
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    let acc = 0;
    let quiet = 0;
    let fired = false;
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      acc += e.deltaX;
      if (!fired && Math.abs(acc) > 60) {
        fired = true;
        step(acc > 0 ? 1 : -1);
      }
      clearTimeout(quiet);
      quiet = window.setTimeout(() => ((acc = 0), (fired = false)), 180);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", wheel);
      clearTimeout(quiet);
    };
  }, [step]);

  useEffect(() => {
    const key = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [close, step]);

  const pad = (k: number) => String(k).padStart(2, "0");
  return (
    <div className={`project-view${shut ? " is-shut" : ""}`} role="dialog" aria-modal="true" aria-labelledby="project-view-title">
      <div className="project-view-top">
        <p>
          <b>{profile.name}</b> · Selected work
        </p>
        <button ref={closeBtn} type="button" className="project-view-close" onClick={close}>
          Close <LuX aria-hidden="true" />
        </button>
      </div>

      {/* swipe sideways anywhere on the project to go to the next or the one before */}
      <div
        ref={body}
        className="project-view-body"
        onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => {
          const s0 = swipe.current;
          swipe.current = null;
          if (!s0 || (e.target as HTMLElement).closest("iframe, a, button")) return;
          const dx = e.clientX - s0.x, dy = e.clientY - s0.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => (swipe.current = null)}
      >
        <div ref={card} className={`project-view-card${dir ? (dir > 0 ? " from-right" : " from-left") : ""}`} key={study.name}>
          {study.cardScene === "patterns" ? (
            <div className="coverflow-body">
              <PatternStage active />
            </div>
          ) : study.image ? (
            <img src={study.cardImage ?? study.image} alt="" />
          ) : (
            <span className="coverflow-blank" aria-hidden="true" />
          )}
          {study.video && <CardVideo src={study.video} live={sound && !!study.sound} label={`${study.name}, playing`} />}
          {study.live && <CardLive src={study.live} live={sound && !!study.sound} label={`${study.name}, live`} onSound={onSound} />}
          {study.video && !study.live && study.sound && <SoundButton on={sound} onToggle={() => onSound(!sound)} />}
        </div>

        <div className="project-view-text" key={study.name + "-text"}>
          <p className="project-view-eyebrow">
            Project {pad(index + 1)} of {pad(n)}
          </p>
          <h3 id="project-view-title" className="font-display text-5xl font-semibold sm:text-6xl">
            {study.name}
          </h3>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{study.role}</p>
          {study.stack.length > 0 && <ul aria-label="Tools" className="mt-4 flex flex-wrap gap-1.5">
            {study.stack.map((tool) => (
              <Chip key={tool} as="li">
                {tool}
              </Chip>
            ))}
          </ul>}
          <dl className="mt-8 space-y-6">
            {(study.earlier
              ? [["about", study.approach]]
              : (["problem", "approach", "result"] as const).map((key) => [key, study[key]])
            ).map(([key, text]) => (
              <div key={key}>
                <dt className="font-mono text-xs font-medium tracking-[0.14em] text-accent-solid uppercase">{key}</dt>
                <dd className="mt-1.5 text-lg leading-relaxed">{text}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-10 overflow-hidden rounded-[1.5rem]">
            <StudyPreview study={study} />
          </div>
        </div>
      </div>

      <div className="project-view-bar">
        <div className="project-view-links">
          {study.pageLink && (
            <Button href={study.pageLink} external variant="primary" icon={<LuArrowUpRight />}>
              View live
            </Button>
          )}
          {study.sourceLink && (
            <Button href={study.sourceLink} external icon={<FaGithub />}>
              Source
            </Button>
          )}
          {study.links?.map((l) => (
            <Button key={l.label} href={l.href} external icon={<LuArrowUpRight />}>
              {l.label}
            </Button>
          ))}
        </div>
        <div className="project-view-steps">
          <button type="button" onClick={() => step(-1)} aria-label="Previous project">
            <LuChevronLeft aria-hidden="true" />
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Next project">
            <LuChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

// a card with several live pages: tabs above the frame switch between them. A page with screens tours them: a reel page (the
// Windfall demo) is one frame in which the app moves itself from screen to screen, a teaser, and the chips follow it; any other
// page loads each screen in turn. A tap on a chip jumps there and hands you the pointer, which pauses the motion until Done.
const DWELL = 8000; // ms on each screen, unless the app says how long its own motion takes
const MAX_DWELL = 45000;
function PreviewTabs({ study }: { study: CaseStudy }) {
  const [i, setI] = useState(0);
  const [k, setK] = useState(0); // which screen
  const [touring, setTouring] = useState(PREVIEWS_RUN);
  const [hands, setHands] = useState(false);
  const [handsRequest, setHandsRequest] = useState(0);
  const [visible, setVisible] = useState(false);
  const [lap, setLap] = useState(0); // restarts the chip's progress bar
  const [dwell, setDwell] = useState(DWELL);
  const [go, setGo] = useState<{ n: number; path: string } | null>(null); // a chip tapped on a reel page: the app is sent there
  const box = useRef<HTMLDivElement>(null);
  const p = study.previews![i];
  const reel = !!p.reel;
  const screens = p.screens ?? [];
  const sc = screens[k] ?? null;
  const url = reel || !sc ? p.url : p.url.replace(/\/$/, "") + sc.path;
  const running = touring && visible && !hands && screens.length > 1;
  const next = useCallback(() => { setK((v) => (v + 1) % screens.length); setLap((l) => l + 1); setDwell(DWELL); }, [screens.length]);
  // the app in the frame says which screen it is on and how long its motion there takes; the chips follow
  const onReel = useCallback((m: ReelMessage) => {
    if (m.windfallReel !== "running" || typeof m.path !== "string") return;
    const path = m.path.startsWith("/play/") ? "/today" : m.path;
    const j = screens.findIndex((s2) => s2.path === path);
    if (j >= 0) setK(j);
    setLap((l) => l + 1);
    setDwell(Math.min(MAX_DWELL, Math.max(4000, (m.eta ?? DWELL) + 1500)));
  }, [screens]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.intersectionRatio >= 0.4), { threshold: [0, 0.4] });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!running || reel) return;
    const tm = window.setTimeout(next, dwell);
    return () => window.clearTimeout(tm);
  }, [running, reel, k, lap, dwell, next]);
  const onHands = useCallback((on: boolean) => setHands(on), []);
  const jump = (j: number) => { setK(j); setLap((l) => l + 1); setDwell(DWELL); setHandsRequest((r) => r + 1); if (reel) setGo((g) => ({ n: (g?.n ?? 0) + 1, path: screens[j].path })); };
  return (
    <div ref={box} className="flex flex-col">
      <div role="tablist" aria-label={`${study.name} pages`} className="flex gap-1.5 bg-[#17140f] px-2.5 pt-2.5 pb-2">
        {study.previews!.map((t, j) => (
          <button key={t.label} role="tab" type="button" aria-selected={j === i} onClick={() => { setI(j); setK(0); setLap((l) => l + 1); setDwell(DWELL); setGo(null); }}
            className={"min-h-9 rounded-full px-3.5 text-[13px] font-semibold transition " + (j === i ? "bg-[#e0c27e] text-[#0e0c09]" : "text-white/75 hover:bg-white/10 hover:text-white")}>
            {t.label}
          </button>
        ))}
        {p.blurb && <span className="ml-auto hidden self-center text-[12px] text-white/60 sm:inline">{p.blurb}</span>}
      </div>
      {screens.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 bg-[#17140f] px-2.5 pb-2.5" aria-label={`${p.label} screens`}>
          {screens.map((s2, j) => (
            <button key={s2.path} type="button" aria-pressed={k === j} onClick={() => jump(j)}
              className={"relative min-h-8 overflow-hidden rounded-full border px-3 text-[12px] font-medium transition " + (k === j ? "border-[#e0c27e] bg-[#e0c27e]/15 text-[#e0c27e]" : "border-white/15 text-white/70 hover:border-white/40 hover:text-white")}>
              {k === j && running && <i key={lap + ":" + dwell} className="tour-bar absolute inset-x-0 bottom-0 h-0.5 bg-[#e0c27e]" style={{ animationDuration: dwell + "ms" }} aria-hidden="true" />}
              <span className="relative">{s2.label}</span>
            </button>
          ))}
          <button type="button" onClick={() => setTouring((t) => !t)} aria-pressed={touring} className="ml-auto inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-white/70 hover:text-white" title={touring ? "Pause the teaser" : "Play the teaser"}>
            {touring ? <LuPause aria-hidden="true" /> : <LuPlay aria-hidden="true" />}{hands ? "Paused while you use it" : touring ? "Teaser" : "Teaser paused"}
          </button>
        </div>
      )}
      <LivePreview name={`${study.name} · ${p.label}${sc ? " · " + sc.label : ""}`} image={study.image!} url={url} frame={p.frame} handsRequest={handsRequest} onHands={onHands} reel={reel} active={touring && visible} go={go} onReel={onReel} />
    </div>
  );
}
