// Running races on the world: setting one up (course, mode, the wind it is really sailed in, the fleet on its grid,
// the ghost and best for its slot, the rival), the frame callback that steers the rivals, steps the rules and records
// the run, and the finish (the best kept, the rivals beaten, the result). Between races it shows the title's view: the
// chosen course's buoys, the fleet on its line and the camera circling it. App.tsx owns the screens; this owns the race.
// It arrives with the world (App imports it beside world.ts), as its rivals bring three.js.
import type { ChartLive } from "./CourseChart";
import { copy } from "./copy";
import { hudView, type HudView } from "./hudView";
import type { ResultView } from "./Results";
import { COURSES } from "./rules/course";
import { placesOf } from "./rules/cup";
import { poseAt, recorder, type Run } from "./rules/ghost";
import { COUNTDOWN, createRace, gridFor, moveFor, recover, type Race } from "./rules/race";
import * as rivals from "./rules/rivals";
import { startRun } from "./rules/start";
import { slotOf, type openStore, type Slot } from "./rules/store";
import type { Course, CourseId, Helm, Mode, WindSet } from "./rules/types";
import { effectiveWind, knotsAt, windAt, windFor, type WindField } from "./rules/wind";
import type { Weather } from "./weather";
import { sfx } from "./sfx";
import type { RaceWorld } from "./world";

export type Store = ReturnType<typeof openStore>;
/** what the player chose for a race. wind: the setting chosen (today's may turn out to be standard: see configure) */
export type RaceSetup = { course: CourseId; mode: Mode; wind: WindSet; ghost: boolean };
/** what the pre-race card shows. wind: Sailing only, the wind she starts in (from, as a compass bearing; knots) */
export type CardView = { course: CourseId; mode: Mode; wind: { set: WindSet; from: number; kn: number } | null; rival: string | null };
/** a finish: the result, and every boat's place (0-based, in fleet order: the player first) for the cup */
export type Finish = ResultView & { places: number[] };
export type Session = {
  /** the title's view of a course: its buoys, the fleet on its line, the camera circling it; no race */
  preview(course: CourseId): void;
  /** a race on the card, waiting for begin(). Returns the card, and the wind setting it is really sailed in (today's
   *  only if today's weather has arrived) with its best-times slot. */
  configure(s: RaceSetup): { card: CardView; wind: WindSet; slot: Slot };
  /** from the card into the countdown */
  begin(): void;
  /** stop the race where it stands (the sea still moves), or let it run on */
  pause(on: boolean): void;
  /** put her back on course: stopped at the last mark she rounded (or behind the line), on a heading she can sail.
   *  The clock runs on. Only while racing. */
  recover(): void;
  /** what the course chart draws, as it is now */
  chart(): ChartLive;
  world: RaceWorld;
  /** the fleet, player first, as the standings and the cup table name them */
  roster: { id: string; name: string; tint: number | null }[];
  /** local dev only: for scripted checks */
  dev: {
    race(): Race | null; field(): WindField | null; helm(h: Helm | null): void; setGhost(on: boolean): void;
    /** sail her by the rivals' own helm at full pace (a clean, quick sailor), for timing the courses */
    auto(on: boolean): void;
  };
};

const STILL: Helm = { turn: 0, thrust: 0 };
/** the dev autopilot: the rivals' helm at full pace, steering as tight round a mark as the best of them */
const AUTO: rivals.Rival = { id: "you", name: "You", tint: 0, pace: 1, wide: 14, design: "current", stand: 50 };

/** the local date as YYYY-MM-DD */
export function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/** today as a number, YYYYMMDD: the seed for today's gusts and shifts, so they are the same all day */
const daySeed = () => Number(todayString().replace(/-/g, ""));

/** what belongs to one run: its recording, the best it races against, its rivals and whether it has been saved */
type Attempt = {
  course: Course; mode: Mode;
  rec: ReturnType<typeof recorder>; best: Run | null; saved: boolean; ghost: boolean;
  /** the wind setting this run is really sailed in, and so its best-times slot */
  wind: WindSet; slot: Slot;
  /** the boats sailed by the game, each with her pilot's memory; and the one marked yours */
  rivals: { r: rivals.Rival; mem: rivals.RivalMem }[]; rival: string | null;
};

export function createSession(w: RaceWorld, store: Store, out: { hud(v: HudView): void; finish(f: Finish): void; weather(w: Weather | null): void }): Session {
  const fleet = rivals.GRID_FLEET, ids = ["you", ...fleet.map((b) => b.id)];
  const roster = Object.fromEntries(rivals.RIVALS.map((b) => [b.id, { name: b.name, tint: b.tint }]));
  const pace = new Map(fleet.map((b) => [b.id, b.pace]));
  // every boat is made once, here, and only moved from race to race: the player's first, so the camera follows her
  const you = w.vessel("you");
  const boats = fleet.map((b) => w.vessel(b.id, { tint: b.tint, design: b.design, rival: true }));
  const ghostV = w.vessel("ghost", { ghost: true });
  ghostV.setVisible(false);

  let race: Race | null = null, a: Attempt | null = null, field: WindField | null = null;
  let shown: CourseId | null = null;
  let devHelm: Helm | null = null, auto = false, autoMem = rivals.newRivalMem();
  let lastPhase = "", lastView = "", lastWeather: Weather | null = null, next: number | "finish" = 0;
  let lastCount = 0, lastSplits = 0, ghostShown = false;
  /** two hulls met: the knock is heard when one of them is hers */
  const onBump = (x: { id: string }, y: { id: string }) => void ((x.id === "you" || y.id === "you") && sfx.bump());

  const show = (c: Course) => {
    if (shown !== c.id) w.setCourse(c);
    shown = c.id;
  };

  function preview(id: CourseId) {
    race = null;
    a = null;
    field = null;
    const c = COURSES[id];
    show(c);
    w.setNext(0);
    w.setWind(null, 0);
    w.releasePointer();
    ghostV.setVisible(false);
    // the fleet at rest on the line, as the Easy grid stands, while the camera circles it
    gridFor(c, ids.length).forEach((p, i) => Object.assign(i === 0 ? you.st : boats[i - 1].st, p, { roll: 0 }));
    const { a: e1, b: e2 } = c.start;
    w.orbit({ x: (e1.x + e2.x) / 2 + c.start.dir.x * 20, z: (e1.z + e2.z) / 2 + c.start.dir.z * 20 });
  }

  function configure(s: RaceSetup) {
    const c = COURSES[s.course], mode = s.mode;
    show(c);
    w.orbit(null);
    // today's wind is whatever has arrived by now: a race never waits for the network. If none has, this is a
    // standard-wind race in every respect: its wind, its slot, its ghost and best, and what the screen calls it.
    const weather = w.weather(), wind = effectiveWind(s.wind, weather), slot = slotOf(mode, wind);
    const f = (field = mode === "sailing" ? windFor(c, wind, weather, daySeed()) : null);
    // under sail the fleet is set back on a heading it can sail, so that holding it crosses the line just after the gun
    const grid = f ? startRun(c, f, COUNTDOWN.sailing) : undefined;
    // the three rivals race in either mode; under sail each makes the wind's speed times her pace, as in Easy her thrust
    // is her pace. On the grid the best rival stands beside the player, the easiest furthest off (GRID_FLEET).
    const move = moveFor(mode, f, w.move, (b) => pace.get(b.id) ?? 1);
    const r = createRace({ course: c, mode, countdown: COUNTDOWN[mode], move, grid, onBump }, ids);
    // her state is the race's player pose, so the model follows the rules with no copying
    r.player.pose = Object.assign(you.st, r.player.pose);
    boats.forEach((v, i) => (r.boats[i + 1].pose = Object.assign(v.st, r.boats[i + 1].pose)));
    w.setNext((next = 0));
    w.setWind(f, r.time());
    w.releasePointer();
    ghostV.setVisible(false);
    const rival = fleet.length ? rivals.rivalFor(store.prefs().beaten[`${c.id}:${slot}`] ?? []).id : null;
    a = { course: c, mode, rec: recorder(), best: store.best(c.id, slot), saved: false, ghost: s.ghost, wind, slot, rivals: fleet.map((b) => ({ r: b, mem: rivals.newRivalMem() })), rival };
    autoMem = rivals.newRivalMem();
    race = r;
    lastView = "";
    lastPhase = "";
    lastCount = 0;
    lastSplits = 0;
    // the wind on the card: where it blows from at the line, and its knots
    const sw = f ? windAt(f, (c.start.a.x + c.start.b.x) / 2, (c.start.a.z + c.start.b.z) / 2, r.time()) : null;
    const card: CardView = { course: c.id, mode, wind: f && sw ? { set: wind, from: sw.from, kn: knotsAt(f, sw) } : null, rival: rival && roster[rival].name };
    return { card, wind, slot };
  }

  w.frame((dt) => {
    const wx = w.weather();
    if (wx !== lastWeather) out.weather((lastWeather = wx));
    const r = race;
    if (!r || !a) return;
    const c = a.course, mode = a.mode, me = r.player, f = field;
    // the helm is hers while racing, and in Sailing's countdown too, when she manoeuvres behind the line; in Easy she is
    // held on the line before the gun, and on the card nothing moves. Once she finishes she is left to coast.
    const free = r.phase() === "racing" || (r.phase() === "countdown" && mode === "sailing");
    const t = r.time();
    // (she sails as if alone, as a player holding her line would: the others steer round her)
    const autoHelm = () => (f ? rivals.sailHelm(AUTO, me, c, windAt(f, me.pose.x, me.pose.z, t), w.obstacles, autoMem, t) : rivals.easyHelm(AUTO, me, c, w.obstacles, autoMem));
    me.helm = !free ? STILL : auto && r.phase() === "racing" ? autoHelm() : (devHelm ?? (auto ? STILL : w.helm()));
    // the rivals sail on after she finishes, until they are over the line themselves, keeping clear of the others.
    // Before the gun they hold their course: in Easy they are held on the line, and under sail the grid is set so that
    // holding it crosses just after the gun. Under sail each steers by the wind where she is.
    const going = r.phase() === "racing" || r.phase() === "finished";
    a.rivals.forEach(({ r: rv, mem }, i) => {
      const b = r.boats[i + 1], sea = rivals.withFleet(w.obstacles, r.boats, b);
      b.helm = !going ? STILL : f ? rivals.sailHelm(rv, b, c, windAt(f, b.pose.x, b.pose.z, t), sea, mem, t) : rivals.easyHelm(rv, b, c, sea, mem);
    });
    r.step(dt);
    w.setWind(f, r.time());
    const phase = r.phase();
    if (phase === "racing" || (phase === "finished" && !a.saved)) a.rec.add(r.time(), me.pose);
    // a pointer still held when she finishes is let go
    if (lastPhase === "racing" && phase !== "racing") w.releasePointer();
    // the sounds: three, two, one on the kettles, the gong at the gun, a bar at each mark, a run of them at the finish
    const count = phase === "countdown" ? Math.ceil(-r.time() - 1e-9) : 0;
    if (count !== lastCount && count >= 1 && count <= 3) sfx.tick();
    lastCount = count;
    if (lastPhase === "countdown" && phase === "racing") sfx.gun();
    if (me.prog.splits.length > lastSplits) sfx.mark(me.prog.splits.length - 1);
    lastSplits = me.prog.splits.length;
    if (lastPhase === "racing" && phase === "finished") sfx.finish();
    sfx.sea(Math.min(1, Math.abs(me.pose.v) / 13));
    lastPhase = phase;
    const n: number | "finish" = me.prog.leg < c.marks.length ? me.prog.leg : "finish";
    if (n !== next) w.setNext((next = n));
    // the ghost: the best run's pose at this race time; it takes no part in the rules
    const gp = a.best && a.ghost && phase === "racing" ? poseAt(a.best, r.time()) : null;
    ghostV.setVisible((ghostShown = gp !== null));
    if (gp) Object.assign(ghostV.st, gp);
    if (phase === "finished" && !a.saved && me.prog.finishedAt !== null) return void finish(r, a, me.prog.finishedAt);
    if (phase === "finished") return;
    // the wind where she is, for the arrow
    const lw = f ? windAt(f, me.pose.x, me.pose.z, r.time()) : null;
    const wind = f && lw ? { from: lw.from, kn: knotsAt(f, lw), set: a.wind } : null;
    const view = hudView({ race: r, course: c, mode, wind, viewBearing: w.viewBearing(), best: a.best, roster, rival: a.rival });
    // only when something shown has changed
    const key = [Math.floor(Math.max(0, view.time) * 100), phase === "countdown" ? Math.ceil(-view.time - 1e-9) : "", Math.round(view.turn * 1000), phase, n, view.gap, view.wind?.to, view.wind?.kn, view.wind?.set, view.early, view.stuck, view.standings.map((s) => s.id).join(","), view.lead?.s, view.lead?.name].join("|");
    if (key !== lastView) {
      lastView = key;
      out.hud(view);
    }
  });

  function finish(r: Race, at: Attempt, time: number) {
    at.saved = true;
    const c = at.course, prev = at.best;
    // a best set in a cup race is kept as any other
    const isNew = store.offer(c.id, at.slot, at.rec.done(time, r.player.prog.splits));
    // not new yet nothing was stored at the start: another tab kept a better run meanwhile, so show that one
    const best = isNew ? time : (prev ?? store.best(c.id, at.slot))?.time ?? time;
    // her place is the fleet's order as she crosses (rivals still sailing placed by it); every rival not yet home is
    // one she beat
    const order = r.order(), place = order.indexOf(0) + 1;
    const beat = order.slice(place).map((i) => r.boats[i].id);
    if (beat.length) {
      const key = `${c.id}:${at.slot}`, beaten = store.prefs().beaten;
      store.setPrefs({ beaten: { ...beaten, [key]: [...new Set([...(beaten[key] ?? []), ...beat])] } });
    }
    const rival = at.rival && beat.includes(at.rival) ? roster[at.rival].name : null;
    out.finish({ time, best, gap: prev ? time - prev.time : null, isNew, wind: at.mode === "sailing" ? at.wind : null, place, fleet: r.boats.length, beat: rival, places: placesOf(order) });
  }

  return {
    preview,
    configure,
    begin: () => race?.begin(),
    pause: (on) => {
      w.setPaused(on);
      if (on) w.releasePointer();
    },
    recover() {
      const r = race;
      if (!r || !a || r.phase() !== "racing") return;
      const me = r.player;
      recover(me, a.course, field ? windAt(field, me.pose.x, me.pose.z, r.time()) : null);
      r.unstick();
      autoMem = rivals.newRivalMem();
      w.releasePointer();
    },
    chart() {
      const r = race, tint = (id: string) => roster[id]?.tint ?? null;
      const fleetNow = r ? r.boats.map((b) => ({ x: b.pose.x, z: b.pose.z, yaw: b.pose.yaw, tint: tint(b.id), you: b === r.player })) : [];
      return { next, boats: fleetNow, ghost: ghostShown ? { x: ghostV.st.x, z: ghostV.st.z } : null };
    },
    world: w,
    roster: ids.map((id) => (id === "you" ? { id, name: copy.you, tint: null } : { id, name: roster[id].name, tint: roster[id].tint })),
    dev: {
      race: () => race,
      field: () => field,
      helm: (h) => void (devHelm = h),
      setGhost: (on) => void (a && (a.ghost = on)),
      auto: (on) => void (auto = on),
    },
  };
}
