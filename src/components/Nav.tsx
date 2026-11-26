import { motion } from "motion/react";
import { LuFileText, LuHouse, LuLayers, LuMail, LuUser } from "react-icons/lu";
import { profile } from "../content/profile";
import { useActiveSection } from "../hooks/useActiveSection";
import { Medallion } from "./Medallion";

export const sections = [
  { id: "home", label: "Home", icon: LuHouse },
  { id: "work", label: "Work", icon: LuLayers },
  { id: "about", label: "About", icon: LuUser },
  { id: "contact", label: "Contact", icon: LuMail },
];

const sectionIds = sections.map((s) => s.id);
const spring = { type: "spring", stiffness: 420, damping: 34 } as const;

export function Nav() {
  const active = useActiveSection(sectionIds);

  // a full-width bar, always open, on every screen and over the welcome film: your name on the left, the sections in
  // the middle, the CV on the right
  return (
    <header className="site-bar fixed inset-x-0 top-0 z-50">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:h-[72px] sm:px-6">
        <a href="#home" className="flex shrink-0 items-center gap-2 rounded-full py-1 pr-2">
          <Medallion />
          <span className="hidden text-[15px] font-semibold tracking-tight sm:inline">{profile.name}</span>
        </a>
        <div className="flex items-center gap-0.5 sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:gap-2">
          {sections.slice(1).map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={active === id ? "true" : undefined}
              className="relative rounded-full px-2.5 py-2 text-[15px] font-medium text-ink-2 transition-colors hover:text-ink aria-[current]:text-ink sm:px-4"
            >
              {active === id && (
                <motion.span layoutId="nav-lens" transition={spring} className="absolute inset-x-2.5 bottom-0.5 h-0.5 rounded-full bg-accent-solid sm:inset-x-4" />
              )}
              {label}
            </a>
          ))}
        </div>
        <a
          href={profile.cv}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent-solid px-3.5 py-2 text-[15px] font-semibold text-on-accent transition active:scale-[0.96] sm:px-5"
        >
          <LuFileText aria-hidden="true" />
          CV
        </a>
      </nav>
    </header>
  );
}
