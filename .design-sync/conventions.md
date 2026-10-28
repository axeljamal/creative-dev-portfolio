## Conventions

- **Load once at the app root:** render `<GlassFilter />` once, and add the `refract` class to `<html>` when `supportsRefraction()` returns true. Without it, `lens` surfaces fall back to frosted glass, which is fine everywhere else.
- **Glass needs a backdrop.** `GlassPanel`, glass `Button`s and glass `Chip`s are translucent. Put them over imagery, the aurora, or a warm gradient built from `var(--sun)`, `var(--accent)`, `var(--leaf)` and `var(--canvas)`. On flat white they look like plain pills.
- **Pick the material by content:** `clear` for controls over imagery, `regular` for bars and tiles, `strong` for text-heavy cards. Give each panel its shape with Tailwind classes, e.g. `className="rounded-[2rem] p-6"`.
- **Buttons are links.** `Button` renders an `<a>` and needs an `href`; use `external` for new-tab links. Use `variant="primary"` for the single main action and glass for the rest. An icon-only button needs an `aria-label`.
- **Chips:** `tint` (the default) is for tool tags on case studies; `glass` with `size="md"` is for skills and locations. Use `as="li"` inside a `<ul>`.
- **Page structure:** wrap each page section in `Section` (eyebrow + title), and wrap blocks in `Reveal` to fade them up on scroll. Both start at opacity 0 and animate in when visible.
- **Colour and type:** use the token utilities (`text-ink`, `text-ink-2`, `text-accent-solid`, `bg-canvas`, `bg-accent-solid`, `text-on-accent`). The font is the system stack (SF Pro on Apple devices); don't load a web font.
- Light and dark mode come from `prefers-color-scheme`. Every token has a dark value, so never hard-code colours.
