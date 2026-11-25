# Test fixtures

`rocks.json`: what stands in the water of the race world, as `isles.rocks` has it in the running game: the strait's
buoy, the pier (its run and its head), and the groynes. Each is a capsule from `(ax, az)` to `(bx, bz)` with radius `r`,
rounded to 0.01. The race's course buoys are not obstacles (`world.ts` draws them but adds nothing to `rocks`), so they
are not here.

Produced on 2026-11-24 from the local dev page (`npm run dev`, then `/race/`) by running, in the browser console:

```js
JSON.stringify(__race.rocks().map((k) => Object.fromEntries(Object.entries(k).map(([n, v]) => [n, Math.round(v * 100) / 100]))))
```

Regenerate it whenever `src/dua-pulau/world/isles.ts` changes what stands in the water (the pier, the buoy, the groynes,
or where they are). `water.ts` beside it pairs it with the same capsule distance (`near2`) as `isles.ts`.
