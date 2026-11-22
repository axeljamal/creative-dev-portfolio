// The ten places of Dua Pulau and the work each one holds. The case studies are the portfolio's own
// (src/content/work.ts), so a project is written once and shown in both.
import { caseStudies, type CaseStudy } from "../content/work";

export type PlaceId = "gate" | "pavilion" | "bale" | "guesthouse" | "barong" | "pier" | "table" | "huts" | "lighthouse" | "buoy";
export type Island = "md" | "wf" | "strait";
export type Place = {
  id: PlaceId;
  island: Island;
  /** the landmark */
  name: string;
  /** what it holds */
  holds: string;
  /** what there is to do there, as a line in the ship's log */
  quest: string;
  blurb: string;
  study?: CaseStudy;
  links: { label: string; href: string }[];
};

const study = (name: string) => caseStudies.find((c) => c.name === name);
const HOME = "/portfolio/"; // the classic portfolio, now that Dua Pulau is the home page

export const ISLAND_NAME: Record<Island, string> = { md: "Marea Dvīpa", wf: "Windfall", strait: "The strait" };

export const PLACES: Place[] = [
  {
    id: "gate",
    island: "md",
    name: "The candi bentar",
    holds: "About",
    quest: "Meet the maker",
    blurb: "A split gate marks the way in. Who made all this, and how the work is done.",
    links: [{ label: "Read more on the portfolio", href: `${HOME}#about` }],
  },
  {
    id: "pavilion",
    island: "md",
    name: "The pavilion",
    holds: "Marea Dvīpa",
    quest: "See the Pattern Studio",
    blurb: "The studio's mark, a pavilion by the sea, built solid: five roofs of black thatch over the Pattern Studio.",
    study: study("Marea Dvīpa"),
    links: [],
  },
  {
    id: "bale",
    island: "md",
    name: "The gamelan bale",
    holds: "Media Lab",
    quest: "Hear the gamelan play a motif",
    blurb: "Seven kettles and two gongs under an open roof. The Media Lab shows how each motif was made and scores it for this ensemble, synthesized in the browser. The music you hear in these waters is played on the same instruments.",
    links: [
      // the Media Lab as a room: this same bale, with the reels on a hung cloth and the gamelan playing each score
      { label: "Step inside the bale", href: "https://marea-dvipa.uk/bale" },
      { label: "Open the Media Lab", href: "https://marea-dvipa.uk/#lab" },
    ],
  },
  {
    id: "guesthouse",
    island: "md",
    name: "The guest house",
    holds: "Hospitality websites",
    quest: "Find the websites for small hotels",
    blurb: "Websites for small hotels and guest houses, from six years of working in hospitality: a clear brief, a fair price, a fast site that takes bookings directly.",
    links: [
      { label: "See the web work", href: "https://marea-dvipa.uk/web/" },
      { label: "Build a quote", href: "https://marea-dvipa.uk/quote/" },
    ],
  },
  {
    id: "barong",
    island: "md",
    name: "The Barong plinth",
    holds: "3D product demo",
    quest: "Turn the Barong in your hands",
    blurb: "The Barong motif, lifted from a flat drawing into a sculpture you can turn in your hands.",
    study: study("3D product demo"),
    links: [],
  },
  {
    id: "pier",
    island: "wf",
    name: "The pier",
    holds: "The Windfall story",
    quest: "Walk the Windfall story",
    blurb: "Walk out along the boards. The story tells how Windfall went from an idea to a working app, scroll by scroll, with the real app playing beside each chapter. The demo is the same app on the pilot's sample data.",
    links: [
      { label: "Walk the story", href: "https://demo.marea-dvipa.uk/story/" },
      { label: "Play the demo", href: "https://demo.marea-dvipa.uk/" },
    ],
  },
  {
    id: "table",
    island: "wf",
    name: "The supper table",
    holds: "Windfall",
    quest: "Sit down to supper at Windfall",
    blurb: "A long table laid for the neighbours, crates of the day's surplus beside it, and Pip waving you in.",
    study: study("Windfall"),
    links: [],
  },
  {
    id: "huts",
    island: "wf",
    name: "The beach huts",
    holds: "Bootcamp Connect and earlier work",
    quest: "Open the beach huts",
    blurb: "A terrace of huts on the shingle, one for each project that came before.",
    study: study("Bootcamp Connect"),
    links: [],
  },
  {
    id: "lighthouse",
    island: "wf",
    name: "The lighthouse",
    holds: "Weather Dashboard",
    quest: "Read today's weather from the lamp",
    blurb: "A lamp, a vane and a spinning anemometer on the eastern point.",
    study: study("Weather Dashboard"),
    links: [],
  },
  {
    id: "buoy",
    island: "strait",
    name: "The Dua Pulau medallion",
    holds: "Contact",
    quest: "Say hello at the medallion",
    blurb: "Two islands in one ring, afloat between them. Have a project in mind, or a role to fill? Say hello.",
    links: [{ label: "Write a message", href: `${HOME}#contact` }],
  },
];

export const place = (id: PlaceId) => PLACES.find((p) => p.id === id)!;
