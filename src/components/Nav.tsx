import { motion } from "motion/react";
import { LuFileText, LuHouse, LuLayers, LuMail, LuUser } from "react-icons/lu";
import { profile } from "../content/profile";
import { useActiveSection } from "../hooks/useActiveSection";
import { useCompactOnScroll } from "../hooks/useCompactOnScroll";
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
  const compact = useCompactOnScroll();
  // the welcome film has its own controls, so the nav steps aside until you scroll past it
  const away = active === "home" ? "pointer-events-none -translate-y-4 opacity-0" : "";

  return (
    <>
      {/* web: floating pill at the top */}
      <header
        className={`fixed inset-x-0 top-4 z-50 hidden justify-center px-4 transition duration-500 md:flex ${away}`}
        inert={active === "home"}
      >
        <nav
          aria-label="Main"
          className="glass glass-lens flex items-center gap-1 rounded-full py-1.5 pr-1.5 pl-1.5"
        >
          <Medallion />
          <a
            href="#home"
            className="relative z-2 mr-2 flex items-center rounded-full py-2 pr-3 pl-1.5"
          >
            <span className="text-[15px] font-semibold tracking-tight">{profile.name}</span>
          </a>
          {sections.slice(1).map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={active === id ? "true" : undefined}
              className="relative z-2 rounded-full px-4 py-2 text-[15px] font-medium text-ink-2 transition-colors hover:text-ink aria-[current]:text-ink"
            >
              {active === id && (
                <motion.span
                  layoutId="nav-lens"
                  transition={spring}
                  className="lens-bubble absolute inset-0 -z-1 rounded-full"
                />
              )}
              {label}
            </a>
          ))}
          <a
            href={profile.cv}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-2 ml-1 inline-flex items-center gap-1.5 rounded-full bg-accent-solid px-4 py-2 text-[15px] font-semibold text-on-accent transition active:scale-[0.96]"
          >
            <LuFileText aria-hidden="true" />
            CV
          </a>
        </nav>
      </header>

      {/* mobile: iOS-style tab bar that shrinks while you scroll down */}
      <nav
        aria-label="Main"
        className={`fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),12px)] transition duration-500 md:hidden ${away.replace("-translate-y-4", "translate-y-4")}`}
        inert={active === "home"}
      >
        <motion.ul
          layout
          transition={spring}
          className="glass glass-lens flex items-stretch rounded-full p-1"
        >
          {sections.map(({ id, label, icon: Icon }) => (
            <li key={id} className="relative z-2">
              <a
                href={`#${id}`}
                aria-label={label}
                aria-current={active === id ? "true" : undefined}
                className={`relative flex flex-col items-center justify-center rounded-full text-ink-2 transition-[padding,color] duration-300 aria-[current]:text-accent-solid ${
                  compact ? "h-11 px-4" : "h-14 px-5"
                }`}
              >
                {active === id && (
                  <motion.span
                    layoutId="tab-lens"
                    transition={spring}
                    className="lens-bubble absolute inset-0 -z-1 rounded-full"
                  />
                )}
                <Icon aria-hidden="true" className="size-[22px]" />
                {!compact && (
                  <span className="mt-0.5 text-[10px] font-semibold tracking-tight">{label}</span>
                )}
              </a>
            </li>
          ))}
        </motion.ul>
      </nav>
    </>
  );
}
