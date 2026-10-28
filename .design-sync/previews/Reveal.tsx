import type { ReactNode } from "react";
import { Reveal, GlassPanel, Button } from "creative-dev-portfolio";
import { LuArrowRight } from "react-icons/lu";

// Reveal fades content up when scrolled into view; a static card shows the
// settled state so it isn't captured mid-fade.
const Settled = ({ children }: { children: ReactNode }) => (
  <div className="ds-settled">
    <style>{`.ds-settled [style*="opacity"] { opacity: 1 !important; transform: none !important; }`}</style>
    {children}
  </div>
);

export const Paragraph = () => (
  <Settled>
    <Reveal>
      <p className="max-w-prose text-lg leading-relaxed">
        Good interfaces disappear. I sweat the details people never notice so the parts they do
        notice feel effortless.
      </p>
    </Reveal>
  </Settled>
);

export const Card = () => (
  <Settled>
    <Reveal className="max-w-md">
      <GlassPanel material="strong" className="rounded-[2rem] p-6">
        <h3 className="text-2xl font-bold tracking-tight">Let's build something</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Open to design engineering roles and freelance projects.
        </p>
        <div className="mt-5">
          <Button href="#contact" variant="primary" icon={<LuArrowRight />}>
            Say hello
          </Button>
        </div>
      </GlassPanel>
    </Reveal>
  </Settled>
);
