# Creative Dev Portfolio

Portfolio of Axel Jamal, design engineer in Brighton & Hove and founder of Windfall at Marea Dvīpa.

**Live:** https://axelle.marea-dvipa.uk

The home page is Dua Pulau, the portfolio as a 3D world you sail. The classic portfolio is at `/portfolio/`; `/dua-pulau/` and old section links such as `/#contact` forward to the right place.

Alongside it, the same islands in bricks: Dua Pulau in bricks at `/bricks/`, a
sailing race round them (the Regatta, `/race/` and `/bricks/race/`), a brick
boat builder (Pinisi Yard, `/yard/`) and a players' community (The Crew,
`/crew/`).

Runs on Cloudflare Workers: the site, a contact API and a private inbox at `/admin`.

## Stack

- React 19 + TypeScript, built with Vite
- Tailwind CSS 4
- Motion for animation
- Three.js (WebGL) for the tide behind the page and the 3D pieces, loaded on demand
- Cloudflare Workers (API + static assets), D1 (SQLite) for messages and The
  Crew, Turnstile against spam, Access to protect the inbox, Workers AI for
  Ask Pip
- LEGO.js (`@polight/lego`) web components for The Crew
- Python 3 for the brick tooling: `scripts/pack_ldraw.py` packs the LDraw parts
  Pinisi Yard builds with
- Vitest for the tests (`npm test`)

## Design

The page opens on a welcome film from Marea Dvīpa (`src/welcome/`): a
full-screen 3D stage of batik motifs that land one by one at the golden angle,
orbit Marea Dvīpa's Pattern Studio and Media Lab, then settle into a repeat,
scored for synthesized kakula, gongs and drum at 138 bpm. In the Work chapter
the Bomba Rose grows its petal rings to Bunga Kaili, an original song, and you
can play it. It starts silent; **Play with sound** (or a
tap on any motif) turns the sound on. Move the pointer or tilt the phone to look
around the scene, drag to turn it further, and tap a motif to ring it. Space
plays and pauses, ← → jump chapters, F goes full screen and H hides the
controls. The rest of the site uses the Marea Dvīpa palette (pearl, Bomba
black, temple gold, teal) and type (Cormorant Garamond, Karla, IBM Plex Mono).

Below the film, the motifs keep floating in a 3D field behind the page
(`MotifField`). They drift, tilt with the pointer and move at their own depth
as you scroll. Tap one where nothing else is and a random event rings out, each
with its own sound: the motif changes colour, turns into another motif or
floats away, or the colours behind the page shift. Floating **Collaborate** and
**Contact** buttons lead to the message form; Collaborate starts the message
for you.

Behind the motifs runs Marea, the tide (`src/three/Tide.tsx`): a WebGL sea of
gold points that swells on its own, rises under the pointer, sends a ring out
from every tap and rolls toward you as you scroll. The 3D product demo's card
holds a small Three.js studio (`src/three/ModelStage.tsx`): the Barong and the
Perahu motifs, lifted from the flat drawings into meshes with Higgsfield
image-to-3D (`public/models/`). Drag a piece to turn it, throw it, change its
finish; the key light follows the pointer. Section titles turn up word by word,
cards rise in from a tilt, and the earlier-work cards and the portrait lean
toward the pointer with a light that follows it (`Tilt`). Three.js is its own
chunk and loads after first paint; none of this moves with **Reduce motion**.

The interface uses a Liquid Glass material inspired by Apple's design language:
translucent surfaces that blur and saturate what's behind them, specular rims,
and, in Chromium browsers, edge refraction from an SVG displacement filter.

It adapts for accessibility: glass turns solid with **Reduce transparency** or
**Increase contrast**, animation stops with **Reduce motion**, and it follows
the system light or dark mode. On phones, navigation is an iOS-style tab bar
that shrinks while you scroll.

## The brick side

Everything brick-built is plain studs and brick shapes; no toy maker's names,
logos or figures are used, and the pages say they are not affiliated with any.

- **Dua Pulau in bricks** (`/bricks/`): the same world and the same `App`, with
  the page telling it which (`brick` option on the stage, the islands and the
  world). The land is stacked bricks read off the island heightmap on a 2 m
  stud grid, the sea is studded clear-blue plate, the palms and trees are
  brick-built, and every model gets a toy-plastic finish (`src/dua-pulau/world/brick.ts`).
- **Change the ship**: from the Ship menu in either world, sail today's pinisi,
  the two before it, or a boat of your own from Pinisi Yard. She changes where
  she is, and Pip and the lamp come too.
- **The Regatta** (`/race/`, `/bricks/race/`): three courses round the islands
  against three rival pinisi, in Easy (point and go) or Sailing (the wind's
  speed at your heading, with shifts and gusts), plus a cup over all three,
  ghosts of your best and today's wind. In bricks you race the boat you built.
- **Pinisi Yard** (`/yard/`): build a pinisi from hull, rig, masts, cabin,
  paint, stripe, sailcloth, batik motif and name, then launch her. Her speed,
  stability and charm come from the parts (`src/yard/design.ts`); a top-heavy
  boat rolls over at her launch. At sea those stats set how she handles: her
  pace against the pinisi (86% to 108%), how sharply she turns and how far she
  heels, and a tender boat heeled hard loses way. The hull is built from real
  LDraw brick shapes, instanced, with simple shapes as the fallback.
- **The Crew** (`/crew/`): a players' community built with LEGO.js: join,
  quests, a team board and play links, on D1 (`worker/crew.ts`, `migrations/0003_crew.sql`).

### LDraw parts (Python)

Pinisi Yard's bricks, plates, tiles and round bricks come from the
[LDraw Parts Library](https://library.ldraw.org), © LDraw.org contributors,
licensed [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). The library
is about 100 MB, so `scripts/pack_ldraw.py` (Python 3.8+, standard library only)
follows each of the 13 parts the yard uses through every sub-file and primitive
it references and writes one self-contained `.mpd` per part to
`public/ldraw/` (113 KB in all), with names as three.js's `LDrawLoader` looks
them up. It refuses logo-on-stud primitives, so every stud is plain.

```sh
# once: download the complete parts library from https://library.ldraw.org and unzip it
LDRAW_DIR=~/Apps/ldraw/ldraw npm run yard:parts   # runs python3 scripts/pack_ldraw.py
```

The packed files are committed, so you only need this to change the parts.

## Structure

```
src/
  content/     profile, case studies, earlier work and skills (edit these to update the site)
  welcome/     the welcome film: timeline, stage, Bomba Rose and Web Audio sound
  components/  Nav, Button, Chip, GlassPanel, Section, GlassFilter, MotifField, FloatingActions, Tilt
  three/       WebGL: the tide backdrop and the 3D model stage
  sections/    Work, About, Contact
  hooks/       active section and scroll behaviour
  admin/       the /admin inbox
  dua-pulau/   the sailed world: the page, the Log, Ask Pip, the ship chooser; world/ for the 3D engine,
               the hull physics and the brick world
  race/        the Regatta: screens, session, rules/ (course, wind, rivals, cup, all tested)
  yard/        Pinisi Yard: the design and its stats, the brick boat, the LDraw parts
  crew/        The Crew: LEGO.js bricks (bricks/ compiled into built/ by `npm run crew:bricks`)
  index.css    design tokens and the glass material
admin/index.html   inbox page entry; portfolio/, dua-pulau/, bricks/, race/, yard/ and crew/ hold the other pages' entries
scripts/     pack_ldraw.py, the LDraw parts packer (Python)
public/ldraw/  the packed LDraw parts and their licence
worker/      Worker: POST /api/contact, /api/admin/messages, Ask Pip, The Crew's API
migrations/  D1 schema
```

## Backend

- **POST /api/contact** validates the form, checks the Turnstile token and a
  honeypot field, stores the message in D1 and, if configured, emails an alert
  through Resend.
- **/api/admin/\*** lists, updates (new / read / archived) and deletes messages.
  Cloudflare Access guards it, and the Worker also verifies the Access JWT, so
  it stays locked even if the Access app is removed.

## Run it

```sh
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev      # http://localhost:5173, inbox at /admin/
npm test         # the rules, the hull, the yard's stats and more
```

Python is only needed to repack the LDraw parts (see above).

Locally, Turnstile uses Cloudflare's always-pass test keys, and `/admin` opens
without Access (`ADMIN_DEV_BYPASS` in `.dev.vars`, honoured on localhost only).

## Deploy to Cloudflare (first time)

1. `npx wrangler login`
2. `npx wrangler d1 create creative-dev-portfolio`, then paste the printed
   `database_id` into `wrangler.jsonc`.
3. `npm run db:migrate` to create the table in the live database.
4. **Turnstile:** in the Cloudflare dashboard, add a Turnstile widget for your
   Worker's hostname. Put the site key in `.env.production` and run
   `npx wrangler secret put TURNSTILE_SECRET_KEY` with the secret key.
5. `npm run deploy`
6. **Access:** in Zero Trust, add a self-hosted application for your Worker's
   hostname with the paths `/admin` and `/api/admin`, and a policy that allows
   only your email. Copy its AUD tag and your team domain into `ACCESS_AUD` and
   `ACCESS_TEAM_DOMAIN` in `wrangler.jsonc`, then `npm run deploy` again.
7. **Email alerts (optional):** set `NOTIFY_EMAIL` in `wrangler.jsonc` and run
   `npx wrangler secret put RESEND_API_KEY`.
