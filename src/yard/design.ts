// Pinisi Yard: what a boat is made of, and what that makes her. A design is a handful of choices from fixed lists,
// so it can be saved, shared in a link and checked; the stats come from the parts by plain arithmetic, so a player
// can learn the rules by building (a racer hull under three tall masts and a two-storey cabin will roll over).

export const HULLS = {
  trader: { label: "Trader", note: "Broad and steady, room for cargo", length: 22, beam: 6.0, depth: 2.5, pace: 4, steady: 7 },
  racer: { label: "Racer", note: "Long and narrow, quick but tender", length: 22, beam: 4.4, depth: 2.0, pace: 7, steady: 4 },
  house: { label: "Houseboat", note: "Short and wide, made for living on", length: 17, beam: 6.6, depth: 2.2, pace: 2, steady: 8 },
} as const;

export const RIGS = {
  gaff: { label: "Gaff", note: "The classic pinisi rig, fore-and-aft", area: 1.0, height: 1.0 },
  tanja: { label: "Tanja", note: "Tilted rectangle, the old Indonesian sail", area: 1.15, height: 0.8 },
  square: { label: "Square", note: "Broad sails on yards, best downwind", area: 1.3, height: 1.15 },
} as const;

export const CABINS = {
  none: { label: "Open deck", drag: 0, top: 0, charm: 0 },
  low: { label: "Deckhouse", drag: 0.4, top: 0.6, charm: 1 },
  tall: { label: "Two storeys", drag: 0.9, top: 1.6, charm: 2 },
} as const;

// toy-brick colours; the ids stay as first named, so links shared before the brick look still open the same boat
export const PAINTS = {
  teak: { label: "Brown", hex: "#7c4a24" },
  cream: { label: "White", hex: "#f4f4f4" },
  indigo: { label: "Blue", hex: "#0055bf" },
  red: { label: "Red", hex: "#c91a09" },
  sea: { label: "Green", hex: "#00852b" },
  black: { label: "Black", hex: "#1b1b1b" },
} as const;

export const SAILS = {
  cream: { label: "White", hex: "#f4f4f4" },
  rust: { label: "Red", hex: "#c91a09" },
  indigo: { label: "Blue", hex: "#0055bf" },
  gold: { label: "Yellow", hex: "#ffcf00" },
} as const;

/** motifs from the Marea Dvīpa batik sets in /public/motifs, printed on the sails */
export const MOTIFS = {
  none: { label: "Plain", file: "" },
  ketupat: { label: "Ketupat", file: "ketupat-lattice.png" },
  rebung: { label: "Rebung", file: "rebung-border.png" },
  lotus: { label: "Lotus", file: "lotus-flower.png" },
  cloud: { label: "Wave cloud", file: "wave-cloud-ornament.png" },
  ntina: { label: "Ntina", file: "ntina-tile--gold.png" },
} as const;

export type HullId = keyof typeof HULLS;
export type RigId = keyof typeof RIGS;
export type CabinId = keyof typeof CABINS;
export type PaintId = keyof typeof PAINTS;
export type SailId = keyof typeof SAILS;
export type MotifId = keyof typeof MOTIFS;
export type Masts = 1 | 2 | 3;

export type Design = {
  hull: HullId;
  rig: RigId;
  masts: Masts;
  cabin: CabinId;
  paint: PaintId;
  stripe: PaintId;
  sail: SailId;
  motif: MotifId;
  name: string;
};

export const DEFAULT_DESIGN: Design = {
  hull: "trader", rig: "gaff", masts: 2, cabin: "low", paint: "red", stripe: "cream", sail: "cream", motif: "ketupat", name: "Bintang Laut",
};

export const NAME_MAX = 24;

export type Stats = { speed: number; stability: number; charm: number; capsizes: boolean; warnings: string[] };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

/** speed, stability and charm out of 10; a boat with stability under 2 rolls over at her launch */
export function stats(d: Design): Stats {
  const hull = HULLS[d.hull], rig = RIGS[d.rig], cabin = CABINS[d.cabin];
  const sail = d.masts * rig.area;                                   // 1 to 3.9
  const heel = d.masts * rig.height * 1.1 + cabin.top;               // how much weight and leverage sits up high
  const speed = clamp(hull.pace + sail * 1.4 - cabin.drag - (d.hull === "house" ? 0.5 : 0), 0, 10);
  const stability = clamp(hull.steady + 2 - heel * 1.25, 0, 10);
  const contrast = d.paint !== d.stripe ? 1 : 0;
  const charm = clamp(3 + cabin.charm + contrast + (d.motif !== "none" ? 2 : 0) + (d.name.trim() ? 1 : 0) + (d.masts >= 2 ? 1 : 0), 0, 10);

  const warnings: string[] = [];
  if (stability < 2) warnings.push("Top-heavy: she will roll over when you launch her. Try fewer masts, a lower cabin or a broader hull.");
  else if (stability < 3.5) warnings.push("Tender: she leans hard in a breeze.");
  if (speed < 3) warnings.push("Slow: more sail, or a slimmer hull, would help.");
  return { speed: round1(speed), stability: round1(stability), charm: round1(charm), capsizes: stability < 2, warnings };
}

/** a design from anything (saved data, a shared link), with every unknown or missing part put back to the default */
export function clean(raw: unknown): Design {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pick = <T extends object>(table: T, v: unknown, fallback: keyof T): keyof T =>
    typeof v === "string" && Object.hasOwn(table, v) ? (v as keyof T) : fallback;
  const masts = r.masts === 1 || r.masts === 2 || r.masts === 3 ? r.masts : DEFAULT_DESIGN.masts;
  const name = typeof r.name === "string" ? r.name.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, NAME_MAX) : DEFAULT_DESIGN.name;
  return {
    hull: pick(HULLS, r.hull, DEFAULT_DESIGN.hull),
    rig: pick(RIGS, r.rig, DEFAULT_DESIGN.rig),
    masts,
    cabin: pick(CABINS, r.cabin, DEFAULT_DESIGN.cabin),
    paint: pick(PAINTS, r.paint, DEFAULT_DESIGN.paint),
    stripe: pick(PAINTS, r.stripe, DEFAULT_DESIGN.stripe),
    sail: pick(SAILS, r.sail, DEFAULT_DESIGN.sail),
    motif: pick(MOTIFS, r.motif, DEFAULT_DESIGN.motif),
    name,
  };
}

/** a short code for a design, safe in a URL: ?boat=<code> */
export function encode(d: Design): string {
  const parts = [1, d.hull, d.rig, d.masts, d.cabin, d.paint, d.stripe, d.sail, d.motif, d.name].join("~");
  const bytes = new TextEncoder().encode(parts);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** the design in a code, or null when the code is not one */
export function decode(code: string): Design | null {
  try {
    const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    const text = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    const [v, hull, rig, masts, cabin, paint, stripe, sail, motif, ...name] = text.split("~");
    if (v !== "1") return null;
    return clean({ hull, rig, masts: Number(masts), cabin, paint, stripe, sail, motif, name: name.join("~") });
  } catch {
    return null;
  }
}
