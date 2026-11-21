// Dua Pulau, the page: the lamp screen, the world's controls, and a panel for each place. The world itself
// (three.js, the models, the sound) is loaded as its own chunk once this page is up, and everything in it is also
// written out below as an ordinary list, for search engines, screen readers and anyone in a hurry.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { earlierWork } from "../content/work";
import { profile } from "../content/profile";
import { ISLAND_NAME, PLACES, place, type Island, type Place, type PlaceId } from "./places";
import type { World } from "./world/engine";

const ModelStage = lazy(() => import("../three/ModelStage"));
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const WATERS = { md: "Marea Dvīpa waters", wf: "Windfall waters", strait: "The strait", open: "Open sea" } as const;

export function App() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<World | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [lit, setLit] = useState(false);
  const [sailing, setSailing] = useState(false);
  const [near, setNear] = useState<PlaceId | null>(null);
  const [open, setOpen] = useState<PlaceId | null>(null);
  const [found, setFound] = useState<PlaceId[]>([]);
  const [waters, setWaters] = useState<keyof typeof WATERS>("strait");
  const [muted, setMuted] = useState(false);
  const [menu, setMenu] = useState(false);
  const [bound, setBound] = useState<PlaceId | null>(null);

  const moor = useCallback((id: PlaceId | null) => {
    setOpen(id);
    setBound(null);
    setMenu(false);
    world.current?.moor(id);
  }, []);

  useEffect(() => {
    let gone = false;
    import("./world/engine")
      .then(({ createWorld }) => {
        if (gone || !canvas.current) return;
        world.current = createWorld(canvas.current, { onNear: setNear, onArrive: (id) => moor(id), onWaters: setWaters, onFound: setFound });
        setState("ready");
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

  const light = () => {
    if (!world.current || lit) return;
    world.current.light();
    setLit(true);
    window.setTimeout(() => setSailing(true), reduce ? 400 : 8200);
  };
  const sailTo = (id: PlaceId) => {
    if (!sailing) return;
    setOpen(null);
    setMenu(false);
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
        if (menu) setMenu(false);
        else if (open) moor(null);
      } else if (k === "m" && lit) toggleSound();
      else if ((k === "e" || k === "enter") && near && !open && sailing && !(e.target as HTMLElement | null)?.closest?.("button,a")) moor(near);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, open, near, sailing, lit, moor, toggleSound]);
  useEffect(() => {
    if (open) closeBtn.current?.focus({ preventScroll: true });
  }, [open]);

  const here = open ? place(open) : null;
  const next = here ? PLACES[(PLACES.indexOf(here) + 1) % PLACES.length] : null;

  return (
    <main className="dp">
      <section id="world" className="dp-world" aria-label="Dua Pulau, a world of two islands">
        <canvas ref={canvas} tabIndex={-1} aria-label="A pinisi schooner on the sea between two islands: Marea Dvīpa to the west and Windfall to the east. Every place in it is listed below the world." />

        <div className={`dp-gate${lit ? " is-out" : ""}`} aria-hidden={lit}>
          <a className="dp-home" href="/">← Portfolio</a>
          <div className="dp-gate-in">
            <p className="dp-kicker">Dua Pulau · two islands</p>
            <h1>
              A lamp on the <em>water</em>.
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
              <a className="dp-home" href="/">← Portfolio</a>
              <strong>Dua Pulau</strong>
              <span>{WATERS[waters]}</span>
            </div>
            <div className="dp-hud-tr">
              <span className="dp-pill" aria-live="polite">{found.length} / {PLACES.length} found</span>
              <button type="button" className="dp-pill" aria-expanded={menu} aria-controls="dp-menu" onClick={() => setMenu((m) => !m)}>Places</button>
              <button type="button" className="dp-pill" aria-pressed={!muted} onClick={toggleSound}>{muted ? "Sound off" : "Sound on"}</button>
            </div>
            {menu && (
              <nav id="dp-menu" className="dp-menu" aria-label="Sail to a place">
                {(["md", "strait", "wf"] as Island[]).map((isle) => (
                  <div key={isle}>
                    <p className={`dp-kicker is-${isle}`}>{ISLAND_NAME[isle]}</p>
                    {PLACES.filter((p) => p.island === isle).map((p) => (
                      <button type="button" key={p.id} onClick={() => sailTo(p.id)}>
                        <b>{p.holds}</b>
                        <span>{p.name}{found.includes(p.id) ? " · found" : ""}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </nav>
            )}
            {!open && (
              <div className="dp-foot" aria-live="polite">
                {near ? (
                  <button type="button" className={`dp-btn dp-btn-gold is-${place(near).island}`} onClick={() => moor(near)}>
                    Moor at {place(near).name.replace(/^The /, "the ")} <span>· {place(near).holds}</span>
                  </button>
                ) : bound ? (
                  <p className="dp-hint">Sailing to {place(bound).name.replace(/^The /, "the ")}… steer to take the helm back</p>
                ) : (
                  <p className="dp-hint"><span className="dp-keys">← → steer · ↑ sail · or hold and point</span><span className="dp-touch">Hold and point to sail</span> · Places to go straight there</p>
                )}
              </div>
            )}
          </div>
        )}

        {here && (
          <aside className={`dp-panel is-${here.island}`} aria-label={`${here.name}: ${here.holds}`}>
            <header>
              <p className={`dp-kicker is-${here.island}`}>{ISLAND_NAME[here.island]} · {here.name}</p>
              <h2>{here.holds}</h2>
              <button ref={closeBtn} type="button" className="dp-x" onClick={() => moor(null)} aria-label="Cast off and close">×</button>
            </header>
            <div className="dp-panel-body">
              <PlaceBody p={here} />
            </div>
            <footer>
              <button type="button" className="dp-btn dp-btn-line" onClick={() => moor(null)}>Cast off</button>
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
          Built in code with Three.js: the pinisi, the lamp, both islands and every building. The music is Marea Dvīpa's own gamelan, synthesized in the browser, with Windfall's tuning east of the strait. <a href="/">Back to the portfolio</a>
        </p>
      </section>
    </main>
  );
}

const ext = { target: "_blank", rel: "noreferrer" } as const;

function PlaceBody({ p }: { p: Place }) {
  const s = p.study;
  return (
    <>
      <p className="dp-blurb">{p.blurb}</p>
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
          <p className="dp-role">{profile.title} · {profile.location}</p>
          <p>{profile.bio[0]}</p>
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
