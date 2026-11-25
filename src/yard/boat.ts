// Pinisi Yard: a boat from a design, built in toy bricks. The hull's lines are sampled on the stud grid: every cell
// inside her lines is a brick, only the shell is kept, and the top of each column is her deck (studded) or, at her
// sides, her sheer stripe. Masts are stacked round bricks; the sails stay cloth, printed with the chosen batik, as
// sails on brick ships are. Her waterline is y = 0, her bow points +x, and she is centred on her length.
import * as THREE from "three";
import { Bricks, plastic } from "./bricks";
import { HULLS, MOTIFS, PAINTS, SAILS, RIGS, type Design } from "./design";
import type { Built } from "../dua-pulau/world/vessel";

const PI = Math.PI;
export const PITCH = 0.5;
const BH = PITCH * 1.2;

/** the hull's shape along her length, u from 0 (stern) to 1 (bow) */
export function hullLines(d: Design) {
  const { length: L, beam: B, depth: D } = HULLS[d.hull];
  const racer = d.hull === "racer";
  return {
    L, B, D,
    half: (u: number) => (B / 2) * Math.pow(Math.sin(PI * (0.13 + 0.85 * u)), racer ? 0.75 : 0.55),
    sheer: (u: number) => 0.55 * D + 0.75 * D * Math.pow(u, 5) + 0.45 * D * Math.pow(1 - u, 4),
    keel: (u: number) => -0.55 * D * Math.pow(Math.sin(PI * (0.04 + 0.92 * u)), 0.35),
  };
}

/** how far her lowest bricks reach below the waterline */
export function keelDepth(d: Design) {
  return Math.ceil(-hullLines(d).keel(0.5) / BH) * BH;
}

const DECK = "#e4cd9e"; // tan
const WOOD = "#7c4a24"; // reddish brown
const WINDOW = "#9fd3f2";

// ---------- printed parts: sails and the name tile ----------
const images = new Map<string, HTMLImageElement>();
function motifImage(file: string, onReady: () => void) {
  let img = images.get(file);
  if (!img) {
    img = new Image();
    img.decoding = "async";
    img.src = `/motifs/${file}`;
    images.set(file, img);
  }
  if (!img.complete) img.addEventListener("load", onReady, { once: true });
  return img;
}
function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function sailTexture(d: Design, onAsset: () => void) {
  const file = MOTIFS[d.motif].file;
  const img = file ? motifImage(file, onAsset) : null;
  return canvasTexture(512, 512, (g) => {
    g.fillStyle = SAILS[d.sail].hex;
    g.fillRect(0, 0, 512, 512);
    g.strokeStyle = "rgba(0,0,0,.12)";
    g.lineWidth = 3;
    for (let x = 64; x < 512; x += 64) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, 512);
      g.stroke();
    }
    if (img && img.complete && img.naturalWidth) {
      const r = img.naturalWidth / img.naturalHeight, big = 260;
      g.drawImage(img, 256 - (big * r) / 2, 250 - big / 2, big * r, big);
      for (let x = 20; x < 512; x += 84) g.drawImage(img, x, 440, 52 * r, 52);
    }
    g.strokeStyle = "rgba(0,0,0,.35)";
    g.lineWidth = 14;
    g.strokeRect(7, 7, 498, 498);
  });
}
function nameTexture(name: string, paint: string, ink: string) {
  return canvasTexture(512, 128, (g) => {
    g.fillStyle = paint;
    g.fillRect(0, 0, 512, 128);
    g.fillStyle = ink;
    g.font = "700 60px Fredoka, 'Arial Rounded MT Bold', sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(name, 256, 68, 480);
  });
}

/** a cloth panel through four corners (luff foot, luff head, leech head, leech foot), bellied by the wind */
function sailMesh(corners: THREE.Vector3[], belly: THREE.Vector3, mat: THREE.Material) {
  const [p00, p01, p11, p10] = corners;
  const N = 10, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const v = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  for (let i = 0; i <= N; i++)
    for (let j = 0; j <= N; j++) {
      const s = i / N, t = j / N;
      a.lerpVectors(p00, p01, t);
      b.lerpVectors(p10, p11, t);
      v.lerpVectors(a, b, s).addScaledVector(belly, Math.sin(PI * s) * Math.sin(PI * (0.15 + 0.85 * t)));
      pos.push(v.x, v.y, v.z);
      uv.push(s, t);
      if (i < N && j < N) {
        const q = i * (N + 1) + j;
        idx.push(q, q + N + 1, q + 1, q + 1, q + N + 1, q + N + 2);
      }
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  return m;
}
/** a bar between two points: yards, gaffs, booms and the bowsprit */
function bar(from: THREE.Vector3, to: THREE.Vector3, r: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, from.distanceTo(to), 12), mat);
  m.position.copy(from).add(to).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  m.castShadow = true;
  return m;
}

export type Boat = { group: THREE.Group; sails: THREE.Mesh[]; flag: THREE.Mesh; bricks: number; dispose: () => void };

const MAST_AT: Record<1 | 2 | 3, number[]> = { 1: [0.08], 2: [0.2, -0.1], 3: [0.27, 0.04, -0.2] };

export function buildBoat(d: Design, onAsset: () => void): Boat {
  const h = hullLines(d), rig = RIGS[d.rig];
  const paint = PAINTS[d.paint].hex, stripe = PAINTS[d.stripe].hex;
  const bottom = new THREE.Color(paint).lerp(new THREE.Color("#1b1b1b"), 0.45).getHexString();
  const kit = new Bricks(PITCH);

  // ---------- the hull, sampled on the grid ----------
  const ix0 = Math.floor(-h.L / 2 / PITCH), ix1 = Math.ceil(h.L / 2 / PITCH);
  const izMax = Math.ceil(h.B / 2 / PITCH);
  const maxZ = (ix: number, iy: number) => {
    const u = (ix * PITCH) / h.L + 0.5;
    if (u < 0 || u > 1) return -1;
    const y = iy * BH + BH / 2, k = h.keel(u), sh = h.sheer(u);
    if (y < k - BH * 0.3 || y > sh) return -1;
    const s = Math.pow(Math.max(0, (y - k) / (sh - k)), 1 / 1.6);
    return Math.max(PITCH * 0.5, h.half(u) * (1 - Math.pow(1 - s, 2.2)));
  };
  const inside = (ix: number, iy: number, iz: number) => Math.abs(iz * PITCH) <= maxZ(ix, iy);
  const iyLo = Math.floor(-h.D / BH) - 1, iyHi = Math.ceil((h.D * 1.4) / BH) + 1;
  const top = new Map<string, number>(); // highest layer of each column
  for (let ix = ix0; ix <= ix1; ix++)
    for (let iz = -izMax; iz <= izMax; iz++)
      for (let iy = iyLo; iy <= iyHi; iy++) if (inside(ix, iy, iz)) top.set(`${ix},${iz}`, Math.max(top.get(`${ix},${iz}`) ?? -99, iy));
  for (let ix = ix0; ix <= ix1; ix++)
    for (let iz = -izMax; iz <= izMax; iz++) {
      const t = top.get(`${ix},${iz}`);
      if (t === undefined) continue;
      const edge = !top.has(`${ix},${iz + 1}`) || !top.has(`${ix},${iz - 1}`) || !top.has(`${ix + 1},${iz}`) || !top.has(`${ix - 1},${iz}`);
      for (let iy = iyLo; iy <= t; iy++) {
        if (!inside(ix, iy, iz)) continue;
        const shell = !inside(ix + 1, iy, iz) || !inside(ix - 1, iy, iz) || !inside(ix, iy, iz + 1) || !inside(ix, iy, iz - 1) || !inside(ix, iy - 1, iz) || iy === t;
        if (!shell) continue;
        const color = iy === t ? (edge ? stripe : DECK) : iy === t && edge ? stripe : iy < 0 ? `#${bottom}` : paint;
        kit.set(ix, iy, iz, color);
      }
      // a rail of studded bricks along her edges
      if (edge) kit.set(ix, t + 1, iz, stripe);
    }
  const deckTop = (x: number) => {
    const ix = Math.round(x / PITCH);
    return (top.get(`${ix},0`) ?? 0) + 1; // first free layer above the deck
  };

  // ---------- the cabin ----------
  if (d.cabin !== "none") {
    const cx = Math.round((-0.17 * h.L) / PITCH), half = Math.round((0.12 * h.L) / PITCH);
    const wid = Math.max(2, Math.floor((h.half((-0.17 * h.L) / h.L + 0.5) * 0.62) / PITCH));
    const walls = d.paint === "cream" ? "#e4cd9e" : "#f4f4f4";
    let base = deckTop(cx * PITCH);
    for (let s = 0; s < (d.cabin === "tall" ? 2 : 1); s++) {
      const x0 = cx - half + s * 2, x1 = cx + half - s, w = wid - s;
      kit.box(x0, x1, base, base + 2, -w, w, walls);
      for (let x = x0 + 1; x < x1; x += 2) {
        kit.set(x, base + 1, -w, WINDOW, "tile");
        kit.set(x, base + 1, w, WINDOW, "tile");
      }
      kit.box(x0 - 1, x1 + 1, base + 3, base + 3, -w - 1, w + 1, stripe, "plate");
      base += 4;
    }
  }

  // ---------- masts, of stacked round bricks ----------
  const xs = MAST_AT[d.masts].map((f) => Math.round((f * h.L) / PITCH));
  const H = (6.5 + h.L * 0.32) * rig.height;
  const heads: THREE.Vector3[] = [];
  xs.forEach((ix, i) => {
    const base = deckTop(ix * PITCH);
    const tall = H * (i === 0 && d.masts > 1 ? 0.92 : 1) * (i === xs.length - 1 && d.masts === 3 ? 0.82 : 1);
    const n = Math.round(tall / BH);
    for (let k = 0; k < n; k++) kit.set(ix, base + k, 0, WOOD, "round");
    heads.push(new THREE.Vector3(ix * PITCH, (base + n) * BH, 0));
  });

  const group = new THREE.Group();
  const hull = kit.build();
  group.add(hull);

  // ---------- spars and sails ----------
  const barMat = plastic({ color: WOOD });
  const sailMat = new THREE.MeshStandardMaterial({ map: sailTexture(d, onAsset), roughness: 0.85, side: THREE.DoubleSide });
  const sails: THREE.Mesh[] = [];
  const bowTip = new THREE.Vector3(ix1 * PITCH, (top.get(`${ix1 - 1},0`) ?? 3) * BH + BH, 0);
  const sprit = bowTip.clone().add(new THREE.Vector3(h.L * 0.18, h.L * 0.04, 0));
  group.add(bar(bowTip.clone().add(new THREE.Vector3(-1.5, 0, 0)), sprit, 0.12, barMat));
  const lee = new THREE.Vector3(0, 0, 1);
  heads.forEach((head, i) => {
    const x = head.x, y0 = deckTop(x) * BH, tall = head.y - y0;
    const gap = i < heads.length - 1 ? x - heads[i + 1].x : x + 0.42 * h.L;
    const span = Math.min(gap * 0.88, h.L * 0.3);
    if (d.rig === "gaff") {
      const c = [new THREE.Vector3(x - 0.3, y0 + 1.4, 0), new THREE.Vector3(x - 0.3, y0 + tall * 0.8, 0),
        new THREE.Vector3(x - span, y0 + tall * 0.97, 0.2), new THREE.Vector3(x - span, y0 + 1.5, 0.3)];
      sails.push(sailMesh(c, lee.clone().multiplyScalar(span * 0.08), sailMat));
      group.add(bar(c[1], c[2], 0.09, barMat), bar(c[0], c[3], 0.1, barMat));
    } else if (d.rig === "tanja") {
      const c = [new THREE.Vector3(x + span * 0.35, y0 + 1.2, 0), new THREE.Vector3(x + span * 0.05, y0 + tall * 0.95, 0),
        new THREE.Vector3(x - span * 0.75, y0 + tall * 0.72, 0.3), new THREE.Vector3(x - span * 0.35, y0 + 1.0, 0.35)];
      sails.push(sailMesh(c, lee.clone().multiplyScalar(span * 0.08), sailMat));
      group.add(bar(c[1], c[2], 0.1, barMat), bar(c[0], c[3], 0.1, barMat));
    } else {
      for (const [lo, hi, w] of [[0.2, 0.53, 0.62], [0.56, 0.92, 0.48]] as const) {
        const half = h.B * w, xs0 = x + 0.4;
        const c = [new THREE.Vector3(xs0, y0 + tall * lo, -half), new THREE.Vector3(xs0, y0 + tall * hi, -half * 0.92),
          new THREE.Vector3(xs0, y0 + tall * hi, half * 0.92), new THREE.Vector3(xs0, y0 + tall * lo, half)];
        sails.push(sailMesh(c, new THREE.Vector3(half * 0.2, 0, 0), sailMat));
        group.add(bar(c[1], c[2], 0.1, barMat));
      }
    }
  });
  if (d.rig !== "square") {
    const x = heads[0].x, y0 = deckTop(x) * BH, topP = new THREE.Vector3(x + 0.3, y0 + (heads[0].y - y0) * 0.8, 0);
    for (const k of [0, 1]) {
      const tack = bowTip.clone().lerp(sprit, k ? 0.95 : 0.45);
      const clew = new THREE.Vector3(x + 1.4 + k * 1.5, y0 + 1.4, 0.5);
      const head = topP.clone().lerp(tack, 0.12 * k);
      sails.push(sailMesh([tack, head, head.clone(), clew], new THREE.Vector3(0, 0, 0.4), sailMat));
    }
  }
  for (const s of sails) group.add(s);

  // rigging: black string
  const lines: number[] = [];
  heads.forEach((head, i) => {
    const side = (izMax - 0.5) * PITCH, y0 = deckTop(head.x) * BH;
    for (const z of [side, -side]) lines.push(head.x, head.y, 0, head.x - 0.6, y0, z);
    const to = i === 0 ? sprit : heads[i - 1];
    lines.push(head.x, head.y, 0, to.x, i === 0 ? to.y : to.y - 1, 0);
  });
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(lines, 3)),
    new THREE.LineBasicMaterial({ color: "#1b1b1b" })));

  // the flag on the tallest mast, and her name printed on a tile across the transom
  const tallest = heads.reduce((a, b) => (b.y > a.y ? b : a));
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), plastic({ color: "#ffcf00", side: THREE.DoubleSide }));
  flag.geometry.translate(-1.1, 0, 0);
  flag.position.copy(tallest).add(new THREE.Vector3(0, 0.6, 0));
  group.add(flag);
  if (d.name.trim()) {
    const sternX = (kit.minX() - 0.5) * PITCH - 0.02;
    const sternTop = (top.get(`${ix0 + 1},0`) ?? 3) * BH;
    const w = Math.max(2.4, h.half(0.02) * 1.6);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshStandardMaterial({ map: nameTexture(d.name, "#f4f4f4", "#1b1b1b"), roughness: 0.4 }));
    plate.position.set(sternX, sternTop - 0.1, 0);
    plate.rotation.y = -PI / 2;
    group.add(plate);
  }

  return {
    group, sails, flag, bricks: kit.size,
    dispose() {
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!(m as unknown as THREE.InstancedMesh).isInstancedMesh) m.geometry?.dispose(); // shared brick shapes stay
        for (const mat of ([] as THREE.Material[]).concat((m.material as THREE.Material) ?? [])) {
          (mat as THREE.MeshStandardMaterial).map?.dispose();
          mat.dispose();
        }
        if ((m as unknown as THREE.InstancedMesh).isInstancedMesh) (m as unknown as THREE.InstancedMesh).dispose();
      });
    },
  };
}

// ---------- the yard's boat sailing elsewhere: the Regatta and Dua Pulau ----------
/** the length the Regatta's and Dua Pulau's hull shape is drawn for, in metres (beamAt runs −14 … +14) */
const SAIL_LENGTH = 28;

/** a yard design as a vessel's boat: the model with bow along +x, scaled to 28 m so she handles like any other; her
 *  sails and a pennant; and the places Dua Pulau sets her lamp and Pip (at the bow, and up on the stern) */
export function buildYardPinisi(d: Design): Built & { lampAt: THREE.Group; pipBow: THREE.Group; pipStern: THREE.Group } {
  const built = buildBoat(d, () => {});
  const s = SAIL_LENGTH / HULLS[d.hull].length, h = hullLines(d);
  const boat = new THREE.Group();
  built.group.scale.setScalar(s);
  boat.add(built.group);
  // the vessel streams a pennant by turning it half round (it expects one that flies forward at rest); the yard's
  // flag flies aft, so it is hung in a pivot that turns it back
  const flag = new THREE.Group();
  flag.position.copy(built.flag.position);
  built.flag.position.set(0, 0, 0);
  built.flag.rotation.y = Math.PI;
  flag.add(built.flag);
  built.group.add(flag);
  const foreFlag = new THREE.Object3D(); // she has one flag; the vessel's second pennant is a stand-in
  built.group.add(foreFlag);
  // her deck at u along her (0 stern … 1 bow), in the outer group's metres: the top of the bricks under her sheer
  const deckAt = (u: number) => new THREE.Vector3((u - 0.5) * h.L * s, (Math.ceil(h.sheer(u) / BH) * BH) * s, 0);
  const at = (p: THREE.Vector3) => {
    const g = new THREE.Group();
    g.position.copy(p);
    boat.add(g);
    return g;
  };
  const lampAt = at(deckAt(0.86));
  const pipBow = at(deckAt(0.82).add(new THREE.Vector3(0, 0, Math.min(0.55, h.half(0.82) * s - 0.6))));
  const pipStern = at(deckAt(0.16).add(new THREE.Vector3(0, BH * 2 * s, 0))); // up where the camera astern can see him
  return { boat, sails: built.sails, flag, foreFlag, lampAt, pipBow, pipStern };
}
