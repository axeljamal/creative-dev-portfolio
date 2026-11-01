import bootcampConnect from "../assets/bootcamp-connect.jpg";
import mareaDvipa from "../assets/marea-studio.jpg";
import weatherDashboard from "../assets/weather-dashboard.jpg";
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
  /** the live project runs inside the card: as a desktop window, or in a phone for a mobile-first one */
  preview?: { url: string; frame: "desktop" | "phone" };
  /** several live pages to switch between in the card (the first shows first) */
  previews?: { label: string; url: string; frame: "desktop" | "phone"; blurb?: string }[];
  /** more places to go, beside View and Source */
  links?: { label: string; href: string }[];
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
      "An installable studio in two rooms, built around my own Dua Pulau and Ntina motifs. The Pattern Studio rebuilds repeats and Fibonacci flows live from master motifs, with an Albers colour test and a stencil check. The Media Lab shows, step by step, how each motif was made, and has a stage where a pattern is made in the centre of the screen to its own score, or a whole reel plays with its captions running underneath. The mark, a pavilion by the sea, is drawn by its own gamelan: Marea, an original piece in the manner of Balinese gong kebyar, synthesized in the browser.",
    result:
      "Live as an installable PWA that works offline, in dark and light mode. It opens on its living mark building itself to Marea, then the film carries on with every motif dancing to the music. Drop in a picture and the lab composes a score from it. The welcome at the top of this page is the same film, with the same mark as its menu.",
    pageLink: "https://marea-dvipa.uk",
    sourceLink: "https://github.com/axeljamal/marea-dvipa",
    preview: { url: "https://marea-dvipa.uk/#welcome", frame: "desktop" },
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
      "Live at bootcampconnect.co.uk as an installable app: Google sign-in, a ranked feed with post menus, a LinkedIn-style profile page and form, AI-powered CV and LinkedIn import with a review step, browser tests and CI. Every product, design and technical decision is logged, fifty-one so far.",
    pageLink: "https://bootcampconnect.co.uk",
    sourceLink: "https://github.com/jennyshenstudio/bootcamp-connect",
    preview: { url: "https://bootcampconnect.co.uk/", frame: "desktop" },
  },
  {
    name: "Windfall",
    image: windfall,
    role: "Team project, 2026. Service and interaction design, then the React Native build",
    stack: ["React Native", "Expo", "TypeScript", "Zustand", "Supabase", "Claude Code"],
    problem: "Good food goes to waste while many people eat alone.",
    approach:
      "Windfall turns surplus food into small hosted suppers for three to eight neighbours. It began as a clickable prototype and is now a finished React Native app with Expo Router: discover a supper, take a chair, host your own table, chat with your table, with an ID check and a trust and safety layer. Dark mode follows the phone, sound chimes when switched on, and the mark is a sketch logo with a stippled gust.",
    result:
      "The finished app is live at windfall.marea-dvipa.uk and windfall.expo.app. The Windfall Story tells how it went from an idea to a working app, scroll by scroll, with the real app playing beside each chapter; the demo is the same app on the pilot’s sample data, for showing people. Types, app tests and database security tests run in CI. Piloting in Brighton and Hove. Switch between the app, the story and the demo in the card.",
    pageLink: "https://windfall.marea-dvipa.uk",
    previews: [
      { label: "App", url: "https://windfall.marea-dvipa.uk", frame: "phone", blurb: "The finished app" },
      { label: "Story", url: "https://demo.marea-dvipa.uk/story/", frame: "desktop", blurb: "From a glut to a table" },
      { label: "Demo", url: "https://demo.marea-dvipa.uk/", frame: "phone", blurb: "On the pilot’s sample data" },
    ],
    links: [
      { label: "Story", href: "https://demo.marea-dvipa.uk/story/" },
      { label: "Demo", href: "https://demo.marea-dvipa.uk/" },
    ],
  },
  {
    name: "Weather Dashboard",
    image: weatherDashboard,
    role: "Solo project, rebuilt in 2026. Front end, 3D and API design",
    stack: ["JavaScript", "Three.js", "OpenWeather API", "CSS", "Claude Code"],
    problem:
      "Weather apps hide how they work: you type a city and numbers appear, with no sense of the requests going back and forth to the server.",
    approach:
      "I rebuilt my bootcamp weather dashboard with a liquid glass interface over a live Three.js scene, where clouds, sun, moon, rain, snow and lightning follow the real weather and wind. A floating panel animates every API call as it happens: geocoding first, then current weather and the forecast in parallel, with the real query, status and timing.",
    result:
      "Live on GitHub Pages and responsive on phones. Fixed the forecast breaking at month ends, wrong wind units and crashes on unknown cities, and slow replies from an old search can no longer overwrite a new one.",
    pageLink: "https://axeljamal.github.io/s-api-js-weather-dashboard/",
    sourceLink: "https://github.com/axeljamal/s-api-js-weather-dashboard",
    preview: { url: "https://axeljamal.github.io/s-api-js-weather-dashboard/", frame: "desktop" },
  },
  {
    name: "3D product demo",
    role: "Team project, 2023. Front end",
    stack: ["Vue 3", "Vite", "Three.js", "Bootstrap"],
    problem: "Static product images do not let people explore a product before they buy it.",
    approach: "An interactive 3D product scene in the browser, built with Vue and Three.js, with a cart and a checkout page wired through the router.",
    result: "A responsive 3D shopping demo that runs in any modern browser. The cube on the left is its own small demo: drag it.",
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
