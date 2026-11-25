# Sailing race game on the Dua Pulau sea: design

Date: 2026-11-24
Status: approved by Axelle, 2026-11-24
Working title: **Dua Pulau Regatta** (Claude's placeholder; the name is Axelle's to choose)

## Intent

Axelle wants a sailing race game that stands as a game in its own right, built from the Dua Pulau world (the 3D home page of this portfolio: two islands, a sea, a 28 m pinisi). It is a portfolio piece that anyone can open on the web and play, on a phone or a desktop, with no account and no install.

"In its own right" means it has its own address, its own identity and something to get good at. It is not a mode of the portfolio page and carries none of the portfolio's content.

## Goals

- A visitor can be racing within about ten seconds of the page loading.
- Two ways to play the same courses:
  - **Easy**: the boat goes where it is pointed, as in Dua Pulau today. Wind is scenery.
  - **Sailing**: wind decides speed. The boat cannot sail straight into the wind, is fastest across it, and upwind legs need tacking. Gusts and wind shifts make races differ.
- You race the clock, a ghost of your own best run, and three AI pinisi.
- Three courses on the existing two islands.
- Best times are kept on the device, separately per course and mode.
- Works with keyboard, touch (one thumb) and gamepad, the same inputs Dua Pulau has now.
- The portfolio home page looks and behaves exactly as it does today after the shared code is pulled out.

## Non-goals (for this version)

- Shared online leaderboard (the likely first follow-up).
- Live multiplayer.
- Sail trimming, heel management or any control beyond steering (and throttle in Easy).
- New islands or new waters.
- Damage, protests or the racing rules of sailing.
- Accounts, sign-in, analytics beyond what the site already has.

## Anti-goals

- The home page getting slower or heavier because of the game. The game's code must not load on the home page.
- A game that needs a tutorial before the first race. Sailing mode may show hints while you play; it must not block play behind instructions.
- A second, drifting copy of the world code.
- Portfolio content inside the game (places to visit, the helmsman chat, Ask Pip, the quest log). One small credit with a link back to the portfolio is wanted; nothing more.

## Constraints

- Repo: `creative-dev-portfolio`. Vite multi-page build (`vite.config.ts` lists `main`, `portfolio`, `admin`, `dua-pulau` inputs), React, three.js, deployed to Cloudflare with `npm run deploy`. The game is one more page input.
- The world lives in `src/dua-pulau/world/`: `engine.ts` (1,303 lines, one `createWorld` function holding scene, sun, sites, boat, input, camera, autopilot and weather), `models.ts`, `terrain.ts`, `audio.ts`, `carving.ts`.
- At the time of writing the working tree has uncommitted changes in `src/dua-pulau/App.tsx`, `world/engine.ts` and `world/models.ts`. These must be kept. Ask Axelle what they are and get them committed (or confirm they stay as they are) before starting the refactor.
- Phones must be playable. The world already lowers pixel ratio on touch devices; three extra boats must not undo that. Rivals may use a lighter pinisi model if the full one costs too much.
- `prefers-reduced-motion` is already honoured by the world and must be honoured by the game.
- Axelle and Claude lead development. No pushing or deploying without Axelle saying so.

## Approaches considered

**A. A new page in this repo that shares the world code (chosen).** The islands, sea, sky, pinisi, boat motion and sound are pulled out of `engine.ts` into shared modules used by both the portfolio world and the game. One deploy, one set of models; a later improvement to the look reaches both. Cost: a careful refactor of `engine.ts` first, with the home page checked afterwards.

**B. A separate repo and site, started from a copy.** Fully independent and could have its own domain. It duplicates about 5,000 lines of world code, and the copies drift apart from day one. Worth it only if the game became a product, which is not the aim.

**C. A race mode inside the existing home page.** Least new code, but the home page gets heavier for every visitor, `engine.ts` grows further, and the game has no address or identity of its own, which is the one thing asked for.

Axelle talked about outcomes and left the how to Claude; A is Claude's pick, put to her before this document was written.

## What Axelle decided

- It is a game in its own right, not a feature of the portfolio page.
- Both sailing models are wanted: arcade (Easy) and simple wind (Sailing).
- Opponents: the clock with your own ghost, and AI boats.
- It is a portfolio piece anyone can play on the web.

Everything below is Claude's proposal unless marked otherwise. Axelle was shown the proposals under "The game" in summary and did not object, but silence is not sign-off: her approval of this document is.

## The game

### Where it lives

- Address: `/race/` on axelle.marea-dvipa.uk (new `race/index.html` page input, source in `src/race/`).
- One link to it from the portfolio (the Work section, and wherever on the home page suits). A small "by Axelle Jamal" credit in the game links back.

### The world in the game

- Same two islands, sea, sky and buildings as Dua Pulau. The buildings are scenery only: nothing to moor at, nothing to open.
- No blue-hour lamp opening. The game opens in daylight, at a fixed time of day chosen for good visibility of marks and wind on the water.
- The beach huts carry portfolio project posters on the home page (`engine.ts` passes `content/work` into `buildHuts`). In the game they do not (Claude's call): the shared island dressing takes hut content as a parameter, and the game's huts show race boards instead (the three course names and the rival boats' names). `content/work` stays out of the game's bundle.
- Pip stays on deck as crew (he is part of the boat), but is not tappable.

### Flow

1. Title screen over the live world: game name, **Race** button, course picker (three courses), mode switch (Easy / Sailing), and best time for the current choice.
2. Countdown with the fleet at the start line.
3. Race.
4. Results: finishing position, time, gap to your best, new-best notice, **Race again**, **Change course**.

Pause is available during a race (Esc, or a button on touch). Restart is one tap from pause.

### Courses

Three, all in existing waters. Exact mark positions are the builder's to place and tune by sailing them.

| Course | Shape | Target time (Easy) |
|---|---|---|
| Sprint | Short out-and-back off the Brighton-side shore | about 40 seconds |
| Island lap | Once round one island | about 1 minute |
| Two islands | Figure-of-eight round both, through the strait | about 2 to 2.5 minutes |

Claude's call: the times follow from the world as it is (islands of radius about 70, top speed 13 units a second). Each course is a single lap at today's boat speed; the boat is not slowed and marks are not pushed far out to sea to pad the time, because the race should stay close to the islands. Short races suit a web piece, and Sailing mode will take longer than Easy on the same course. No lap counting is needed.

- Start and finish are lines between two buoys.
- Each mark is a buoy that must be rounded on a stated side. The next mark is always shown on screen. A mark passed on the wrong side does not count; the pointer stays on it until it is rounded properly.
- Each course has at least one upwind leg under its standard wind, so Sailing mode has tacking in it, but never the first leg.

### Start

- Easy: boats are held on the line; a short countdown (about 5 seconds), then go.
- Sailing: an 8-second countdown with boats free to move. The fleet is placed far enough behind the line that a boat simply holding its course crosses about a second after the gun, so a newcomer starts cleanly without being told how; steering to arrive right on the gun is the skill. A boat over the line at zero must go back and re-cross; its clock runs from zero regardless. (Changed 2026-11-24 after play: the first version, 20 seconds from just behind the line, put every newcomer over early.)

### Boat handling

- **Easy**: today's Dua Pulau handling unchanged (thrust up to full speed in any direction, slow schooner turning, heel in turns).
- **Sailing**: steering only; the sails set themselves and there is no throttle. Speed follows the angle between heading and wind:
  - a no-go zone of roughly 40° either side of the wind, where the boat slows to a crawl;
  - fastest on a beam to broad reach;
  - somewhat slower dead downwind.
  The exact speed curve is the builder's to tune by feel. The slow turning of the pinisi stays, so each tack costs speed and its timing matters.
- Sails should visibly change side when the boat tacks or gybes, if the existing model allows it without heavy rework; otherwise it is left out and noted. The rig in the working copy is two sails fixed at 45° to fill from astern (`models.ts`, around lines 737 to 769), so this depends on whether that rig is final (see Open for Axelle).
- Land and piers push the hull back as now. Hitting them costs speed.
- Boats bump each other: hulls do not pass through one another; a bump pushes them apart and slows both. No rules or penalties.

### Wind (Sailing mode)

- **Today's wind** (default): direction from live Brighton weather (the open-meteo call the lighthouse already makes), with strength clamped to a playable range so a calm or a gale still gives a race. If the weather cannot be fetched, fall back to the standard wind. One adjustment (2026-11-25, after play): when the day's direction would make the start a beat, it is turned by the least amount that puts the start at least 60° off the wind. A fleet cannot line up or get away cleanly from an upwind start in the tight water these lines sit in. Strength, gusts and shifts stay the day's own.
- **Standard wind**: a fixed direction and strength per course, so times can be compared. Each is chosen so the start is off the wind and the upwind legs fall in open sea: Sprint from the east (a run out, a beat home), Island lap from the north-east (the beat is the third leg, north-west of the island), Two islands from the north-west (two beats, one off each island; the crossing past the pier is a reach).
- Gusts: patches of stronger wind that drift across the course and can be seen on the water before they arrive. They are sized and counted to the course so a boat spends roughly a quarter of a race in one.
- Shifts: the direction swings slowly by a modest amount (around ±15°) during a race.
- Gusts and shifts under Standard wind follow the same pattern every race, so a best time is a fair target. Under Today's wind they may vary.
- A wind arrow is always on screen in Sailing mode. In Easy mode wind is not shown.

### Opponents

- **Clock and ghost**: the best run for each course, mode and wind setting is recorded on the device and replayed as a see-through pinisi. The ghost does not collide. It can be switched off.
- **AI boats**: three pinisi, each with a name and hull colour, at three skill levels (one beatable by a newcomer, one a fair match, one hard). Names are the builder's to propose, drawn from Indonesian and Sussex seafaring; Axelle approves them.
  - Each rival sails a different boat (Axelle, 2026-11-24: use the pinisi designs already built). The player has the current pinisi. The rivals have the original pinisi (as in `models.ts` at commit d8495fd), the cruising gaff-rigged pinisi (as at 1fe41aa), and the current pinisi in another hull colour. The recovered designs are game-only code and add nothing to the home page. If a design cannot be brought back cleanly, that rival uses the current design in its own colour. Choosing your own boat stays out of this version.
  - In Easy they follow the course using the island and pier avoidance that the existing autopilot has.
  - In Sailing they obey the same wind as the player and tack upwind sensibly. They need not be clever, but must never get stuck, sail into the no-go zone indefinitely, or run aground.
  - AI skill differs by how well they hold speed and round marks, not by breaking the rules the player sails under.
  - As built (Task 8, 2026-11-24; names and colours awaiting Axelle's approval): Ombak, teal, the original pinisi, pace 0.86, swings 26 wide round a mark; Sussex Maid, terracotta red, the cruising pinisi, 0.93, 18 wide; Bintang Laut, indigo, the current pinisi, 0.98, 13 wide. Both older designs came back cleanly; none fell back. Alone on the Island lap they take about 84, 76 and 71 seconds; a clean full-throttle lap is about 64.
  - Rivals steer round each other (and round the pier and buoy) except within 50 of the mark they are rounding, where they hold their line and the hulls knock. A knock slows both boats once, as they meet; hulls that stay together are only kept apart, so two boats side by side do not stop dead. A boat that has finished is out of the race: it neither knocks nor is steered round.
  - Frame rate: with 4× CPU throttling the scene alone is already near or under 30 frames a second on a phone-sized screen, and the three rivals cost a few more. So rivals leave no wake and cast no shadow, and each one's fixed parts are merged into a few meshes (about 25 per boat instead of 300). The device quality check (Addition 7) is what will bring phones back over 30.

### Best times

- Kept in the browser's local storage, keyed by course, mode and wind setting (Easy; Sailing with Standard wind; Sailing with Today's wind).
- Today's-wind bests are kept with the date and treated as "today's best" only.
- Clearing site data loses them; that is accepted for this version.

### On screen during a race

- Race timer.
- Position in the fleet (1st to 4th).
- Pointer to the next mark, with which side to round it.
- Wind arrow (Sailing).
- A small chart of the course with boats and marks (reuse or adapt `Chart.tsx`).
- Gap to the ghost at each mark.
- Pause button on touch.

### Additions after studying Kartboard (approved by Axelle, 2026-11-24)

Axelle asked for a study of kartboard.makio.io, a browser kart racer, and approved all eight lessons below. They are ideas about structure only; nothing of that game's look, names, text or assets is used.

1. **Defaults at every step.** The title screen opens with the last course, mode and wind setting already chosen (first visit: Island lap, Easy). **Race** starts at once; changing anything is optional.
2. **Pre-race card, no tutorial.** Before the countdown a card shows the course name, mode, wind, your rival and the controls for the device in use. Any key or tap dismisses it; it goes by itself after about 4 seconds.
3. **A named rival.** One AI boat is marked as your rival on the card and in the standings: the easiest one you have not yet beaten on this course and mode; once all three are beaten, the hardest.
4. **Standings and gap.** The HUD lists all four boats in order with name and colour, "You" marked, and shows the gap in seconds to the boat ahead (or behind, when leading).
5. **Pause screen.** Resume, Restart, Photo, Change course, sound on or off, and the controls list for keyboard, touch and gamepad. Photo hides the HUD, frees the camera to circle the boat, and offers Save picture.
6. **Back on course.** A key (R) and a pause-screen button put the boat, stopped, at the last mark it rounded (or behind the start line), pointing on a heading it can sail towards the next mark. The clock keeps running. The game offers it when the boat has made almost no way for 6 seconds.
7. **Device quality check.** On first load the game times its frames on the title screen and picks a quality level (high, medium, low), kept on the device. Low lowers resolution, shadows and effects so phones stay smooth. The home page is not affected.
8. **Cup.** The three courses in order (Sprint, Island lap, Two islands) in one mode and wind setting, with 4, 3, 2, 1 points for 1st to 4th, a table between races and a final result. The best cup result is kept on the device.

Still left out: power-ups, drifting, split screen, choosing a boat or crew.

Notes from the build (2026-11-25):

- The standings list folds away: her place is the handle (click or tap it, or press T). It starts folded on narrow screens.
- A rival boat that sails between the camera and the player's boat is hidden while it is in the way.
- The quality check's result takes effect from the next visit. Rebuilding the world under a player who has just arrived froze the title, laid the islands' ground twice and asked for the weather again, so the first visit runs at the device's usual level.
- The quality check counts a median frame of 20 ms or less as high and 34 ms or less as medium. A browser never draws faster than the screen refreshes, so the first thresholds (12 and 22 ms) could not be met on an ordinary 60 Hz screen.
- The follow camera sits about 100 behind and 40 above the boat, further on tall screens; the first, closer camera hid the course behind the sails.
- The game is lit at a fixed mid-afternoon, which gives the white boats form.
- The seventh beach hut, which stands "To let" on the portfolio, carries a board like the others in the game.

### Sound

Reuse the world's sea and sound setup. Add a start signal, a mark-rounded sound and a finish sound. A mute control as on the home page.

### Devices and access

- Phone portrait and landscape, tablet, desktop.
- Touch: steer by holding where you want to go, as now. Keyboard: arrows or WASD. Gamepad: as now.
- All menus work by keyboard and have visible focus. Rival boats are told apart by name as well as colour.
- Reduced motion: no camera shake or sweeping intro cameras.

## Shared code

`engine.ts` is split so that the game and the portfolio world build on the same pieces: the scene (renderer, sky, water, sun, post-processing), the islands and their dressing, the boat (model, motion, land collision), input, the follow camera, and weather. The portfolio's `createWorld` keeps its present interface, so `App.tsx` on the home page does not change.

How the pieces are cut is the builder's call. The requirements are:

- the home page renders and behaves the same before and after (checked with before and after screenshots at fixed camera positions and times of day, and a sail-to and moor run-through);
- the game's code is not in the home page's bundle, and the portfolio-only code (places, chat, quest log) is not in the game's;
- game rules (speed from wind angle, mark rounding, line crossing, timing, ghost recording, AI course choice) are plain functions separate from rendering, so they can be tested without a browser.

## Order of work

Each step leaves something playable or checkable.

1. Split `engine.ts` into shared pieces; prove the home page is unchanged.
2. `/race/` page with the world, the boat, and one course in Easy mode against the clock.
3. Best times and the ghost.
4. Sailing mode: wind, gusts, shifts, wind arrow.
5. AI boats in Easy, with bumping; then AI in Sailing.
6. The other two courses, title and results screens, sound, phone layout.
7. Link from the portfolio. Deploy when Axelle says so.

## Left to the builder

- Module boundaries in the shared code.
- Mark positions, the speed curve, gust size and timing, AI tuning, countdown lengths: all tuned by playing.
- How gusts are drawn on the water.
- Ghost recording format and sample rate.
- Whether rivals use the full pinisi model or a lighter one.
- The look of the game's screens, within the Dua Pulau visual language (its fonts, colours and tone). A distinct title treatment for the game is welcome.
- Test tooling, if the repo has none for this kind of logic.

## Open for Axelle

- Answered 2026-11-24: the pinisi restyle in the working copy (about 300 uncommitted lines in `models.ts`, plus small changes in `App.tsx` and `engine.ts`) is finished. It still needs committing, with Axelle's say-so, before step 1 so the refactor has a baseline to compare against.
- The game's name.
- The rival boats' names.
