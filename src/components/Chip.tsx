import type { ReactNode } from "react";

export type ChipProps = {
  /** tint: accent-tinted label, e.g. a tool on a case study; glass: clear glass pill */
  variant?: "tint" | "glass";
  size?: "sm" | "md";
  icon?: ReactNode;
  as?: "span" | "li";
  className?: string;
  children: ReactNode;
};

const variants = {
  tint: "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-accent-solid",
  glass: "glass-clear",
};

const sizes = {
  sm: "gap-1.5 px-3 py-1 text-[13px] font-semibold",
  md: "gap-2 px-3.5 py-2 text-[15px] font-medium",
};

/** A small pill label for tools, skills and locations. */
export function Chip({
  variant = "tint",
  size = "sm",
  icon,
  as: Tag = "span",
  className = "",
  children,
}: ChipProps) {
  return (
    <Tag className={`inline-flex items-center rounded-full ${variants[variant]} ${sizes[size]} ${className}`}>
      {icon && (
        <span aria-hidden="true" className="text-accent-solid">
          {icon}
        </span>
      )}
      <span>{children}</span>
    </Tag>
  );
}
