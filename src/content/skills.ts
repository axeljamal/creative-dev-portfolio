import type { IconType } from "react-icons";
import { FaCss3Alt, FaFigma, FaGithub, FaHtml5, FaJs, FaNodeJs, FaReact, FaVuejs } from "react-icons/fa6";
import {
  LuAccessibility,
  LuAudioWaveform,
  LuDatabase,
  LuFileCheck,
  LuFlaskConical,
  LuHeartHandshake,
  LuMegaphone,
  LuMessageSquareText,
  LuPalette,
  LuPlug,
  LuShapes,
  LuSmartphone,
  LuSparkles,
  LuUsers,
  LuWorkflow,
} from "react-icons/lu";
import {
  SiBlender,
  SiClaude,
  SiCloudflare,
  SiLinux,
  SiNextdotjs,
  SiPython,
  SiThreedotjs,
  SiTypescript,
  SiVite,
} from "react-icons/si";

// One list shared with the CV and LinkedIn, in the order of the CV.
// The welcome film's Tools caption shows the first five, then the next eight.
export const skills: { name: string; icon: IconType }[] = [
  { name: "Claude Code on the command line", icon: LuSparkles },
  { name: "Claude Design", icon: SiClaude },
  { name: "Next.js", icon: SiNextdotjs },
  { name: "React", icon: FaReact },
  { name: "TypeScript", icon: SiTypescript },
  { name: "JavaScript", icon: FaJs },
  { name: "Python", icon: SiPython },
  { name: "Supabase (Postgres, RLS, Edge Functions)", icon: LuDatabase },
  { name: "Node.js", icon: FaNodeJs },
  { name: "Figma", icon: FaFigma },
  { name: "Three.js", icon: SiThreedotjs },
  { name: "CI/CD", icon: LuWorkflow },
  { name: "Linux and the command line", icon: SiLinux },
  { name: "MCP", icon: LuPlug },
  { name: "Prompt engineering", icon: LuMessageSquareText },
  { name: "LLM features in production", icon: LuSparkles },
  { name: "Spec-first AI-assisted development", icon: LuFileCheck },
  { name: "Vue", icon: FaVuejs },
  { name: "React Native (Expo)", icon: LuSmartphone },
  { name: "HTML", icon: FaHtml5 },
  { name: "CSS and Tailwind", icon: FaCss3Alt },
  { name: "Vite and PWAs", icon: SiVite },
  { name: "Canvas and Web Audio", icon: LuAudioWaveform },
  { name: "Cloudflare", icon: SiCloudflare },
  { name: "Playwright and testing", icon: LuFlaskConical },
  { name: "GitHub", icon: FaGithub },
  { name: "Blender (Python scripting)", icon: SiBlender },
  { name: "Generative pattern design", icon: LuShapes },
  { name: "Design systems", icon: LuPalette },
  { name: "Accessibility (WCAG 2.2 AA)", icon: LuAccessibility },
  { name: "Customer service and customer experience", icon: LuHeartHandshake },
  { name: "Team leadership", icon: LuUsers },
  { name: "Marketing and PR", icon: LuMegaphone },
];

// How Axel works with Claude Code; Pip's brief quotes it so visitors can ask.
export const workingWithClaude =
  "Axel works with Claude Code in the terminal as a pair: specs and plans first, then builds, runs the tests and browser checks, and deploys from the command line through CI/CD, keeping a decision log and a fix log as she goes.";
