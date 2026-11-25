// The one-page brief for a playtest wave: how it scored, how people felt, and the three things to fix first,
// each with the players' own words. Ranked by how many players hit a problem and how unhappy they were,
// so a game team can read it in a minute and act on it.

import { keywordTheme, THEME_LABELS, type Mood, type Theme } from "./tagging";

export type TaggedFeedback = { id: string; score: number; liked: string; blocked: string; theme: Theme; mood: Mood };

export type Brief = {
  responses: number;
  averageScore: number | null;
  moods: Record<Mood, number>;
  fixFirst: { theme: Theme; label: string; players: number; quotes: string[] }[];
  keep: { theme: Theme; label: string; players: number; quotes: string[] }[];
};

const MOOD_WEIGHT: Record<Mood, number> = { negative: 2, mixed: 1, positive: 0 };

/** the start of a player's words, cut at a sentence or a word so a quote stays readable */
export function quote(text: string, max = 140) {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const sentence = cut.match(/^(.*[.!?])\s/)?.[1];
  return sentence && sentence.length > max / 2 ? sentence : `${cut.replace(/\s+\S*$/, "")}…`;
}

export function waveBrief(items: TaggedFeedback[]): Brief {
  const moods: Record<Mood, number> = { positive: 0, mixed: 0, negative: 0 };
  for (const f of items) moods[f.mood] += 1;

  // problems: what got in the way, grouped by theme, weighted by mood
  const problems = new Map<Theme, { weight: number; players: number; quotes: string[] }>();
  // strengths: what felt good from players who were happy overall
  const strengths = new Map<Theme, { players: number; quotes: string[] }>();

  for (const f of items) {
    if (f.blocked.trim() && f.mood !== "positive") {
      const p = problems.get(f.theme) ?? { weight: 0, players: 0, quotes: [] };
      p.players += 1;
      p.weight += 1 + MOOD_WEIGHT[f.mood];
      if (p.quotes.length < 2) p.quotes.push(quote(f.blocked));
      problems.set(f.theme, p);
    }
    // a response's theme is about what got in the way, so what felt good is sorted by its own words
    const likedTheme = keywordTheme(f.liked, "");
    if (f.liked.trim() && f.mood !== "negative" && likedTheme !== "other") {
      const s = strengths.get(likedTheme) ?? { players: 0, quotes: [] };
      s.players += 1;
      if (s.quotes.length < 1) s.quotes.push(quote(f.liked));
      strengths.set(likedTheme, s);
    }
  }

  const fixFirst = [...problems.entries()]
    .sort((a, b) => b[1].weight - a[1].weight || b[1].players - a[1].players)
    .slice(0, 3)
    .map(([theme, p]) => ({ theme, label: THEME_LABELS[theme], players: p.players, quotes: p.quotes }));

  const keep = [...strengths.entries()]
    .sort((a, b) => b[1].players - a[1].players)
    .slice(0, 3)
    .map(([theme, s]) => ({ theme, label: THEME_LABELS[theme], players: s.players, quotes: s.quotes }));

  const averageScore = items.length ? Math.round((items.reduce((n, f) => n + f.score, 0) / items.length) * 10) / 10 : null;
  return { responses: items.length, averageScore, moods, fixFirst, keep };
}
