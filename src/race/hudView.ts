// What the HUD shows, worked out from the race: the next mark and where it lies, the gap to the best at the mark just
// rounded, the wind arrow, and the fleet's standings with your place and the gap to the boat ahead (or behind). Pure:
// the page calls it every frame and hands the result to Hud.
import { gapText } from "./copy";
import { remaining } from "./rules/course";
import type { Run } from "./rules/ghost";
import { stuck, type Phase, type Race } from "./rules/race";
import type { Course, Mode, Side, WindSet } from "./rules/types";

/** how long the gap to the best shows after a mark is rounded, seconds */
export const GAP_SHOWN_S = 3;
/** top speed: a distance left over this is the gap in seconds */
const TOP = 13;

export type Standing = { id: string; name: string; tint: number | null; you: boolean; rival: boolean };
export type HudView = {
  phase: Phase;
  time: number;
  next: number | "finish";
  marks: number;
  side: Side | null;
  /** where the next mark lies off her bow, radians, positive to port */
  turn: number;
  /** the gap to the best run at the mark just rounded, already formatted; null when none is showing */
  gap: string | null;
  mode: Mode;
  /** Sailing only: the wind at her, as the way it blows in degrees clockwise from screen-up, and its speed in knots */
  wind: { to: number; kn: number; set: WindSet } | null;
  /** over the line before the gun and not yet back behind it */
  early: boolean;
  /** the fleet, leader first */
  standings: Standing[];
  /** her place, 1 = leading, and how many boats race */
  place: number;
  fleet: number;
  /** the gap to the boat ahead (ahead: false), or when leading to the boat behind (ahead: true), as "+2.4 s"; none
   *  before the gun */
  lead: { s: string; ahead: boolean; name: string } | null;
  /** she has made almost no way for some seconds: offer to put her back on course */
  stuck: boolean;
};

export type HudIn = {
  race: Race; course: Course; mode: Mode;
  /** the wind at her (Sailing): where it blows from, its knots, the setting; null in Easy */
  wind: { from: number; kn: number; set: WindSet } | null;
  /** the compass bearing the camera looks along */
  viewBearing: number;
  /** the best run raced against, or null */
  best: Run | null;
  /** every rival's name and colour, by boat id */
  roster: Record<string, { name: string; tint: number }>;
  /** the rival marked as yours, or null */
  rival: string | null;
};

const YOU = "You";

export function hudView(i: HudIn): HudView {
  const { race, course, mode } = i, me = race.player, t = race.time(), phase = race.phase();
  const n: number | "finish" = me.prog.leg < course.marks.length ? me.prog.leg : "finish";
  const to = n === "finish" ? { x: (course.finish.a.x + course.finish.b.x) / 2, z: (course.finish.a.z + course.finish.b.z) / 2 } : course.marks[n];
  const ang = Math.atan2(-(to.z - me.pose.z), to.x - me.pose.x) - me.pose.yaw;
  // to the degree, so the pointer (and the HUD) changes only when it visibly would
  const turn = Math.round((Math.atan2(Math.sin(ang), Math.cos(ang)) * 180) / Math.PI) * (Math.PI / 180);

  // the gap to the best at the mark she rounded last, for a few seconds after she rounds it
  const k = me.prog.splits.length, ref = i.best?.splits[k - 1];
  const gap = k > 0 && k <= course.marks.length && ref !== undefined && t - me.prog.splits[k - 1] < GAP_SHOWN_S ? gapText(me.prog.splits[k - 1] - ref) : null;

  const wind = i.wind ? { to: Math.round((((i.wind.from + 180 - i.viewBearing) % 360) + 360) % 360), kn: i.wind.kn, set: i.wind.set } : null;

  const order = race.order(), boats = race.boats;
  const standings: Standing[] = order.map((j) => {
    const b = boats[j], r = i.roster[b.id], you = b === me;
    return { id: b.id, name: you ? YOU : (r?.name ?? b.id), tint: you ? null : (r?.tint ?? null), you, rival: b.id === i.rival };
  });
  const at = order.indexOf(boats.indexOf(me));
  const other = at > 0 ? boats[order[at - 1]] : order.length > 1 ? boats[order[1]] : null;
  let lead: HudView["lead"] = null;
  // only once the race is on: on the grid the fleet is level, and the distance to the mark is no measure of that
  if (other && phase !== "card" && phase !== "countdown") {
    const left = (b: typeof me) => remaining(course, b.prog, b.pose);
    const s = Math.abs(left(me) - left(other)) / TOP;
    lead = { s: `+${s.toFixed(1)} s`, ahead: at === 0, name: i.roster[other.id]?.name ?? other.id };
  }

  return { phase, time: t, next: n, marks: course.marks.length, side: n === "finish" ? null : course.marks[n].side, turn, gap, mode, wind, early: me.prog.early, standings, place: at + 1, fleet: boats.length, lead, stuck: stuck(race) };
}
