import bootcampConnect from "../assets/bootcamp-connect.jpg";
import bricks from "../assets/bricks.jpg";
import crewTeam from "../assets/crew-team.jpg";
import hospitalityNext from "../assets/hospitality-next.jpg";
import mareaDvipa from "../assets/marea-studio.jpg";
import mediaLab from "../assets/media-lab.jpg";
import mareaStage from "../assets/marea-stage.jpg";

// Marea Dvīpa's stage, live on its cards; the local copy while developing, so a change there shows here too
// (read loosely: the Worker's type-check reads this file too, without Vite's types)
const MAREA = (import.meta as { env?: { DEV?: boolean } }).env?.DEV ? "http://localhost:5299" : "https://marea-dvipa.uk";
import regatta from "../assets/regatta.jpg";
import weatherDashboard from "../assets/weather-dashboard.jpg";
import windfall from "../assets/windfall.jpg";
import windfallImpact from "../assets/windfall-impact.jpg";

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
  /** reel: the app runs itself, with sound, when asked (?reel=1 and a message), and says when each screen is done */
  previews?: { label: string; url: string; frame: "desktop" | "phone"; blurb?: string; reel?: boolean; screens?: { label: string; path: string }[] }[];
  /** a film of the project playing, for its card (in public/work/) */
  video?: string;
  /** the film has sound worth hearing: its card gets the sound switch */
  sound?: boolean;
  /** the project itself, live, in place of a film: a page that fills the card (Marea Dvīpa's ?card= stage) */
  live?: string;
  /** the card's own picture, when it should differ from the case study's (a still of what the live card plays) */
  cardImage?: string;
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
    name: "Windfall",
    video: "/work/windfall.mp4",
    sound: true,
    image: windfall,
    role: "Team project, 2026. Service and interaction design, then the React Native build",
    stack: ["React Native", "Expo", "TypeScript", "Zustand", "Supabase", "Claude Code"],
    problem: "Good food goes to waste while many people eat alone.",
    approach:
      "Windfall turns surplus food into small hosted suppers for three to eight neighbours. It began as a clickable prototype and is now a finished React Native app with Expo Router: discover a supper, take a chair, host your own table, chat with your table, with an ID check and a trust and safety layer. Dark mode follows the phone, sound chimes when switched on, and the mark is a sketch logo with a stippled gust.",
    result:
      "The finished app is live at windfall.marea-dvipa.uk and windfall.expo.app. The Windfall Story tells how it went from an idea to a working app, scroll by scroll, with the real app playing beside each chapter; the demo is the same app on the pilot’s sample data, for showing people. Types, app tests and database security tests run in CI. Piloting in Brighton and Hove. Try it here: jump the demo to any screen, play the day’s windfall, take a chair at a supper, host a table.",
    pageLink: "https://windfall.marea-dvipa.uk",
    previews: [
      { label: "Demo", url: "https://demo.marea-dvipa.uk", frame: "phone", blurb: "A teaser: the demo plays itself, with sound; tap a screen to jump there", reel: true, screens: [
        { label: "Welcome", path: "/" }, { label: "Today: play the windfall", path: "/today" }, { label: "Suppers", path: "/home" }, { label: "A supper", path: "/supper/weald" },
        { label: "Host a table", path: "/host" }, { label: "Album", path: "/album" }, { label: "How it works", path: "/how" }, { label: "Impact", path: "/impact" },
      ] },
      { label: "Story", url: "https://demo.marea-dvipa.uk/story/", frame: "desktop", blurb: "From a glut to a table" },
      { label: "App", url: "https://windfall.marea-dvipa.uk", frame: "phone", blurb: "The finished app, live" },
    ],
    links: [
      { label: "Story", href: "https://demo.marea-dvipa.uk/story/" },
      { label: "Demo", href: "https://demo.marea-dvipa.uk/" },
    ],
  },
  {
    name: "Marea Dvīpa Pattern Studio",
    live: `${MAREA}/?card=marea&x=0.51#marea`,
    cardImage: mareaStage,
    sound: true,
    image: mareaDvipa,
    role: "Current project, 2026. Original motifs and generative pattern design",
    stack: ["React", "Vite", "Canvas", "Web Audio", "PWA", "Claude Code"],
    problem:
      "Batik and ikat motifs from Bali and Central Sulawesi are usually seen as flat images, cut off from how they are drawn and the colours they are dyed in.",
    approach:
      "The first room of Marea Dvīpa, an installable studio built around my own Dua Pulau and Ntina motifs. The Pattern Studio rebuilds batik repeats and Fibonacci flows live from master motifs, with an Albers colour test and a stencil check, so a pattern can be tried in any colourway before it is printed. The mark, a pavilion by the sea, is drawn live on the stage by its own gamelan: Marea, an original piece in the manner of Balinese gong kebyar.",
    result:
      "Live as an installable PWA that works offline, in dark and light mode. It opens on its living mark building itself to Marea. The welcome at the top of this page is the same film, with the same mark as its menu.",
    pageLink: "https://marea-dvipa.uk",
    sourceLink: "https://github.com/axeljamal/marea-dvipa",
    preview: { url: "https://marea-dvipa.uk/#welcome", frame: "desktop" },
  },
  {
    name: "Marea Dvīpa Media Lab",
    live: `${MAREA}/?card=bomba#bomba`,
    sound: true,
    image: mediaLab,
    role: "Current project, 2026. Sound, music and how each motif was made",
    stack: ["Canvas", "Web Audio", "MediaRecorder", "JavaScript", "Claude Code"],
    problem:
      "A motif's story, how it was drawn and the music around it, is lost when it is shown as a single finished picture.",
    approach:
      "The second room of Marea Dvīpa. The Media Lab shows, step by step, how each motif was made, then plays it as a reel on a stage: the pattern is made in the centre of the screen to its own score, with captions running underneath. Every score is written for a gamelan and synthesized in the browser with Web Audio, with a mixer to mute each part. Bomba Rose grows its petal rings of 13, 8, 5 and 3 to Bunga Kaili.",
    result:
      "Seven reels, each with its own score, live and free to play. Any reel can be recorded as a video with its sound, right in the browser. Drop in a picture and the lab composes a score from it. The same reels play in a 3D room, the Bale.",
    pageLink: "https://marea-dvipa.uk/#lab",
    sourceLink: "https://github.com/axeljamal/marea-dvipa",
    links: [{ label: "The Bale", href: "https://marea-dvipa.uk/bale" }],
  },
  {
    name: "Bootcamp Connect",
    video: "/work/bootcamp-connect.mp4",
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
    name: "Dua Pulau Regatta",
    image: regatta,
    video: "/work/regatta.mp4",
    role: "Solo project, 2026. A sailing race game, in the browser",
    stack: ["Three.js", "TypeScript", "React", "Web Audio", "Vitest", "Claude Code"],
    problem:
      "My portfolio's world of two islands has a pinisi you can sail. Sailing round is pleasant, but there is nothing to aim for, and nothing to come back for.",
    approach:
      "A race game on the same sea, for anyone, on a phone or a keyboard. Three courses, from a sprint to a lap of both islands, with the wind setting which way is fast; Easy mode for a first go and Sailing mode with real points of sail. Three rival pinisi, a ghost of your best run, a cup over three races, a chart, photo mode and sound. The race rules are plain TypeScript, apart from the 3D, so they are tested on their own.",
    result:
      "Live and free to play. 111 tests cover the rules, the wind, the rivals, the cup and the saved best times. On phones it drops its render quality to keep a steady frame rate.",
    pageLink: "https://axelle.marea-dvipa.uk/race/",
    preview: { url: "https://axelle.marea-dvipa.uk/race/", frame: "desktop" },
  },
  {
    name: "Dua Pulau in Bricks",
    image: bricks,
    video: "/work/bricks.mp4",
    role: "Solo project, 2026. A brick-built world, a boat builder and a players' community",
    stack: ["Three.js", "LDraw parts", "TypeScript", "Web components", "Cloudflare D1", "Workers AI"],
    problem:
      "I wanted to show how a game community could work around building and playing: make something, play with it, then tell the team what you think.",
    approach:
      "Dua Pulau rebuilt in bricks: the land from my height map at two-metre studs, a studded sea and toy-finish trees. Pinisi Yard lets you build a boat from real brick parts (packed from the open LDraw library) and launch her; she floats or rolls over depending on your choices. Race the boat you built in the brick Regatta. The Crew is the community around it, built from small web components: welcome quests, a deck, and playtest feedback that Workers AI sorts into themes for the team.",
    result:
      "All four are live and linked to each other. Your boat travels in a share link. The team sees the Crew's numbers in a separate dashboard. It uses no brand names, logos or figures, only the brick look.",
    pageLink: "https://axelle.marea-dvipa.uk/bricks/",
    preview: { url: "https://axelle.marea-dvipa.uk/yard/", frame: "desktop" },
    links: [
      { label: "Pinisi Yard", href: "https://axelle.marea-dvipa.uk/yard/" },
      { label: "Brick Regatta", href: "https://axelle.marea-dvipa.uk/bricks/race/" },
      { label: "The Crew", href: "https://axelle.marea-dvipa.uk/crew/" },
    ],
  },
  {
    name: "Windfall Impact",
    video: "/work/windfall-impact.mp4",
    image: windfallImpact,
    role: "Solo project, 2026. Data visualisation and front end, in Next.js",
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "SVG charts", "Vitest", "Cloudflare"],
    problem:
      "A food project lives on its numbers: how many suppers, how many chairs filled, where the surplus comes from. Windfall had the records but nowhere to show them.",
    approach:
      "A dashboard of the Windfall pilot, built in Next.js with server components and a static export. Every chart is hand-built SVG, with a title, a one-line summary, a data table you can switch to and marks you can reach by keyboard. It runs in Windfall's own colours, in day and night. All the numbers come through one typed function, so live data from Supabase can replace the sample later.",
    result:
      "Live, with eight headline numbers and six charts. It uses the pilot demo's sample data, and says so on every chart; a second page shows where each number comes from. Where the data can't honestly answer a question, such as kilos of food rescued, the page says what is not counted yet rather than guessing. 42 tests, including colour contrast checks in both themes.",
    pageLink: "https://windfall-impact.marea-dvipa.uk",
    sourceLink: "https://github.com/axeljamal/windfall-impact",
    preview: { url: "https://windfall-impact.marea-dvipa.uk/", frame: "desktop" },
  },
  {
    name: "The Crew · Team view",
    video: "/work/crew-team.mp4",
    image: crewTeam,
    role: "Solo project, 2026. Dashboard and server rendering, in Next.js",
    stack: ["Next.js", "React Server Components", "TypeScript", "Tailwind CSS", "OpenNext", "Cloudflare Workers"],
    problem:
      "The Crew is a players' community for my Pinisi Yard game. The people running playtests need to see who joined, who came back, what testers said about each build and what has been reported.",
    approach:
      "A team dashboard in Next.js on Cloudflare Workers. Server components fetch the Crew's team API on the server, so the admin token never reaches the browser. It has an overview of five numbers the team can act on, a one-page brief for each playtest wave (themes, moods, scores and the top three things to fix, with quotes) and the reports queue, in the Crew's own toy-signage look.",
    result:
      "Live on demo data, with a banner saying so; a private deploy can switch to real members. Getting it onto Workers meant turning off Next.js's new Cache Components, whose caching hung every request there, and fetching fresh on each page instead.",
    pageLink: "https://crew-team.marea-dvipa.uk",
    sourceLink: "https://github.com/axeljamal/crew-team",
    preview: { url: "https://crew-team.marea-dvipa.uk/", frame: "desktop" },
  },
  {
    name: "Hospitality site template",
    video: "/work/hospitality-next.mp4",
    image: hospitalityNext,
    role: "Marea Dvīpa, 2026. A reusable guest site for small hotels and guest houses, in Next.js",
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "JSON-LD", "Vitest", "Cloudflare"],
    problem:
      "Each guest house site I built by hand had to be built again for the next one, though the sections, the booking maths and the search data are much the same.",
    approach:
      "I rebuilt my Beam House site in Next.js as components, one per section, driven by a single typed file per venue: adding a guest house is adding one file. The booking calendar, the price summary, the walk through the house before you book and the accessibility statement all carry over. Open Graph tags and schema.org data are built from the same file.",
    result:
      "Live as a static site, keyboard-usable throughout and checked on a phone. 36 tests cover the price and booking maths and check every venue file, down to every photo existing. The owner's details stay clearly marked placeholders until a real venue fills them in.",
    pageLink: "https://hospitality-next.marea-dvipa.uk",
    sourceLink: "https://github.com/axeljamal/hospitality-next",
    preview: { url: "https://hospitality-next.marea-dvipa.uk/", frame: "desktop" },
  },
  {
    name: "Weather Dashboard",
    video: "/work/weather-dashboard.mp4",
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
    video: "/work/3d-product-demo.mp4",
    role: "Team project, 2023. Front end",
    stack: ["Vue 3", "Vite", "Three.js", "Bootstrap"],
    problem: "Static product images do not let people explore a product before they buy it.",
    approach: "An interactive 3D product scene in the browser, built with Vue and Three.js, with a cart and a checkout page wired through the router.",
    result: "A responsive 3D shopping demo that runs in any modern browser. The piece beside this is its own small demo, in Three.js: my Barong motif, lifted from the flat drawing into a mesh with Higgsfield image-to-3D. Drag it, throw it, change its finish.",
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
