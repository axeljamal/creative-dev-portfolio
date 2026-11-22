import cv from "../assets/cv.pdf";

export const profile = {
  name: "Axel Jamal",
  title: "Founder & Design Engineer, Marea Dvīpa",
  location: "Brighton & Hove, UK",
  intro:
    "I design in Claude Design and Figma and build in React Web+Native, Vue and TypeScript, using Claude Code to take a product from idea to a pilot-ready app: research, prototype, design system, front end, backend and tests.",
  bio: [
    "I'm a design engineer in Brighton & Hove and the founder of Windfall at Marea Dvīpa. I design in Claude Design and Figma and build in React, React Native, Vue and TypeScript, and I use Claude Code to take a product all the way from an idea to an app ready for a pilot, guided by specs, tests, Apple's Human Interface Guidelines and WCAG 2.2 AA.",
    "Two current projects show the whole arc. Windfall turns surplus food into small hosted suppers for Brighton and Hove: it began with a problem-solving session and a clickable prototype, became a React Native app with Expo Router and Zustand, gained a Supabase backend whose safety rules are tested as every kind of user, and is now live on the web and piloting in Brighton & Hove with Brighton & Hove Food Partnership, with a demo on sample data and a story page that tells how it was made. Marea Dvīpa brings my original batik motifs, generative pattern design and original music into one installable studio: a pattern engine, a Media Lab with synthesized gamelan scores, a living mark, dark and light mode, offline, and on Cloudflare.",
    "Across both, the method is the same: a spec first, a design system, the front end and the backend built together, tests and CI before every deploy, and Claude Code as the pair that keeps the pace. I built Windfall during an AI-assisted design engineering apprenticeship at TechNative Digital, and the film of how it was designed played at the Winter Showcase in November 2026. The welcome film at the top of this page is Marea Dvīpa’s own, and each Work card runs the real app.",
    "Before tech, I spent six years in hospitality, marketing and PR. I raised a venue's online reputation score by 60%, grew its event-night sales by 40% with a live music programme, and helped a restaurant keep 90% of its revenue by moving it onto delivery in 2020. It taught me to design for the whole customer journey, not just the screen. I work in English, Indonesian and Malay.",
  ],
  /** where things stand now, kept in step with the LinkedIn profile (last checked 22 November 2026); shown at the gate in Dua Pulau */
  latest: {
    role: "Founder & Design Engineer, Marea Dvīpa",
    place: "Brighton & Hove",
    now: [
      { label: "Now", text: "Founder of Windfall at Marea Dvīpa. Windfall turns surplus food into small hosted suppers for three to eight neighbours. It is live on the web and piloting in Brighton & Hove with Brighton & Hove Food Partnership." },
      { label: "Training", text: "AI-assisted design engineering apprenticeship at TechNative Digital since September 2026, with a certificate in AI-assisted software development. The film of how Windfall was designed played at its Winter Showcase on 19 November 2026." },
      { label: "Newest work", text: "This world, Dua Pulau, and The Bale, the Media Lab as a room where the ensemble plays each reel's score." },
      { label: "How I work", text: "A spec first, a design system, tests and CI before every deploy, and accessibility throughout: screen reader labels, reduced motion and WCAG 2.2 AA." },
    ],
  },
  email: "hello@marea-dvipa.uk",
  cv,
  links: {
    github: "https://github.com/axeljamal",
    linkedin: "https://www.linkedin.com/in/axel-jamal-dev24/",
    instagram: "https://www.instagram.com/la.bel.axelle",
  },
};
