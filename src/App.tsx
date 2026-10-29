import { MotionConfig } from "motion/react";
import { FloatingActions } from "./components/FloatingActions";
import { GlassFilter } from "./components/GlassFilter";
import { MotifField } from "./components/MotifField";
import { Nav } from "./components/Nav";
import { ThemeSwitch } from "./components/ThemeSwitch";
import { Work } from "./sections/Work";
import { About } from "./sections/About";
import { Contact } from "./sections/Contact";
import { profile } from "./content/profile";
import { Welcome } from "./welcome/Welcome";

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
      <MotifField />
      <a
        href="#work"
        className="glass-strong sr-only !fixed top-4 left-4 z-60 rounded-full px-4 py-2 focus:not-sr-only"
      >
        Skip to work
      </a>
      <Nav />
      <FloatingActions />
      <Welcome />
      <main className="mx-auto max-w-6xl px-4 pb-28 sm:px-6 md:pb-0">
        <Work />
        <About />
        <Contact />
      </main>
      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 pt-4 pb-32 text-sm text-ink-2 sm:px-6 md:pb-10">
        <p>
          © {new Date().getFullYear()} {profile.name}. Built with React, Vite and Tailwind CSS.
        </p>
        <p className="w-full max-w-3xl text-xs">
          The welcome comes from Marea Dvīpa. Dua Pulau and Ntina are original designs inspired by the Bomba flower
          of the Kaili people and the taiganja of the Kaili and Kulawi peoples of Central Sulawesi, and by Balinese
          ornament. The score is an original piece for a synthesized ensemble inspired by kakula; no traditional
          piece is quoted.
        </p>
        <ThemeSwitch />
      </footer>
    </MotionConfig>
  );
}
