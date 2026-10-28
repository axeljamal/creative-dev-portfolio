import { useEffect, useState } from "react";

// true while scrolling down past the hero, false as soon as you scroll up,
// like the iOS tab bar minimising to give content more room
export function useCompactOnScroll(threshold = 200) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 8) return;
      setCompact(y > threshold && y > lastY);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return compact;
}
