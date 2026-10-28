import { useEffect, useRef } from "react";
import { useTheme } from "../theme";

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
let scriptLoad: Promise<void> | undefined;

function loadScript() {
  scriptLoad ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.append(script);
  });
  return scriptLoad;
}

// Cloudflare's spam check. Calls onToken with a one-time token, or null when
// it expires or fails. Remount it (change its key) to get a fresh token.
// It re-renders in the site's theme when the visitor switches Light/Dark.
export function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const callback = useRef(onToken);
  callback.current = onToken;

  useEffect(() => {
    if (!siteKey) {
      console.error("VITE_TURNSTILE_SITE_KEY is not set");
      return;
    }
    let widgetId: string | undefined;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetId = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          theme,
          size: "flexible",
          callback: (token: string) => callback.current(token),
          "expired-callback": () => callback.current(null),
          "error-callback": () => callback.current(null),
        });
      })
      .catch(() => callback.current(null));
    return () => {
      cancelled = true;
      if (widgetId) {
        window.turnstile?.remove(widgetId);
        callback.current(null);
      }
    };
  }, [theme]);

  return <div ref={ref} className="min-h-[65px]" />;
}
