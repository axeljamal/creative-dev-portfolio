import { MotionConfig } from "motion/react";
import { GlassFilter } from "./components/GlassFilter";
import { Nav } from "./components/Nav";
import { ThemeSwitch } from "./components/ThemeSwitch";
import { Hero } from "./sections/Hero";
import { Work } from "./sections/Work";
import { About } from "./sections/About";
import { Contact } from "./sections/Contact";
import { profile } from "./content/profile";

export default function App() {
  return (
    // follow the visitor's "reduce motion" setting for every animation
    <MotionConfig reducedMotion="user">
      <GlassFilter />
      <div className="aurora" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <a
        href="#work"
        className="glass-strong sr-only z-60 rounded-full px-4 py-2 focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Skip to work
      </a>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 pb-28 sm:px-6 md:pb-0">
        <Hero />
        <Work />
        <About />
        <Contact />
      </main>
      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 pt-4 pb-32 text-sm text-ink-2 sm:px-6 md:pb-10">
        <p>
          © {new Date().getFullYear()} {profile.name}. Built with React, Vite and Tailwind CSS.
        </p>
        <ThemeSwitch />
      </footer>
    </MotionConfig>
  );
}
