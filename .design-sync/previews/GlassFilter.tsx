import { useEffect } from "react";
import { GlassFilter, GlassPanel, supportsRefraction } from "creative-dev-portfolio";

const backdrop = {
  padding: 24,
  borderRadius: 32,
  background:
    "repeating-linear-gradient(115deg, var(--accent) 0 14px, var(--sun) 14px 28px, var(--canvas) 28px 42px)",
};

// Mount GlassFilter once at the app root, and add `refract` to <html> where
// supported, the way the site's main.tsx does.
const useRefract = () =>
  useEffect(() => {
    if (supportsRefraction()) document.documentElement.classList.add("refract");
  }, []);

export const LensOverStripes = () => {
  useRefract();
  return (
    <>
      <GlassFilter />
      <div style={{ ...backdrop, display: "flex", gap: 16 }}>
        <GlassPanel material="clear" lens className="rounded-full px-6 py-3 text-[15px] font-semibold">
          With lens
        </GlassPanel>
        <GlassPanel material="clear" className="rounded-full px-6 py-3 text-[15px] font-semibold">
          Frosted only
        </GlassPanel>
      </div>
    </>
  );
};
