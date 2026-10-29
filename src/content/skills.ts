import type { IconType } from "react-icons";
import { FaCss3Alt, FaFigma, FaGithub, FaHtml5, FaJs, FaNodeJs, FaReact, FaVuejs } from "react-icons/fa6";
import {
  LuAccessibility,
  LuAudioWaveform,
  LuDatabase,
  LuFlaskConical,
  LuMegaphone,
  LuPalette,
  LuPlug,
  LuShapes,
  LuSmartphone,
  LuSparkles,
  LuUsers,
} from "react-icons/lu";
import { SiClaude, SiCloudflare, SiThreedotjs, SiTypescript, SiVite } from "react-icons/si";

// in the order of the CV; the welcome film's Tools caption shows the first few
export const skills: { name: string; icon: IconType }[] = [
  { name: "Claude Code", icon: LuSparkles },
  { name: "Claude Design", icon: SiClaude },
  { name: "Figma", icon: FaFigma },
  { name: "React", icon: FaReact },
  { name: "Vue", icon: FaVuejs },
  { name: "TypeScript", icon: SiTypescript },
  { name: "JavaScript", icon: FaJs },
  { name: "React Native", icon: LuSmartphone },
  { name: "HTML", icon: FaHtml5 },
  { name: "CSS and Tailwind", icon: FaCss3Alt },
  { name: "Vite and PWAs", icon: SiVite },
  { name: "Three.js", icon: SiThreedotjs },
  { name: "Canvas and Web Audio", icon: LuAudioWaveform },
  { name: "Generative pattern design", icon: LuShapes },
  { name: "MCP", icon: LuPlug },
  { name: "Node.js", icon: FaNodeJs },
  { name: "Supabase", icon: LuDatabase },
  { name: "Cloudflare", icon: SiCloudflare },
  { name: "Playwright and testing", icon: LuFlaskConical },
  { name: "Accessibility (WCAG 2.2 AA)", icon: LuAccessibility },
  { name: "Design systems", icon: LuPalette },
  { name: "GitHub", icon: FaGithub },
  { name: "Team leadership", icon: LuUsers },
  { name: "Marketing and PR", icon: LuMegaphone },
];
