# Creative Dev Portfolio

Portfolio of Axel Jamal, design engineer and AI creative technologist in Brighton.

Live: https://axeljamal.github.io/creative-dev-portfolio/

## Stack

- React 19 + TypeScript, built with Vite
- Tailwind CSS 4
- Motion for animation
- Deployed to GitHub Pages with `gh-pages`

## Design

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
  components/  Nav, Button, Section, GlassFilter
  sections/    Hero, Work, About, Contact
  hooks/       active section and scroll behaviour
  index.css    design tokens and the glass material
```

## Run it

```sh
npm install
npm run dev      # http://localhost:5173/creative-dev-portfolio/
npm run build    # type-check and build to dist/
npm run deploy   # build and publish to GitHub Pages
```
