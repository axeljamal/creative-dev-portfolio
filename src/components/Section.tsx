import type { ReactNode } from "react";
import { motion } from "motion/react";

type Props = {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
};

export function Section({ id, eyebrow, title, children }: Props) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 py-16 sm:py-24">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-10 sm:mb-14"
      >
        <p className="font-mono text-xs font-medium tracking-[0.14em] text-accent-solid uppercase">{eyebrow}</p>
        <h2
          id={`${id}-title`}
          className="mt-2 font-display text-5xl font-semibold text-balance sm:text-6xl"
        >
          {title}
        </h2>
      </motion.header>
      {children}
    </section>
  );
}

// fades content up as it scrolls into view
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
