import { useSyncExternalStore } from "react";

// Appearance: follow the system, or a Light/Dark choice saved on this device.
// The choice is applied as data-theme on <html>, which design/tokens.css reads.
// index.html applies a saved choice before first paint so there's no flash.

export type ThemePreference = "system" | "light" | "dark";
export type Theme = "light" | "dark";

const KEY = "theme";
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set<() => void>();

function read(): ThemePreference {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

let preference = read();

function apply() {
  const root = document.documentElement;
  if (preference === "system") delete root.dataset.theme;
  else root.dataset.theme = preference;

  // browser chrome colour: each theme-color meta is tagged with its scheme
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const scheme = meta.dataset.scheme;
    meta.media =
      preference === "system"
        ? `(prefers-color-scheme: ${scheme})`
        : scheme === preference
          ? "all"
          : "not all";
  }
}

const notify = () => listeners.forEach((listener) => listener());

export function setThemePreference(next: ThemePreference) {
  preference = next;
  try {
    if (next === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
  } catch {
    // private mode: the choice lasts for this page only
  }
  apply();
  notify();
}

// keep other open tabs (the site and the inbox) in step
window.addEventListener("storage", (event) => {
  if (event.key !== KEY && event.key !== null) return;
  preference = read();
  apply();
  notify();
});
darkQuery.addEventListener("change", notify);
apply();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const snapshot = () => `${preference}:${preference === "system" ? (darkQuery.matches ? "dark" : "light") : preference}`;

/** The saved preference and the theme actually showing. */
export function useTheme() {
  const [pref, resolved] = useSyncExternalStore(subscribe, snapshot).split(":") as [ThemePreference, Theme];
  return { preference: pref, theme: resolved };
}
