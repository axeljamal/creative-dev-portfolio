# design-sync notes

- **Shape:** package. The DS entry is `src/ds/index.ts`, built by `npm run build:ds` (Vite lib mode → `dist-ds/`, plus `tsc -p tsconfig.ds.json` for the types). React, motion and react-icons stay external in the lib build; the converter inlines them into `_ds_bundle.js`.
- **CSS:** `dist-ds/styles.css` is the whole site stylesheet (Tailwind v4 plus `design/tokens.css` and `design/glass.css`). Tailwind scans `.design-sync/previews/` because it isn't gitignored, so utility classes used only in previews still ship.
- **Fonts:** the system stack is intentional (SF Pro → Inter → system-ui). The user chose to keep system fonts on 2026-10-28, and no web font ships.
- **Playwright:** no bundled browser. Run validate and capture with `DS_CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`.
- **Animated components:** `Section` and `Reveal` start at opacity 0 and fade in via motion `whileInView`. The capture doesn't wait for animations, so their previews wrap content in a `Settled` helper (`.ds-settled [style*="opacity"] { opacity:1 !important; transform:none !important }`) to show the settled state.
- **Glass previews** sit on an inline radial-gradient backdrop built from the token colours; on a flat canvas the glass is barely visible.
- **GlassFilter preview** adds `refract` to `<html>` in a `useEffect`, as `src/main.tsx` does, so the lens shows in Chromium.

## Known render warns

- `[FONT_MISSING] "SF Pro Text", "SF Pro Display", "Inter"`: accepted (system font stack; see Fonts above).

## Re-sync risks

- Adding a component to the site doesn't add it to the DS. It must also be exported from `src/ds/index.ts`, then run `npm run build:ds`.
- If `Section`/`Reveal` stop using an inline `opacity` style, the `Settled` selector in their previews stops matching. Re-check those cards.
