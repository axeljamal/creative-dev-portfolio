// Marea Dvīpa's Pattern Studio rules, ported from its engine (marea-dvipa src/engine/layouts.js, fibonacci.js and
// signature.js, contract 0.2.91) for the Pattern Studio's card. The layout recipes are the Studio's own: each places
// several motifs in one tile (the hero, its crown, lotus fillers on the diagonals) and the tile repeats; the Fibonacci
// bloom and the Bomba garden turn every motif by the golden angle out from a hero at the heart.

export type Placed = { m: string; x: number; y: number; w: number; h: number; rot: number; flip: boolean };
export type Pattern = { title: string; items: Placed[]; lines: string[] };

// height / width of each motif (the Studio's master files)
const AR: Record<string, number> = {
  "barong-mask": 1.272, "traditional-boat": 1.102, "split-gate-candi-bentar": 0.99, "large-floral-ornament": 1.069,
  "wave-cloud-ornament": 0.835, "lotus-floral-motif": 0.96, "scroll-ornament": 1.031, "lotus-flower": 1.065,
  "lotus-bud": 1.298, "border-filler-ornament": 0.132, "bomba-rose": 1.4, "bomba-rosette": 1.0, "rebung-border": 0.328,
  "ketupat-lattice": 1.0, "cengkeh-sprig": 1.15, "dua-pulau-medallion": 1.0,
};
const SIGNATURE = new Set(["bomba-rose", "bomba-rosette", "rebung-border", "ketupat-lattice", "cengkeh-sprig", "dua-pulau-medallion"]);
/** the motif's file: the signature motifs in their gold buya inks, which sit on the dark grounds */
export const motifFile = (m: string) => `/motifs/${SIGNATURE.has(m) ? `${m}--buya` : m}.png`;

type Opts = { hero: string; crown: string; mirror: boolean };
type Row = [string, number, number, number, boolean]; // motif, centre x, centre y, width, flip
type Layout = { title: string; tw: number; th: number; scale: number; items: (o: Opts) => Row[] };

const LAYOUTS: Layout[] = [
  {
    title: "Royal Damask", tw: 380, th: 460, scale: 0.5,
    items: (o) => [[o.hero, 0, 0, 150, false], [o.crown, 190, 230, 176, false],
      ["lotus-bud", 190, 10, 38, false], ["lotus-bud", 0, 240, 38, false],
      ["lotus-flower", 95, 118, 54, false], ["lotus-flower", 285, 348, 54, false],
      ["scroll-ornament", 285, 112, 56, false], ["scroll-ornament", 95, 342, 56, true]],
  },
  {
    title: "Ketupat Field", tw: 300, th: 300, scale: 0.5,
    items: () => [["ketupat-lattice", 0, 0, 300, false], ["bomba-rosette", 150, 150, 120, false], ["lotus-bud", 0, 0, 34, false]],
  },
  {
    title: "Ocean Voyage", tw: 440, th: 380, scale: 0.5,
    items: (o) => [["traditional-boat", 0, 0, 170, false], ["wave-cloud-ornament", 220, 20, 130, o.mirror],
      ["lotus-floral-motif", 110, 190, 96, false], ["lotus-bud", 330, 190, 40, false],
      ["scroll-ornament", 330, 110, 46, false], ["lotus-flower", 0, 190, 40, false]],
  },
  {
    title: "Lotus Garden", tw: 300, th: 300, scale: 0.55,
    items: () => [["lotus-floral-motif", 0, 0, 124, false], ["lotus-flower", 150, 150, 92, false],
      ["lotus-bud", 150, 0, 38, false], ["lotus-bud", 0, 150, 38, false],
      ["scroll-ornament", 75, 78, 52, false], ["scroll-ornament", 225, 78, 52, true],
      ["scroll-ornament", 75, 228, 52, true], ["scroll-ornament", 225, 228, 52, false]],
  },
  {
    title: "Dua Pulau Sarong", tw: 640, th: 600, scale: 0.42,
    items: (o) => [["rebung-border", 0, 0, 640, false],
      [o.hero, -160, 330, 150, false], ["bomba-rose", 160, 320, 140, false],
      ["cengkeh-sprig", 0, 360, 92, false], ["lotus-bud", 320, 350, 40, false]],
  },
  {
    title: "Temple Frieze", tw: 900, th: 400, scale: 0.34,
    items: (o) => [["border-filler-ornament", 0, 0, 840, false], ["lotus-bud", 450, 0, 44, false],
      [o.hero, 0, 210, 130, false], ["split-gate-candi-bentar", 450, 210, 170, false],
      ["lotus-flower", 225, 220, 58, false], ["lotus-flower", 675, 220, 58, false]],
  },
];

const put = (m: string, cx: number, cy: number, w: number, rot = 0, flip = false): Placed => {
  const h = w * (AR[m] ?? 1);
  return { m, x: cx - w / 2, y: cy - h / 2, w, h, rot, flip };
};

/** the Studio's placeLayout: the tile's motifs repeated over the whole view, centred, nothing drawn that falls outside */
function tiled(L: Layout, o: Opts, vw: number, vh: number): Placed[] {
  const s = L.scale, tw = L.tw * s, th = L.th * s, out: Placed[] = [];
  const nx = Math.ceil(vw / tw) + 2, ny = Math.ceil(vh / th) + 2;
  const ox = (vw / 2) % tw, oy = (vh / 2) % th;
  for (let j = -1; j < ny; j++)
    for (let i = -1; i < nx; i++)
      for (const [m, bx, by, bw, flip] of L.items(o)) {
        const x = ox + i * tw + bx * s, y = oy + j * th + by * s, pw = bw * s, ph = pw * (AR[m] ?? 1);
        if (x + pw / 2 < 0 || x - pw / 2 > vw || y + ph / 2 < 0 || y - ph / 2 > vh) continue;
        out.push(put(m, x, y, pw, 0, flip));
      }
  return out;
}

// the Fibonacci rules: the golden angle, Fibonacci tiers, φ
const PHI = (1 + Math.sqrt(5)) / 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5)); // 137.5°
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];
function fibTier(i: number) {
  let t = 0, acc = 1;
  while (i >= acc && t < 7) {
    t++;
    acc += FIB[t];
  }
  return t;
}
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** a smooth line through points, as the Studio draws its parastichies */
function smooth(pts: [number, number][]) {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/** Vogel phyllotaxis: each motif 137.5° on from the last at radius ∝ √n, sizes stepping down by φ across Fibonacci
 * tiers, turned to flow outward; the 8 and 13 parastichy spirals drawn as fine gold lines */
function bloom(title: string, ladder: string[], count: number, vw: number, vh: number, seed: number): Pattern {
  const R = seeded(seed), a = 0.25, jit = (amt: number) => (R() - 0.5) * 2 * amt;
  const cx = vw / 2, cy = vh * 0.42, heroW = Math.min(vw, vh) * 0.3;
  const heroR = heroW * 0.62, maxR = (Math.hypot(vw, vh) / 2) * 1.04, c = (maxR - heroR) / Math.sqrt(count);
  const items = [put(ladder[0], cx, cy, heroW)];
  const pts: [number, number][] = [[cx, cy]];
  for (let i = 1; i < count; i++) {
    const t = Math.max(1, fibTier(i));
    const th = i * GOLDEN * (1 + jit(a * 0.012)) + jit(a * 0.22);
    const r = heroR + c * Math.sqrt(i) * (1 + jit(a * 0.16));
    const x = cx + r * Math.cos(th), y = cy + r * Math.sin(th);
    pts.push([x, y]);
    const w = c * 1.45 * Math.pow(PHI, Math.max(0, 4 - t) * 0.3) * (1 + jit(a * 0.3));
    items.push(put(ladder[Math.min(t, ladder.length - 1)], x, y, w, (th * 180) / Math.PI + 90 + jit(a * 25)));
  }
  const lines: string[] = [];
  for (const step of [8, 13])
    for (let k = 1; k <= step; k++) {
      const chain: [number, number][] = [];
      for (let j = k; j < pts.length; j += step) chain.push(pts[j]);
      if (chain.length > 2) lines.push(smooth(chain));
    }
  return { title, items, lines };
}

const HEROES = ["barong-mask", "dua-pulau-medallion"];
const CROWNS = ["large-floral-ornament", "lotus-floral-motif"];
// the order the card plays them: tiled recipes with a bloom after every three (the indices are into LAYOUTS)
const ORDER: (number | "bloom" | "garden")[] = [0, 1, "bloom", 2, 3, "garden", 4, 5];
export const PATTERN_COUNT = ORDER.length;

/** the n-th pattern on the card: the Studio's recipes in turn, with the two Fibonacci blooms between them */
export function pattern(n: number, vw: number, vh: number): Pattern {
  const o: Opts = { hero: HEROES[Math.floor(n / ORDER.length) % HEROES.length], crown: CROWNS[n % CROWNS.length], mirror: n % 2 === 1 };
  const k = ORDER[n % ORDER.length];
  if (k === "bloom")
    return bloom("Fibonacci Bloom", [o.hero, o.crown, "lotus-floral-motif", "lotus-flower", "wave-cloud-ornament", "scroll-ornament", "lotus-bud", "lotus-bud"], 34, vw, vh, n + 1);
  if (k === "garden")
    return bloom("Bomba Garden", ["barong-mask", "bomba-rosette", "bomba-rose", "cengkeh-sprig", "bomba-rosette", "bomba-rose", "lotus-bud", "lotus-bud"], 34, vw, vh, n + 7);
  const L = LAYOUTS[k];
  return { title: L.title, items: tiled(L, o, vw, vh), lines: [] };
}
