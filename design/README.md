# Design system

The portfolio's design system, kept in the repo and synced with a Claude
Design project.

| File | What it is |
| --- | --- |
| `tokens.css` | Colours, light and dark, and the system font stack. **The site imports this file**, so a change here changes the site. |
| `glass.css` | The Liquid Glass material (clear, regular, strong), the lens bubble, inset fields, accessibility fallbacks and the aurora backdrop. Also imported by the site. |
| `preview.css` | Layout for the preview pages and plain-CSS versions of the components. |
| `foundations/` | Colours, typography, spacing and radius, materials. |
| `components/` | Buttons, chips, navigation, cards, contact form, inbox. |
| `index.html` | A gallery linking every preview. |

The site's React components (`src/`) build the same components with Tailwind.
When you change one, update its preview here too.

## View it

With `npm run dev` running, open <http://127.0.0.1:5173/design/>.

## Sync with Claude Design

Each preview page starts with a `<!-- @dsCard group="…" -->` comment. That
comment makes it a card, in that group, in the Claude Design project.

1. Run `/design-sync` in Claude Code and pick (or create) your design-system
   project.
2. Claude shows the exact files it will write or delete. Nothing is uploaded
   until you approve that list.
3. Changes go one component at a time; the project is never replaced
   wholesale. Changes made in Claude Design come back the same way, after you
   approve them.

Standalone Claude Design (claude.ai/design) closes on 14 December 2026, as it
moves into Claude.
