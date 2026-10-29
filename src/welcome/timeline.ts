// The welcome film, written as a score on the 138 bpm grid of Marea Dvīpa's Bomba Rose reel: acts made of beats,
// each beat changing the layout, the ground or the caption, and ringing the kettles, gongs and drum as it lands.
// The Work chapter shows one project, Marea Dvīpa: its Pattern Studio, the Bomba Rose growing its petal rings to its
// own music (which you can play), and the Media Lab that shows how each motif was made.
import { profile } from "../content/profile";
import { skills } from "../content/skills";
import { KAILI_BARS, ringScore } from "./bungaKaili";
import type { Strike } from "./sound";
import { BAR, BEAT, GA } from "./tempo";
import mareaStudio from "../assets/marea-studio.jpg";
import mareaLab from "../assets/marea-lab.jpg";

export { BAR, BEAT, GA };
const E8 = BEAT / 2;
/** a kettle (0–6) for the i-th step round the golden angle */
export const gseq = (i: number) => Math.floor((((i * GA) % (Math.PI * 2)) / (Math.PI * 2)) * 7) % 7;

export const COUNT = 21; // motifs on stage, kept the same so every layout can glide into the next

export const CARDS = [
  { image: mareaStudio, eyebrow: "Marea Dvīpa · React · Vite · PWA", name: "Pattern Studio" },
  { image: mareaLab, eyebrow: "Marea Dvīpa · Canvas · Web Audio", name: "Media Lab" },
];

export type Layout = "stream" | "bloom" | "orbit" | "lattice";
export type Caption = { eyebrow: string; head: string; body?: string };
export type View = {
  act: string;
  layout: Layout;
  ground: string;
  overlay: "title" | "card" | "rose" | "end" | null;
  dim: boolean;
  reveal: number | null; // motifs shown so far (bloom), or null for all
  card: number | null; // index into CARDS
  seed: number;
  caption: Caption | null;
};
type Beat = { t: number; view: Partial<View>; sound: Strike[] | null };
export type Act = { id: string; label: string; bars: number; start: number; dur: number };

export function buildTimeline() {
  // the Work chapter: 2 bars of the Pattern Studio, the ring section of Bunga Kaili with the rose, 2 bars of the Media Lab
  const acts: Act[] = [
    { id: "title", label: "Welcome", bars: 3 },
    { id: "motifs", label: "Craft", bars: 7 },
    { id: "work", label: "Work", bars: 2 + KAILI_BARS + 2 },
    { id: "how", label: "How I work", bars: 4 },
    { id: "end", label: "Enter", bars: 4 },
  ].map((a) => ({ ...a, start: 0, dur: 0 }));
  let at = 0;
  for (const a of acts) {
    a.start = at;
    a.dur = a.bars * BAR;
    at += a.dur;
  }
  const total = at;
  const A = Object.fromEntries(acts.map((a) => [a.id, a]));
  const roseAct = { start: A.work.start + 2 * BAR, dur: KAILI_BARS * BAR };
  const beats: Beat[] = [];
  const add = (t: number, view: Partial<View>, sound: Strike[] | null = null) => beats.push({ t, view, sound });

  // 1 · Title: the Ntina mark and the name over a drifting stream on Bomba black
  add(
    A.title.start,
    { act: "title", layout: "stream", ground: "#0E0C09", overlay: "title", dim: true, reveal: null, card: null, seed: 1, caption: null },
    [{ k: "gong", n: 0, v: 0.5, at: 0.05 }, ...[0, 2, 4, 5].map((n, i): Strike => ({ k: "kettle", n, v: 0.4, at: BAR + i * E8 }))],
  );
  add(A.title.start + 2 * BAR, {}, [{ k: "gong", n: 1, v: 0.35 }]);

  // 2 · Motif by motif: a Fibonacci bloom, each motif landing on a kakula note
  const m0 = A.motifs.start;
  add(
    m0,
    {
      act: "motifs", layout: "bloom", ground: "#02213D", overlay: null, dim: false, reveal: 0, seed: 2,
      caption: { eyebrow: profile.title, head: "Motif by motif, at the golden angle", body: profile.intro },
    },
    [{ k: "gong", n: 0, v: 0.45 }],
  );
  for (let i = 0; i < COUNT; i++) {
    add(m0 + BAR + i * E8, { reveal: i + 1 }, [{ k: "kettle", n: gseq(i), v: 0.36 - i * 0.005, oct: i % 5 === 4, soft: i > 14 }]);
  }
  add(m0 + BAR + COUNT * E8 + E8, { reveal: null }, [
    { k: "gong", n: 1, v: 0.42 },
    { k: "kettle", n: 0, v: 0.3, at: BEAT },
    { k: "kettle", n: 4, v: 0.3, at: BEAT * 1.5 },
  ]);

  // 3 · Work: Marea Dvīpa
  const cardBeat = (k: number): Strike[] => [
    { k: "gong", n: (k % 2) as 0 | 1, v: 0.4 },
    { k: "drum", n: "dum", v: 0.5 },
    ...[0, 2, 4].map((d, i): Strike => ({ k: "kettle", n: (k + d) % 7, v: 0.34, at: E8 * (i + 1) })),
    { k: "drum", n: "tak", v: 0.35, at: BEAT * 2 },
    { k: "drum", n: "dum", v: 0.4, at: BAR },
    { k: "kettle", n: (k + 5) % 7, v: 0.3, oct: true, at: BAR + BEAT },
  ];
  add(
    A.work.start,
    {
      act: "work", layout: "orbit", ground: "#1F5C63", overlay: "card", card: 0, dim: true, reveal: null, seed: 3,
      caption: { eyebrow: "Selected work · Marea Dvīpa", head: "Pattern Studio", body: "Batik repeats and Fibonacci flows rebuilt live from master motifs and my own Dua Pulau and Ntina designs, with an Albers colour test and a stencil check." },
    },
    cardBeat(0),
  );

  // the Bomba Rose grows its petal rings to the ring section of Bunga Kaili, and you can play it
  const r0 = roseAct.start;
  add(r0, {
    overlay: "rose", card: null, ground: "#0E0C09", layout: "bloom", seed: 5,
    caption: { eyebrow: "Marea Dvīpa · Media Lab", head: "The Bomba Rose grows its petal rings", body: "Rings of 13, 8, 5 and 3 petals, each turned by the golden angle from the one outside it, so no petal hides behind another." },
  });
  add(r0 + 4 * BAR, { caption: { eyebrow: "Music · Bunga Kaili", head: "The rose plays itself", body: "My original song for a synthesized Kaili kakula ensemble. Each ring's petals become a rhythm, 13, 8, 5 and 3 notes in 16, picked by the golden angle." } });
  add(r0 + 8 * BAR, { caption: { eyebrow: "Sound · Web Audio", head: "Every sound is made in code", body: "Kakula kettles, tawa-tawa gongs, gimba drums, gamba-gamba and the loom, all oscillators and noise. No samples, and no traditional piece is quoted." } });
  add(r0 + 12 * BAR, { caption: { eyebrow: "Play with it", head: "Spin the rose, tap a ring", body: "Tap a ring to hear its petals, the heart for a gong, or any kettle. Switch the golden turn off and the petals stack into spokes." } });
  for (const e of ringScore()) {
    const { t, ...strike } = e;
    add(r0 + t, {}, [strike as Strike]);
  }

  add(
    r0 + roseAct.dur,
    {
      overlay: "card", card: 1, ground: "#02213D", layout: "orbit", seed: 6,
      caption: { eyebrow: "Selected work · Marea Dvīpa", head: "Media Lab", body: "How each motif was made, step by step, from listening to the cloth to the finished system, with a process checklist, an explore bench and video recording." },
    },
    cardBeat(1),
  );

  // 4 · How I work: the motifs settle into a repeat, like a batik lattice
  const names = skills.map((s) => s.name);
  [0, 1].forEach((k) => {
    add(
      A.how.start + k * 2 * BAR,
      {
        act: "how", layout: "lattice", ground: k ? "#2A6F74" : "#0E0C09", overlay: null, card: null, dim: false, seed: 7 + k,
        caption:
          k === 0
            ? { eyebrow: "How I work", head: "Spec first, tested, to the standard", body: "Figma to React with Claude Code, built to Apple's Human Interface Guidelines and WCAG 2.2 AA." }
            : { eyebrow: "Tools", head: names.slice(0, 5).join(" · "), body: names.slice(5).join(" · ") || undefined },
      },
      [
        ...(k === 0 ? [{ k: "gong", n: 0, v: 0.42 } as Strike] : []),
        { k: "drum", n: "dum", v: 0.55 },
        { k: "drum", n: "tak", v: 0.35, at: BEAT * 1.5 },
        { k: "drum", n: "dum", v: 0.45, at: BEAT * 2 },
        { k: "drum", n: "tak", v: 0.35, at: BEAT * 3 },
        ...[0, 1, 2, 3].map((i): Strike => ({ k: "kettle", n: gseq(k * 4 + i), v: 0.32, at: BAR + i * E8 })),
      ],
    );
  });

  // 5 · End: the way in
  add(
    A.end.start,
    { act: "end", layout: "bloom", ground: "#0E0C09", overlay: "end", dim: true, card: null, seed: 9, caption: null },
    [{ k: "gong", n: 0, v: 0.5 }, ...[6, 4, 2, 0].map((n, i): Strike => ({ k: "kettle", n, v: 0.36, at: BEAT * (i + 1) })), { k: "gong", n: 1, v: 0.3, at: BAR * 2 }],
  );

  beats.sort((a, b) => a.t - b.t);
  return { acts, beats, total, roseAct };
}
