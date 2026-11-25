# Dua Pulau Regatta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A standalone sailing race game at `/race/`, built on the Dua Pulau world, with Easy and Sailing modes, a ghost, three AI pinisi, three courses and a cup.

**Architecture:** `src/dua-pulau/world/engine.ts` is split into shared pieces (stage, isles, vessel, pilot) that the portfolio world and the game both compose. The game's rules (course geometry, wind, ghost, rivals, bumping, cup, race state) are plain TypeScript in `src/race/rules/`, tested with vitest and free of three.js. `src/race/world.ts` draws what the rules say; React screens sit on top.

**Tech Stack:** TypeScript 7, React 19, three.js 0.180, Vite 8 multi-page build, Cloudflare (existing). New dev dependency: vitest (the repo has no test runner; vitest shares Vite's config and TypeScript handling, where jest would need its own transform setup).

**Spec:** `docs/superpowers/specs/2026-11-24-sailing-race-design.md`. Read it before any task.

## Global Constraints

- Work on branch `race-game`. Commit locally per task. Never push or deploy without Axelle saying so.
- Run `/verify` before each code commit. End commit messages with `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.
- The home page must look and behave as it does today. `createWorld(canvas, ev, seen)` and the `World` type keep their present shape; `src/dua-pulau/App.tsx` is not edited until Task 11, which adds one link.
- The game's code must not be in the home page's bundle; `src/content/work`, `places.ts`, `Ask.tsx`, `Log.tsx` must not be in the game's.
- Coordinates: x east, z south, north is −z. `yaw` 0 = east, increasing turns towards north. Forward is `(cos yaw, −sin yaw)`. Top speed 13 units/s. Wind `from` is a compass bearing in degrees (0 north, 90 east).
- Move code out of `engine.ts`; do not rewrite it. Behaviour changes there are bugs.
- Honour `prefers-reduced-motion` and the touch pixel-ratio cap already in the world.
- All `localStorage` access goes through `src/race/rules/store.ts`. Keys start `race:v1:`.
- Nothing from Kartboard's look, names, text or assets.
- UI copy: plain British English, sentence case. Working title "Dua Pulau Regatta" lives in one constant, `TITLE` in `src/race/copy.ts`.
- Mark positions, the speed curve, gusts, AI numbers and countdown lengths below are starting values. Tune by playing; keep the tests' structural assertions true and update a pinned number only together with its test.

## Review Focus

1. **Storage unavailable or corrupt** (private window, bad JSON, full quota): the game plays normally and simply keeps no bests. Test in Task 6.
2. **Weather cannot be fetched, or is slow**: the race never waits; Today's wind falls back to the course's standard wind. Test in Task 7.
3. **Tab hidden or phone locked mid-race**: the race clock does not jump; time is the sum of stepped `dt`, never wall clock. Test in Task 5.
4. **Boat stopped head to wind in Sailing, or wedged against land**: steering still turns the boat at zero speed, and Back on course is offered after 6 s of almost no way. Tests in Tasks 7 and 10.
5. **Crossing lines the wrong way or out of order**: the finish counts only after every mark, in the stated direction; wiggling on the start line does not finish or restart the race. Test in Task 4.

---

## File Structure

Shared world (`src/dua-pulau/world/`):
- `stage.ts` (new): renderer, scene, camera, sky, sun, sea, stars, clouds, post-processing, resize, quality.
- `isles.ts` (new): terrain, shore, sites and buildings, obstacles (`rocks`, `near2`), island life animations. Takes hut content as a parameter.
- `vessel.ts` (new): a pinisi in the scene (model, helm group, wake, bob and heel) and `stepHull`, the motion and collision step.
- `pilot.ts` (new): the steer-for-a-point logic with island and pier avoidance, lifted from `sail()`.
- `engine.ts` (modified): the portfolio world only: lamp opening, day clock, mooring, places, camera, Pip, weather vane. Composes the four above.

Game (`src/race/`):
- `rules/types.ts`, `geometry.ts`, `course.ts`, `wind.ts`, `ghost.ts`, `store.ts`, `rivals.ts`, `bump.ts`, `cup.ts`, `race.ts`, each with a `*.test.ts` beside it.
- `world.ts`: composes stage, isles and vessels; buoys, gust patches, ghost, follow and photo cameras.
- `quality.ts`, `sfx.ts`, `copy.ts`.
- `App.tsx` (screen state), `Title.tsx`, `Card.tsx`, `Hud.tsx`, `CourseChart.tsx`, `Pause.tsx`, `Results.tsx`, `CupTable.tsx`, `race.css`, `main.tsx`.
- `race/index.html` at the repo root; `vite.config.ts` gains the `race` input.

---

### Task 0: Baseline

**Files:**
- Modify: `package.json` (add `vitest`, script `"test": "vitest run"`)
- Create: `vitest.config.ts` (`include: ["src/**/*.test.ts"]`, `environment: "node"`, no Cloudflare plugin)
- Create: `docs/evidence/race-refactor/before/` (screenshots)

- [ ] **Step 1:** With Axelle's go-ahead, commit the finished pinisi work on `main` (`src/dua-pulau/App.tsx`, `world/engine.ts`, `world/models.ts`). Then `git switch -c race-game`.
- [ ] **Step 2:** Install vitest, add the config and script. Add `src/race/rules/smoke.test.ts` asserting `1 + 1 === 2`. Run `npm test`. Expected: 1 passed. Run `npm run build`. Expected: succeeds.
- [ ] **Step 3:** Capture the baseline. Run `npm run dev`, open the home page, and for each shot run in the console `__dp.skip(); __dp.tod(F)`, set `__dp.st` to the pose, call `__dp.api.filmCam({ pos, look })`, wait 3 s, save a 1440×900 screenshot to `docs/evidence/race-refactor/before/<name>.png`:

| name | F | boat x, z, yaw | cam pos | cam look |
|---|---|---|---|---|
| strait-noon | 0.5 | 0, 60, 1.57 | 0, 30, 140 | 0, 4, 40 |
| md-gate-morning | 0.2 | −40, 20, 3.14 | −20, 14, 40 | −70, 6, 12 |
| wf-huts-golden | 0.8 | 150, 100, 0 | 170, 12, 110 | 128, 4, 56 |
| open-sea-noon | 0.5 | 0, 300, 1.57 | 0, 120, 420 | 0, 0, 0 |

Also record, as `before/notes.md`: sail to the pavilion from the chart and moor (does she round the island and stop?), bump the pier at speed (does she slide off?), and the home page's JS chunk names and sizes from `npm run build`.
- [ ] **Step 4:** Commit: `chore: test runner and baseline evidence for the race game`.

---

### Task 1: Extract the stage

**Files:**
- Create: `src/dua-pulau/world/stage.ts`
- Modify: `src/dua-pulau/world/engine.ts` (lines 162 to about 300 and the render pipeline at about 560 to 612 move out)

**Interfaces:**
- Produces:
```ts
export type Quality = "high" | "medium" | "low";
export type Stage = {
  renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera;
  /** as today's setSun */ setSun(elev: number, az?: number, force?: boolean): void;
  sunAt(tod: number): { elev: number; az: number };
  /** 1 in the dark, 0 in full day */ dusk(): number;
  sunDir: THREE.Vector3; elev(): number;
  /** fit the sun's shadow box to the view, as the block at the end of frame() does */ shadowFor(camPos: THREE.Vector3, camLook: THREE.Vector3, tight: boolean): void;
  /** advance sea and sky uniforms */ tick(t: number): void;
  render(): void; inView(): boolean; dispose(): void;
};
export const NIGHT = -5, DAY = 7.5, DAY_S = 330, NIGHT_S = 110;
export const coarse: boolean, reduce: boolean;
export function createStage(canvas: HTMLCanvasElement, opts?: { quality?: Quality }): Stage;
```
- `quality` omitted or `"high"` reproduces today exactly. `"medium"`: pixel ratio ≤ 1.5, no GTAO, shadow map 2048. `"low"`: pixel ratio 1, no GTAO, no bloom, shadow map 1024, water texture 256.

- [ ] **Step 1:** Move the code into `createStage`; `engine.ts` calls it and reads from the returned object. The dev hook `__dp.r` keeps working.
- [ ] **Step 2:** `npm run build`. Expected: type-checks and builds.
- [ ] **Step 3:** Retake the four shots into `docs/evidence/race-refactor/after-1/`. Compare each side by side with `before/`. Expected: same framing, light, colour and shadows (clouds and stars are random and may differ).
- [ ] **Step 4:** Commit: `refactor(dua-pulau): the stage (sky, sun, sea, render) in its own module`.

---

### Task 2: Extract the isles

**Files:**
- Create: `src/dua-pulau/world/isles.ts`
- Modify: `src/dua-pulau/world/engine.ts` (terrain, shore, `SITES`, `stand`, buildings, `rocks`, `near2`, `markers`, `life()`, gulls)

**Interfaces:**
- Consumes: `Stage`.
- Produces:
```ts
export type Rock = { ax: number; az: number; bx: number; bz: number; r: number };
export type Site = /* today's Site type, moved */;
export type Isles = {
  sites: Site[]; site(id: PlaceId): Site;
  rocks: Rock[]; near2(k: Rock, x: number, z: number): { d: number; px: number; pz: number };
  /** every per-frame animation of the islands; env carries what life() reads today */
  update(t: number, dt: number, env: { bob: number; dusk: number; weather: Weather | null; found: Set<PlaceId>; camPos: THREE.Vector3 }): void;
  /** handles engine.ts needs for mooring and place events (bale kettles, huts, markers, pip, solids) */
  parts: { /* named exactly as engine.ts uses them today */ };
};
export function buildIsles(stage: Stage, opts: { huts: HutProject[]; markers?: boolean }): Isles;
```
- `engine.ts` passes the Bootcamp Connect and `earlierWork` list it builds today. `isles.ts` must not import `src/content/work`. `markers: false` leaves out the place beacons.

- [ ] **Step 1:** Move the code; `engine.ts` composes it.
- [ ] **Step 2:** `npm run build`. Expected: succeeds. `grep -n "content/work" src/dua-pulau/world/isles.ts`. Expected: no match.
- [ ] **Step 3:** Retake the four shots into `after-2/` and compare. Moor at the huts and the bale; expected: posters show, kettles play.
- [ ] **Step 4:** Commit: `refactor(dua-pulau): the islands and their life in their own module`.

---

### Task 3: Extract the vessel and the pilot; prove the home page

**Files:**
- Create: `src/dua-pulau/world/vessel.ts`, `src/dua-pulau/world/pilot.ts`
- Modify: `src/dua-pulau/world/engine.ts` (pinisi, helm, wake, `beamAt`, the body of `sail()`)
- Test: `src/dua-pulau/world/pilot.test.ts`

**Interfaces:**
- Consumes: `Isles` (for `rocks`, `near2`), `heightAt`, `ISLANDS`.
- Produces:
```ts
export type Hull = { x: number; z: number; yaw: number; v: number; roll: number };
export type Steer = { turn: number; thrust: number; swing?: number };
export type Vessel = {
  st: Hull; helm: THREE.Group; pinisi: ReturnType<typeof buildPinisi>;
  /** place the model from st: bob, heel, sails, flags, wake */ place(t: number, dt: number): void;
  setVisible(on: boolean): void; dispose(): void;
};
export function createVessel(scene: THREE.Scene, opts?: { tint?: number; ghost?: boolean; wake?: boolean }): Vessel;
/** one step of motion and collision, today's lines from "turn = clamp" to the 520 clamp. speed: when given, st.v eases to it and thrust is ignored. Returns true if she touched land or an obstacle. */
export function stepHull(st: Hull, s: Steer, dt: number, isles: Pick<Isles, "rocks" | "near2">, opts?: { speed?: number }): boolean;

export type PilotMem = { isle: Island | null; side: number };
/** today's autopilot steering for a point, without the arrival check */
export function pilot(st: Hull, target: { x: number; z: number }, isles: Pick<Isles, "rocks" | "near2">, mem: PilotMem): Steer;
```
- `tint` recolours the hull paint; `ghost` makes every material translucent (opacity 0.35), casts no shadow and has no wake. The player's vessel in `engine.ts` uses neither.
- `audio.bump()` stays in `engine.ts`, called when `stepHull` returns true and speed was above 5.

- [ ] **Step 1: Write the failing tests** in `pilot.test.ts`, with `isles = { rocks: [], near2 }` (a local `near2` for a capsule):
```ts
test("clear water: steers straight for the point", () => {
  const s = pilot({ x: 0, z: 300, yaw: 0, v: 8, roll: 0 }, { x: 200, z: 300 }, isles, { isle: null, side: 0 });
  expect(Math.abs(s.turn)).toBeLessThan(0.05); expect(s.thrust).toBe(1);
});
test("an island in the way: she turns off the straight course", () => {
  const s = pilot({ x: -260, z: 0, yaw: 0, v: 8, roll: 0 }, { x: 0, z: 0 }, isles, { isle: null, side: 0 });
  expect(Math.abs(s.turn)).toBeGreaterThan(0.2);
});
test("driven for 120 s she passes the island without grounding", () => {
  const st = { x: -260, z: 0, yaw: 0, v: 0, roll: 0 }, mem = { isle: null, side: 0 };
  for (let i = 0; i < 120 * 30; i++) { stepHull(st, pilot(st, { x: 0, z: 0 }, isles, mem), 1 / 30, isles); expect(heightAt(st.x, st.z)).toBeLessThan(-1.5); }
  expect(Math.hypot(st.x, st.z)).toBeLessThan(20);
});
```
- [ ] **Step 2:** `npm test`. Expected: FAIL, `pilot` not found.
- [ ] **Step 3:** Move the code. `sail()` in `engine.ts` becomes: build a `Steer` from the autopilot (`pilot` plus the arrival check and the cast-off `thrust`/`swing` rule) or from keys, pad and pointer, then call `stepHull`.
- [ ] **Step 4:** `npm test`. Expected: PASS. `npm run build`. Expected: succeeds.
- [ ] **Step 5:** Retake the four shots into `after-3/`; repeat the run-through from `before/notes.md` (sail to the pavilion, moor, bump the pier, light the lamp from a fresh load, phone-width check at 390×844). Expected: all as recorded. Compare home-page chunk sizes with the baseline: total within 2%.
- [ ] **Step 6:** Commit: `refactor(dua-pulau): the vessel and the pilot in their own modules`.

---

### Task 4: Course rules

**Files:**
- Create: `src/race/rules/types.ts`, `geometry.ts`, `course.ts`
- Test: `src/race/rules/course.test.ts`

**Interfaces:**
- Produces:
```ts
// types.ts
export type Vec = { x: number; z: number };
export type Pose = Vec & { yaw: number; v: number };
export type Side = "port" | "starboard";
/** out: unit vector from the buoy away from the inside of the turn */
export type Mark = Vec & { side: Side; out: Vec };
/** dir: unit vector, the way boats must cross */
export type Line = { a: Vec; b: Vec; dir: Vec };
export type CourseId = "sprint" | "lap" | "eight";
export type Course = { id: CourseId; name: string; start: Line; finish: Line; marks: Mark[]; wind: { from: number; kmh: number }; seed: number };
export type Mode = "easy" | "sailing";
export type WindSet = "standard" | "today";
export type Progress = { started: boolean; early: boolean; leg: number; splits: number[]; finishedAt: number | null };

// geometry.ts
export const wrap180: (deg: number) => number;            // to (−180, 180]
export const bearingOf: (yaw: number) => number;          // compass degrees, 0..360
export const yawOf: (bearing: number) => number;
export function segCross(p0: Vec, p1: Vec, a: Vec, b: Vec): boolean;

// course.ts
export const RAY = 60, RAY_GAP = 3;                        // a mark's rounding ray runs from RAY_GAP to RAY along out
export const COURSES: Record<CourseId, Course>;
export const CUP_ORDER: CourseId[] = ["sprint", "lap", "eight"];
export const newProgress: () => Progress;
/** one step of a boat's track from p0 to p1 at race time t (negative before the gun) */
export function advance(c: Course, p: Progress, p0: Vec, p1: Vec, t: number): Progress;
/** the point to make for next: the next mark's rounding point (buoy + out × 14), or the middle of the finish line */
export function target(c: Course, p: Progress): Vec;
/** distance still to sail along the course, for ranking and gaps */
export function remaining(c: Course, p: Progress, at: Vec): number;
/** where to put a boat back on course: the last rounded mark's rounding point, or 25 behind the start line's middle */
export function recoverAt(c: Course, p: Progress): Vec;
```
- Rules for `advance`: before `started`, crossing `start` along `dir` at `t ≥ 0` with `early` false sets `started`. At `t === 0` (first call with `t ≥ 0`), a boat on the course side of the line (`dot(p1 − a, dir) > 0`) gets `early = true`; `early` clears when it is back on the pre-start side. A mark is rounded when the step crosses its ray and `out.x * v.z − out.z * v.x` is negative for port, positive for starboard (`v = p1 − p0`); only the mark at index `leg` counts. Each rounding pushes `t` to `splits`. The finish counts only when `leg === marks.length`, crossing `finish` along its `dir`; it sets `finishedAt`.

**Starting course data** (tune by sailing in Task 5 and 10):

| Course | name | start (a, b, dir) | marks (x, z, side, out) | finish | wind from, km/h | seed |
|---|---|---|---|---|---|---|
| sprint | Sprint | (150,92) (150,142) west | (20,115, port, west) | (150,92) (150,142) east | 90, 22 | 11 |
| lap | Island lap | (−30,60) (−30,110) west | (−125,115, starboard, south) (−240,0, starboard, west) (−125,−115, starboard, north) (−25,0, starboard, east) | same as start | 45, 22 | 23 |
| eight | Two islands | (0,105) (0,155) east | (125,118, port, south) (235,8, port, east) (125,−100, port, north) (−125,115, starboard, south) (−240,0, starboard, west) (−125,−115, starboard, north) | same as start | 315, 22 | 37 |

- [ ] **Step 1: Write the failing tests:**
```ts
test("every course point lies in deep water and every out and dir is a unit vector", () => {
  for (const c of Object.values(COURSES)) {
    for (const p of [c.start.a, c.start.b, c.finish.a, c.finish.b, ...c.marks]) expect(heightAt(p.x, p.z)).toBeLessThan(-3.6);
    for (const v of [c.start.dir, c.finish.dir, ...c.marks.map((m) => m.out)]) expect(Math.hypot(v.x, v.z)).toBeCloseTo(1);
  }
});
test("port rounding: passing west of a west-facing ray heading south counts; heading north does not", () => {
  const c = COURSES.sprint, m = c.marks[0], p = { ...newProgress(), started: true };
  expect(advance(c, p, { x: m.x - 20, z: m.z - 5 }, { x: m.x - 20, z: m.z + 5 }, 9).leg).toBe(1);
  expect(advance(c, p, { x: m.x - 20, z: m.z + 5 }, { x: m.x - 20, z: m.z - 5 }, 9).leg).toBe(0);
});
test("the start does not count before the gun, nor backwards", () => {
  const c = COURSES.sprint, east = { x: 155, z: 115 }, west = { x: 145, z: 115 };
  expect(advance(c, newProgress(), east, west, -1).started).toBe(false);
  expect(advance(c, newProgress(), west, east, 2).started).toBe(false);
  expect(advance(c, newProgress(), east, west, 2).started).toBe(true);
});
test("over the line at the gun: must come back before the start counts", () => {
  const c = COURSES.sprint;
  let p = advance(c, newProgress(), { x: 141, z: 115 }, { x: 140, z: 115 }, 0);
  expect(p.early).toBe(true); expect(p.started).toBe(false);
  p = advance(c, p, { x: 140, z: 115 }, { x: 156, z: 115 }, 3); expect(p.early).toBe(false);
  p = advance(c, p, { x: 156, z: 115 }, { x: 144, z: 115 }, 5); expect(p.started).toBe(true);
});
test("the finish counts only after every mark", () => {
  const c = COURSES.sprint, w = { x: 145, z: 115 }, e = { x: 155, z: 115 };
  const p = { ...newProgress(), started: true };
  expect(advance(c, p, w, e, 20).finishedAt).toBeNull();
  expect(advance(c, { ...p, leg: 1, splits: [15] }, w, e, 31.5).finishedAt).toBe(31.5);
});
test("a mark out of turn does not count", () => {
  const c = COURSES.lap, m = c.marks[1], p = { ...newProgress(), started: true };
  expect(advance(c, p, { x: m.x - 20, z: m.z + 5 }, { x: m.x - 20, z: m.z - 5 }, 9).leg).toBe(0);
});
test("remaining shrinks along the course and is 0 when finished", () => {
  const c = COURSES.sprint, p = { ...newProgress(), started: true };
  expect(remaining(c, p, { x: 140, z: 115 })).toBeGreaterThan(remaining(c, p, { x: 60, z: 115 }));
  expect(remaining(c, { ...p, leg: 1, finishedAt: 30 }, { x: 160, z: 115 })).toBe(0);
});
```
- [ ] **Step 2:** `npm test`. Expected: FAIL, modules not found.
- [ ] **Step 3:** Implement the three files to the signatures and rules above.
- [ ] **Step 4:** `npm test`. Expected: PASS. If the deep-water test fails for a point, move that point seaward and note the new value in this table.
- [ ] **Step 5:** Commit: `feat(race): course geometry, mark rounding and line rules`.

---

### Task 5: The page, the race loop, one course in Easy against the clock

**Files:**
- Create: `race/index.html`, `src/race/main.tsx`, `App.tsx`, `Hud.tsx`, `Results.tsx`, `race.css`, `copy.ts`, `world.ts`, `rules/race.ts`
- Modify: `vite.config.ts` (add `race: "race/index.html"` to `input`)
- Test: `src/race/rules/race.test.ts`

**Interfaces:**
- Consumes: Task 4 types and functions; `createStage`, `buildIsles`, `createVessel`, `stepHull`.
- Produces:
```ts
// rules/race.ts
export type Phase = "card" | "countdown" | "racing" | "finished";
export type Boat = { id: string; pose: Pose & { roll: number }; prog: Progress; helm: Helm };   // Helm = { turn: number; thrust: number }
export type RaceCfg = { course: Course; mode: Mode; countdown: number; move: (b: Boat, dt: number, t: number) => void };
export type Race = {
  phase(): Phase; /** race time in seconds; negative during the countdown */ time(): number;
  boats: Boat[]; player: Boat;
  /** leave the card and begin the countdown */ begin(): void;
  step(dt: number): void;
  /** indices into boats, leader first */ order(): number[];
};
export const COUNTDOWN: Record<Mode, number> = { easy: 5, sailing: 8 };   // sailing was 20; changed in Task 7, with the grid placed by startRun (rules/start.ts)
export function createRace(cfg: RaceCfg, ids: string[]): Race;   // ids[0] is the player
export function gridFor(c: Course, n: number): Pose[];           // n boats abreast, 14 apart, 25 behind the start line, facing dir

// world.ts
export type RaceWorld = {
  setCourse(c: Course): void;                 // buoys and line buoys; the next mark is highlighted by setNext
  setNext(i: number | "finish"): void;
  vessel(id: string, opts?: { tint?: number; ghost?: boolean }): Vessel;
  /** what the player is steering with now, from keys, pad and pointer */ helm(): Helm;
  move(b: Boat, dt: number, speed?: number): boolean;   // stepHull against the isles
  frame(cb: (dt: number, t: number) => void): void;     // called each rendered frame, dt ≤ 0.05; not called while hidden
  setPaused(on: boolean): void; dispose(): void;
};
export function createRaceWorld(canvas: HTMLCanvasElement, opts: { quality: Quality; huts: HutProject[] }): RaceWorld;
```
- `step`: time advances only by `dt` (so a hidden tab cannot jump it). In `"countdown"` with `mode === "easy"`, boats are not moved; with `"sailing"` they are. At `time() ≥ 0` the phase is `"racing"`. Each moved boat is passed through `advance` with its position before and after. The phase becomes `"finished"` when the player's `finishedAt` is set.
- `world.ts`: fixed sun at `stage.sunAt(0.42 * DAY_S)`; no lamp, no day clock; `buildIsles(stage, { huts, markers: false })`; follow camera 30 behind and 13 above the player, looking 12 ahead, eased as `aim()` eases today; steering input copied from the `steering()` branch of `sail()` (keys, gamepad, pointer on the sea plane). Buoys use `buildBuoy()`; the next mark's buoy carries a tall gold pennant and a ring on the water on its rounding side.
- `race/index.html`: title `Dua Pulau Regatta`, the same font links as the home page, `<meta name="description" content="A sailing race round two islands. Play in your browser.">`, canonical `https://axelle.marea-dvipa.uk/race/`.
- This task's screens: straight into a race on `COURSES.lap`, Easy. `Hud` shows the timer (`m:ss.cc`) and a pointer to the next mark with "leave to port" or "leave to starboard". `Results` shows the time and **Race again**.

- [ ] **Step 1: Write the failing tests** (`move` stub: advance the pose along `yaw` at `helm.thrust * 13`):
```ts
test("easy: boats are held until the gun", () => {
  const r = createRace({ course: COURSES.sprint, mode: "easy", countdown: 5, move }, ["you"]); r.begin();
  const x0 = r.player.pose.x; r.player.helm = { turn: 0, thrust: 1 };
  for (let i = 0; i < 4 * 30; i++) r.step(1 / 30);
  expect(r.phase()).toBe("countdown"); expect(r.player.pose.x).toBe(x0);
});
test("the clock is the sum of steps: a long gap between frames adds only its dt", () => {
  const r = createRace({ course: COURSES.sprint, mode: "easy", countdown: 5, move }, ["you"]); r.begin();
  for (let i = 0; i < 6 * 20; i++) r.step(0.05);
  expect(r.time()).toBeCloseTo(1, 5);
});
test("a boat driven round the sprint finishes with one split and a time", () => { /* steer with a helm that turns for target(course, prog); expect phase "finished", splits.length 1, finishedAt > 15 */ });
test("gridFor puts every boat behind the line, facing it", () => {
  for (const p of gridFor(COURSES.lap, 4)) { expect((p.x - COURSES.lap.start.a.x) * COURSES.lap.start.dir.x).toBeLessThan(0); expect(bearingOf(p.yaw)).toBeCloseTo(270); }
});
```
- [ ] **Step 2:** `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `rules/race.ts`. `npm test`. Expected: PASS.
- [ ] **Step 4:** Build the page and `world.ts`. Run `npm run dev`, open `/race/`. Expected: daylight, the player's pinisi behind the Island lap start line, a 5-second countdown, then a race round the island with each next buoy flagged; a wrong-side pass leaves the pointer where it was; crossing the finish shows the time.
- [ ] **Step 5:** Sail the lap three times. Adjust `COURSES.lap` marks so the lap takes 55 to 75 s in Easy and no mark sits where the pier or shallows make rounding awkward; update the Task 4 table and tests if a value changes.
- [ ] **Step 6:** `npm run build`. Check the home page's chunks do not contain the string `race:v1:` or `Dua Pulau Regatta`, and the race page's chunks do not contain `Bootcamp Connect`. Expected: no matches.
- [ ] **Step 7:** Commit: `feat(race): the /race/ page with one course against the clock`.

---

### Task 6: Best times and the ghost

**Files:**
- Create: `src/race/rules/store.ts`, `src/race/rules/ghost.ts`
- Modify: `src/race/App.tsx`, `Results.tsx`, `Hud.tsx`, `world.ts`
- Test: `src/race/rules/store.test.ts`, `ghost.test.ts`

**Interfaces:**
- Produces:
```ts
// ghost.ts
export type Run = { time: number; splits: number[]; track: number[] };   // track: flat [x, z, yaw] every 0.1 s from the gun, x and z to 0.1, yaw to 0.01
export function recorder(): { add(t: number, p: Pose): void; done(time: number, splits: number[]): Run };
export function poseAt(run: Run, t: number): { x: number; z: number; yaw: number } | null;   // linear between samples, yaw by shortest turn; null before 0 or after the end

// store.ts
export type Slot = "easy" | "sailing-standard" | "sailing-today";
export const slotOf: (mode: Mode, wind: WindSet) => Slot;
export type Kv = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export function openStore(kv: Kv | null, today: string): {
  best(course: CourseId, slot: Slot): Run | null;
  /** keeps the run if it beats the stored one; returns true if it did */ offer(course: CourseId, slot: Slot, run: Run): boolean;
  prefs(): Prefs; setPrefs(p: Partial<Prefs>): void;
};
export type Prefs = { course: CourseId; mode: Mode; wind: WindSet; ghost: boolean; muted: boolean; beaten: Record<string, string[]>; cupBest: Record<Slot, number | null>; quality: Quality | null };
export const DEFAULT_PREFS: Prefs;   // lap, easy, today, ghost on, not muted, nothing beaten, no cup best, quality null
```
- Keys: `race:v1:best:<course>:<slot>` (for `sailing-today` the stored value carries `day`, and `best` returns null when `day !== today`), `race:v1:prefs`.

- [ ] **Step 1: Write the failing tests:**
```ts
test("no storage: nothing is kept and nothing throws", () => { const s = openStore(null, "2026-11-24"); expect(s.offer("lap", "easy", run(60))).toBe(true); expect(s.best("lap", "easy")).toBeNull(); expect(s.prefs()).toEqual(DEFAULT_PREFS); });
test("storage that throws on write or holds bad JSON behaves like no storage", () => { /* kv.setItem throws; kv.getItem returns "{oops" */ });
test("a slower run does not replace the best", () => { const s = openStore(mem(), "d"); s.offer("lap", "easy", run(60)); expect(s.offer("lap", "easy", run(61))).toBe(false); expect(s.best("lap", "easy")!.time).toBe(60); });
test("slots are separate", () => { const s = openStore(mem(), "d"); s.offer("lap", "easy", run(60)); expect(s.best("lap", "sailing-standard")).toBeNull(); });
test("today's-wind bests last the day only", () => { const kv = mem(); openStore(kv, "2026-11-24").offer("lap", "sailing-today", run(90)); expect(openStore(kv, "2026-11-24").best("lap", "sailing-today")!.time).toBe(90); expect(openStore(kv, "2026-11-25").best("lap", "sailing-today")).toBeNull(); });
test("a recorded run plays back where it was sailed", () => { const r = recorder(); for (let i = 0; i <= 100; i++) r.add(i / 10, { x: i, z: 2 * i, yaw: 0.5, v: 10 }); const run = r.done(10, []); expect(poseAt(run, 5.05)!.x).toBeCloseTo(50.5, 0); expect(poseAt(run, -1)).toBeNull(); expect(poseAt(run, 11)).toBeNull(); });
test("yaw interpolates the short way across ±π", () => { /* samples at yaw 3.1 and −3.1: midpoint is near ±π, not 0 */ });
```
- [ ] **Step 2:** `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement both files. `npm test`. Expected: PASS.
- [ ] **Step 4:** Wire in: record the player from the gun; on finish `offer` the run; `Results` shows time, best, the gap (`+1.24` or `−0.87`) and "New best" when `offer` returned true. While racing, a `ghost: true` vessel follows `poseAt(best, time)` and is hidden when that is null or `prefs.ghost` is false; the HUD shows the gap to the best run's split at each mark for 3 s.
- [ ] **Step 5:** Play two laps. Expected: second lap shows the ghost of the first; the faster one is kept after a reload.
- [ ] **Step 6:** Commit: `feat(race): best times kept on the device, and a ghost of the best run`.

---

### Task 7: Sailing mode

**Files:**
- Create: `src/race/rules/wind.ts`
- Modify: `src/race/world.ts` (gust patches, weather fetch, sails), `rules/race.ts` (sailing move), `Hud.tsx` (wind arrow), `App.tsx`
- Test: `src/race/rules/wind.test.ts`

**Interfaces:**
- Produces:
```ts
export const POLAR: [number, number][] = [[0, 0.05], [30, 0.12], [42, 0.62], [60, 0.82], [90, 0.97], [110, 1], [135, 0.93], [160, 0.8], [180, 0.72]];
export const polar: (twaDeg: number) => number;                 // linear between POLAR points
export const twa: (yaw: number, from: number) => number;        // 0..180
/** 0.75 at 10 km/h or less, 1.25 at 35 km/h or more, linear between; 1 at 22.5 */
export const strength: (kmh: number) => number;
export type Gust = { x: number; z: number; r: number; add: number };
export type WindField = { from: number; kmh: number; seed: number; vary: boolean };
export const makeField: (base: { from: number; kmh: number }, seed: number, vary: boolean) => WindField;
/** the five gust patches at time t: radius 45 to 70, add 0.12 to 0.25, drifting downwind at 6 units/s, wrapping in a 700 square on the origin */
export function gustsAt(f: WindField, t: number): Gust[];
export function windAt(f: WindField, x: number, z: number, t: number): { from: number; factor: number };
/** the speed she settles to under sail */
export const sailSpeed: (yaw: number, w: { from: number; factor: number }) => number;   // 13 × polar × factor
/** the wind to race in: today's if it arrived, else the course's own */
export function windFor(c: Course, set: WindSet, weather: { wind: number; from: number } | null): WindField;
```
- `windAt().from` = base `from` + `15 × sin(2π t / 70 + phase)`, phase 0 when `vary` is false, seeded when true. `factor` = `strength(kmh)` + the `add` of any gust the point lies in (falling off linearly to the edge). With `vary` false, gusts depend only on `seed` and `t`. `windFor(c, "standard", …)` returns `makeField(c.wind, c.seed, false)`; `"today"` with weather returns `makeField({ from: weather.from, kmh: weather.wind }, Date-based seed, true)`; `"today"` with null returns the standard field.
- Sailing move in `race.ts`/`world.ts`: `stepHull(st, { turn, thrust: 0 }, dt, isles, { speed: sailSpeed(st.yaw, windAt(field, st.x, st.z, t)) })`. Down and S keys do nothing in Sailing.
- Weather: `world.ts` makes the same open-meteo request `engine.ts` makes, once at load, with a 4-second timeout; the result or null is read when a race is configured.
- Gusts on the water: for each gust a dark, soft-edged translucent disc just above the sea (reuse the wake's radial texture, tinted `#06262c`, opacity 0.28), moved each frame from `gustsAt`.
- Sails: `pinisi.sails` meshes mirror to the leeward side (flip the brace angle's sign over 0.8 s) when the wind crosses the bow or stern. If the yards cannot be mirrored without remodelling, leave it and add a line to the spec under "Boat handling" saying so.
- Wind arrow in the HUD: points the way the wind blows, relative to the screen-up heading of the camera, with the speed in knots; hidden in Easy.

- [ ] **Step 1: Write the failing tests:**
```ts
test("polar: pinned points, symmetric, slow in the no-go zone", () => { expect(polar(0)).toBe(0.05); expect(polar(42)).toBe(0.62); expect(polar(110)).toBe(1); expect(polar(180)).toBe(0.72); expect(polar(36)).toBeCloseTo(0.37); expect(polar(20)).toBeLessThan(0.12); });
test("twa: heading east in a west wind is a dead run; heading west is head to wind", () => { expect(twa(0, 270)).toBeCloseTo(180); expect(twa(Math.PI, 270)).toBeCloseTo(0); expect(twa(Math.PI / 2, 270)).toBeCloseTo(90); });
test("strength clamps", () => { expect(strength(0)).toBe(0.75); expect(strength(22.5)).toBeCloseTo(1); expect(strength(80)).toBe(1.25); });
test("standard wind repeats exactly", () => { const a = makeField({ from: 225, kmh: 22 }, 23, false), b = makeField({ from: 225, kmh: 22 }, 23, false); expect(windAt(a, 10, 20, 37.5)).toEqual(windAt(b, 10, 20, 37.5)); expect(gustsAt(a, 12)).toEqual(gustsAt(b, 12)); });
test("shift stays within 15 degrees and a gust only adds", () => { const f = makeField({ from: 225, kmh: 22 }, 23, false); for (let t = 0; t < 200; t += 3) { const w = windAt(f, 0, 0, t); expect(Math.abs(wrap180(w.from - 225))).toBeLessThanOrEqual(15.001); expect(w.factor).toBeGreaterThanOrEqual(strength(22) - 1e-9); expect(w.factor).toBeLessThanOrEqual(strength(22) + 0.25 + 1e-9); } });
test("no weather: today's wind is the course's own", () => { const c = COURSES.lap; expect(windFor(c, "today", null)).toEqual(windFor(c, "standard", null)); });
test("head to wind and stopped, she can still be turned out and gathers way", () => {
  const st = { x: 0, z: 300, yaw: yawOf(270), v: 0, roll: 0 }, w = { from: 270, factor: 1 };
  for (let i = 0; i < 30 * 30; i++) stepHull(st, { turn: 1, thrust: 0 }, 1 / 30, open, { speed: sailSpeed(st.yaw, w) });
  expect(twa(st.yaw, 270)).toBeGreaterThan(42); expect(st.v).toBeGreaterThan(6);
});
```
- [ ] **Step 2:** `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `wind.ts`. `npm test`. Expected: PASS.
- [ ] **Step 4:** Wire Sailing into the race (mode read from a temporary `?mode=sailing` query until Task 10's title screen), with the 20-second free countdown and the early-start rule from `advance`; the HUD shows "Over early: go back behind the line" while `prog.early`.
- [ ] **Step 5:** Sail the lap in Sailing with `?mode=sailing&wind=standard`. Expected: she crawls inside about 40° of the wind, the upwind leg needs at least two tacks, gust patches are visible before they reach her and she speeds up inside them, the arrow follows the shift. Tune `POLAR` and the turn rate's feel until a tack costs speed but never strands her; update pinned test values with any change.
- [ ] **Step 6:** Block `api.open-meteo.com` in the browser's network panel and reload with `wind=today`. Expected: the race starts without delay under the standard wind.
- [ ] **Step 7:** Commit: `feat(race): sailing mode with wind, gusts, shifts and a timed start`.

---

### Task 8: Rival boats in Easy, bumping, standings

**Files:**
- Create: `src/race/rules/rivals.ts`, `src/race/rules/bump.ts`
- Modify: `rules/race.ts`, `world.ts`, `Hud.tsx`, `App.tsx`
- Test: `src/race/rules/rivals.test.ts`, `bump.test.ts`

**Interfaces:**
- Consumes: `pilot`, `PilotMem`, `target`, `remaining`.
- Produces:
```ts
// rivals.ts
export type Rival = { id: string; name: string; tint: number; pace: number; wide: number };
export const RIVALS: Rival[] = [
  { id: "ombak", name: "Ombak", tint: 0x2f8f8a, pace: 0.86, wide: 26 },          // the one a newcomer can beat
  { id: "sussex-maid", name: "Sussex Maid", tint: 0xc8553d, pace: 0.93, wide: 18 },
  { id: "bintang-laut", name: "Bintang Laut", tint: 0x3a4f8f, pace: 0.98, wide: 13 },
];
export type RivalMem = PilotMem & { tack: 1 | -1; tackedAt: number };
export const newRivalMem: () => RivalMem;
/** Easy: where to steer and how hard to push. thrust is r.pace, eased to 0.6 × pace within 25 of a rounding point. */
export function easyHelm(r: Rival, b: Boat, c: Course, isles: Pick<Isles, "rocks" | "near2">, mem: RivalMem): Helm;
/** the easiest rival not yet beaten on this course and slot, else the hardest */
export function rivalFor(beaten: string[]): Rival;

// bump.ts
export const HULL_R = 3.4, HULL_AT = [9, 0, -9];
/** if the hulls overlap, push them apart equally, slow both to 85%, and return true */
export function bump(a: Pose, b: Pose): boolean;
```
- **Boat designs (added 2026-11-24).** Create `src/race/boats.ts` exporting `buildOriginalPinisi()` and `buildCruisingPinisi()`, recovered from `buildPinisi` in `src/dua-pulau/world/models.ts` at commits `d8495fd` and `1fe41aa` (`git show <commit>:src/dua-pulau/world/models.ts`), with whatever helpers those versions needed that today's `models.ts` no longer exports copied in beside them. Each returns at least `{ boat: THREE.Group; sails: THREE.Mesh[]; flag: THREE.Object3D; foreFlag: THREE.Object3D }`, bow along +x, same scale as today's. `createVessel` gains `opts.build?: () => { boat; sails; flag; foreFlag }` (default `buildPinisi`); `Vessel.place` must work with any of the three. `Rival` gains `design: "original" | "cruising" | "current"`: Ombak `original`, Sussex Maid `cruising`, Bintang Laut `current` with its tint. `boats.ts` must not be in the home page's bundle. If a design cannot be recovered cleanly, give that rival `current` with its tint and say so in the report and the spec.
- A rival's rounding point is `mark + out × r.wide` (the player's pointer uses 14).
- `race.ts`: after moving all boats each step, `bump` every pair of real boats (never the ghost). `order()` sorts finished boats by `finishedAt`, then the rest by `remaining` ascending; unstarted boats last by distance to the line.
- Names and colours above are proposals; Axelle approves them (ask at the end of this task and change the roster if she wants).
- HUD: standings list (position, colour swatch, name, "You" for the player, a "Rival" tag), position badge (`1st` to `4th`), and the gap to the boat ahead, or behind when leading: `remaining` difference ÷ 13, shown as `+2.4 s`.
- On finish, every rival the player beat is added to `prefs.beaten["<course>:<slot>"]`.

- [ ] **Step 1: Write the failing tests:**
```ts
test("each rival, driven by easyHelm, finishes every course without grounding or stalling", () => {
  for (const c of Object.values(COURSES)) for (const r of RIVALS) {
    /* simulate at 30 Hz with stepHull and advance, thrust × 13; expect finishedAt within 300 s; every step heightAt(pose) < -1.5; never more than 8 s with |v| < 1 after the gun */
  }
});
test("pace orders the fleet", () => { /* finish times on the lap: ombak > sussex-maid > bintang-laut */ });
test("overlapping hulls are pushed apart and slowed", () => { const a = { x: 0, z: 0, yaw: 0, v: 10 }, b = { x: 3, z: 2, yaw: 0, v: 10 }; expect(bump(a, b)).toBe(true); expect(bump({ ...a }, { ...b })).toBe(false); expect(a.v).toBe(8.5); expect(b.v).toBe(8.5); });
test("hulls well apart are left alone", () => { const a = { x: 0, z: 0, yaw: 0, v: 10 }, b = { x: 0, z: 30, yaw: 0, v: 10 }; expect(bump(a, b)).toBe(false); expect(a.v).toBe(10); });
test("rivalFor: easiest unbeaten, then the hardest", () => { expect(rivalFor([]).id).toBe("ombak"); expect(rivalFor(["ombak"]).id).toBe("sussex-maid"); expect(rivalFor(["ombak", "sussex-maid", "bintang-laut"]).id).toBe("bintang-laut"); });
```
- [ ] **Step 2:** `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement both files and the `race.ts` changes. `npm test`. Expected: PASS.
- [ ] **Step 4:** Add the three rival vessels to `world.ts` (tinted; the full model first). Check the frame rate on a phone-sized viewport with CPU throttling at 4×: if below 30 fps, give rivals `wake: false` and no shadow casting, and note it in the spec.
- [ ] **Step 5:** Race the lap in Easy. Expected: four boats on the line, rivals round every mark, bumping pushes boats apart with the bump sound, standings and gap update, Ombak is beatable on a first try.
- [ ] **Step 6:** Commit: `feat(race): three rival pinisi, bumping and live standings`.

---

### Task 9: Rivals under sail

**Files:**
- Modify: `src/race/rules/rivals.ts`, `rules/race.ts`
- Test: `src/race/rules/rivals.test.ts`

**Interfaces:**
- Produces:
```ts
export const CLOSE = 47;        // degrees off the wind a rival sails when it cannot lay its target
export const MIN_TACK = 8;      // seconds between tacks
/** Sailing: the heading to hold. Lays the target when it can; otherwise sails CLOSE off the wind on mem.tack and tacks when the target bears more than CLOSE on the other side, when land lies within 60 ahead (heightAt probes every 10), or when more than 90 off the straight line from the last mark. */
export function sailHelm(r: Rival, b: Boat, c: Course, w: { from: number; factor: number }, isles: Pick<Isles, "rocks" | "near2">, mem: RivalMem, t: number): Helm;
```
- A rival's speed target is `sailSpeed × r.pace`. Off the wind, `sailHelm` steers as `easyHelm` does (pilot avoidance included). Rivals start from the grid `startRun` gives (see `rules/start.ts`, Task 7) and hold their course through the 8-second countdown, so they cross within 3 s after the gun.

- [ ] **Step 1: Write the failing test:**
```ts
test("each rival finishes every course under the standard wind without grounding, stalling or sailing in the no-go zone", () => {
  for (const c of Object.values(COURSES)) for (const r of RIVALS) {
    /* simulate at 30 Hz from the 8 s countdown on the startRun grid with windAt(windFor(c, "standard", null)); expect: started within 6 s of the gun; finishedAt within 480 s; heightAt < -1.5 throughout; never more than 10 s in a row with twa < 38; never more than 10 s with |v| < 1 after the gun */
  }
});
test("dead upwind she tacks rather than pinching", () => { /* target straight upwind 300 away: over 120 s the tack sign changes at least twice and at most 12 times, and distance to target falls below 30 */ });
```
- [ ] **Step 2:** `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. `npm test`. Expected: PASS.
- [ ] **Step 4:** Race the lap and the eight in Sailing. Expected: rivals tack up the windward legs, give land room, and do not all sail the same track (their `wide` and tack timing differ).
- [ ] **Step 5:** Commit: `feat(race): rivals that sail by the wind`.

---

### Task 10: Screens, the other courses, cup, pause, photo, back on course, quality, sound

**Files:**
- Create: `src/race/Title.tsx`, `Card.tsx`, `Pause.tsx`, `CupTable.tsx`, `CourseChart.tsx`, `quality.ts`, `sfx.ts`, `rules/cup.ts`
- Modify: `src/race/App.tsx`, `Hud.tsx`, `Results.tsx`, `world.ts`, `rules/race.ts`, `race.css`, `copy.ts`
- Test: `src/race/rules/cup.test.ts`, `race.test.ts`, `src/race/quality.test.ts`

**Interfaces:**
- Produces:
```ts
// cup.ts
export const POINTS = [4, 3, 2, 1];
/** places[r][i]: finishing place (0-based) of boat i in race r. Returns totals and the order, ties broken by the better place in the last race. */
export function cupTable(places: number[][]): { totals: number[]; order: number[] };

// quality.ts
/** from frame times in ms measured on the title screen (first 20 dropped): median ≤ 12 high, ≤ 22 medium, else low */
export function tierFrom(frameMs: number[]): Quality;

// race.ts additions
/** put a boat back: stopped at recoverAt, on a heading it can sail towards its target (in Sailing, CLOSE off the wind on the nearer side if the target lies in the no-go zone) */
export function recover(b: Boat, c: Course, w: { from: number; factor: number } | null): void;
/** true when, since the gun, the player has made less than 1 unit/s for 6 s running */
export function stuck(r: Race): boolean;
```
- Screen flow in `App.tsx`: `title → card → countdown/racing → results`, with `cup` wrapping three races and `CupTable` between them. Query-string overrides from Tasks 5 and 7 are removed.
- **Title:** `TITLE`, a **Race** button (focused on load), course picker (three, each with its best for the current slot), mode switch, wind switch (Sailing only: "Today's wind" / "Standard wind"), ghost switch, **Cup** button, mute, and "by Axelle Jamal" linking to `/`. Every choice starts from `prefs` and is saved on change. Behind it the camera circles the chosen course's start line slowly (still under reduced motion).
- **Card:** course name, mode, wind (direction as a compass point and knots, Sailing only), "Your rival: <name>", and the controls for the device in use (touch: "Hold where you want to go"; keyboard: "Arrows or A D to steer" plus "Up or W for way on" in Easy; gamepad if one is connected). Any key or tap, or 4 s, calls `race.begin()`.
- **Pause** (Esc, P, or the HUD button): Resume, Restart, Back on course, Photo, Change course, sound switch, and the full controls list. The world stops stepping while paused.
- **Photo:** HUD and pause hidden; drag circles the boat, scroll or pinch zooms (reuse the orbit maths from the moored camera in `engine.ts`); **Save picture** downloads the canvas as `dua-pulau-regatta.png`; **Done** returns to pause.
- **Back on course:** R, the pause button, and a HUD prompt shown when `stuck(race)`; calls `recover` on the player. The clock keeps running.
- **Results:** place, time, best and gap, "New best" when earned, "You beat <rival>" when the rival was beaten, **Race again**, **Change course**; in a cup, **Next race** then the final `CupTable` and "Best cup: N points" kept in `prefs.cupBest[slot]`.
- **CourseChart:** a canvas in the HUD corner: both shorelines (sample `heightAt` as `Chart.tsx`'s source data does), the course's marks numbered, the line, four boat dots in their colours, the ghost hollow. Do not import `Chart.tsx` (it depends on `places.ts`).
- **Quality:** when `prefs.quality` is null, the title screen runs at `"high"`, collects 120 frame times, stores `tierFrom(...)`, and if it is not `"high"` recreates the world at that tier before the first race. Touch devices never go above `"medium"`.
- **Hut boards:** `createRaceWorld` is called with `huts: [...CUP_ORDER.map((id) => ({ name: COURSES[id].name, line: <its shape in a few words> })), ...RIVALS.map((r) => ({ name: r.name, line: "Racing today" }))]`.
- **Sound (`sfx.ts`):** built on `world/audio.ts`: countdown ticks on 3, 2, 1 (`audio.kettle`), the gun (`audio.gong`), mark rounded (`audio.bar`), finish (a short rising `bar` run), bump (`audio.bump`). `audio.startAudio()` is called from the first tap or key.
- **Layout:** playable at 390×844 portrait, 844×390 landscape and 1440×900. Standings collapse to the position badge below 600 px wide. Tapping any HUD or menu control must not steer the boat.
- **Access:** every control reachable by Tab with a visible focus ring; standings and timer in an `aria-live="off"` region, results announced with `role="status"`; rival colours always paired with names.

- [ ] **Step 1: Write the failing tests:**
```ts
test("cup points and order", () => { const t = cupTable([[0, 1, 2, 3], [1, 0, 2, 3], [0, 1, 3, 2]]); expect(t.totals).toEqual([11, 10, 5, 4]); expect(t.order).toEqual([0, 1, 2, 3]); });
test("a cup tie goes to the better place in the last race", () => { const t = cupTable([[0, 1, 2, 3], [1, 0, 2, 3]]); expect(t.totals[0]).toBe(t.totals[1]); expect(t.order[0]).toBe(1); });
test("tierFrom", () => { expect(tierFrom(frames(8))).toBe("high"); expect(tierFrom(frames(16))).toBe("medium"); expect(tierFrom(frames(30))).toBe("low"); expect(tierFrom([200, 200, ...frames(8)])).toBe("high"); });
test("recover before any mark puts her behind the start line, stopped, facing it", () => { /* x on the pre-start side, v 0, bearing = start dir */ });
test("recover in Sailing with the target dead upwind points her CLOSE off the wind", () => { /* twa(b.pose.yaw, from) ≈ 47 */ });
test("stuck: 6 s of almost no way after the gun, and not before it", () => { /* true after 6 s at v 0.3 while racing; false during the countdown; false if v rose above 1 within the 6 s */ });
```
- [ ] **Step 2:** `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `cup.ts`, `quality.ts` and the `race.ts` additions. `npm test`. Expected: PASS.
- [ ] **Step 4:** Build the screens, chart, sound, photo camera and quality switch as specified.
- [ ] **Step 5:** Tune `COURSES.sprint` and `COURSES.eight` by sailing each three times in Easy (targets: about 40 s, and 2 to 2.5 min) and once in Sailing; rerun `npm test` (rival finish tests guard the changes).
- [ ] **Step 6:** Play-through checklist, at 1440×900 with keyboard and at 390×844 with touch emulation. Expected, each one:
  - From a fresh profile, **Race** is focused and Enter, then any key, has a race counting down within 10 s of load.
  - A second visit opens on the last course, mode and wind.
  - Each course in each mode can be finished; a best is kept per slot; the ghost appears on the next run and can be switched off.
  - A full cup in Easy and in Sailing ends with a table and a kept best.
  - Pause stops the clock; Restart and Change course work from it; Photo saves a PNG without the HUD.
  - Driving into a bay and stopping brings the Back on course prompt after 6 s; R puts her at the last mark.
  - Switching to another tab for 20 s mid-race and returning does not add 20 s to the clock.
  - With reduced motion on, the title camera is still and nothing sweeps.
  - With storage blocked (private window), everything plays and no error is logged.
  - The beach huts show course and boat names, no project names.
  - Keyboard alone reaches every control.
- [ ] **Step 7:** Commit: `feat(race): title, cup, pause, photo, back on course, quality check and sound`.

---

### Task 11: Join it to the portfolio and finish

**Files:**
- Modify: `src/sections/Work.tsx` (a link to `/race/` in the manner of the existing Dua Pulau entry), `src/dua-pulau/` home UI (one small "Race" link by the existing home link; this is the one permitted edit to the home page's UI), `race/index.html` (Open Graph title, description and image), `public/` (a 1200×630 share image taken from Photo mode)
- Modify: `docs/superpowers/specs/2026-11-24-sailing-race-design.md` (record anything left out, such as sail mirroring or lighter rivals)

- [ ] **Step 1:** Add the links and share tags. Ask Axelle for the game's name and her view of the rival names; set `TITLE` and `RIVALS` to her answers.
- [ ] **Step 2:** `npm test && npm run build`. Expected: all pass, build succeeds.
- [ ] **Step 3:** Bundle check on the build output: home page chunks do not contain `race:v1:`; race chunks do not contain `Bootcamp Connect`, `helmsman` or any `places.ts` blurb. Home page JS total within 2% of the Task 0 baseline.
- [ ] **Step 4:** Retake the four baseline shots into `docs/evidence/race-refactor/final/` and repeat the home run-through from `before/notes.md`. Expected: unchanged apart from the new link.
- [ ] **Step 5:** `npm run preview`; repeat the Task 10 checklist's first, third and seventh items against the built site.
- [ ] **Step 6:** Commit: `feat(race): link the game from the portfolio`. Stop. Tell Axelle it is ready; push and `npm run deploy` only when she says so.
