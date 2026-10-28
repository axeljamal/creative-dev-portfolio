import type { IconType } from "react-icons";
import {
  FaCss3Alt,
  FaFigma,
  FaGithub,
  FaHtml5,
  FaJs,
  FaNodeJs,
  FaReact,
  FaVuejs,
} from "react-icons/fa6";
import { LuAccessibility, LuBox, LuDatabase, LuFlaskConical, LuSparkles } from "react-icons/lu";

export const skills: { name: string; icon: IconType }[] = [
  { name: "Claude Code", icon: LuSparkles },
  { name: "Figma", icon: FaFigma },
  { name: "React", icon: FaReact },
  { name: "Vue", icon: FaVuejs },
  { name: "JavaScript", icon: FaJs },
  { name: "HTML", icon: FaHtml5 },
  { name: "CSS and Tailwind", icon: FaCss3Alt },
  { name: "Three.js", icon: LuBox },
  { name: "Node.js", icon: FaNodeJs },
  { name: "Supabase", icon: LuDatabase },
  { name: "Accessibility", icon: LuAccessibility },
  { name: "Testing", icon: LuFlaskConical },
  { name: "GitHub", icon: FaGithub },
];
