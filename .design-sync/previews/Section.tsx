import type { ReactNode } from "react";
import { Section, Reveal, GlassPanel, Chip } from "creative-dev-portfolio";

// Section and Reveal fade in when scrolled into view; a static card shows the
// settled state so it isn't captured mid-fade.
const Settled = ({ children }: { children: ReactNode }) => (
  <div className="ds-settled">
    <style>{`.ds-settled [style*="opacity"] { opacity: 1 !important; transform: none !important; }`}</style>
    {children}
  </div>
);

export const AboutSection = () => (
  <Settled>
  <Section id="about" eyebrow="About" title="Design for the whole journey">
    <Reveal>
      <p className="max-w-prose text-lg leading-relaxed">
        I'm a design engineer who moves between research, interface design and front-end code.
        I like small teams, honest feedback and products that respect people's time.
      </p>
    </Reveal>
  </Section>
  </Settled>
);

export const WorkSection = () => (
  <Settled>
  <Section id="work" eyebrow="Selected work" title="Case studies">
    <Reveal>
      <GlassPanel material="strong" className="rounded-[2rem] p-6">
        <h3 className="text-2xl font-bold tracking-tight">Bootcamp Connect</h3>
        <p className="mt-1 text-[15px] leading-relaxed text-ink-2">
          A mobile app that helps bootcamp students find study partners and share progress.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {["React Native", "Expo", "Figma"].map((t) => (
            <Chip key={t} as="li">
              {t}
            </Chip>
          ))}
        </ul>
      </GlassPanel>
    </Reveal>
  </Section>
  </Settled>
);
