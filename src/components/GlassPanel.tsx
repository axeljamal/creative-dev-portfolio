import type { HTMLAttributes } from "react";

export type GlassMaterial = "clear" | "regular" | "strong";

const materials: Record<GlassMaterial, string> = {
  clear: "glass-clear",
  regular: "glass",
  strong: "glass-strong",
};

export type GlassPanelProps = HTMLAttributes<HTMLElement> & {
  /** clear: controls over imagery; regular: bars and tiles; strong: text-heavy cards */
  material?: GlassMaterial;
  /** bend the backdrop at the edges (Chromium only; frosted elsewhere) */
  lens?: boolean;
  as?: "div" | "section" | "article" | "aside" | "header" | "nav" | "ul" | "li";
};

/**
 * A Liquid Glass surface: translucent tint over a blurred backdrop with a
 * specular rim. Children sit above the rim automatically. Set the shape with
 * className (e.g. rounded-[2rem] p-6).
 */
export function GlassPanel({
  material = "regular",
  lens = false,
  as: Tag = "div",
  className = "",
  ...rest
}: GlassPanelProps) {
  return <Tag className={`${materials[material]} ${lens ? "glass-lens" : ""} ${className}`} {...rest} />;
}
