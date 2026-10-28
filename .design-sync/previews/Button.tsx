import { Button } from "creative-dev-portfolio";
import { FaLinkedin, FaGithub } from "react-icons/fa6";
import { LuFileText, LuArrowRight, LuMail } from "react-icons/lu";

// glass needs something behind it to refract
const backdrop = {
  padding: 24,
  borderRadius: 28,
  background:
    "radial-gradient(circle at 20% 20%, var(--sun), transparent 55%), radial-gradient(circle at 80% 70%, var(--accent), transparent 60%), var(--canvas)",
};

export const Primary = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
    <Button href="#contact" variant="primary" icon={<LuMail />}>
      Get in touch
    </Button>
    <Button href="#work" variant="primary" icon={<LuArrowRight />}>
      See my work
    </Button>
  </div>
);

export const Glass = () => (
  <div style={{ ...backdrop, display: "flex", flexWrap: "wrap", gap: 12 }}>
    <Button href="/cv.pdf" external icon={<LuFileText />}>
      Download CV
    </Button>
    <Button href="https://github.com/axeljamal" external icon={<FaGithub />}>
      GitHub
    </Button>
  </div>
);

export const HeroActions = () => (
  <div style={{ ...backdrop, display: "flex", flexWrap: "wrap", gap: 12 }}>
    <Button href="https://www.linkedin.com/in/axeljamal" external variant="primary" icon={<FaLinkedin />}>
      LinkedIn
    </Button>
    <Button href="/cv.pdf" external icon={<LuFileText />}>
      Download CV
    </Button>
  </div>
);

export const IconOnly = () => (
  <div style={{ ...backdrop, display: "flex", gap: 12 }}>
    <Button href="https://github.com/axeljamal" external aria-label="GitHub" icon={<FaGithub />} />
    <Button href="https://www.linkedin.com/in/axeljamal" external aria-label="LinkedIn" icon={<FaLinkedin />} />
    <Button href="mailto:hello@example.com" aria-label="Email" icon={<LuMail />} />
  </div>
);
