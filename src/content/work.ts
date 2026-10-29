import bootcampConnect from "../assets/bootcamp-connect.jpg";
import mareaDvipa from "../assets/marea-studio.jpg";
import windfall from "../assets/windfall.jpg";

export type CaseStudy = {
  name: string;
  image?: string;
  role: string;
  stack: string[];
  problem: string;
  approach: string;
  result: string;
  pageLink?: string;
  sourceLink?: string;
};

export type Project = {
  name: string;
  image: string;
  details: string;
  pageLink: string;
  sourceLink: string;
};

export const caseStudies: CaseStudy[] = [
  {
    name: "Marea Dvīpa",
    image: mareaDvipa,
    role: "Current project, 2026. Original motifs, generative pattern design, sound and music",
    stack: ["React", "Vite", "Canvas", "Web Audio", "PWA", "Claude Code"],
    problem:
      "Batik and ikat motifs from Bali and Central Sulawesi are usually seen as flat images, cut off from how they are drawn, the colours they are dyed in and the music around them.",
    approach:
      "An installable studio in two rooms, built around my own Dua Pulau and Ntina motifs. The Pattern Studio rebuilds repeats and Fibonacci flows live from master motifs, with an Albers colour test and a stencil check. The Media Lab shows, step by step, how the Ntina mark and the Bomba Rose were made, scored with Bunga Kaili, my original song for a synthesized Kaili kakula ensemble. Every motif is drawn by hand and every sound is made with Web Audio; there are no samples.",
    result:
      "Live as an installable PWA that works offline, opening on its own 3D welcome film: 34 motifs landing at the golden angle, timed to the 138 bpm of the Bomba Rose score. The welcome film at the top of this page runs on its motifs, its Bomba Rose and its score. Press Play with sound, then spin the rose and tap its rings.",
    pageLink: "https://marea-dvipa.axeltaj.workers.dev",
    sourceLink: "https://github.com/axeljamal/marea-dvipa",
  },
  {
    name: "Bootcamp Connect",
    image: bootcampConnect,
    role: "Team project, 2026. Design system, accessibility and AI-assisted development",
    stack: ["Claude Code", "JavaScript", "Tailwind CSS", "Supabase", "PWA"],
    problem:
      "Bootcamp graduates need real experience to get hired, but most projects stop after demo day.",
    approach:
      "An installable app where software and business developers join real opportunities, run them as projects with a team chat, and earn verified experience. Built spec-first with Claude Code, to Apple's Human Interface Guidelines and WCAG 2.2 AA.",
    result:
      "Working alpha with Google sign-in, a ranked feed, AI-powered CV and LinkedIn import with a review step, browser tests and CI.",
    sourceLink: "https://github.com/jennyshenstudio/bootcamp-connect",
  },
  {
    name: "Windfall",
    image: windfall,
    role: "Team prototype, 2026. Service and interaction design",
    stack: ["Prototype", "HTML", "CSS", "JavaScript"],
    problem: "Good food goes to waste while many people eat alone.",
    approach:
      "A clickable mobile prototype for small hosted suppers built around surplus food: discover a gathering, RSVP, host your own, with a trust and safety layer.",
    result: "Built to click through with stakeholders for a Brighton and Hove pilot.",
  },
  {
    name: "3D product demo",
    role: "Team project. 25 commits",
    stack: ["Vue 3", "Vite", "Three.js"],
    problem: "Static product images do not let people explore a product.",
    approach: "An interactive 3D scene in the browser, built with Vue and Three.js.",
    result: "A responsive 3D experience that runs in any modern browser.",
  },
];

export const earlierWork: Project[] = [
  {
    name: "Sojourn",
    image:
      "https://user-images.githubusercontent.com/119621308/226062894-98ce4f5e-d516-4b85-8ef0-7d3e61e3d95b.jpeg",
    details: "A travel website built with a team, pulling together third-party travel APIs.",
    pageLink: "https://axeljamal.github.io/travel-concierge-api-project/",
    sourceLink: "https://github.com/axeljamal/travel-concierge-api-project",
  },
  {
    name: "Team Generator",
    image:
      "https://user-images.githubusercontent.com/119621308/223402724-05682ffb-a744-417d-bb66-dd37e3e257c7.png",
    details: "A Node.js command-line app, built test-first, that generates a team profile page.",
    pageLink: "https://axeljamal.github.io/tdd-oop-team-profile-generator/",
    sourceLink: "https://github.com/axeljamal/tdd-oop-team-profile-generator",
  },
  {
    name: "Weather Dashboard",
    image:
      "https://user-images.githubusercontent.com/119621308/221939490-22b44b50-fb0f-4ca4-80a1-d431ebd5c502.png",
    details: "Current weather and a five-day forecast for any city, from a server API.",
    pageLink: "https://axeljamal.github.io/s-api-js-weather-dashboard/",
    sourceLink: "https://github.com/axeljamal/s-api-js-weather-dashboard",
  },
  {
    name: "JavaScript Quiz",
    image:
      "https://user-images.githubusercontent.com/119621308/219744525-035e38f9-c4d2-416b-b377-644522cce3ff.png",
    details: "A timed quiz with saved high scores, built with JavaScript, HTML and CSS.",
    pageLink: "https://axeljamal.github.io/api-js-code-quiz/index.html",
    sourceLink: "https://github.com/axeljamal/api-js-code-quiz",
  },
  {
    name: "Work Day Scheduler",
    image:
      "https://user-images.githubusercontent.com/119621308/216040766-6781b96a-b563-4a66-bfee-dd857399ab8a.png",
    details: "An hour-by-hour daily planner that saves your notes, using third-party APIs.",
    pageLink: "https://axeljamal.github.io/api-js-daily-planner-app/",
    sourceLink: "https://github.com/axeljamal/api-js-daily-planner-app",
  },
  {
    name: "Password Generator",
    image:
      "https://user-images.githubusercontent.com/119621308/223720649-57519794-3a22-41cc-8fba-6c0c52312c23.png",
    details: "Generates a random password from the length and character types you choose.",
    pageLink: "https://axeljamal.github.io/js-password-generator/",
    sourceLink: "https://github.com/axeljamal/js-password-generator",
  },
];
