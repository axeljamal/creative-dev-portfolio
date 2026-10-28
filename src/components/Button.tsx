import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "glass";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 sm:px-5 text-[15px] font-semibold tracking-tight transition duration-200 ease-out active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent-solid text-on-accent shadow-[0_8px_24px_-8px_var(--accent)] hover:brightness-110",
  glass: "glass-clear glass-lens text-ink hover:brightness-105",
};

// for <button>s that should look like Button
export const buttonClass = (variant: Variant = "glass") => `${base} ${variants[variant]}`;

type Props = ComponentProps<"a"> & {
  variant?: Variant;
  icon?: ReactNode;
  external?: boolean;
};

export function Button({
  variant = "glass",
  icon,
  external,
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <a
      className={`${base} ${variants[variant]} ${className}`}
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
      {...rest}
    >
      {icon && <span className="relative z-2 text-[1.1em]">{icon}</span>}
      {children && <span className="relative z-2">{children}</span>}
    </a>
  );
}
