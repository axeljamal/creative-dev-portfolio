import type { IconType } from "react-icons";
import { FaCss3Alt, FaFigma, FaGithub, FaHtml5, FaJs, FaNodeJs, FaReact, FaVuejs } from "react-icons/fa6";
import {
  LuAccessibility,
  LuAudioWaveform,
  LuBlocks,
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
  SiDotnet,
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

export type Skill = { name: string; icon: IconType; where: string };

// The portfolio's skills, by area, each with where it can be seen in Axel's own work. Only skills a project here
// shows are listed; the flat list above keeps the CV's order for the welcome film.
export const skillGroups: { area: string; skills: Skill[] }[] = [
  {
    area: "Front end",
    skills: [
      { name: "React and TypeScript", icon: FaReact, where: "This portfolio and Dua Pulau; Windfall is written in TypeScript." },
      { name: "Next.js", icon: SiNextdotjs, where: "Windfall Impact, a dashboard of the pilot's numbers; The Crew's team view on server components; a hospitality site template, one file per venue." },
      { name: "React Native (Expo)", icon: LuSmartphone, where: "Windfall, built with Expo Router and live on the web and at windfall.expo.app." },
      { name: "Three.js", icon: SiThreedotjs, where: "Dua Pulau, Pinisi Yard, the Regatta, the Weather Dashboard's live sky and the 3D product demo." },
      { name: "Canvas and Web Audio", icon: LuAudioWaveform, where: "Marea Dvīpa's live pattern engine and its gamelan scores, synthesized in the browser." },
      { name: "JavaScript, HTML and CSS", icon: FaJs, where: "The Weather Dashboard in plain JavaScript, and the Marea Dvīpa client sites." },
      { name: "Tailwind CSS", icon: FaCss3Alt, where: "This portfolio and Bootcamp Connect." },
      { name: "Vue", icon: FaVuejs, where: "The 3D product demo, with Vue 3, Vite and Three.js." },
      { name: "Vite and PWAs", icon: SiVite, where: "Marea Dvīpa installs and works offline; Bootcamp Connect installs too." },
      { name: "Web components", icon: LuBlocks, where: "The Crew, built from LEGO.js bricks." },
    ],
  },
  {
    area: "Design",
    skills: [
      { name: "Generative pattern design", icon: LuShapes, where: "Marea Dvīpa's Pattern Studio rebuilds repeats and Fibonacci flows from my own motifs." },
      { name: "Claude Design", icon: SiClaude, where: "Windfall's prototype, designed in Claude Design before the app was built." },
      { name: "Figma", icon: FaFigma, where: "Bootcamp Connect's screens and design system, designed in Figma." },
      { name: "Design systems", icon: LuPalette, where: "Bootcamp Connect's design system, and Windfall's written design rules." },
      { name: "Accessibility (WCAG 2.2 AA)", icon: LuAccessibility, where: "Bootcamp Connect was built to WCAG 2.2 AA and Apple's Human Interface Guidelines." },
      { name: "Blender (Python scripting)", icon: SiBlender, where: "Python scripts that build the 3D characters for Jam Studio's live puppets." },
    ],
  },
  {
    area: "Back end and data",
    skills: [
      { name: "Supabase (Postgres, RLS, Edge Functions)", icon: LuDatabase, where: "Windfall's safety rules live in the database and are tested in CI; its Edge Functions run the address finder, notifications and Ask Pip." },
      { name: "Cloudflare Workers and D1", icon: SiCloudflare, where: "This portfolio's Worker and database run The Crew and its inbox; Marea Dvīpa and Windfall's web app are hosted on Cloudflare." },
      { name: "Python", icon: SiPython, where: "Marea Dvīpa's motif pipeline, Windfall's picture and video pipeline, and Pinisi Yard's brick-part packer." },
      { name: "Node.js", icon: FaNodeJs, where: "Build and content scripts for Windfall and this portfolio." },
      { name: "C# and .NET", icon: SiDotnet, where: "Windfall Suppers API, a .NET 10 API on GitHub." },
    ],
  },
  {
    area: "AI",
    skills: [
      { name: "Claude Code on the command line", icon: LuSparkles, where: "Every project here, from spec and plan to tests and deploy." },
      { name: "MCP", icon: LuPlug, where: "MCP servers in Claude Code for Supabase, Figma, Canva and Playwright, used to build, design and test this work." },
      { name: "LLM features in production", icon: LuSparkles, where: "Bootcamp Connect's CV and LinkedIn import, Ask Pip in Windfall and here, and The Crew's feedback tagging." },
      { name: "Prompt engineering", icon: LuMessageSquareText, where: "Pip's brief, and The Crew's tagging prompt, whose answers are checked against fixed lists." },
      { name: "Spec-first AI-assisted development", icon: LuFileCheck, where: "Bootcamp Connect's 51 logged decisions; Windfall's decision log and fix log." },
    ],
  },
  {
    area: "Testing and delivery",
    skills: [
      { name: "Playwright and testing", icon: LuFlaskConical, where: "Bootcamp Connect's browser tests, Windfall's app and database tests, and this portfolio's unit tests." },
      { name: "CI/CD", icon: LuWorkflow, where: "Windfall and Bootcamp Connect run their checks in GitHub Actions on every change." },
      { name: "Linux and the command line", icon: SiLinux, where: "Builds, tests and deploys run from the terminal, with Wrangler and EAS." },
      { name: "GitHub", icon: FaGithub, where: "Public work at github.com/axeljamal." },
    ],
  },
  {
    area: "People",
    skills: [
      { name: "Customer service and customer experience", icon: LuHeartHandshake, where: "Six years in hospitality, which shaped Windfall's host and guest journeys." },
      { name: "Team leadership", icon: LuUsers, where: "Team leader at The Feathers; Windfall and Bootcamp Connect were team projects." },
      { name: "Marketing and PR", icon: LuMegaphone, where: "Guardian and Times reviews at Supawan; Windfall's launch posts and videos." },
    ],
  },
];

// How Axel works with Claude Code; Pip's brief quotes it so visitors can ask.
export const workingWithClaude =
  "Axel works with Claude Code in the terminal as a pair: specs and plans first, then builds, runs the tests and browser checks, and deploys from the command line through CI/CD, keeping a decision log and a fix log as she goes.";
