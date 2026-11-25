// The race page: which screen is up (title, card, race, results) and the cup round three of them. The race itself (the
// world's frame, the rules, the finish) is session.ts's; this file wires the screens to it and keeps the choices.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "./Card";
import { copy } from "./copy";
import type { CupRow } from "./CupTable";
import { watchDevice } from "./device";
import { Hud } from "./Hud";
import { Pause } from "./Pause";
import type { HudView } from "./hudView";
import { Results, type CupView, type ResultView } from "./Results";
import { COURSES, CUP_ORDER } from "./rules/course";
import { POINTS, cupTable } from "./rules/cup";
import { tierFrom } from "./quality";
import { sfx } from "./sfx";
import type { Quality } from "../dua-pulau/world/stage";
import { openStore, slotOf, type Prefs } from "./rules/store";
import type { CourseId, Helm, Mode, WindSet } from "./rules/types";
import { effectiveWind } from "./rules/wind";
import type { CardView, Finish, Session } from "./session";
import { Title } from "./Title";
import { BRICK, HOME, yardDesign } from "./brick";
import { handling, handlingNote } from "../yard/design";
import type { Weather } from "./weather";
import type { RaceWorld } from "./world";

type Screen = "title" | "card" | "race" | "results";
/** a cup under way: its mode, the wind setting it is really sailed in (fixed by its first race), and each race's places */
type Cup = { mode: Mode; chose: WindSet; wind: WindSet | null; places: number[][] };
type Choice = Pick<Prefs, "course" | "mode" | "wind" | "ghost" | "muted">;

/** window.localStorage, or null where even reading the property throws (blocked site data) */
function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
const localDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** in bricks, the player races the boat built in Pinisi Yard (read once: the yard keeps it on this device) */
const YARD = BRICK ? yardDesign() : null;

export function App() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const store = useMemo(() => openStore(safeLocalStorage(), localDay()), []);
  const session = useRef<Session | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [screen, setScreen] = useState<Screen>("title");
  const [prefs, setPrefsView] = useState<Choice>(() => store.prefs());
  const [weather, setWeather] = useState<Weather | null>(null);
  const [card, setCard] = useState<CardView | null>(null);
  const [hud, setHud] = useState<HudView | null>(null);
  const [result, setResult] = useState<ResultView | null>(null);
  const [cupView, setCupView] = useState<CupView | null>(null);
  /** the course the race on screen is sailed on, and its mode (in a cup, not the title's choice) */
  const [racing, setRacing] = useState<{ course: CourseId; mode: Mode }>({ course: prefs.course, mode: prefs.mode });
  const cup = useRef<Cup | null>(null);
  /** Race was pressed before the world was ready: race as soon as it is */
  const pending = useRef<(() => void) | null>(null);
  const [waiting, setWaiting] = useState(false);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const [paused, setPaused] = useState(false);
  const [photo, setPhoto] = useState(false);
  // the world's quality: the tier kept from the device check, or until that has run the usual one for the device
  const [quality] = useState<Quality>(() => store.prefs().quality ?? (window.matchMedia("(pointer: coarse)").matches ? "medium" : "high"));

  const change = useCallback(
    (p: Partial<Prefs>) => {
      store.setPrefs(p);
      setPrefsView((was) => ({ ...was, ...p }));
      if (p.muted !== undefined) sfx.mute(p.muted);
      if (p.course) session.current?.preview(p.course);
    },
    [store],
  );

  /** set up a race on the card: the title's choice, or the cup's next course in the cup's mode and wind */
  const go = useCallback((course: CourseId) => {
    // every race begins with a key or a tap: the moment the browser lets sound start
    sfx.mute(prefsRef.current.muted);
    sfx.start();
    setPaused(false);
    setPhoto(false);
    const s = session.current;
    s?.pause(false);
    s?.world.setPhoto(false);
    if (!s) {
      pending.current = () => go(course);
      return setWaiting(true);
    }
    const c = cup.current, p = prefsRef.current;
    const set = s.configure({ course, mode: c ? c.mode : p.mode, wind: c ? (c.wind ?? c.chose) : p.wind, ghost: c ? false : p.ghost });
    // a cup is sailed in one wind setting throughout: what its first race really had
    if (c && c.wind === null) c.wind = set.wind;
    setRacing({ course, mode: set.card.mode });
    setCard(set.card);
    setHud(null);
    setResult(null);
    setScreen("card");
  }, []);

  const begin = useCallback(() => {
    session.current?.begin();
    setScreen("race");
  }, []);

  const pause = useCallback((on: boolean) => {
    const s = session.current;
    if (!s) return;
    s.pause(on);
    if (!on) s.world.setPhoto(false);
    setPaused(on);
    if (!on) setPhoto(false);
  }, []);
  const snapPhoto = useCallback((on: boolean) => {
    session.current?.world.setPhoto(on);
    setPhoto(on);
  }, []);
  const save = useCallback(() => {
    const w = session.current?.world;
    if (!w) return;
    const a = document.createElement("a");
    a.href = w.snap();
    a.download = "dua-pulau-regatta.png";
    a.click();
  }, []);
  const recoverNow = useCallback(() => {
    session.current?.recover();
    pause(false);
  }, [pause]);

  const toTitle = useCallback(() => {
    session.current?.pause(false);
    session.current?.world.setPhoto(false);
    setPaused(false);
    setPhoto(false);
    // leaving a cup part-way abandons it: nothing of it is kept but the bests already saved
    cup.current = null;
    setCupView(null);
    setResult(null);
    setCard(null);
    setScreen("title");
    session.current?.preview(prefsRef.current.course);
  }, []);

  const startCup = useCallback(() => {
    const p = prefsRef.current;
    cup.current = { mode: p.mode, chose: p.wind, wind: null, places: [] };
    setCupView(null);
    go(CUP_ORDER[0]);
  }, [go]);

  const nextRace = useCallback(() => {
    const c = cup.current;
    if (c && c.places.length < CUP_ORDER.length) go(CUP_ORDER[c.places.length]);
  }, [go]);

  /** her finish: the result, and in a cup this race's places added to the table (and after the last, the best cup) */
  const finish = useCallback(
    (f: Finish) => {
      const c = cup.current, s = session.current;
      if (c && s) {
        c.places.push(f.places);
        const { totals, order } = cupTable(c.places), races = CUP_ORDER.map((id) => COURSES[id].name);
        const rows: CupRow[] = order.map((i) => ({ ...s.roster[i], you: i === 0, points: CUP_ORDER.map((_, k) => (c.places[k] ? POINTS[c.places[k][i]] : null)), total: totals[i] }));
        let final: CupView["final"] = null;
        if (c.places.length === CUP_ORDER.length) {
          const slot = slotOf(c.mode, c.wind ?? "standard"), kept = store.prefs().cupBest, was = kept[slot];
          const mine = totals[0], newBest = was === null || mine > was;
          if (newBest) store.setPrefs({ cupBest: { ...kept, [slot]: mine } });
          final = { place: order.indexOf(0) + 1, best: newBest ? mine : was!, newBest };
        }
        setCupView({ race: c.places.length, of: CUP_ORDER.length, races, rows, final });
        // the cup is over: Race the cup again starts a new one, Change course leaves
        if (final) cup.current = null;
      }
      setResult(f);
      setScreen("results");
    },
    [store],
  );

  useEffect(() => {
    watchDevice();
    let gone = false;
    let world: RaceWorld | null = null;
    Promise.all([import("./world"), import("./session"), import("./rules/rivals")])
      .then(([{ createRaceWorld }, { createSession }, { RIVALS }]) => {
        if (gone || !canvas.current) return;
        // the beach huts' boards: the three courses with their shapes, and the three boats racing today
        const huts = [...CUP_ORDER.map((id) => ({ name: COURSES[id].name, line: copy.shapes[id] })), ...RIVALS.map((r) => ({ name: r.name, line: copy.racingToday }))];
        const w = (world = createRaceWorld(canvas.current, { quality, huts, brick: BRICK, yard: YARD }));
        const s = createSession(w, store, { hud: setHud, finish: (f) => finishRef.current(f), weather: setWeather });
        session.current = s;
        s.preview(prefsRef.current.course);
        setState("ready");
        const p = pending.current;
        pending.current = null;
        setWaiting(false);
        p?.();
        // local dev only: lets a script choose and start a race, read it and hold the helm (never in a production build)
        if (import.meta.env.DEV)
          Object.assign(window, {
            __race: {
              race: () => s.dev.race(), world: w, field: () => s.dev.field(), helm: (h: Helm | null) => s.dev.helm(h), setGhost: s.dev.setGhost, auto: s.dev.auto,
              screen: () => screenRef.current, course: () => s.dev.race() && racingRef.current.course,
              /** choose course, mode and wind (as the title would, and kept as it keeps them), then race at once: no card */
              play: (o: Partial<Choice> & { cup?: boolean } = {}) => {
                const { cup: inCup, ...choice } = o;
                changeRef.current(choice);
                if (inCup) startCupRef.current();
                else goRef.current(prefsRef.current.course);
                beginRef.current();
              },
              restart: () => {
                goRef.current(racingRef.current.course);
                beginRef.current();
              },
              next: () => nextRef.current(), title: () => titleRef.current(),
              // what stands in the water, as plain capsules: the source of rules/fixtures/rocks.json
              rocks: () => w.obstacles.rocks.map(({ ax, az, bx, bz, r }) => ({ ax, az, bx, bz, r })),
            },
          });
      })
      .catch((e) => {
        console.error(e);
        setState("failed");
      });
    return () => {
      gone = true;
      world?.dispose();
      session.current = null;
      if (import.meta.env.DEV) delete (window as { __race?: unknown }).__race;
    };
  }, [store, quality]);

  // the device check, once per device: time the title screen's frames and keep the tier. It takes effect from the next
  // visit: rebuilding the world under a player who has just arrived cost more than it saved (a frozen title, the
  // islands' ground laid twice, the weather asked for again). measured: once per page load, storage or none.
  const measured = useRef(false);
  useEffect(() => {
    if (state !== "ready" || measured.current || store.prefs().quality !== null) return;
    const times: number[] = [];
    let raf = 0, last = 0;
    const tick = (now: number) => {
      if (document.hidden || screenRef.current !== "title") return void ((last = 0), (raf = requestAnimationFrame(tick)));
      if (last) times.push(now - last);
      last = now;
      if (times.length < 120) return void (raf = requestAnimationFrame(tick));
      measured.current = true;
      let tier = tierFrom(times);
      if (window.matchMedia("(pointer: coarse)").matches && tier === "high") tier = "medium"; // a phone never draws the full picture
      store.setPrefs({ quality: tier });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, store]);

  // keys while racing: P or Esc pauses and resumes, R puts her back on course; and a hidden tab falls silent
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || screenRef.current !== "race") return;
      const k = e.key.toLowerCase();
      if (k === "escape" || k === "p") {
        e.preventDefault();
        pauseRef.current(!pausedRef.current);
      } else if (k === "r" && !pausedRef.current) session.current?.recover();
    };
    const vis = () => sfx.away(document.hidden);
    window.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  // the frame loop and the dev hook outlive renders: they reach the current callbacks through these
  const finishRef = useRef(finish);
  finishRef.current = finish;
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const racingRef = useRef(racing);
  racingRef.current = racing;
  const changeRef = useRef(change);
  changeRef.current = (p) => {
    prefsRef.current = { ...prefsRef.current, ...p };
    change(p);
  };
  const goRef = useRef(go);
  goRef.current = go;
  const pauseRef = useRef(pause);
  pauseRef.current = pause;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const beginRef = useRef(begin);
  beginRef.current = begin;
  const startCupRef = useRef(startCup);
  startCupRef.current = startCup;
  const nextRef = useRef(nextRace);
  nextRef.current = nextRace;
  const titleRef = useRef(toTitle);
  titleRef.current = toTitle;

  // each course's best for the slot the title's choice would race in now (today's wind only once it has arrived)
  const slot = slotOf(prefs.mode, effectiveWind(prefs.wind, weather));
  // (read only while the title is up: the rest of the time the page re-renders with the HUD, many times a second)
  const bests = screen === "title" ? (Object.fromEntries(CUP_ORDER.map((id) => [id, store.best(id, slot)?.time ?? null])) as Record<CourseId, number | null>) : null;

  return (
    <main className={`rg is-${screen}${photo ? " is-photo" : ""}${BRICK ? " is-brick" : ""}`}>
      <canvas ref={canvas} aria-label="The sea round two islands, and your pinisi" />
      {screen !== "title" && <h1 className="rg-sr">{copy.title}</h1>}
      {state === "failed" && <p className="rg-note" role="alert">{copy.failed}</p>}
      {(screen === "title" || state === "failed") && (
        <a className="rg-home" href={HOME}>
          {copy.homeShort}
        </a>
      )}
      {BRICK && screen === "title" && (
        <p className="rg-yard">
          {YARD ? (
            <>
              Racing <b>{YARD.name.trim() || "your boat"}</b>, built in Pinisi Yard: {handlingNote(handling(YARD))}. <a href="/yard/">Rebuild her →</a>
            </>
          ) : (
            <>
              Racing the yard's pinisi. <a href="/yard/">Build your own in Pinisi Yard →</a>
            </>
          )}
        </p>
      )}
      {bests && state !== "failed" && <Title prefs={prefs} bests={bests} loading={waiting} onChange={change} onRace={() => go(prefs.course)} onCup={startCup} />}
      {screen === "card" && card && <Card v={card} cup={cup.current ? { race: cup.current.places.length + 1, of: CUP_ORDER.length } : null} onBegin={begin} />}
      {screen === "race" && hud && <Hud v={hud} paused={paused} course={COURSES[racing.course]} chart={() => session.current!.chart()} onPause={() => pause(true)} onRecover={() => session.current?.recover()} />}
      {screen === "race" && paused && (
        <Pause
          mode={racing.mode}
          muted={prefs.muted}
          canRecover={hud?.phase === "racing"}
          photo={photo}
          onResume={() => pause(false)}
          onRestart={() => {
            go(racing.course);
            begin();
          }}
          onRecover={recoverNow}
          onPhoto={snapPhoto}
          onSave={save}
          onChange={toTitle}
          onMute={(muted) => change({ muted })}
        />
      )}
      {screen === "results" && result && (
        <Results course={COURSES[racing.course].name} mode={racing.mode} r={result} cup={cupView} onAgain={() => go(racing.course)} onChange={toTitle} onNext={nextRace} onCupAgain={startCup} />
      )}
    </main>
  );
}
