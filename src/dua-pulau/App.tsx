// Dua Pulau, the page: the lamp screen, the world's controls, and a panel for each place. The world itself
// (three.js, the models, the sound) is loaded as its own chunk once this page is up, and everything in it is also
// written out below as an ordinary list, for search engines, screen readers and anyone in a hurry.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { earlierWork } from "../content/work";
import { profile } from "../content/profile";
import { ISLAND_NAME, PLACES, place, type Island, type Place, type PlaceId } from "./places";
import { Chart } from "./Chart";
import { Log, TALK, Talk } from "./Log";
import { Ask, type AskLine } from "./Ask";
import { PipCorner } from "./PipCorner";
import type { BoatView, DayPart, Weather, World } from "./world/engine";

const VIEW_NEXT: Record<BoatView, BoatView> = { astern: "starboard", starboard: "port", port: "astern" };
const VIEW_NAME: Record<BoatView, string> = { astern: "Astern", starboard: "Starboard side", port: "Port side" };

const ModelStage = lazy(() => import("../three/ModelStage"));
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Pip's welcome is said once per browser; after that the log waits behind its button
const SEEN = "dua-pulau-welcomed";
const welcomed = () => {
  try {
    return localStorage.getItem(SEEN) === "1";
  } catch {
    return false;
  }
};
// the log's ticks are kept in the browser, so a reload or a later visit picks the voyage up where it stopped
const LOGGED = "dua-pulau-logged";
const logged = (): PlaceId[] => {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(LOGGED) || "[]");
    return Array.isArray(ids) ? PLACES.map((p) => p.id).filter((id) => ids.includes(id)) : [];
  } catch {
    return [];
  }
};
const WATERS = { md: "Marea Dvīpa waters", wf: "Windfall waters", strait: "The strait", open: "Open sea" } as const;

/** Dua Pulau in bricks: the same world and the same work, served at /bricks/ */
const BRICK = typeof location !== "undefined" && location.pathname.startsWith("/bricks");

export function App() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<World | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [lit, setLit] = useState(false);
  const [sailing, setSailing] = useState(false);
  const [near, setNear] = useState<PlaceId | null>(null);
  const [open, setOpen] = useState<PlaceId | null>(null);
  const [looking, setLooking] = useState(false); // moored, panel tucked away, walking the camera round the place
  const lookBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (looking) lookBtn.current?.focus({ preventScroll: true });
  }, [looking]);
  const [found, setFound] = useState<PlaceId[]>(logged); // a place moored at on an earlier visit was found then
  const [waters, setWaters] = useState<keyof typeof WATERS>("strait");
  const [muted, setMuted] = useState(false);
  const [boatView, setBoatView] = useState<BoatView>("astern");
  const [menu, setMenu] = useState(false);
  const [bound, setBound] = useState<PlaceId | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [dayPart, setDayPart] = useState<DayPart>("First light");
  const [visited, setVisited] = useState<PlaceId[]>(logged); // moored at: the log's ticks
  const [talk, setTalk] = useState<number | null>(null); // which line of Pip's welcome is showing
  const [firstLog, setFirstLog] = useState(false); // the log as it opens straight after the welcome
  const [asking, setAsking] = useState(false); // Pip's question panel
  const [tools, setTools] = useState(false); // phone: the controls unfolded from their floating button
  const [askThread, setAskThread] = useState<AskLine[]>([]); // kept while the panel is shut, so a conversation picks up again

  const look = useCallback((on: boolean) => {
    setLooking(on);
    world.current?.look(on);
  }, []);
  const moor = useCallback((id: PlaceId | null) => {
    setOpen(id);
    setLooking(false);
    setBound(null);
    setMenu(false);
    setTalk(null);
    if (id) setVisited((v) => (v.includes(id) ? v : [...v, id]));
    world.current?.moor(id);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(LOGGED, JSON.stringify(visited));
    } catch {
      /* private mode: the ticks last for this visit only */
    }
  }, [visited]);
  // the welcome ends, by its last line or by Skip: the log opens in its place
  const endTalk = () => {
    setTalk(null);
    setFirstLog(true);
    setMenu(true);
    try {
      localStorage.setItem(SEEN, "1");
    } catch {
      /* private mode: she will simply be welcomed again */
    }
  };
  const closeLog = () => {
    setMenu(false);
    setFirstLog(false);
  };
  /** a tap on Pip on deck: his questions open, once she is under way (before that the welcome is still speaking) */
  const sailingNow = useRef(false);
  sailingNow.current = sailing;
  const askPip = useCallback(() => {
    if (!sailingNow.current) return;
    setMenu(false);
    setFirstLog(false);
    setTalk(null);
    setAsking(true);
  }, []);

  useEffect(() => {
    let gone = false;
    import("./world/engine")
      .then(({ createWorld }) => {
        if (gone || !canvas.current) return;
        world.current = createWorld(canvas.current, { onNear: setNear, onArrive: (id) => moor(id), onWaters: setWaters, onFound: setFound, onWeather: setWeather, onTime: setDayPart, onPip: askPip, onView: setBoatView }, logged(), { brick: BRICK });
        setState("ready");
        // local dev only, for filming: lets a recorder steer the world (never in a production build)
        if (import.meta.env.DEV) { const w = window as unknown as { __dp?: object }; w.__dp = Object.assign(w.__dp ?? {}, { world: world.current, moor, look }); }
      })
      .catch((e) => {
        console.error(e);
        setState("failed");
      });
    return () => {
      gone = true;
      world.current?.dispose();
      world.current = null;
    };
  }, [moor]);
  // Pip on deck stays awake and faces the visitor while his questions are open
  useEffect(() => world.current?.pipTalking(asking), [asking, state]);

  const light = () => {
    if (!world.current || lit) return;
    world.current.light();
    setLit(true);
    window.setTimeout(() => {
      setSailing(true);
      if (!welcomed()) setTalk(0);
    }, reduce ? 400 : 8200);
  };
  const sailTo = (id: PlaceId) => {
    if (!sailing) return;
    setOpen(null);
    closeLog();
    setAsking(false);
    setTalk(null);
    setBound(id);
    world.current?.moor(null);
    world.current?.sailTo(id);
    document.getElementById("world")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  };
  const toggleSound = useCallback(() => {
    setMuted((m) => {
      world.current?.setMuted(!m);
      return !m;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.("input,textarea")) return;
      const k = e.key.toLowerCase();
      if (k === "escape") {
        if (menu) closeLog();
        else if (looking) look(false);
        else if (open) moor(null);
      } else if (k === "m" && lit) toggleSound();
      else if ((k === "e" || k === "enter") && near && !open && sailing && !(e.target as HTMLElement | null)?.closest?.("button,a")) moor(near);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, open, near, sailing, lit, moor, toggleSound, looking, look]);
  useEffect(() => {
    if (open) closeBtn.current?.focus({ preventScroll: true });
  }, [open]);

  const here = open ? place(open) : null;
  const next = here ? PLACES[(PLACES.indexOf(here) + 1) % PLACES.length] : null;

  return (
    <main className={`dp${BRICK ? " is-brick" : ""}`}>
      <section id="world" className={`dp-world${open ? " has-panel" : ""}${talk !== null ? " has-talk" : ""}${menu || asking ? " has-log" : ""}`} aria-label="Dua Pulau, a world of two islands">
        <canvas ref={canvas} tabIndex={-1} aria-label="A pinisi schooner on the sea between two islands: Marea Dvīpa to the west and Windfall to the east. Every place in it is listed below the world." />

        <div className={`dp-gate${lit ? " is-out" : ""}`} aria-hidden={lit}>
          <a className="dp-home" href="/portfolio/">Classic portfolio →</a>
          <a className="dp-home dp-other" href={BRICK ? "/" : "/bricks/"}>{BRICK ? "The real world →" : "Build it in bricks →"}</a>
          <div className="dp-gate-in">
            <p className="dp-kicker">{BRICK ? "Dua Pulau · in bricks" : "Dua Pulau · two islands"}</p>
            <h1>
              {BRICK ? <>Two islands, <em>brick by brick</em>.</> : <>A lamp on the <em>water</em>.</>}
            </h1>
            <p>Light the pelita at her bow and the day comes up. Then sail the pinisi between two islands, Marea Dvīpa and Windfall, and moor at the work.</p>
            <div className="dp-btns">
              <button type="button" className="dp-btn dp-btn-gold" onClick={light} disabled={state !== "ready" || lit}>
                {state === "loading" ? "Preparing the sea…" : state === "failed" ? "The world could not load" : "Light the lamp"}
              </button>
              <a className="dp-btn dp-btn-line" href="#map">Just the work</a>
            </div>
            <p className="dp-small">{state === "failed" ? "Your browser could not start the 3D world. Everything in it is in the list below." : "Sound comes on with the lamp. Keyboard, touch, mouse or a controller."}</p>
          </div>
        </div>

        {lit && (
          <div className={`dp-hud${sailing ? " is-on" : ""}`}>
            <div className="dp-hud-tl">
              <a className="dp-home" href="/portfolio/">Classic portfolio →</a>
              <a className="dp-home" href={BRICK ? "/bricks/race/" : "/race/"}>Race the regatta →</a>
              <a className="dp-home" href={BRICK ? "/" : "/bricks/"}>{BRICK ? "The real world →" : "In bricks →"}</a>
              <strong>Dua Pulau</strong>
              <span>{WATERS[waters]}</span>
            </div>
            <div className="dp-hud-tr">
              {/* on a phone the controls fold into one floating button; on wider screens it is hidden and they show as a row */}
              <button type="button" className="dp-more" aria-expanded={tools} aria-controls="dp-tools" aria-label={tools ? "Close the controls" : `Controls: ${dayPart}, ${visited.length} of ${PLACES.length} logged`} onClick={() => setTools(!tools)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">{tools ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
                {!tools && <b className="dp-more-n">{visited.length}</b>}
              </button>
              <div id="dp-tools" className={`dp-tools${tools ? " is-open" : ""}`}>
              <span className="dp-pill" aria-live="polite">{found.length} / {PLACES.length} found</span>
              <button type="button" className="dp-pill dp-time" onClick={() => world.current?.skipTime()} aria-label={`Time of day: ${dayPart}. Move on to the next part of the day`} title="Move the day on">{dayPart}</button>
              {sailing && (
                <button type="button" className="dp-pill" onClick={() => { const v = VIEW_NEXT[boatView]; setBoatView(v); world.current?.setView(v); }} aria-label={`View: ${VIEW_NAME[boatView]}. Change to ${VIEW_NAME[VIEW_NEXT[boatView]]}`} title="Change the view (V)">{VIEW_NAME[boatView]}</button>
              )}
              <button type="button" className="dp-pill dp-logbtn" aria-expanded={menu} aria-controls="dp-log" onClick={() => { setAsking(false); setTools(false); if (menu) closeLog(); else setMenu(true); }}>Log <b>{visited.length}/{PLACES.length}</b></button>
              <button type="button" className="dp-pill" aria-pressed={!muted} onClick={toggleSound}>{muted ? "Sound off" : "Sound on"}</button>
              </div>
            </div>
            {menu && <Log visited={visited} first={firstLog} onSail={sailTo} onClose={closeLog} />}
            {asking && <Ask thread={askThread} setThread={setAskThread} onSail={sailTo} onClose={() => setAsking(false)} />}
            {sailing && world.current && <Chart world={world.current} found={found} bound={bound} onSail={sailTo} />}
            <PipCorner away={!sailing || asking || !!open || menu || tools || talk !== null} onAsk={() => { closeLog(); setTools(false); setAsking(true); }} />
            {!open && (
              <div className="dp-foot" aria-live="polite">
                {talk !== null ? (
                  <Talk line={talk} onNext={() => (talk < TALK.length - 1 ? setTalk(talk + 1) : endTalk())} onSkip={endTalk} />
                ) : near ? (
                  <button type="button" className={`dp-btn dp-btn-gold is-${place(near).island}`} onClick={() => moor(near)}>
                    Moor at {place(near).name.replace(/^The /, "the ")} <span>· {place(near).holds}</span>
                  </button>
                ) : bound ? (
                  <p className="dp-hint">Sailing to {place(bound).name.replace(/^The /, "the ")}… steer to take the helm back</p>
                ) : (
                  <p className="dp-hint"><span className="dp-keys">← → steer · ↑ sail · or hold and point</span><span className="dp-touch">Hold and point to sail</span> · the Log to go straight there</p>
                )}
              </div>
            )}
          </div>
        )}

        {here && looking && (
          <div className={`dp-look is-${here.island}`} role="group" aria-label={`Looking round ${here.name}`}>
            <p>Drag to walk round {here.name.replace(/^The /, "the ")} · scroll or pinch to come closer · arrow keys too</p>
            <button type="button" className="dp-btn dp-btn-gold" onClick={() => look(false)} ref={lookBtn}>
              Back to {here.holds}
            </button>
          </div>
        )}
        {here && !looking && (
          <aside className={`dp-panel is-${here.island}`} aria-label={`${here.name}: ${here.holds}`}>
            <header>
              <p className={`dp-kicker is-${here.island}`}>{ISLAND_NAME[here.island]} · {here.name}</p>
              <h2>{here.holds}</h2>
              <button ref={closeBtn} type="button" className="dp-x" onClick={() => moor(null)} aria-label="Cast off and close">×</button>
            </header>
            <div className="dp-panel-body">
              <PlaceBody p={here} weather={weather} />
            </div>
            <footer>
              <span className="dp-foot-l">
                <button type="button" className="dp-btn dp-btn-line" onClick={() => moor(null)}>Cast off</button>
                <button type="button" className="dp-btn dp-btn-line" onClick={() => look(true)} title="Hide this panel and walk the view round the place">Look around</button>
              </span>
              {next && <button type="button" className="dp-btn dp-btn-gold" onClick={() => sailTo(next.id)}>Sail on to {next.name.replace(/^The /, "the ")} →</button>}
            </footer>
          </aside>
        )}
      </section>

      <section id="map" className="dp-map">
        <p className="dp-kicker">The map</p>
        <h2>Two islands, ten places</h2>
        <p className="dp-lede">Every place in the world holds a piece of work. Here they all are in plain words{sailing ? ", each with a way to sail straight there" : ""}.</p>
        <div className="dp-isles">
          {(["md", "strait", "wf"] as Island[]).map((isle) => (
            <div key={isle} className={`dp-isle is-${isle}`}>
              <h3>{ISLAND_NAME[isle]}</h3>
              <ul>
                {PLACES.filter((p) => p.island === isle).map((p) => (
                  <li key={p.id}>
                    <h4>{p.holds}</h4>
                    <p className="dp-where">{p.name}</p>
                    <p>{p.study ? p.study.problem : p.blurb}</p>
                    <p className="dp-links">
                      {p.study?.pageLink && <a href={p.study.pageLink} target="_blank" rel="noreferrer">Open it live ↗</a>}
                      {p.links.map((l) => <a key={l.href} href={l.href} {...(l.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>{l.label}{l.href.startsWith("http") ? " ↗" : ""}</a>)}
                      {sailing && <button type="button" onClick={() => sailTo(p.id)}>Sail there</button>}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="dp-credit">
          Built in code with Three.js: the pinisi, the lamp, both islands and every building. The music is Marea Dvīpa's own gamelan, synthesized in the browser, with Windfall's tuning east of the strait. <a href="/portfolio/">See the classic portfolio</a>
        </p>
      </section>
    </main>
  );
}

const ext = { target: "_blank", rel: "noreferrer" } as const;

const COMPASS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];

function PlaceBody({ p, weather }: { p: Place; weather: Weather | null }) {
  const s = p.study;
  return (
    <>
      <p className="dp-blurb">{p.blurb}</p>
      {p.id === "lighthouse" && weather && (
        <p className="dp-live" aria-live="polite">
          Brighton now: {Math.round(weather.temp)}°C, wind {Math.round(weather.wind)} km/h from the {COMPASS[Math.round(weather.from / 45) % 8]}. The vane up there is turned into it, and the cups spin at its speed.
        </p>
      )}
      {p.id === "barong" && (
        <div className="dp-stage">
          <Suspense fallback={null}>
            <ModelStage name="3D product demo" fallback={null} />
          </Suspense>
        </div>
      )}
      {s?.image && p.id !== "barong" && <img className="dp-shot" src={s.image} alt={`${s.name}, a screen from the project`} loading="lazy" />}
      {p.id === "gate" && (
        <>
          <p className="dp-role">{profile.latest.role} · {profile.latest.place}</p>
          <p>{profile.bio[0]}</p>
          <dl>
            {profile.latest.now.map((n) => (
              <div key={n.label} style={{ display: "contents" }}>
                <dt>{n.label}</dt>
                <dd>{n.text}</dd>
              </div>
            ))}
          </dl>
          <p>{profile.bio[3]}</p>
        </>
      )}
      {p.id === "buoy" && (
        <p>
          <a className="dp-mail" href={`mailto:${profile.email}`}>{profile.email}</a>
        </p>
      )}
      {s && (
        <>
          <p className="dp-role">{s.role}</p>
          <dl>
            <dt>The problem</dt>
            <dd>{s.problem}</dd>
            <dt>The approach</dt>
            <dd>{s.approach}</dd>
            <dt>The result</dt>
            <dd>{s.result}</dd>
          </dl>
          <ul className="dp-chips">
            {s.stack.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </>
      )}
      <p className="dp-actions">
        {s?.pageLink && <a className="dp-btn dp-btn-gold" href={s.pageLink} {...ext}>Open it live ↗</a>}
        {s?.links?.map((l) => <a key={l.href} className="dp-btn dp-btn-line" href={l.href} {...ext}>{l.label} ↗</a>)}
        {s?.sourceLink && <a className="dp-btn dp-btn-line" href={s.sourceLink} {...ext}>Source ↗</a>}
        {p.links.map((l, i) => (
          <a key={l.href} className={`dp-btn ${i === 0 && !s ? "dp-btn-gold" : "dp-btn-line"}`} href={l.href} {...(l.href.startsWith("http") ? ext : {})}>
            {l.label}{l.href.startsWith("http") ? " ↗" : ""}
          </a>
        ))}
        {p.id === "gate" && <a className="dp-btn dp-btn-line" href={profile.cv} {...ext}>CV ↗</a>}
        {(p.id === "gate" || p.id === "buoy") && <a className="dp-btn dp-btn-line" href={profile.links.linkedin} {...ext}>LinkedIn ↗</a>}
        {p.id === "gate" && <a className="dp-btn dp-btn-line" href={profile.links.github} {...ext}>GitHub ↗</a>}
      </p>
      {p.id === "huts" && (
        <>
          <h3>Earlier work</h3>
          <ul className="dp-earlier">
            {earlierWork.map((w) => (
              <li key={w.name}>
                <a href={w.pageLink} {...ext}>{w.name} ↗</a>
                <span>{w.details}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
