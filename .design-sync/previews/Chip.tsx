import { Chip } from "creative-dev-portfolio";
import { LuMapPin } from "react-icons/lu";
import { FaReact, FaFigma, FaHtml5 } from "react-icons/fa6";

const backdrop = {
  padding: 20,
  borderRadius: 24,
  background:
    "radial-gradient(circle at 20% 30%, var(--sun), transparent 55%), radial-gradient(circle at 85% 70%, var(--accent), transparent 60%), var(--canvas)",
};

export const ToolTags = () => (
  <ul style={{ display: "flex", flexWrap: "wrap", gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
    {["React", "TypeScript", "Tailwind CSS", "Figma"].map((t) => (
      <Chip key={t} as="li">
        {t}
      </Chip>
    ))}
  </ul>
);

export const Location = () => (
  <div style={backdrop}>
    <Chip variant="glass" icon={<LuMapPin />}>
      Brighton, UK
    </Chip>
  </div>
);

export const Skills = () => (
  <div style={backdrop}>
    <ul style={{ display: "flex", flexWrap: "wrap", gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
      <Chip as="li" variant="glass" size="md" icon={<FaFigma />}>Figma</Chip>
      <Chip as="li" variant="glass" size="md" icon={<FaReact />}>React</Chip>
      <Chip as="li" variant="glass" size="md" icon={<FaHtml5 />}>HTML &amp; CSS</Chip>
    </ul>
  </div>
);

export const Sizes = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <Chip size="sm">Small</Chip>
    <Chip size="md">Medium</Chip>
  </div>
);
