// Packs the few LDraw parts Pinisi Yard uses into self-contained .mpd files in public/ldraw/, so the site serves
// a dozen small files instead of the 100 MB library. Each part is followed through every sub-file it references
// (parts/s, p, p/48 and p/8 primitives) and written as one MPD: a one-line model placing the part, then each file.
//
//   LDRAW_DIR=~/Apps/ldraw/ldraw npm run yard:parts
//
// The LDraw parts library is © LDraw.org contributors, licensed CC BY 2.0 (https://www.ldraw.org/legal-info).
// Studs are the plain stud primitives: logo-on-stud primitives are refused.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ROOT = (process.env.LDRAW_DIR ?? join(homedir(), "Apps/ldraw/ldraw")).replace(/^~/, homedir());
const OUT = new URL("../public/ldraw/", import.meta.url).pathname;

/** the pieces the yard builds with, by the names src/yard/parts.ts loads them under */
const PARTS = {
  "brick-1x1": "3005.dat",
  "brick-1x2": "3004.dat",
  "brick-1x3": "3622.dat",
  "brick-1x4": "3010.dat",
  "plate-1x1": "3024.dat",
  "plate-1x2": "3023.dat",
  "plate-1x3": "3623.dat",
  "plate-1x4": "3710.dat",
  "tile-1x1": "3070b.dat",
  "tile-1x2": "3069b.dat",
  "tile-1x3": "63864.dat",
  "tile-1x4": "2431.dat",
  "round-1x1": "3062b.dat",
};

const DIRS = ["parts", "p"];
const norm = (name) => name.trim().toLowerCase().replace(/\\/g, "/");
function find(name) {
  for (const d of DIRS) {
    const p = join(ROOT, d, name);
    if (existsSync(p)) return p;
  }
  return null;
}

function pack(partFile) {
  const files = new Map(); // name -> text
  const queue = [norm(partFile)];
  while (queue.length) {
    const name = queue.shift();
    if (files.has(name)) continue;
    if (/logo/.test(name)) throw new Error(`refusing a logo primitive: ${name}`);
    const path = find(name);
    if (!path) throw new Error(`LDraw file not found: ${name} (looked in ${ROOT})`);
    const text = readFileSync(path, "latin1").replace(/\r\n/g, "\n");
    files.set(name, text);
    for (const line of text.split("\n")) {
      const t = line.trim().split(/\s+/);
      if (t[0] === "1" && t.length >= 15) queue.push(norm(t.slice(14).join(" ")));
    }
  }
  const main = `0 FILE model.ldr\n0 Pinisi Yard: ${partFile}\n1 16 0 0 0 1 0 0 0 1 0 0 0 1 ${partFile}\n`;
  // embedded names as three's LDrawLoader looks them up: it rewrites "s/x" to "parts/s/x" and "48/x" to "p/48/x"
  const asLoaded = (name) => (name.startsWith("s/") ? `parts/${name}` : name.startsWith("48/") ? `p/${name}` : name);
  return main + [...files].map(([name, text]) => `0 FILE ${asLoaded(name)}\n${text.trimEnd()}\n`).join("");
}

mkdirSync(OUT, { recursive: true });
let total = 0;
for (const [id, file] of Object.entries(PARTS)) {
  const mpd = pack(file);
  writeFileSync(join(OUT, `${id}.mpd`), mpd);
  total += mpd.length;
  console.log(`${id.padEnd(10)} ${file.padEnd(10)} ${(mpd.length / 1024).toFixed(1)} KB`);
}
writeFileSync(
  join(OUT, "LICENSE.txt"),
  "Part geometry from the LDraw Parts Library (https://library.ldraw.org), © LDraw.org contributors,\n" +
    "licensed under Creative Commons Attribution 2.0 (https://creativecommons.org/licenses/by/2.0/).\n" +
    "Packed for Pinisi Yard by scripts/pack-ldraw.mjs. LDraw is not affiliated with the LEGO Group.\n",
);
console.log(`total ${(total / 1024).toFixed(0)} KB in ${OUT}`);
