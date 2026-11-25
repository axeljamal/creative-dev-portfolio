# Baseline ("before") for the race refactor

Captured 2026-11-24 on branch `race-game` (from 374354e plus the vitest setup), dev server `npm run dev` on http://localhost:5173/, Playwright Chromium at 1440x900, screenshots at css scale. Four PNGs sit beside this file. Later tasks rerun the same steps and compare.

## Setup (once per page load)

1. Resize to 1440x900 and open `http://localhost:5173/`.
2. Mark the welcome as seen so Pip's talk and the Log panel do not cover the picture, then reload:
   `localStorage.setItem("dua-pulau-welcomed","1"); location.reload();`
3. Wait until `window.__dp` exists and the "Light the lamp" button is enabled, click it, then wait 5 s. (Calling `__dp.skip()` straight away, with no settle time, left the screen at sunset with the HUD fading in; after 5 s it is stable.)

## Shot snippet (run in the page console, then take the screenshot)

Replace F, X, Z, YAW, POS and LOOK from the table. It closes the Log if it is open, and waits 5 s for the time-of-day fade and the HUD.

```js
async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  __dp.skip(); __dp.tod(F);
  Object.assign(__dp.st, { x: X, z: Z, yaw: YAW, v: 0, roll: 0 });
  __dp.api.filmCam({ pos: POS, look: LOOK });
  document.querySelector('.dp-logbtn[aria-expanded="true"]')?.click();
  await w(5000);
}
```

| file | F | x, z, yaw | pos | look | dayPart label |
|---|---|---|---|---|---|
| strait-noon.jpg | 0.5 | 0, 60, 1.57 | [0,30,140] | [0,4,40] | Midday |
| md-gate-morning.jpg | 0.2 | -40, 20, 3.14 | [-20,14,40] | [-70,6,12] | Morning |
| wf-huts-golden.jpg | 0.8 | 150, 100, 0 | [170,12,110] | [128,4,56] | Afternoon |
| open-sea-noon.jpg | 0.5 | 0, 300, 1.57 | [0,120,420] | [0,0,0] | Midday |
| md-gate-wide.jpg | 0.2 | -40, 60, 3.14 | [20,40,150] | [-110,6,0] | Morning |
| wf-huts-wide.jpg | 0.8 | 150, 130, 0 | [250,40,190] | [125,6,20] | Afternoon |

The two wide shots were added at 79feac4 (before Task 1 edited any source), because md-gate-morning and wf-huts-golden are mostly sail. They were taken in their own page load, after the setup above, in the order listed; both HUDs read "1 / 10 found".

Exact calls used: `__dp.tod(0.5)` / `0.2` / `0.8` / `0.5`; screenshot taken immediately after the 5 s wait. Shots run back to back in one page load, in the table order. Notes on the pictures: md-gate-morning and wf-huts-golden are close to the hull (the camera is about 20 units from the boat), so the hull and a sail fill the frame; that is what the specified camera gives. The "Moor at ..." pill shows in the HUD when she is near a site. The first shot HUD says "1 / 10 found", later ones 2, 3 (the found count rises as she passes sites; it is not reset by the snippet).

## Behaviour observations (before the refactor)

1. Sail to the pavilion from the chart and moor. Start `x:0, z:60, yaw:1.57, v:0` after `__dp.skip(); __dp.tod(0.5); __dp.api.filmCam(null)`, click the Log button (`.dp-logbtn`), click the "See the Pattern Studio" entry (`#dp-log button`). Autopilot ran: after 1 s (0, 56) v 5.8; 5 s (-7, 23) v 10.1; 9 s (-35, -19) v 12.7; 13 s (-66, -62) v 11.6; 17 s (-82, -83) v 0.0 and the mooring panel ("Marea Dvipa", Cast off / Look around / Sail on) opened. Yes: she made a smooth curve to the island, slowed and stopped, and the pavilion filled the view. Total about 17 s. Screenshot kept untracked in `.superpowers/sdd/2026-11-24-sailing-race/moored-pavilion.jpg`.
2. Bump the pier at speed. Start `x:-20, z:-16, yaw:0, v:12`, hold ArrowUp (Playwright `keyboard.down('ArrowUp')`), sample every 0.5 s. She ran straight east at 12.9 m/s to x 52.4, hit at x about 54.5, speed dropped 12.9 to 2.6 to about 1.3, and she stayed there (54.4, -16.8) for the remaining 4 s with the key still held. She does not slide off or turn along the pier; z moved by only 0.8. The speed settles at about 1.3 (not 0), so she keeps nudging.
3. Home page JS (from `npm run build`; `dist/client/index.html` loads these): `main-CYRpUC17.js` 24.97 kB (gzip 8.84), `jsx-runtime-BSV_q0XG.js` 219.95 kB (68.78), `preload-helper-DLkCJaR_.js` 13.03 kB (5.30); CSS `main-C_Jtj8wE.css` 15.80 kB (4.00), `jsx-runtime-DnTcjFo4.css` 45.53 kB (9.53). Loaded lazily when the world starts: `engine-GfuEaMF0.js` 181.75 kB (61.35), `three.module-RDuJKsY5.js` 568.41 kB (143.72), `GLTFLoader-DowKZCk5.js` 49.36 kB (14.25), `sound-C2E7lINA.js` 4.71 kB (1.96); `ModelStage-DXRaS-UH.js` 9.51 kB (4.20) lazily for the 3D plinth panel. Hashes will change when code changes; compare sizes and the set of names.
