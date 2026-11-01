// Marea Dvīpa's motifs on this site: the Bali master motifs and the Dua Pulau and Ntina signatures, each with its name.
export const MOTIFS: [string, string][] = [
  ["barong-mask", "Barong"],
  ["bomba-rose--buya", "Bomba rose"],
  ["lotus-flower", "Lotus flower"],
  ["cengkeh-sprig--buya", "Cengkeh sprig"],
  ["dua-pulau-medallion--buya", "Dua Pulau medallion"],
  ["wave-cloud-ornament", "Wave cloud"],
  ["lotus-bud", "Lotus bud"],
  ["bomba-rosette--buya", "Bomba rosette"],
  ["scroll-ornament", "Scroll"],
  ["ketupat-lattice--buya", "Ketupat lattice"],
  ["large-floral-ornament", "Large floral"],
  ["traditional-boat", "Perahu"],
  ["ntina-tile--gold", "Ntina tile"],
  ["lotus-floral-motif", "Lotus floral"],
  ["split-gate-candi-bentar", "Candi bentar"],
  ["border-filler-ornament", "Border filler"],
];

/** the motif's file for the ground it sits on: the gold-on-black "buya" versions on a dark ground, the Dua Pulau and black inks on a light one */
export const motifSrc = (m: string, theme: "light" | "dark" = "dark") => `/motifs/${theme === "light" ? m.replace(/--buya$/, "").replace(/--gold$/, "--black") : m}.png`;
