// Every word the game puts on screen, in one place.
import type { CourseId, Mode, Side } from "./rules/types";

/** the game's working title (Axelle's to choose) */
export const TITLE = "Dua Pulau Regatta";

export const copy = {
  title: TITLE,
  loading: "Rigging the fleet…",
  failed: "The sea would not load in this browser. Try another, or a newer one.",
  go: "Go",
  leave: (s: Side) => (s === "port" ? "leave to port" : "leave to starboard"),
  mark: (i: number, n: number) => `Mark ${i} of ${n}`,
  finish: "Finish line",
  cross: "cross between the buoys",
  finished: "Finished",
  time: "Time",
  again: "Race again",
  best: "Best",
  newBest: "New best",
  gap: "Gap to best",
  modes: { easy: "Easy", sailing: "Sailing" },
  finishedSay: (time: string) => `Finished in ${time}`,
  steer: { keys: "Arrows or WASD to sail", sailKeys: "Left and right, or A and D, to steer", touch: "Hold where you want to go" },
  timedStart: "Be behind the line at the gun",
  overEarly: "Over early: go back behind the line",
  winds: { standard: "Standard wind", today: "Today's wind" },
  knots: (kn: number) => `${kn} knots`,
  windSay: (kn: number) => `Wind, ${kn} knots, the arrow shows the way it blows`,
  standings: "Standings",
  showStandings: "Show the standings (T)",
  hideStandings: "Hide the standings (T)",
  you: "You",
  rival: "Rival",
  /** 1 → "1st" … 4 → "4th" */
  place: (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th")}`,
  of: (n: number) => `of ${n}`,
  placeSay: (n: number, of: number) => `Place: ${copy.place(n)} of ${of}`,
  /** the gap words beside "+2.4 s": to the boat ahead, or to the boat behind when leading */
  behindOf: (name: string) => `behind ${name}`,
  aheadOf: (name: string) => `ahead of ${name}`,
  behindSay: (s: string, name: string) => `${s} behind ${name}`,
  leadingSay: (s: string) => `Leading by ${s}`,
  rivalSay: (name: string) => `${name}, your rival`,
  placed: "Place",

  // ---------- the title ----------
  kicker: "A sailing race round two islands",
  race: "Race",
  course: "Course",
  mode: "Mode",
  wind: "Wind",
  ghost: "Ghost of your best",
  sound: "Sound",
  cup: "Race the cup",
  cupLine: "All three courses in turn, for points",
  byline: "by Axelle Jamal",
  /** the way out of the race, on the title, the pause and the results */
  home: "Back to Dua Pulau",
  homeShort: "← Dua Pulau",
  noBest: "No best yet",
  bestLabel: (t: string) => `Best ${t}`,
  /** each course's shape, a few words: on the title and on the beach huts' boards */
  shapes: { sprint: "Out to one mark and back", lap: "Once round the western island", eight: "A figure of eight round both islands" } satisfies Record<CourseId, string>,
  modeLines: { easy: "Point and go", sailing: "The wind decides your speed" } satisfies Record<Mode, string>,
  windLines: { today: "Brighton's wind today", standard: "The same every race, for fair times" },
  /** on the huts' boards, under each rival's name */
  racingToday: "Racing today",

  // ---------- the pre-race card ----------
  yourRival: (name: string) => `Your rival: ${name}`,
  controls: "Controls",
  /** the controls for the device in use, a line each; in Sailing steering only */
  keysFor: { easy: ["Arrows or A D to steer", "Up or W for way on"], sailing: ["Arrows or A D to steer"] } satisfies Record<Mode, string[]>,
  padFor: { easy: ["Left stick to steer", "A or right trigger for way on"], sailing: ["Left stick to steer"] } satisfies Record<Mode, string[]>,
  touchFor: ["Hold where you want to go"],
  begin: { keys: "Any key to start", touch: "Tap to start", pad: "Any key or tap to start" },
  cupRace: (i: number, n: number) => `Cup, race ${i} of ${n}`,
  windCard: (point: string, kn: number) => `${point}, ${kn} knots`,
  windFrom: (point: string) => `from the ${point}`,

  // ---------- pause, photo and back on course ----------
  pause: "Pause",
  paused: "Paused",
  resume: "Resume",
  restart: "Restart",
  recover: "Back on course",
  recoverKey: "Back on course (R)",
  stuckSay: "Stuck? Back on course puts you at the last mark you rounded",
  photo: "Photo",
  photoHint: "Drag to look round. Scroll or pinch to come closer.",
  save: "Save picture",
  done: "Done",
  /** every control, by device, for the pause screen; in Sailing there is no way on to ask for */
  controlSets: (mode: Mode) => [
    { device: "Keyboard", lines: [mode === "sailing" ? "Arrows or A D steer" : "Arrows or W A S D sail", "R back on course", "T standings", "P or Esc pause"] },
    { device: "Touch", lines: ["Hold where you want to go"] },
    { device: "Gamepad", lines: [mode === "sailing" ? "Left stick steers" : "Left stick steers, A or right trigger for way on"] },
  ],

  // ---------- the results and the cup ----------
  beat: (name: string) => `You beat ${name}`,
  change: "Change course",
  next: "Next race",
  cupTable: "The cup",
  afterRace: (i: number, n: number) => `After race ${i} of ${n}`,
  cupDone: "Final table",
  total: "Points",
  bestCup: (n: number) => `Best cup: ${n} points`,
  newBestCup: "Your best cup",
  cupAgain: "Race the cup again",
  cupPlace: (n: number) => `${copy.place(n)} in the cup`,
  pointsSay: (name: string, pts: number[], total: number) => `${name}: ${pts.join(", ")}; ${total} points`,
};

/** a compass bearing as one of eight points, N to NW */
const POINTS8 = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const POINT_NAMES: Record<string, string> = { N: "north", NE: "north-east", E: "east", SE: "south-east", S: "south", SW: "south-west", W: "west", NW: "north-west" };
export const compass = (deg: number): string => POINTS8[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
/** the point spelled out, for screen readers */
export const compassName = (deg: number): string => POINT_NAMES[compass(deg)];

/** m:ss.cc; a negative time (the countdown) reads as 0:00.00 */
export function clock(t: number): string {
  const cs = Math.max(0, Math.floor(t * 100 + 1e-6));
  const m = Math.floor(cs / 6000), s = Math.floor((cs % 6000) / 100), c = cs % 100;
  return `${m}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
}

/** seconds ahead or behind, signed with a real minus: +1.24, −0.87 */
export function gapText(g: number): string {
  const r = Math.round(g * 100) / 100;
  return `${r < 0 ? "−" : "+"}${Math.abs(r).toFixed(2)}`;
}
