# design-sync notes

- **Shape:** package. The DS entry is `src/ds/index.ts`, built by `npm run build:ds` (Vite lib mode → `dist-ds/`, plus `tsc -p tsconfig.ds.json` for the types). React, motion and react-icons stay external in the lib build; the converter inlines them into `_ds_bundle.js`.
- **CSS:** `dist-ds/styles.css` is the whole site stylesheet (Tailwind v4 plus `design/tokens.css` and `design/glass.css`). Tailwind scans `.design-sync/previews/` because it isn't gitignored, so utility classes used only in previews still ship.
- **Utility safelist:** Claude Design's agent writes its own Tailwind classes, but Tailwind only generates classes the site uses. Designs came out with square nav links and broken fields until `src/ds/styles.css` added a standard set via `@source inline(...)`, on 2026-10-28. That brought the DS CSS to about 229 KB, while the site's own CSS stays about 30 KB. When the agent reaches for a class that's missing, add it there; don't change `src/index.css`.
- **Fonts:** Marea Dvīpa's type: Cormorant Garamond (display), Karla (text) and IBM Plex Mono (eyebrows), loaded from Google Fonts in `index.html` and mapped through `--type-display`, `--type-body` and `--type-mono` in `design/tokens.css`. This replaced the system font stack on 2026-10-28 with the Marea Dvīpa retheme.
- **Playwright:** no bundled browser. Run validate and capture with `DS_CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`.
- **Animated components:** `Section` and `Reveal` start at opacity 0 and fade in via motion `whileInView`. The capture doesn't wait for animations, so their previews wrap content in a `Settled` helper (`.ds-settled [style*="opacity"] { opacity:1 !important; transform:none !important }`) to show the settled state.
- **Glass previews** sit on an inline radial-gradient backdrop built from the token colours; on a flat canvas the glass is barely visible.
- **GlassFilter preview** adds `refract` to `<html>` in a `useEffect`, as `src/main.tsx` does, so the lens shows in Chromium.

## Known render warns

- None. A `[FONT_MISSING]` warning means Claude Design can't reach a font file; check the Google Fonts link.

## Re-sync risks

- Adding a component to the site doesn't add it to the DS. It must also be exported from `src/ds/index.ts`, then run `npm run build:ds`.
- If `Section`/`Reveal` stop using an inline `opacity` style, the `Settled` selector in their previews stops matching. Re-check those cards.
