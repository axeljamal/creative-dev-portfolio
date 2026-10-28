import { motion } from "motion/react";
import type { IconType } from "react-icons";
import { LuMonitor, LuMoon, LuSun } from "react-icons/lu";
import { setThemePreference, useTheme, type ThemePreference } from "../theme";

const options: { value: ThemePreference; label: string; icon: IconType }[] = [
  { value: "system", label: "System", icon: LuMonitor },
  { value: "light", label: "Light", icon: LuSun },
  { value: "dark", label: "Dark", icon: LuMoon },
];

/** System / Light / Dark segmented control, built on native radios. */
export function ThemeSwitch({ className = "" }: { className?: string }) {
  const { preference } = useTheme();

  return (
    <div role="radiogroup" aria-label="Appearance" className={`glass-clear inline-flex rounded-full p-1 ${className}`}>
      {options.map(({ value, label, icon: Icon }) => (
        <label
          key={value}
          className="relative z-2 flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold text-ink-2 transition-colors has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
        >
          <input
            type="radio"
            name="theme"
            value={value}
            checked={preference === value}
            onChange={() => setThemePreference(value)}
            className="sr-only"
          />
          {preference === value && (
            <motion.span
              layoutId="theme-bubble"
              transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
              className="lens-bubble absolute inset-0 -z-1 rounded-full"
            />
          )}
          <Icon aria-hidden="true" className="size-4" />
          {label}
        </label>
      ))}
    </div>
  );
}
