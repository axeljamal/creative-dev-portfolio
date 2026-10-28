import { GlassPanel, Button, Chip } from "creative-dev-portfolio";
import { LuFileText } from "react-icons/lu";

const backdrop = {
  padding: 24,
  borderRadius: 32,
  background:
    "radial-gradient(circle at 15% 25%, var(--sun), transparent 50%), radial-gradient(circle at 85% 75%, var(--accent), transparent 55%), radial-gradient(circle at 60% 10%, var(--leaf), transparent 45%), var(--canvas)",
};

export const Materials = () => (
  <div style={{ ...backdrop, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
    {(["clear", "regular", "strong"] as const).map((m) => (
      <GlassPanel key={m} material={m} className="rounded-[1.5rem] p-5">
        <p className="text-[15px] font-semibold capitalize">{m}</p>
        <p className="mt-1 text-[13px] text-ink-2">
          {m === "clear" ? "Controls over imagery" : m === "regular" ? "Bars and tiles" : "Text-heavy cards"}
        </p>
      </GlassPanel>
    ))}
  </div>
);

export const AboutCard = () => (
  <div style={backdrop}>
    <GlassPanel material="strong" className="rounded-[2rem] p-6">
      <p className="text-lg leading-relaxed">
        I'm a design engineer who cares about the whole journey, from the first sketch to the
        last pixel shipped. I build interfaces that feel calm, fast and human.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button href="/cv.pdf" external icon={<LuFileText />}>
          Download CV
        </Button>
      </div>
      <h3 className="mt-8 text-sm font-semibold tracking-wide text-accent-solid uppercase">Skills</h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {["Figma", "React", "TypeScript", "Accessibility"].map((s) => (
          <Chip key={s} as="li" variant="glass" size="md">
            {s}
          </Chip>
        ))}
      </ul>
    </GlassPanel>
  </div>
);

export const LensPill = () => (
  <div style={backdrop}>
    <GlassPanel as="nav" material="regular" lens className="inline-flex items-center gap-1 rounded-full p-1.5">
      {["Work", "About", "Contact"].map((label, i) => (
        <a
          key={label}
          href={`#${label.toLowerCase()}`}
          className={`rounded-full px-4 py-2 text-[15px] font-medium ${i === 0 ? "text-ink" : "text-ink-2"}`}
        >
          {label}
        </a>
      ))}
    </GlassPanel>
  </div>
);
