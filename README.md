# Creative Dev Portfolio

Portfolio of Axel Jamal, design engineer and AI creative technologist in Brighton.

**Live:** https://axelle.marea-dvipa.uk

Runs on Cloudflare Workers: the site, a contact API and a private inbox at `/admin`.

## Stack

- React 19 + TypeScript, built with Vite
- Tailwind CSS 4
- Motion for animation
- Cloudflare Workers (API + static assets), D1 (SQLite) for messages,
  Turnstile against spam, Access to protect the inbox

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

The interface uses a Liquid Glass material inspired by Apple's design language:
translucent surfaces that blur and saturate what's behind them, specular rims,
and, in Chromium browsers, edge refraction from an SVG displacement filter.

It adapts for accessibility: glass turns solid with **Reduce transparency** or
**Increase contrast**, animation stops with **Reduce motion**, and it follows
the system light or dark mode. On phones, navigation is an iOS-style tab bar
that shrinks while you scroll.

## Structure

```
src/
  content/     profile, case studies, earlier work and skills (edit these to update the site)
  welcome/     the welcome film: timeline, stage, Bomba Rose and Web Audio sound
  components/  Nav, Button, Chip, GlassPanel, Section, GlassFilter, MotifField, FloatingActions
  sections/    Work, About, Contact
  hooks/       active section and scroll behaviour
  admin/       the /admin inbox
  index.css    design tokens and the glass material
admin/index.html   inbox page entry
worker/      Worker: POST /api/contact, /api/admin/messages (list, update, delete)
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
```

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
