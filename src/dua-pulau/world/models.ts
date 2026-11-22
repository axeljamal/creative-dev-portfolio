// Everything standing in the world, built in code: the pinisi and her oil lamp, Marea Dvīpa's gate, meru pavilion,
// gamelan bale and guest house, Windfall's pier, supper table, beach huts and lighthouse, Pip, and the planting.
// Lengths are in metres. Materials are physically based so the sky lights them.
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// ---------- small kit ----------
type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;
function tex(w: number, h: number, draw: Draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
const rep = (t: THREE.Texture, x: number, y: number) => {
  const c = t.clone();
  c.repeat.set(x, y);
  c.needsUpdate = true;
  return c;
};
const rnd = (() => {
  let s = 7;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
})();
const speckle = (g: CanvasRenderingContext2D, w: number, h: number, n: number, cols: string[], size = 2) => {
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[i % cols.length];
    g.globalAlpha = 0.15 + rnd() * 0.35;
    g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * size, 1 + rnd() * size);
  }
  g.globalAlpha = 1;
};

const brickT = tex(256, 256, (g, w, h) => {
  g.fillStyle = "#b7a084";
  g.fillRect(0, 0, w, h);
  for (let r = 0; r < 16; r++)
    for (let c = -1; c < 8; c++) {
      const v = rnd();
      g.fillStyle = `rgb(${150 + v * 34},${62 + v * 26},${40 + v * 16})`;
      g.fillRect(c * 32 + (r % 2 ? 16 : 0) + 1, r * 16 + 1, 30, 14);
    }
  speckle(g, w, h, 900, ["#5a2a1c", "#d9a78a"]);
});
const parasT = tex(256, 256, (g, w, h) => {
  g.fillStyle = "#b3a892";
  g.fillRect(0, 0, w, h);
  speckle(g, w, h, 3200, ["#7f7667", "#d6ccb8", "#8e8a7a"], 3);
  g.strokeStyle = "rgba(70,62,50,.35)";
  for (let y = 0; y < h; y += 64) g.strokeRect(-1, y, w + 2, 64);
});
const thatchT = tex(256, 256, (g, w, h) => {
  g.fillStyle = "#1c1915";
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1400; i++) {
    g.strokeStyle = ["#2f2a24", "#3b342b", "#0f0d0b", "#4a4135"][i % 4];
    g.globalAlpha = 0.5;
    const x = rnd() * w, y = rnd() * h;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (rnd() - 0.5) * 5, y + 18 + rnd() * 40);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.fillStyle = "rgba(0,0,0,.35)";
  for (let y = 0; y < h; y += 64) g.fillRect(0, y, w, 5);
});
const woodT = tex(256, 256, (g, w, h) => {
  g.fillStyle = "#6f4a2c";
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 500; i++) {
    g.strokeStyle = i % 2 ? "rgba(40,22,10,.35)" : "rgba(170,120,70,.25)";
    const y = rnd() * h;
    g.beginPath();
    g.moveTo(0, y);
    g.bezierCurveTo(w * 0.3, y + rnd() * 6 - 3, w * 0.6, y + rnd() * 6 - 3, w, y);
    g.stroke();
  }
  g.fillStyle = "rgba(20,10,4,.6)";
  for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 2);
});
/** pale planks: tinted by vertex or material colour */
const plankT = tex(256, 256, (g, w, h) => {
  g.fillStyle = "#e9e3d8";
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 420; i++) {
    g.strokeStyle = i % 2 ? "rgba(90,70,50,.18)" : "rgba(255,255,255,.3)";
    const y = rnd() * h;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y + rnd() * 4 - 2);
    g.stroke();
  }
  g.fillStyle = "rgba(40,26,14,.55)";
  for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 2);
  for (let i = 0; i < 12; i++) g.fillRect(rnd() * w, Math.floor(rnd() * 8) * 32, 2, 32);
});
const tileT = tex(256, 256, (g, w, h) => {
  g.fillStyle = "#8a3f24";
  g.fillRect(0, 0, w, h);
  for (let r = 0; r < 8; r++)
    for (let c = -1; c < 9; c++) {
      const v = rnd();
      g.fillStyle = `rgb(${160 + v * 40},${78 + v * 26},${46 + v * 16})`;
      g.beginPath();
      g.ellipse(c * 32 + (r % 2 ? 16 : 0) + 16, r * 32 + 4, 15, 26, 0, 0, Math.PI);
      g.fill();
    }
});
const plasterT = tex(128, 128, (g, w, h) => {
  g.fillStyle = "#efe6d6";
  g.fillRect(0, 0, w, h);
  speckle(g, w, h, 900, ["#d9cdb8", "#fffaf0"], 3);
});
/** sailcloth with seams and a rebung (bamboo shoot) border in Marea Dvīpa's gold on indigo */
/** sailcloth: sewn panels of off-white canvas, weathered, with Marea Dvīpa's indigo foot and gold tumpal along it */
const sailCloth = (g: CanvasRenderingContext2D, w: number, h: number) => {
  g.fillStyle = "#ece2cc";
  g.fillRect(0, 0, w, h);
  // the weave, then the weather: rain streaks down from the head, grime gathering toward the foot
  speckle(g, w, h, 5200, ["#d9ccb0", "#fbf5e6", "#e3d7bd"], 2);
  for (let i = 0; i < 46; i++) {
    const x = rnd() * w, len = 60 + rnd() * 260, wd = 6 + rnd() * 26, grd = g.createLinearGradient(0, 0, 0, len);
    grd.addColorStop(0, "rgba(120,104,78,.1)");
    grd.addColorStop(1, "rgba(120,104,78,0)");
    g.fillStyle = grd;
    g.fillRect(x, 0, wd, len);
  }
  const foot = g.createLinearGradient(0, h - 240, 0, h);
  foot.addColorStop(0, "rgba(96,80,56,0)");
  foot.addColorStop(1, "rgba(96,80,56,.16)");
  g.fillStyle = foot;
  g.fillRect(0, h - 240, w, 240);
  // panel seams, each a doubled line of stitching, and two rows of reef points
  for (let x = 0; x < w; x += 64) {
    g.strokeStyle = "rgba(110,92,64,.42)";
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, h);
    g.stroke();
    g.strokeStyle = "rgba(255,250,236,.5)";
    g.beginPath();
    g.moveTo(x + 3, 0);
    g.lineTo(x + 3, h);
    g.stroke();
  }
  [h - 150, h - 215].forEach((y) => {
    g.fillStyle = "rgba(110,92,64,.2)";
    g.fillRect(0, y, w, 2);
    g.fillStyle = "rgba(70,56,40,.6)";
    for (let x = 16; x < w; x += 32) g.fillRect(x, y - 2, 2, 11);
  });
  g.fillStyle = "#02213d";
  g.fillRect(0, h - 76, w, 76);
  g.fillStyle = "#c39b65";
  g.fillRect(0, h - 80, w, 5);
  for (let x = 0; x < w; x += 32) {
    g.beginPath();
    g.moveTo(x + 3, h - 6);
    g.lineTo(x + 16, h - 66);
    g.lineTo(x + 29, h - 6);
    g.closePath();
    g.fill();
  }
};
const sailT = tex(512, 512, sailCloth);
/** the mainsail carries the Dua Pulau medallion, dyed into the cloth in indigo as a batik would be */
const mainSailT = tex(512, 512, sailCloth);
mainSailT.wrapS = mainSailT.wrapT = THREE.ClampToEdgeWrapping;
{
  const img = new Image();
  img.onload = () => {
    const cv = mainSailT.image as HTMLCanvasElement, g = cv.getContext("2d")!;
    // the motif's own shape, filled with indigo, then laid into the canvas so the weave still shows through it
    const dye = document.createElement("canvas");
    dye.width = dye.height = 250;
    const d = dye.getContext("2d")!;
    d.drawImage(img, 0, 0, 250, 250);
    d.globalCompositeOperation = "source-in";
    d.fillStyle = "#12325a";
    d.fillRect(0, 0, 250, 250);
    g.save();
    g.globalAlpha = 0.62;
    g.globalCompositeOperation = "multiply";
    g.drawImage(dye, 131, 96);
    g.restore();
    mainSailT.needsUpdate = true;
  };
  img.src = "/motifs/dua-pulau-medallion.png";
}
sailT.wrapS = sailT.wrapT = THREE.ClampToEdgeWrapping;

/**
 * Nothing that stands outdoors is clean. Onto a finished texture this lays what weather leaves: rain streaks running
 * down from the top, damp and green creeping up from the foot, and blotches where a surface has faded unevenly.
 */
function age(t: THREE.CanvasTexture, o: { streak?: number; damp?: number; blot?: number; green?: boolean }) {
  const c = t.image as HTMLCanvasElement, g = c.getContext("2d")!, w = c.width, h = c.height;
  for (let i = 0; i < 26; i++) {
    const x = rnd() * w, r = 10 + rnd() * 34, y = rnd() * h, dark = rnd() > 0.45;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, dark ? `rgba(40,32,24,${0.16 * (o.blot ?? 1)})` : `rgba(255,248,232,${0.13 * (o.blot ?? 1)})`);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 22; i++) {
    const x = rnd() * w, len = h * (0.2 + rnd() * 0.6), wd = 3 + rnd() * 12, grd = g.createLinearGradient(0, 0, 0, len);
    grd.addColorStop(0, `rgba(36,30,24,${0.3 * (o.streak ?? 0)})`);
    grd.addColorStop(1, "rgba(36,30,24,0)");
    g.fillStyle = grd;
    g.fillRect(x, 0, wd, len);
  }
  if (o.damp) {
    const d = g.createLinearGradient(0, h * 0.62, 0, h);
    d.addColorStop(0, "rgba(0,0,0,0)");
    d.addColorStop(1, o.green ? `rgba(52,66,30,${o.damp})` : `rgba(44,36,28,${o.damp})`);
    g.fillStyle = d;
    g.fillRect(0, h * 0.62, w, h * 0.38);
  }
  t.needsUpdate = true;
}
age(brickT, { streak: 0.7, damp: 0.42, green: true });
age(parasT, { streak: 0.8, damp: 0.5, green: true });
age(plasterT, { streak: 0.5, damp: 0.34 });
age(thatchT, { streak: 0.3, blot: 1.3 });
age(tileT, { streak: 0.35, blot: 1.2, damp: 0.2, green: true });
age(plankT, { streak: 0.3, blot: 1.1 });
age(woodT, { streak: 0.3, blot: 0.9 });

type MatOpts = { color?: number; map?: THREE.Texture; rough?: number; metal?: number; side?: THREE.Side; emissive?: number; vertexColors?: boolean; /** how deep the texture's own relief reads; 0 for none */ bump?: number };
const std = (o: MatOpts) => new THREE.MeshStandardMaterial({ color: o.color ?? 0xffffff, map: o.map ?? null, bumpMap: o.map && o.bump !== 0 ? o.map : null, bumpScale: o.bump ?? 1.1, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, side: o.side ?? THREE.FrontSide, emissive: o.emissive ?? 0x000000, vertexColors: o.vertexColors ?? false });
/** a light source that the bloom pass picks up */
export const glow = (r: number, g: number, b: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(r, g, b) });

const M = {
  brick: std({ map: rep(brickT, 2, 1), rough: 0.92 }),
  stone: std({ map: parasT, rough: 0.95 }),
  thatch: std({ map: rep(thatchT, 4, 1), rough: 1 }),
  wood: std({ map: woodT, rough: 0.8 }),
  darkWood: std({ map: woodT, color: 0x6b5a4e, rough: 0.75 }),
  teak: std({ map: rep(plankT, 4, 1), color: 0xb98a55, rough: 0.7 }),
  plaster: std({ map: plasterT, rough: 0.9 }),
  tile: std({ map: rep(tileT, 5, 2), rough: 0.85 }),
  white: std({ color: 0xf3efe6, rough: 0.6 }),
  iron: std({ color: 0x26302d, rough: 0.6, metal: 0.6 }),
  bronze: std({ color: 0xb08a4a, rough: 0.34, metal: 1 }),
  gold: std({ color: 0xd9b266, rough: 0.24, metal: 1 }),
  brass: std({ color: 0xc09a52, rough: 0.28, metal: 1 }),
  lacquer: std({ color: 0x7a1f14, rough: 0.35 }),
  teal: std({ color: 0x1f5c63, rough: 0.6 }),
  cream: std({ color: 0xfff2eb, rough: 0.9 }),
  terracotta: std({ color: 0xc67139, rough: 0.8 }),
  sage: std({ color: 0x7a8a5e, rough: 0.6, metal: 0.2 }),
  warm: glow(3.2, 2.1, 0.9),
};

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, parent?: THREE.Object3D) {
  const o = new THREE.Mesh(geo, mat);
  o.position.set(x, y, z);
  o.castShadow = o.receiveShadow = true;
  parent?.add(o);
  return o;
}
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt: number, rb: number, h: number, seg = 12) => new THREE.CylinderGeometry(rt, rb, h, seg);
const ball = (r: number, a = 16, b = 12) => new THREE.SphereGeometry(r, a, b);
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** a pole from p to q */
function spar(p: THREE.Vector3, q: THREE.Vector3, r: number, mat: THREE.Material, parent: THREE.Object3D, r2 = r) {
  const d = q.clone().sub(p);
  const o = mesh(cyl(r2, r, d.length(), 8), mat, 0, 0, 0, parent);
  o.position.copy(p).addScaledVector(d, 0.5);
  o.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return o;
}
function lines(pairs: THREE.Vector3[], color: number, parent: THREE.Object3D) {
  const l = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pairs), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.75 }));
  parent.add(l);
  return l;
}
/** a four-sided roof tier: a square frustum with its flat faces to the compass */
function roofTier(top: number, bottom: number, h: number, mat: THREE.Material, y: number, parent: THREE.Object3D, zScale = 1) {
  const o = mesh(new THREE.CylinderGeometry(top * Math.SQRT2, bottom * Math.SQRT2, h, 4, 1), mat, 0, y + h / 2, 0, parent);
  o.rotation.y = Math.PI / 4;
  const wrap = new THREE.Group();
  wrap.scale.z = zScale;
  parent.add(wrap);
  wrap.add(o);
  return o;
}
/** a Balinese ceremonial umbrella */
function tedung(parent: THREE.Object3D, x: number, z: number, cloth: number) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  mesh(cyl(0.05, 0.06, 4.2, 8), M.darkWood, 0, 2.1, 0, g);
  mesh(new THREE.ConeGeometry(1.25, 0.55, 20, 1, true), std({ color: cloth, rough: 0.9, side: THREE.DoubleSide }), 0, 4.2, 0, g);
  mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.32, 20, 1, true), std({ color: 0xd9b266, rough: 0.7, side: THREE.DoubleSide }), 0, 3.78, 0, g);
  mesh(new THREE.ConeGeometry(0.07, 0.5, 8), M.gold, 0, 4.7, 0, g);
  return g;
}

/** kain poleng: the black and white check tied round what is held sacred */
const polengT = tex(64, 64, (g, w, h) => {
  const n = 4, c = w / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      g.fillStyle = (i + j) % 2 ? "#f1ece0" : i % 2 ? "#17140f" : "#6f6a62"; // black, white, and the grey where they cross
      g.fillRect(i * c, j * c, c, c);
    }
  void h;
});
/** the cloth of an umbul-umbul: one colour, gold tumpal up both edges, the way the sail's foot is finished */
const umbulT = (ground: string) => {
  const t = tex(64, 512, (g, w, h) => {
    g.fillStyle = ground;
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, 500, ["rgba(255,255,255,.07)", "rgba(0,0,0,.09)"], 2);
    g.fillStyle = "#d9b266";
    for (let y = 0; y < h; y += 26) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(15, y + 13);
      g.lineTo(0, y + 26);
      g.closePath();
      g.fill();
      g.beginPath();
      g.moveTo(w, y);
      g.lineTo(w - 15, y + 13);
      g.lineTo(w, y + 26);
      g.closePath();
      g.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
};
const UMBUL = { indigo: umbulT("#12325a"), terracotta: umbulT("#b65a2c"), pearl: umbulT("#efe6d2") };
const bamboo = std({ color: 0xb9a468, rough: 0.6 });
const penjorLeaf = std({ color: 0xe6d48a, rough: 0.8, side: THREE.DoubleSide }), penjorFoot = std({ map: rep(polengT.clone(), 3, 1), rough: 0.9 });
/** a bamboo pole bowing over at the top, as a tube along its curve. Returns the points along it. */
function bowedPole(parent: THREE.Object3D, h: number, lean: number, r: number) {
  const pts = Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    return V(lean * Math.pow(t, 2.6), h * (t - 0.16 * Math.pow(t, 4)), 0);
  });
  const curve = new THREE.CatmullRomCurve3(pts);
  const m = mesh(new THREE.TubeGeometry(curve, 26, r, 7), bamboo, 0, 0, 0, parent);
  m.castShadow = true;
  return curve;
}
/** umbul-umbul: a tall festival banner, a long tapering cloth hung down the bow of its pole */
export function umbul(parent: THREE.Object3D, x: number, z: number, cloth: keyof typeof UMBUL, turn = 0, h = 8.4) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = turn;
  parent.add(g);
  const curve = bowedPole(g, h, 1.9, 0.055);
  // the cloth follows the pole from near the tip down two thirds of it, widest in the middle of its run
  const N = 22, pos: number[] = [], uv: number[] = [], idx: number[] = [], p = V(0, 0, 0);
  for (let i = 0; i <= N; i++) {
    const t = i / N, u = 0.98 - t * 0.66, wd = 0.16 + 0.62 * Math.sin(Math.PI * Math.min(1, t * 1.25)) * (1 - t * 0.35);
    curve.getPoint(u, p);
    const wave = Math.sin(t * 9) * 0.12 * t;
    pos.push(p.x, p.y, p.z + 0.02, p.x + wd * 0.25, p.y - wd * 0.2, p.z + wd + wave);
    uv.push(0, 1 - t, 1, 1 - t);
    if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  mesh(geo, std({ map: UMBUL[cloth], rough: 0.85, side: THREE.DoubleSide }), 0, 0, 0, g);
  return g;
}
/** penjor: the bamboo pole of Galungan, bowed under a hanging ornament of young palm leaf, its foot wrapped in poleng */
export function penjor(parent: THREE.Object3D, x: number, z: number, turn = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = turn;
  parent.add(g);
  const curve = bowedPole(g, 10.5, 3.4, 0.07);
  const p = V(0, 0, 0);
  // every strip of leaf goes into one mesh: a penjor is many small pieces, and four of them should not cost two hundred draws
  const strips: THREE.BufferGeometry[] = [], o = new THREE.Object3D();
  const strip = (w: number, h: number, x: number, y: number, z: number, rx: number, ry: number, rz: number) => {
    o.position.set(x, y, z);
    o.rotation.set(rx, ry, rz);
    o.updateMatrix();
    strips.push(new THREE.PlaneGeometry(w, h).applyMatrix4(o.matrix));
  };
  // tufts of pale leaf up the pole, thicker toward the bow
  for (let i = 0; i < 9; i++) {
    curve.getPoint(0.3 + i * 0.075, p);
    for (let k = 0; k < 4; k++) strip(0.07, 0.55 + i * 0.05, p.x, p.y - 0.2, p.z, 0.5, (k / 4) * Math.PI * 2 + i, 0.5);
  }
  // the sampian: a little lantern of plaited leaf hanging from the tip, and a fan of strips under it
  curve.getPoint(1, p);
  mesh(cyl(0.005, 0.005, 1.5, 4), M.darkWood, p.x, p.y - 0.75, p.z, g);
  mesh(new THREE.ConeGeometry(0.3, 0.5, 8, 1, true), penjorLeaf, p.x, p.y - 1.55, p.z, g);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    strip(0.06, 1.1, p.x + Math.cos(a) * 0.16, p.y - 2.3, p.z + Math.sin(a) * 0.16, (rnd() - 0.5) * 0.3, a, (rnd() - 0.5) * 0.3);
  }
  mesh(mergeGeometries(strips), penjorLeaf, 0, 0, 0, g);
  mesh(cyl(0.11, 0.11, 0.8, 10), penjorFoot, 0, 0.9, 0, g);
  return g;
}

// ---------- the pinisi ----------
const HULL_L = 28, HULL_B = 3.6;
const hullW = (u: number) => HULL_B * Math.pow(Math.sin(Math.PI * (0.08 + 0.92 * u)), 0.6);
const hullTop = (u: number) => 2.4 + 2.2 * Math.pow(1 - u, 5) + 1.4 * Math.pow(u, 4);
const hullBottom = (u: number) => -2.2 * Math.pow(Math.sin(Math.PI * (0.05 + 0.9 * u)), 0.5);
/** deck height at a point along the hull (x: -14 stern … +14 bow) */
export const deckY = (x: number) => hullTop((x + HULL_L / 2) / HULL_L) - 0.35;

function sailGeo(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, belly: number, n = 10) {
  // a: tack, b: head on the mast, c: peak, d: clew. A triangle passes b twice.
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const p = V(0, 0, 0), q = V(0, 0, 0);
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= n; j++) {
      const s = i / n, t = j / n;
      p.lerpVectors(a, d, s);
      q.lerpVectors(b, c, s);
      p.lerp(q, t);
      p.z += belly * Math.sin(Math.PI * s) * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.1));
      pos.push(p.x, p.y, p.z);
      uv.push(s, t);
    }
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const k = i * (n + 1) + j;
      idx.push(k, k + n + 1, k + 1, k + 1, k + n + 1, k + n + 2);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A Bugis pinisi: two masts, seven sails, a high stern and a long bowsprit. Bow points along +x. */
export function buildPinisi() {
  const boat = new THREE.Group();
  // hull: U-shaped sections swept from stern to bow
  const U = 56, S = 22;
  const pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [];
  for (let i = 0; i <= U; i++) {
    const u = i / U, w = hullW(u), top = hullTop(u), bot = hullBottom(u);
    for (let j = 0; j <= S; j++) {
      const phi = -Math.PI / 2 + (Math.PI * j) / S;
      const up = 1 - Math.pow(Math.cos(phi), 1.25);
      const y = bot + (top - bot) * up;
      const x = -HULL_L / 2 + u * HULL_L + 1.6 * Math.pow(u, 7) * up - 1.1 * Math.pow(1 - u, 6) * up;
      pos.push(x, y, w * Math.sin(phi) * (0.9 + 0.1 * up));
      uv.push(u * 7, (j / S) * 3);
      // paint: antifouling red below the water, varnished teak, then a white strake with a red line under the rail
      const fromTop = top - y;
      if (y < 0.35) col.push(0.36, 0.1, 0.07);
      else if (fromTop < 0.12) col.push(0.35, 0.22, 0.12);
      else if (fromTop < 0.62) col.push(0.95, 0.93, 0.88);
      else if (fromTop < 0.74) col.push(0.6, 0.13, 0.08);
      else col.push(0.63, 0.41, 0.22);
    }
  }
  for (let i = 0; i < U; i++)
    for (let j = 0; j < S; j++) {
      const k = i * (S + 1) + j;
      idx.push(k, k + 1, k + S + 1, k + 1, k + S + 2, k + S + 1);
    }
  // close the stern with a transom
  const sternC = pos.length / 3;
  pos.push(-HULL_L / 2 - 0.5, (hullTop(0) + hullBottom(0)) / 2 + 0.6, 0);
  uv.push(0, 1.5);
  col.push(0.63, 0.41, 0.22);
  for (let j = 0; j < S; j++) idx.push(sternC, j + 1, j);
  const hg = new THREE.BufferGeometry();
  hg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  hg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  hg.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  hg.setIndex(idx);
  hg.computeVertexNormals();
  mesh(hg, std({ map: plankT, vertexColors: true, rough: 0.55, side: THREE.DoubleSide }), 0, 0, 0, boat);

  // deck and rails, following the sheer
  const dp: number[] = [], du: number[] = [], di: number[] = [];
  const railL: THREE.Vector3[] = [], railR: THREE.Vector3[] = [];
  for (let i = 0; i <= U; i++) {
    const u = i / U, x = -HULL_L / 2 + u * HULL_L, w = hullW(u) * 0.97, y = hullTop(u) - 0.35;
    dp.push(x, y, -w, x, y, w);
    du.push(u * 10, 0, u * 10, 1);
    const rx = x + 1.6 * Math.pow(u, 7) - 1.1 * Math.pow(1 - u, 6);
    railL.push(V(rx, hullTop(u) + 0.05, -hullW(u)));
    railR.push(V(rx, hullTop(u) + 0.05, hullW(u)));
    if (i < U) di.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.Float32BufferAttribute(dp, 3));
  dg.setAttribute("uv", new THREE.Float32BufferAttribute(du, 2));
  dg.setIndex(di);
  dg.computeVertexNormals();
  mesh(dg, std({ map: rep(plankT, 1, 8), color: 0xc49a66, rough: 0.75, side: THREE.DoubleSide }), 0, 0, 0, boat);
  [railL, railR].forEach((r) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(r), 80, 0.13, 6), M.darkWood, 0, 0, 0, boat));

  // deckhouse on the poop, with a carved stern rail
  const cabinY = deckY(-9.5);
  mesh(box(5.6, 2.3, 4.0), std({ map: rep(plankT, 2, 2), color: 0xf1ece2, rough: 0.6 }), -9.6, cabinY + 1.15, 0, boat);
  mesh(box(6.3, 0.16, 4.7), M.teak, -9.6, cabinY + 2.38, 0, boat);
  for (let i = 0; i < 4; i++) [-1, 1].forEach((s) => mesh(box(0.8, 0.7, 0.06), std({ color: 0x14212b, rough: 0.2, metal: 0.4 }), -11.4 + i * 1.2, cabinY + 1.45, s * 2.02, boat));
  mesh(box(0.06, 1.6, 0.9), M.wood, -6.78, cabinY + 0.85, 0, boat);
  for (let i = 0; i < 9; i++) [-1, 1].forEach((s) => mesh(cyl(0.035, 0.035, 0.75, 6), M.white, -12.4 + i * 0.7, cabinY + 2.8, s * 2.25, boat));
  [-1, 1].forEach((s) => mesh(box(6.1, 0.07, 0.09), M.darkWood, -9.6, cabinY + 3.2, s * 2.25, boat));
  // cargo hatch, coiled rope and a tender amidships
  mesh(box(3.2, 0.5, 2.6), M.teak, 0.8, deckY(0.8) + 0.25, 0, boat);
  mesh(box(3.4, 0.08, 2.8), M.darkWood, 0.8, deckY(0.8) + 0.54, 0, boat);
  const coil = mesh(new THREE.TorusGeometry(0.36, 0.08, 6, 18), std({ color: 0xcdb88f, rough: 1 }), 8.4, deckY(8.4) + 0.09, 1.1, boat);
  coil.rotation.x = Math.PI / 2;

  // masts, bowsprit, gaffs and booms
  const spars = new THREE.Group();
  boat.add(spars);
  const fx = 5.5, mx = -3.6;
  const fDeck = deckY(fx), mDeck = deckY(mx);
  spar(V(fx, fDeck, 0), V(fx - 0.5, 24, 0), 0.3, M.wood, spars, 0.14);
  spar(V(mx, mDeck, 0), V(mx - 0.5, 21, 0), 0.28, M.wood, spars, 0.13);
  const bow0 = V(13.2, hullTop(0.96) + 0.1, 0), bow1 = V(23.6, 6.4, 0);
  spar(bow0, bow1, 0.2, M.wood, spars, 0.1);
  const sailM = std({ map: sailT, rough: 0.95, side: THREE.DoubleSide }), mainSailM = std({ map: mainSailT, rough: 0.95, side: THREE.DoubleSide });
  const sails: THREE.Mesh[] = [];
  const sail = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, belly: number, m: THREE.Material = sailM) => {
    const s = mesh(sailGeo(a, b, c, d, belly), m, 0, 0, 0, boat);
    sails.push(s);
    return s;
  };
  // fore gaff sail and topsail
  const fTack = V(fx - 0.3, fDeck + 2.6, 0), fThroat = V(fx - 0.45, 16, 0), fPeak = V(-1.4, 20, 2.6), fClew = V(-2.4, fDeck + 3.0, 3.1); // sheeted out to leeward
  sail(fTack, fThroat, fPeak, fClew, 1.5);
  spar(fThroat, fPeak, 0.11, M.wood, spars);
  spar(fTack, fClew, 0.11, M.wood, spars);
  sail(V(fx - 0.45, 16.5, 0), V(fx - 0.5, 23.4, 0), V(fx - 0.5, 23.4, 0), V(-1.3, 20.4, 2.6), 0.8);
  // main (aft) gaff sail and topsail
  const mTack = V(mx - 0.3, mDeck + 2.9, 0), mThroat = V(mx - 0.45, 14, 0), mPeak = V(-10.6, 17.6, 2.5), mClew = V(-13.2, mDeck + 3.6, 3.2);
  sail(mTack, mThroat, mPeak, mClew, 1.4, mainSailM);
  spar(mThroat, mPeak, 0.1, M.wood, spars);
  spar(mTack, mClew, 0.1, M.wood, spars);
  sail(V(mx - 0.45, 14.5, 0), V(mx - 0.5, 20.4, 0), V(mx - 0.5, 20.4, 0), V(-10.4, 18, 2.5), 0.7);
  // three jibs out along the bowsprit
  [[1, 22.8, 7.4], [0.68, 19, 7.0], [0.36, 15.2, 6.6]].forEach(([t, headY, clewY], i) => {
    const tack = bow0.clone().lerp(bow1, t).add(V(0, 0.15, 0));
    const head = V(fx - 0.2 + (24 - headY) * 0.02, headY, 0);
    sail(tack, head, head, V(fx + 1.2 + i * 0.5, clewY, 2.3), 0.9 - i * 0.15);
  });
  // standing rigging and a pennant
  lines(
    [
      V(fx - 0.5, 24, 0), bow1, V(fx - 0.5, 24, 0), V(mx - 0.5, 21, 0), V(mx - 0.5, 21, 0), V(-14, hullTop(0) + 0.2, 0),
      ...[-1, 1].flatMap((s) => [V(fx - 0.5, 23, 0), V(fx - 1, deckY(fx) + 0.4, s * hullW(0.68)), V(fx - 0.5, 23, 0), V(fx + 1, deckY(fx) + 0.4, s * hullW(0.72)), V(mx - 0.5, 20, 0), V(mx - 1, deckY(mx) + 0.4, s * hullW(0.36)), V(mx - 0.5, 20, 0), V(mx + 1, deckY(mx) + 0.4, s * hullW(0.4))]),
      bow1, V(14.6, 0.9, 0),
    ],
    0x241a12,
    boat,
  );
  const flag = mesh(new THREE.PlaneGeometry(1.5, 0.9, 6, 1), std({ color: 0xc67139, rough: 0.9, side: THREE.DoubleSide }), mx - 1.3, 21.1, 0, boat);

  // where the oil lamp stands: a small teak stand on the foredeck
  const lampAt = new THREE.Group();
  lampAt.position.set(10.6, deckY(10.6), 0);
  boat.add(lampAt);
  mesh(box(0.5, 0.55, 0.5), M.teak, 0, 0.275, 0, lampAt);
  mesh(box(0.62, 0.05, 0.62), M.darkWood, 0, 0.575, 0, lampAt);

  boat.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  return { boat, sails, flag, lampAt };
}

// ---------- the pelita: a brass oil lamp with a living flame ----------
export function buildLamp() {
  const lamp = new THREE.Group();
  const prof = [[0, 0], [0.105, 0], [0.115, 0.012], [0.11, 0.028], [0.06, 0.045], [0.028, 0.07], [0.024, 0.15], [0.04, 0.165], [0.042, 0.18], [0.026, 0.195], [0.03, 0.22], [0.09, 0.245], [0.15, 0.285], [0.166, 0.318], [0.16, 0.326], [0.146, 0.31], [0.1, 0.285], [0, 0.278]].map(([r, y]) => new THREE.Vector2(r, y));
  mesh(new THREE.LatheGeometry(prof, 48), M.brass, 0, 0, 0, lamp);
  // oil in the bowl, the spout and its wick
  const oil = mesh(new THREE.CircleGeometry(0.146, 32), new THREE.MeshPhysicalMaterial({ color: 0x3a2206, roughness: 0.05, metalness: 0, clearcoat: 1 }), 0, 0.304, 0, lamp);
  oil.rotation.x = -Math.PI / 2;
  const spout = mesh(new THREE.ConeGeometry(0.045, 0.16, 16), M.brass, 0.2, 0.312, 0, lamp);
  spout.rotation.z = -Math.PI / 2 + 0.25;
  spout.scale.z = 0.8;
  mesh(cyl(0.007, 0.009, 0.05, 6), std({ color: 0x1a1410, rough: 1 }), 0.262, 0.35, 0, lamp);
  // a ring handle and three small feet catch the light
  const ring = mesh(new THREE.TorusGeometry(0.05, 0.009, 8, 20), M.brass, -0.2, 0.3, 0, lamp);
  ring.rotation.y = Math.PI / 2;
  for (let i = 0; i < 12; i++) mesh(ball(0.008, 8, 6), M.gold, Math.cos((i / 12) * Math.PI * 2) * 0.163, 0.3, Math.sin((i / 12) * Math.PI * 2) * 0.163, lamp);

  const flameM = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uLit: { value: 0 } },
    vertexShader: `
      uniform float uTime; uniform float uLit;
      varying float vH; varying vec3 vN; varying vec3 vV;
      void main(){
        vec3 p = position;
        float h = p.y + 0.5;
        vH = h;
        p.xz *= mix(1.0, 0.06, pow(h, 1.7)) * (0.55 + 0.45 * sin(h * 3.14159));
        p.y = (h * (0.75 + 0.25 * uLit) - 0.5);
        p.x += (sin(uTime * 8.0 + h * 4.0) * 0.07 + sin(uTime * 13.7) * 0.03) * h * h;
        p.z += sin(uTime * 6.3 + h * 5.0) * 0.05 * h * h;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uTime; uniform float uLit;
      varying float vH; varying vec3 vN; varying vec3 vV;
      void main(){
        float core = pow(max(dot(normalize(vN), normalize(vV)), 0.0), 1.6);
        vec3 col = mix(vec3(1.0, 0.42, 0.08), vec3(1.0, 0.86, 0.5), core);
        col = mix(col, vec3(1.0, 0.97, 0.86), smoothstep(0.55, 1.0, core) * smoothstep(0.9, 0.25, vH));
        col = mix(vec3(0.25, 0.45, 1.0), col, smoothstep(0.02, 0.24, vH));
        float a = core * smoothstep(1.0, 0.72, vH) * (0.9 + 0.1 * sin(uTime * 21.0));
        gl_FragColor = vec4(col * 3.2 * a * uLit, a * uLit);
      }`,
  });
  const flame = new THREE.Mesh(ball(0.5, 28, 24), flameM);
  flame.scale.set(0.085, 0.2, 0.085);
  flame.position.set(0.262, 0.465, 0);
  lamp.add(flame);
  // a soft halo, and the light the flame throws on the brass, the deck and the sails
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex(128, 128, (g) => {
        const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        r.addColorStop(0, "rgba(255,214,140,1)");
        r.addColorStop(0.25, "rgba(255,160,70,.45)");
        r.addColorStop(1, "rgba(255,120,40,0)");
        g.fillStyle = r;
        g.fillRect(0, 0, 128, 128);
      }),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0,
    }),
  );
  halo.scale.setScalar(0.9);
  halo.position.copy(flame.position);
  lamp.add(halo);
  const light = new THREE.PointLight(0xffa24a, 0, 40, 1.6);
  light.position.set(0.262, 0.5, 0);
  lamp.add(light);
  return {
    lamp,
    /** lit: 0 dark … 1 burning */
    update(t: number, lit: number) {
      flameM.uniforms.uTime.value = t;
      flameM.uniforms.uLit.value = lit;
      const f = 0.86 + 0.09 * Math.sin(t * 11) + 0.05 * Math.sin(t * 23.7);
      light.intensity = lit * f * 9;
      (halo.material as THREE.SpriteMaterial).opacity = lit * 0.5 * f;
    },
  };
}

// ---------- Marea Dvīpa ----------
/** candi bentar: a temple tower split clean in two, the path running through the cut. The path runs along x. */
export function buildGate() {
  const g = new THREE.Group();
  mesh(box(9, 0.7, 19), M.stone, 0, 0.35, 0, g);
  for (let i = 0; i < 4; i++) [-1, 1].forEach((s) => mesh(box(0.5, 0.175, 3.4), M.stone, s * (4.75 + i * 0.5), 0.61 - i * 0.175, 0, g));
  const tiers = [[5.2, 2.3, 3.8], [4.4, 1.7, 3.3], [3.7, 1.5, 2.9], [3.0, 1.35, 2.5], [2.4, 1.25, 2.1], [1.8, 1.15, 1.7], [1.25, 1.05, 1.3], [0.75, 1.3, 0.9]];
  [-1, 1].forEach((s) => {
    const h = new THREE.Group();
    h.scale.z = s;
    g.add(h);
    let y = 0.7;
    tiers.forEach(([w, ht, d], i) => {
      mesh(box(d, ht, w), M.brick, 0, y + ht / 2, 1.25 + w / 2, h);
      mesh(box(d + 0.45, 0.24, w + 0.28), M.stone, 0, y + ht + 0.12, 1.25 + (w + 0.28) / 2, h);
      // an upturned stone leaf at each tier's outer corners
      [-1, 1].forEach((e) => {
        const a = mesh(new THREE.ConeGeometry(0.2, 0.75, 4), M.stone, e * (d / 2 + 0.1), y + ht + 0.55, 1.25 + w + 0.05, h);
        a.rotation.x = 0.35;
      });
      if (i === 0) mesh(box(d + 0.1, 0.5, 0.5), M.stone, 0, y + 1.1, 1.25 + w + 0.15, h);
      y += ht + 0.24;
    });
    mesh(new THREE.ConeGeometry(0.3, 1.3, 4), M.stone, 0, y + 0.65, 1.6, h);
    // the low wall running out from each half
    mesh(box(1.1, 2.3, 2.9), M.brick, 0, 0.7 + 1.15, 7.9, h);
    mesh(box(1.4, 0.25, 3.1), M.stone, 0, 0.7 + 2.42, 7.9, h);
  });
  tedung(g, 3.6, 3.4, 0xf4eee3);
  tedung(g, 3.6, -3.4, 0xf4eee3);
  const poleng = std({ map: rep(polengT.clone(), 10, 2), rough: 0.9 });
  [-1, 1].forEach((s) => {
    mesh(box(3.86, 0.8, 5.26), poleng, 0, 0.7 + 0.75, s * (1.25 + 2.6), g);
    penjor(g, 13.4, s * 3.5, s > 0 ? -0.5 : 0.5);
    umbul(g, 5.2, s * 10.6, s > 0 ? "indigo" : "terracotta", Math.PI / 2 - 0.3 * s);
  });
  // stone lamps down the path to the water: they light in pairs, from the gate outward, when someone comes
  const lamps = [0, 1, 2, 3].map((i) => {
    const m = glow(3.2, 2.1, 0.9);
    [-1, 1].forEach((s) => {
      mesh(box(0.4, 0.9, 0.4), M.stone, 6.4 + i * 1.7, 0.45 - i * 0.12, s * 2.3, g);
      mesh(ball(0.17), m, 6.4 + i * 1.7, 1.08 - i * 0.12, s * 2.3, g).castShadow = false;
    });
    return m;
  });
  return { group: g, lamps };
}

/** the studio's mark made solid: a meru, five roofs of black ijuk thatch over a brick shrine. It faces +x. */
export function buildPavilion() {
  const g = new THREE.Group();
  mesh(box(16, 1, 16), M.stone, 0, 0.5, 0, g);
  mesh(box(13.4, 1, 13.4), M.brick, 0, 1.5, 0, g);
  mesh(box(13.9, 0.3, 13.9), M.stone, 0, 2.15, 0, g);
  for (let i = 0; i < 7; i++) mesh(box(0.55, 0.33, 4), M.stone, 7.2 + i * 0.55, 2.13 - i * 0.33, 0, g);
  // festival banners at the foot of the steps and the back corners, and a penjor either side of the way up
  umbul(g, 9.4, 4.2, "pearl", Math.PI / 2 - 0.2);
  umbul(g, 9.4, -4.2, "pearl", Math.PI / 2 + 0.2);
  umbul(g, -8.6, 8.6, "indigo", 0.6);
  umbul(g, -8.6, -8.6, "terracotta", -0.6);
  penjor(g, 12.6, 3.2, -0.4);
  penjor(g, 12.6, -3.2, 0.4);
  const y0 = 2.3;
  mesh(box(5.2, 4.2, 5.2), M.brick, 0, y0 + 2.1, 0, g);
  [-1, 1].forEach((a) => [-1, 1].forEach((b) => mesh(box(0.7, 4.3, 0.7), M.stone, a * 2.6, y0 + 2.15, b * 2.6, g)));
  // carved doors, gilded
  mesh(box(0.2, 3.1, 2.1), M.stone, 2.66, y0 + 1.55, 0, g);
  [-1, 1].forEach((s) => mesh(box(0.14, 2.7, 0.8), M.lacquer, 2.78, y0 + 1.4, s * 0.42, g));
  [-1, 1].forEach((s) => mesh(box(0.05, 2.3, 0.5), M.gold, 2.87, y0 + 1.4, s * 0.42, g));
  mesh(box(0.3, 0.5, 2.6), M.gold, 2.7, y0 + 3.4, 0, g);
  // the colonnade
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12, r = 5.6;
    const px = Math.max(-5.2, Math.min(5.2, Math.cos(a) * r * 1.3)), pz = Math.max(-5.2, Math.min(5.2, Math.sin(a) * r * 1.3));
    mesh(cyl(0.17, 0.2, 4.3, 10), M.darkWood, px, y0 + 2.15, pz, g);
    mesh(box(0.5, 0.3, 0.5), M.stone, px, y0 + 0.15, pz, g);
    mesh(box(0.45, 0.16, 0.45), M.gold, px, y0 + 4.22, pz, g);
  }
  let y = y0 + 4.3;
  for (let i = 0; i < 5; i++) {
    const r = 7.6 - i * 1.3;
    mesh(box(r * 2 + 0.2, 0.22, r * 2 + 0.2), M.lacquer, 0, y + 0.02, 0, g);
    roofTier(r * 0.42, r, 1.75, M.thatch, y + 0.1, g);
    mesh(box(r * 0.8, 0.95, r * 0.8), i % 2 ? M.lacquer : M.darkWood, 0, y + 2.25, 0, g);
    y += 2.7;
  }
  mesh(new THREE.ConeGeometry(0.5, 1.5, 8), M.gold, 0, y + 0.35, 0, g);
  mesh(ball(0.3), M.gold, 0, y + 1.25, 0, g);
  mesh(new THREE.ConeGeometry(0.12, 0.9, 8), M.gold, 0, y + 1.9, 0, g);
  tedung(g, 8.3, 3.2, 0xe0c27e);
  tedung(g, 8.3, -3.2, 0xe0c27e);
  // lamps by the steps
  const lampM = glow(3.2, 2.1, 0.9);
  const lamps = [-1, 1].map((s) => {
    mesh(box(0.5, 1.3, 0.5), M.stone, 9.4, 2.3 - 1.6 + 0.65, s * 2.6, g);
    return mesh(ball(0.2), lampM, 9.4, 1.6, s * 2.6, g);
  });
  lamps.forEach((l) => (l.castShadow = false));
  return { group: g, lampM };
}

/** an open bale with the gamelan set out under it: seven kettles and two hanging gongs. Open side faces +x. */
export function buildBale() {
  const g = new THREE.Group();
  mesh(box(12, 1.1, 8.6), M.stone, 0, 0.55, 0, g);
  mesh(box(12.4, 0.2, 9), M.brick, 0, 1.2, 0, g);
  for (let i = 0; i < 3; i++) mesh(box(0.5, 0.36, 3), M.stone, 6.45 + i * 0.5, 0.95 - i * 0.36, 0, g);
  umbul(g, 7.6, 5.6, "terracotta", Math.PI / 2 - 0.25, 7.4);
  umbul(g, 7.6, -5.6, "indigo", Math.PI / 2 + 0.25, 7.4);
  const y0 = 1.3;
  [-5.2, 0, 5.2].forEach((x) => [-3.6, 3.6].forEach((z) => {
    mesh(cyl(0.17, 0.2, 3.6, 10), M.darkWood, x, y0 + 1.8, z, g);
    mesh(box(0.5, 0.25, 0.5), M.gold, x, y0 + 3.5, z, g);
  }));
  mesh(box(11.2, 0.3, 8), M.darkWood, 0, y0 + 3.75, 0, g);
  roofTier(1.6, 7.4, 2.9, M.thatch, y0 + 3.9, g, 0.7);
  mesh(box(3.6, 0.3, 0.4), M.lacquer, 0, y0 + 6.9, 0, g);
  // the kakula: seven bossed kettles on a lacquered frame
  mesh(box(0.95, 0.5, 6.4), M.lacquer, 1.2, y0 + 0.55, 0, g);
  mesh(box(1.0, 0.07, 6.5), M.gold, 1.2, y0 + 0.83, 0, g);
  [-1, 1].forEach((s) => mesh(box(1.1, 0.75, 0.2), M.lacquer, 1.2, y0 + 0.38, s * 3.2, g));
  const kettles: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) {
    const m = std({ color: 0xb08a4a, rough: 0.3, metal: 1 });
    const k = mesh(ball(0.34, 20, 14), m, 1.2, y0 + 0.98, -2.55 + i * 0.85, g);
    k.scale.y = 0.55;
    mesh(ball(0.11, 12, 10), m, 0, 0.3, 0, k);
    kettles.push(k);
  }
  // two tawa-tawa gongs hanging in a carved stand
  [-1, 1].forEach((s) => mesh(cyl(0.09, 0.11, 2.6, 8), M.lacquer, -2.6, y0 + 1.3, s * 2.1, g));
  mesh(box(0.22, 0.22, 4.9), M.lacquer, -2.6, y0 + 2.62, 0, g);
  mesh(box(0.26, 0.1, 5.1), M.gold, -2.6, y0 + 2.76, 0, g);
  const gongs = [-1, 1].map((s) => {
    const gm = std({ color: 0xa67c3d, rough: 0.36, metal: 1 });
    const o = mesh(cyl(0.82, 0.82, 0.14, 36), gm, -2.6, y0 + 1.55, s * 1.02, g);
    o.rotation.z = Math.PI / 2;
    mesh(ball(0.2, 14, 10), gm, 0, -0.1, 0, o).scale.y = 0.6;
    mesh(new THREE.TorusGeometry(0.82, 0.07, 8, 36), gm, 0, 0, 0, o).rotation.x = Math.PI / 2;
    return o;
  });
  // the gimba drum
  const drum = mesh(cyl(0.34, 0.28, 1.1, 16), M.wood, -0.6, y0 + 0.4, 2.6, g);
  drum.rotation.x = Math.PI / 2;
  return { group: g, kettles, gongs };
}

/** a small guest house with a pool: the hospitality websites. The veranda faces +x. */
export function buildGuestHouse() {
  const g = new THREE.Group();
  mesh(box(15, 0.9, 11), M.stone, 0, 0.45, 0, g);
  const y0 = 0.9;
  mesh(box(10, 3.3, 8), M.plaster, -1.5, y0 + 1.65, 0, g);
  [-1, 1].forEach((a) => [-1, 1].forEach((b) => mesh(box(0.3, 3.4, 0.3), M.darkWood, -1.5 + a * 5, y0 + 1.7, b * 4, g)));
  mesh(box(0.06, 2.3, 1.2), new THREE.MeshBasicMaterial({ color: 0x2a1a0c }), 3.52, y0 + 1.15, 0, g); // the dark of the doorway
  const door = new THREE.Group(); // hinged on its left edge
  door.position.set(3.58, y0, -0.6);
  g.add(door);
  mesh(box(0.1, 2.3, 1.2), M.wood, 0, 1.15, 0.6, door);
  mesh(ball(0.05, 8, 6), M.brass, 0.07, 1.1, 1.05, door);
  const glass = new THREE.MeshStandardMaterial({ color: 0x1a2a30, roughness: 0.15, metalness: 0.5, emissive: 0xffb45a, emissiveIntensity: 0 });
  [-2.6, 2.6].forEach((z) => {
    mesh(box(0.1, 1.5, 1.3), glass, 3.54, y0 + 1.75, z, g);
    [-1, 1].forEach((s) => mesh(box(0.08, 1.6, 0.62), M.teal, 3.6, y0 + 1.75, z + s * 0.98, g));
  });
  // veranda
  for (let i = 0; i < 4; i++) mesh(cyl(0.12, 0.14, 3.1, 8), M.darkWood, 6.6, y0 + 1.55, -4.5 + i * 3, g);
  mesh(box(3.4, 0.14, 10), M.teak, 5.1, y0 + 0.07, 0, g);
  // a joglo roof: a shallow skirt under a steep crown
  roofTier(4.4, 9.4, 1.7, M.tile, y0 + 3.3, g, 0.74).parent!.position.x = 0.4;
  roofTier(0.5, 4.4, 3.0, M.tile, y0 + 5.0, g, 0.74).parent!.position.x = 0.4;
  mesh(box(1.4, 0.25, 0.3), M.darkWood, 0.4, y0 + 8.1, 0, g);
  // the pool, loungers and lanterns
  const pool = new THREE.Group();
  pool.position.set(11.5, 0, 0);
  g.add(pool);
  mesh(box(7.4, 0.9, 5.4), M.stone, 0, 0.45, 0, pool);
  const water = mesh(box(6.4, 0.1, 4.4), new THREE.MeshPhysicalMaterial({ color: 0x39b3ad, roughness: 0.06, metalness: 0, clearcoat: 1, emissive: 0x0b4b4a, emissiveIntensity: 0.5 }), 0, 0.88, 0, pool);
  water.castShadow = false;
  [-1.3, 1.3].forEach((z) => {
    const l = mesh(box(2.1, 0.12, 0.75), M.teak, 0.2, y0 + 0.4, 4.2 + (z > 0 ? 1.2 : 0), g);
    l.position.set(11.5 + z, y0 + 0.35, 3.6);
    l.rotation.y = Math.PI / 2;
    mesh(box(1.9, 0.1, 0.65), M.cream, 0, 0.1, 0, l);
  });
  const lanternM = glow(3.2, 2.1, 0.9);
  [[7.2, 5], [7.2, -5], [15.6, 3.2], [15.6, -3.2]].forEach(([x, z]) => {
    mesh(cyl(0.05, 0.06, 1.5, 6), M.iron, x, y0 + 0.75, z, g);
    mesh(box(0.3, 0.42, 0.3), lanternM, x, y0 + 1.65, z, g).castShadow = false;
  });
  // a frame loom on the veranda, a length of cloth half woven: the work of making a place, thread by thread
  const loom = new THREE.Group();
  loom.position.set(5.4, y0 + 0.14, -3.1);
  loom.rotation.y = Math.PI / 2 - 0.35;
  g.add(loom);
  [-1, 1].forEach((s) => {
    mesh(box(0.09, 1.6, 0.09), M.darkWood, s * 0.9, 0.8, 0, loom);
    mesh(box(0.09, 0.09, 1.4), M.darkWood, s * 0.9, 0.05, 0.4, loom);
  });
  mesh(cyl(0.055, 0.055, 2.0, 10), M.wood, 0, 1.52, 0, loom).rotation.z = Math.PI / 2;
  mesh(cyl(0.065, 0.065, 2.0, 10), M.wood, 0, 0.48, 1.0, loom).rotation.z = Math.PI / 2;
  const warpT = tex(128, 128, (c, w, h) => {
    c.fillStyle = "#02213d";
    c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 4) {
      c.fillStyle = x % 16 === 0 ? "#c39b65" : "rgba(244,238,227,.5)";
      c.fillRect(x, 0, 1, h);
    }
    c.fillStyle = "#c39b65";
    for (let y = 92; y < h; y += 6) c.fillRect(0, y, w, 2);
  });
  const cloth = mesh(new THREE.PlaneGeometry(1.6, 1.48), std({ map: warpT, rough: 0.9, side: THREE.DoubleSide }), 0, 1.0, 0.5, loom);
  cloth.rotation.x = -0.76;
  const beater = new THREE.Group();
  beater.position.set(0, 1.52, 0.02);
  loom.add(beater);
  mesh(box(1.76, 0.11, 0.06), M.lacquer, 0, -0.74, 0.48, beater);
  [-0.85, 0.85].forEach((x) => (mesh(box(0.04, 0.86, 0.04), M.darkWood, x, -0.38, 0.24, beater).rotation.x = -0.55));
  const shuttle = mesh(box(0.28, 0.05, 0.08), M.gold, -0.55, 0.82, 0.74, loom);
  return { group: g, door, glass, lanternM, beater, shuttle };
}

/** a stepped plinth for the Barong; the engine sets the sculpture on `seat` */
export function buildPlinth() {
  const g = new THREE.Group();
  mesh(box(7, 0.6, 7), M.stone, 0, 0.3, 0, g);
  mesh(box(5, 0.6, 5), M.stone, 0, 0.9, 0, g);
  mesh(box(2.8, 2.0, 2.8), M.brick, 0, 2.2, 0, g);
  mesh(box(3.3, 0.3, 3.3), M.stone, 0, 3.35, 0, g);
  [-1, 1].forEach((a) => [-1, 1].forEach((b) => mesh(new THREE.ConeGeometry(0.22, 0.6, 4), M.stone, a * 1.5, 3.8, b * 1.5, g)));
  tedung(g, 0, 3.4, 0xe0c27e);
  tedung(g, 0, -3.4, 0xe0c27e);
  const seat = new THREE.Group();
  seat.position.y = 3.5;
  g.add(seat);
  return { group: g, seat };
}

/** the Dua Pulau medallion afloat in the strait: contact */
export function buildBuoy() {
  const g = new THREE.Group();
  mesh(cyl(2.3, 2.6, 0.9, 24), std({ map: rep(plankT, 4, 1), color: 0x7a5232, rough: 0.8 }), 0, 0.2, 0, g);
  mesh(new THREE.TorusGeometry(2.36, 0.09, 8, 36), M.brass, 0, 0.66, 0, g).rotation.x = Math.PI / 2;
  mesh(cyl(0.16, 0.2, 1.0, 10), M.brass, 0, 1.1, 0, g);
  const spin = new THREE.Group();
  spin.position.y = 3.75;
  g.add(spin);
  mesh(new THREE.TorusGeometry(2.1, 0.13, 10, 48), M.gold, 0, 0, 0, spin);
  mesh(cyl(2.02, 2.02, 0.06, 48), std({ color: 0x02213d, rough: 0.5 }), 0, 0, 0, spin).rotation.x = Math.PI / 2;
  const art = new THREE.TextureLoader().load("/motifs/dua-pulau-medallion.png");
  art.colorSpace = THREE.SRGBColorSpace;
  [-1, 1].forEach((s) => {
    const d = new THREE.Mesh(new THREE.CircleGeometry(1.9, 48), new THREE.MeshStandardMaterial({ map: art, transparent: true, roughness: 0.4, metalness: 0.6, emissive: 0x8a6a30, emissiveMap: art, emissiveIntensity: 0.35 }));
    d.position.z = s * 0.04;
    if (s < 0) d.rotation.y = Math.PI;
    spin.add(d);
  });
  const lightM = glow(3.2, 2.1, 0.9);
  const light = mesh(ball(0.2), lightM, 0, 6.15, 0, g);
  light.castShadow = false;
  mesh(cyl(0.03, 0.03, 0.4, 6), M.brass, 0, 5.95, 0, g);
  return { group: g, spin, lightM };
}

// ---------- Windfall ----------
/** a seaside pier with a domed kiosk at its head: the Windfall story. It runs out along +x from the shore. */
export function buildPier(length = 52) {
  const g = new THREE.Group();
  const deckH = 3.3;
  mesh(box(length, 0.3, 5.2), std({ map: rep(plankT, length / 2, 1), color: 0x9a7a58, rough: 0.85 }), length / 2, deckH, 0, g);
  for (let x = 3; x < length + 4; x += 5.5)
    [-1, 1].forEach((s) => {
      mesh(cyl(0.16, 0.18, deckH + 8, 8), M.iron, x, deckH / 2 - 4, s * 2.1, g);
      spar(V(x, deckH - 0.2, s * 2.1), V(x, deckH - 2.6, -s * 2.1), 0.05, M.iron, g);
    });
  const head = length - 5;
  mesh(box(13, 0.3, 12), std({ map: rep(plankT, 6, 3), color: 0x9a7a58, rough: 0.85 }), head, deckH + 0.001, 0, g);
  [-1, 1].forEach((a) => [-1, 1].forEach((b) => mesh(cyl(0.18, 0.2, deckH + 8, 8), M.iron, head + a * 5.6, deckH / 2 - 4, b * 5.2, g)));
  // white railings
  const rails: THREE.BufferGeometry[] = [];
  const post = (x: number, z: number) => rails.push(box(0.09, 1.1, 0.09).translate(x, deckH + 0.7, z));
  const rail = (x0: number, z0: number, x1: number, z1: number) => {
    const l = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(z1 - z0, x1 - x0);
    [1.22, 0.75].forEach((y) => rails.push(box(l, 0.07, 0.07).rotateY(-a).translate((x0 + x1) / 2, deckH + y, (z0 + z1) / 2)));
    for (let k = 0; k <= l; k += 1.3) post(x0 + ((x1 - x0) * k) / l, z0 + ((z1 - z0) * k) / l);
  };
  [-1, 1].forEach((s) => {
    rail(0, s * 2.5, head - 6.5, s * 2.5);
    rail(head - 6.5, s * 2.5, head - 6.5, s * 5.9);
    rail(head - 6.5, s * 5.9, head + 6.4, s * 5.9);
  });
  rail(head + 6.4, -5.9, head + 6.4, 5.9);
  mesh(mergeGeometries(rails)!, M.white, 0, 0, 0, g);
  // lamp standards with white globes
  const lamps: THREE.MeshBasicMaterial[] = []; // shore first
  for (let x = 5; x < head - 7; x += 9) {
    const lm = glow(3.2, 2.1, 0.9);
    lamps.push(lm);
    [-1, 1].forEach((s) => {
      mesh(cyl(0.06, 0.09, 3.3, 8), M.iron, x, deckH + 1.8, s * 2.45, g);
      mesh(box(0.9, 0.06, 0.06), M.iron, x, deckH + 3.3, s * 2.45, g);
      [-0.4, 0.4].forEach((o) => (mesh(ball(0.19, 12, 10), lm, x + o, deckH + 3.48, s * 2.45, g).castShadow = false));
    });
  }
  const kioskGlass = new THREE.MeshStandardMaterial({ color: 0x24353a, roughness: 0.15, metalness: 0.5, emissive: 0xffc070, emissiveIntensity: 0 });
  // the kiosk
  mesh(cyl(3.0, 3.0, 3.1, 12), M.white, head, deckH + 1.7, 0, g);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    const w = mesh(box(0.08, 1.5, 1.0), i === 0 ? M.terracotta : kioskGlass, head + Math.cos(a) * 3.0, deckH + (i === 0 ? 1.1 : 1.9), Math.sin(a) * 3.0, g);
    w.rotation.y = -a;
    if (i === 0) w.scale.y = 1.4;
  }
  mesh(cyl(3.5, 3.5, 0.22, 24), M.sage, head, deckH + 3.35, 0, g);
  const dome = mesh(new THREE.SphereGeometry(3.1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.sage, head, deckH + 3.45, 0, g);
  dome.scale.y = 0.85;
  mesh(cyl(0.5, 0.7, 0.8, 10), M.white, head, deckH + 6.3, 0, g);
  mesh(ball(0.35), M.gold, head, deckH + 6.95, 0, g);
  mesh(cyl(0.03, 0.03, 2.2, 6), M.iron, head, deckH + 8.2, 0, g);
  const flag = mesh(new THREE.PlaneGeometry(1.5, 0.85), std({ color: 0xc67139, rough: 0.9, side: THREE.DoubleSide }), head + 0.78, deckH + 8.85, 0, g);
  [[head - 4, 4.6], [head + 3, 4.6], [head - 4, -4.6], [head + 3, -4.6]].forEach(([x, z]) => {
    mesh(box(2.2, 0.1, 0.55), M.teak, x, deckH + 0.62, z, g);
    mesh(box(2.2, 0.55, 0.08), M.teak, x, deckH + 0.95, z + Math.sign(z) * 0.28, g);
    [-0.9, 0.9].forEach((o) => mesh(box(0.08, 0.5, 0.5), M.iron, x + o, deckH + 0.4, z, g));
  });
  const kioskM = glow(3.2, 2.1, 0.9);
  [0.9, -0.9].forEach((z) => (mesh(ball(0.24, 12, 10), kioskM, head + 3.2, deckH + 2.2, z, g).castShadow = false));
  // bunting from lamp to lamp down both sides, in Windfall's colours
  const flags: THREE.BufferGeometry[] = [], strings: THREE.Vector3[] = [], hues = [0xc67139, 0xfff2eb, 0x7a8a5e, 0xf2c14e], col = new THREE.Color();
  for (let x = 5; x + 9 < head - 7; x += 9)
    [-1, 1].forEach((sd) => {
      let prev: THREE.Vector3 | null = null;
      for (let k = 0; k <= 12; k++) {
        const f = k / 12, pt = V(x + f * 9, deckH + 3.25 - Math.sin(Math.PI * f) * 0.75, sd * 2.45);
        if (prev) strings.push(prev, pt);
        prev = pt;
        if (k === 0 || k === 12) continue;
        const tri = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute([pt.x - 0.24, pt.y, pt.z, pt.x + 0.24, pt.y, pt.z, pt.x, pt.y - 0.52, pt.z + (k % 2 ? 0.06 : -0.06)], 3));
        col.setHex(hues[(k + (sd > 0 ? 0 : 2)) % 4]);
        tri.setAttribute("color", new THREE.Float32BufferAttribute([col.r, col.g, col.b, col.r, col.g, col.b, col.r, col.g, col.b], 3));
        flags.push(tri);
      }
    });
  const bunt = mergeGeometries(flags)!;
  bunt.computeVertexNormals();
  mesh(bunt, std({ vertexColors: true, rough: 0.9, side: THREE.DoubleSide }), 0, 0, 0, g);
  lines(strings, 0x2a2a28, g);
  return { group: g, flag, lamps, kioskM, kioskGlass };
}

/** Pip, Windfall's mascot, from the app's own model: a soft cream body, leaf ears, a yellow scarf and a glowing bulb */
export function buildPip() {
  // Pip exactly as Windfall draws them (windfall/scripts/art/pip.js, the model the app's own pictures are rendered
  // from): the same shapes and colours, cel-shaded in three tones, with the dark outline that makes Pip a drawing.
  const g = new THREE.Group();
  // the three tones are lifted from the original's: this world's sun is far stronger than the studio lights Pip was
  // drawn under and its exposure far lower, and without the lift Pip's peach comes out tan
  const grad = new THREE.DataTexture(new Uint8Array([150, 205, 245, 255]), 4, 1, THREE.RedFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter;
  grad.needsUpdate = true;
  const toons: THREE.MeshToonMaterial[] = [];
  const toon = (hex: number) => {
    const m = new THREE.MeshToonMaterial({ color: hex, gradientMap: grad, emissive: hex, emissiveIntensity: 0.34 });
    m.userData.toon = true;
    toons.push(m);
    return m;
  };
  const bodyM = toon(0xffe1b0), leafM = toon(0x7fbf5a), leafD = toon(0x5f9e44), scarfM = toon(0xffc928), scarfD = toon(0xf0a91a), cheekM = toon(0xff9a8a), footM = toon(0xf3c58e);
  const white = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: grad }), black = new THREE.MeshToonMaterial({ color: 0x24182e, gradientMap: grad });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, par: THREE.Object3D = g) => {
    const m = mesh(geo, mat, x, y, z, par);
    m.scale.set(sx, sy, sz);
    return m;
  };
  const V2 = (a: number[][]) => a.map(([x, y]) => new THREE.Vector2(x, y));
  add(new THREE.LatheGeometry(new THREE.SplineCurve(V2([[0, 0.05], [0.42, 0.08], [0.62, 0.35], [0.66, 0.8], [0.6, 1.3], [0.5, 1.75], [0.32, 2.02], [0, 2.1]])).getPoints(60), 48), bodyM, 0, 0, 0, 1, 1, 0.92);
  [-0.24, 0.24].forEach((x) => add(ball(0.17, 16, 12), footM, x, 0.06, 0.22, 1, 0.55, 1.3));
  add(new THREE.TorusGeometry(0.58, 0.09, 12, 40), scarfM, 0, 1.2, 0, 1, 1, 0.9).rotation.x = Math.PI / 2;
  add(new THREE.CapsuleGeometry(0.08, 0.38, 6, 12), scarfD, 0.34, 0.95, 0.5, 1, 1, 0.6).rotation.set(0.2, 0, 0.35);
  // the two leaves: a leaf's own outline, given a little thickness
  const es = new THREE.Shape();
  es.moveTo(0, 0);
  es.bezierCurveTo(0.32, 0.18, 0.3, 0.7, 0, 1);
  es.bezierCurveTo(-0.3, 0.7, -0.32, 0.18, 0, 0);
  const earGeo = new THREE.ExtrudeGeometry(es, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3, curveSegments: 20 });
  const ears = [-1, 1].map((sx) => {
    const e = new THREE.Group();
    e.position.set(sx * 0.2, 1.98, -0.02);
    e.rotation.set(-0.15, 0, -sx * 0.7);
    g.add(e);
    add(earGeo, sx < 0 ? leafM : leafD, 0, 0, -0.045, 0.7, 0.75, 1, e);
    return e;
  });
  const ant = new THREE.CatmullRomCurve3([V(0, 2.06, 0), V(0.04, 2.35, 0.05), V(0.2, 2.55, 0.08), V(0.32, 2.48, 0.1)]);
  add(new THREE.TubeGeometry(ant, 24, 0.025, 8), leafD, 0, 0, 0);
  const tip = ant.getPoint(1);
  const bulb = add(ball(0.09, 16, 12), glow(2.6, 2.3, 1.1), tip.x, tip.y, tip.z);
  bulb.castShadow = false;
  // the face, in its happy look: lids a little lowered into arches, a wide smile, the head tipped
  const head = new THREE.Group();
  head.position.set(0, 1.72, 0.47);
  head.rotation.z = 0.08;
  g.add(head);
  [-0.17, 0.17].forEach((x) => {
    const eye = new THREE.Group();
    eye.position.set(x, 0.02, 0);
    head.add(eye);
    add(ball(0.11, 20, 16), white, 0, 0, 0, 1, 1.25, 0.5, eye);
    add(ball(0.07, 16, 12), black, 0, 0, 0.035, 1, 1.15, 0.5, eye);
    add(ball(0.022, 8, 6), glow(1.5, 1.5, 1.5), 0.025, 0.04, 0.07, 1, 1, 1, eye).castShadow = false;
    add(new THREE.SphereGeometry(0.118, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), bodyM, 0, 0, 0, 1, 1.27, 0.56, eye).rotation.x = -0.34; // lifted further than in the drawings: here Pip is seen from above, which closes the eyes
  });
  const smile = new THREE.Group();
  smile.position.set(0, -0.17, 0.07);
  smile.scale.set(1.3, 1.6, 1);
  head.add(smile);
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.09, 0.025, -0.01), V(-0.035, -0.03, 0.015), V(0.035, -0.03, 0.015), V(0.09, 0.025, -0.01)]), 20, 0.02, 8), black, 0, 0, 0, 1, 1, 1, smile);
  [-0.3, 0.3].forEach((x) => add(ball(0.07, 12, 10), cheekM, x, -0.12, -0.03, 1, 0.65, 0.35, head));
  const arm = (par: THREE.Object3D, p: number[][], hand: number[]) => {
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p.map(([x, y, z]) => V(x, y, z))), 28, 0.085, 12), bodyM, 0, 0, 0, 1, 1, 1, par);
    add(ball(0.15, 16, 12), bodyM, hand[0], hand[1], hand[2], 1, 1, 1, par);
  };
  arm(g, [[-0.6, 1.15, 0.05], [-0.86, 0.85, 0.12], [-0.92, 0.55, 0.2]], [-0.93, 0.48, 0.22]);
  // the waving arm hangs from a shoulder so it can swing
  const shoulder = new THREE.Group();
  shoulder.position.set(0.6, 1.2, 0.05);
  g.add(shoulder);
  arm(shoulder, [[0, 0, 0], [0.35, 0.3, 0.1], [0.45, 0.75, 0.15]], [0.46, 0.83, 0.17]);
  // the outline: each cel-shaded part again, turned inside out, pushed out along its normals and painted dark
  g.updateMatrixWorld(true);
  const ws = V(0, 0, 0), outs: THREE.Mesh[] = [];
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && (m.material as THREE.Material).userData.toon) outs.push(m);
  });
  outs.forEach((o) => {
    o.getWorldScale(ws);
    const th = 0.022 / ((Math.abs(ws.x) + Math.abs(ws.y) + Math.abs(ws.z)) / 3 || 1);
    const m = new THREE.MeshBasicMaterial({ color: 0x2b1d33, side: THREE.BackSide });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.ot = { value: th };
      sh.vertexShader = "uniform float ot;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n transformed += normalize(normal) * ot;");
    };
    m.customProgramCacheKey = () => "pip-outline-" + th.toFixed(4);
    const line = new THREE.Mesh(o.geometry, m);
    line.castShadow = false;
    o.add(line);
  });
  return {
    group: g,
    /** dark: 1 at night, 0 by day. Pip's own lift of colour is for the sun; in the dark it would make a lamp of them. */
    update(t: number, still: boolean, dark = 0) {
      toons.forEach((m) => (m.emissiveIntensity = 0.05 + 0.29 * (1 - dark)));
      if (still) return;
      shoulder.rotation.z = 0.35 * Math.sin(t * 4);
      ears.forEach((e, n) => (e.rotation.z = (n ? -1 : 1) * (0.7 + 0.06 * Math.sin(t * 3.1 + n * 1.7))));
      bulb.scale.setScalar(1 + 0.18 * Math.sin(t * 3));
      g.scale.y = g.scale.x * (1 + 0.012 * Math.sin(t * 2.2));
    },
  };
}

/** the supper table at golden hour: places laid, festoon lights overhead, crates of the day's windfall. Long side along x. */
export function buildSupper() {
  const g = new THREE.Group();
  mesh(box(15, 0.16, 8), std({ map: rep(plankT, 7, 2), color: 0xa98a66, rough: 0.9 }), 0, 0.08, 0, g);
  const y0 = 0.16;
  mesh(box(9.4, 0.1, 1.5), M.wood, 0, y0 + 0.78, 0, g);
  [-4.2, 0, 4.2].forEach((x) => [-0.55, 0.55].forEach((z) => mesh(box(0.12, 0.74, 0.12), M.darkWood, x, y0 + 0.37, z, g)));
  mesh(box(9.5, 0.015, 0.62), M.cream, 0, y0 + 0.84, 0, g);
  const dishC = [0x7fbf5a, 0xffc928, 0xc67139, 0xe58a9a, 0x7a8a5e, 0xf4eee3];
  for (let i = 0; i < 7; i++)
    [-1, 1].forEach((s) => {
      const x = -3.9 + i * 1.3;
      // chair
      const c = new THREE.Group();
      c.position.set(x, y0, s * 1.25);
      c.rotation.y = s > 0 ? Math.PI : 0;
      g.add(c);
      mesh(box(0.48, 0.06, 0.46), M.wood, 0, 0.46, 0, c);
      mesh(box(0.44, 0.05, 0.42), M.terracotta, 0, 0.5, 0, c);
      mesh(box(0.48, 0.5, 0.05), M.wood, 0, 0.78, -0.22, c);
      [-0.2, 0.2].forEach((a) => [-0.19, 0.19].forEach((b) => mesh(box(0.05, 0.46, 0.05), M.darkWood, a, 0.23, b, c)));
      // place setting
      mesh(cyl(0.16, 0.12, 0.025, 20), M.white, x, y0 + 0.86, s * 0.5, g);
      mesh(cyl(0.035, 0.03, 0.12, 10), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0.9, thickness: 0.05 }), x + 0.24, y0 + 0.91, s * 0.42, g);
    });
  for (let i = 0; i < 6; i++) {
    const b = mesh(new THREE.SphereGeometry(0.2, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std({ color: dishC[i], rough: 0.4, side: THREE.DoubleSide }), -3.3 + i * 1.3, y0 + 1.05, 0, g);
    mesh(ball(0.15, 12, 8), std({ color: [0xd9a441, 0x9c3b22, 0x6a9a3a, 0xe9d9a8, 0xb5532a, 0x7a9a4a][i], rough: 0.9 }), 0, -0.08, 0, b).scale.y = 0.5;
  }
  const candles = [-2.6, 0, 2.6].map((x) => {
    mesh(cyl(0.06, 0.06, 0.16, 10), new THREE.MeshPhysicalMaterial({ color: 0xffe2b0, roughness: 0.1, transmission: 0.6, thickness: 0.1 }), x + 0.65, y0 + 0.93, 0, g);
    const f = mesh(ball(0.035, 8, 6), glow(4, 2.4, 0.8), x + 0.65, y0 + 0.95, 0, g);
    f.castShadow = false;
    return f;
  });
  // festoon lights between four poles
  const P = [V(-6.6, y0 + 4.3, -3.2), V(6.6, y0 + 4.3, -3.2), V(6.6, y0 + 4.3, 3.2), V(-6.6, y0 + 4.3, 3.2)];
  P.forEach((p) => mesh(cyl(0.06, 0.08, 4.3, 8), M.iron, p.x, y0 + 2.15, p.z, g));
  const bulbs: THREE.BufferGeometry[] = [], wire: THREE.Vector3[] = [];
  [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3]].forEach(([a, b]) => {
    const n = Math.round(P[a].distanceTo(P[b]) / 0.75);
    let prev = P[a].clone();
    for (let i = 1; i <= n; i++) {
      const t = i / n, p = P[a].clone().lerp(P[b], t);
      p.y -= Math.sin(Math.PI * t) * 0.9;
      wire.push(prev, p.clone());
      prev = p.clone();
      if (i < n) bulbs.push(ball(0.075, 8, 6).translate(p.x, p.y - 0.1, p.z));
    }
  });
  lines(wire, 0x1a1a1a, g);
  const festoonM = glow(3.4, 2.3, 1.0);
  g.add(new THREE.Mesh(mergeGeometries(bulbs)!, festoonM));
  // crates of surplus: apples, squash and greens
  [[-6.2, 2.2, 0xb5352a], [-5.2, 2.6, 0x7fbf5a], [-6.0, 3.1, 0xe08a2a]].forEach(([x, z, c]) => {
    mesh(box(0.8, 0.45, 0.6), std({ map: plankT, color: 0xb08a5a, rough: 0.9 }), x, y0 + 0.23, z, g);
    for (let i = 0; i < 9; i++) mesh(ball(0.11, 10, 8), std({ color: c, rough: 0.5 }), x - 0.25 + (i % 3) * 0.25, y0 + 0.5 + (i > 5 ? 0.08 : 0), z - 0.15 + Math.floor(i / 3) * 0.16, g);
  });
  return { group: g, festoonM, candles };
}

/** a terrace of beach huts in Brighton's colours: Bootcamp Connect and the earlier work. Doors face +z. */
export function buildHuts() {
  const g = new THREE.Group();
  const colours = [0xc67139, 0x6aa7a8, 0xf2c14e, 0xd9667b, 0x8fb0d9, 0x7a8a5e, 0xf4eee3];
  mesh(box(26.5, 0.4, 5.6), std({ map: rep(plankT, 10, 2), color: 0xa08c70, rough: 0.9 }), 0, 0.2, 0.6, g);
  const gable = new THREE.Shape();
  gable.moveTo(-1.5, 0);
  gable.lineTo(1.5, 0);
  gable.lineTo(0, 1.25);
  gable.closePath();
  const huts: { doors: THREE.Group[]; inside: THREE.MeshBasicMaterial }[] = [];
  colours.forEach((c, i) => {
    const h = new THREE.Group();
    h.position.set(-10.8 + i * 3.6, 0.4, 0);
    g.add(h);
    const paint = std({ map: rep(plankT, 1, 3), color: c, rough: 0.7 });
    mesh(box(2.8, 2.5, 3.4), paint, 0, 1.25, 0, h);
    const roof = mesh(new THREE.ExtrudeGeometry(gable, { depth: 3.8, bevelEnabled: false }), std({ color: i % 2 ? 0xf3efe6 : 0x3a4648, rough: 0.7 }), 0, 2.5, -1.9, h);
    roof.scale.x = 1.04;
    mesh(box(2.84, 0.1, 0.12), M.white, 0, 2.5, 1.72, h);
    const inside = glow(0.5, 0.33, 0.14); // the light in the hut, seen when its doors swing open
    mesh(box(1.26, 1.85, 0.02), inside, 0, 0.98, 1.66, h).castShadow = false;
    const doorM = std({ map: rep(plankT, 1, 2), color: new THREE.Color(c).multiplyScalar(0.72).getHex(), rough: 0.7 });
    const doors = [-1, 1].map((s) => {
      const hinge = new THREE.Group();
      hinge.position.set(s * 0.64, 0.98, 1.72);
      h.add(hinge);
      mesh(box(0.62, 1.85, 0.06), doorM, -s * 0.31, 0, 0, hinge);
      mesh(ball(0.035, 8, 6), M.brass, -s * 0.56, 0.02, 0.05, hinge);
      mesh(box(0.1, 2.5, 0.1), M.white, s * 1.38, 1.25, 1.7, h);
      return hinge;
    });
    huts.push({ doors, inside });
    mesh(box(1.6, 0.14, 0.5), M.teak, 0, -0.07, 2.0, h);
  });
  // two striped deckchairs
  [[-3, 0xc67139], [4.4, 0x6aa7a8]].forEach(([x, c]) => {
    const d = new THREE.Group();
    d.position.set(x, 0.4, 2.7);
    d.rotation.y = 0.3;
    g.add(d);
    const seat = mesh(box(0.6, 0.03, 1.2), std({ color: c, rough: 0.9 }), 0, 0.42, 0, d);
    seat.rotation.x = -0.6;
    [-0.3, 0.3].forEach((s) => {
      mesh(box(0.04, 0.04, 1.4), M.wood, s, 0.42, 0, d).rotation.x = -0.6;
      mesh(box(0.04, 0.04, 1.0), M.wood, s, 0.3, 0.1, d).rotation.x = 0.7;
    });
  });
  return { group: g, huts };
}

/** a lighthouse with a weather vane and a spinning anemometer: the Weather Dashboard */
export function buildLighthouse() {
  const g = new THREE.Group();
  const rock = mesh(new THREE.DodecahedronGeometry(4.6, 1), std({ color: 0x6a625a, rough: 1 }), 0, 0.2, 0, g);
  rock.scale.set(1.3, 0.5, 1.2);
  mesh(cyl(3.0, 3.5, 1.4, 20), M.stone, 0, 2.0, 0, g);
  const bands = tex(64, 256, (c, w, h) => {
    c.fillStyle = "#f3efe6";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#c2552b";
    c.fillRect(0, 44, w, 46);
    c.fillRect(0, 150, w, 46);
  });
  bands.wrapS = bands.wrapT = THREE.ClampToEdgeWrapping;
  mesh(cyl(1.55, 2.6, 15, 28), std({ map: bands, rough: 0.55 }), 0, 10.2, 0, g);
  mesh(box(0.1, 1.9, 0.9), M.teal, 2.5, 3.7, 0, g);
  [7, 11, 15].forEach((y, i) => mesh(box(0.1, 0.8, 0.45), std({ color: 0x1a2a30, rough: 0.2, metal: 0.5 }), 2.2 - i * 0.22, y, 0, g));
  mesh(cyl(2.5, 2.2, 0.3, 24), M.iron, 0, 17.85, 0, g);
  const railT = mesh(new THREE.TorusGeometry(2.4, 0.04, 6, 36), M.iron, 0, 18.9, 0, g);
  railT.rotation.x = Math.PI / 2;
  for (let i = 0; i < 16; i++) mesh(cyl(0.03, 0.03, 1, 5), M.iron, Math.cos((i / 16) * 6.283) * 2.4, 18.4, Math.sin((i / 16) * 6.283) * 2.4, g);
  const glass = mesh(new THREE.CylinderGeometry(1.35, 1.35, 2.1, 12, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xeaf6f6, roughness: 0.05, transmission: 0.85, thickness: 0.1, transparent: true, opacity: 0.45, side: THREE.DoubleSide }), 0, 19.05, 0, g);
  glass.castShadow = false;
  const lampM = glow(5, 4.2, 2.4);
  const lampBall = mesh(ball(0.5), lampM, 0, 19.05, 0, g);
  lampBall.castShadow = false;
  mesh(new THREE.ConeGeometry(1.7, 1.4, 12), M.sage, 0, 20.8, 0, g);
  mesh(ball(0.22), M.gold, 0, 21.6, 0, g);
  // the beam sweeps; two soft cones back to back
  const beam = new THREE.Group();
  beam.position.y = 19.05;
  g.add(beam);
  const beamM = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(1.0, 0.9, 0.6), transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  [-1, 1].forEach((s) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(4, 70, 20, 1, true), beamM);
    c.rotation.z = (s * Math.PI) / 2;
    c.position.x = s * 35;
    beam.add(c);
  });
  // weather vane and anemometer
  const vane = new THREE.Group();
  vane.position.y = 22.5;
  g.add(vane);
  mesh(cyl(0.03, 0.03, 1.8, 6), M.iron, 0, -0.5, 0, g).position.y = 22.2;
  mesh(box(1.5, 0.05, 0.05), M.gold, 0, 0.3, 0, vane);
  mesh(new THREE.ConeGeometry(0.14, 0.4, 4), M.gold, 0.85, 0.3, 0, vane).rotation.z = -Math.PI / 2;
  mesh(box(0.4, 0.3, 0.03), M.gold, -0.7, 0.3, 0, vane);
  const cups = new THREE.Group();
  cups.position.y = 23.3;
  g.add(cups);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    mesh(box(0.5, 0.03, 0.03), M.iron, Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25, cups).rotation.y = -a;
    mesh(new THREE.SphereGeometry(0.11, 10, 8, 0, Math.PI), M.brass, Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5, cups).rotation.y = -a;
  }
  // the keeper's cottage
  mesh(box(5, 2.6, 3.6), M.plaster, -5.4, 2.6, 0.6, g);
  const cr = roofTier(0.3, 3.2, 1.6, std({ color: 0x3a4648, rough: 0.7 }), 3.9, g, 0.62);
  cr.parent!.position.set(-5.4, 0, 0.6);
  mesh(box(0.08, 1.7, 0.8), M.teal, -2.88, 2.2, 0.6, g);
  return { group: g, beam, vane, cups, lampM, beamM };
}

// ---------- planting ----------
const frondT = tex(256, 64, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.lineCap = "round";
  for (let x = 6; x < w - 4; x += 5) {
    const len = (h / 2 - 3) * Math.sin(Math.PI * Math.min(1, (x / w) * 0.86 + 0.14)) * (0.8 + rnd() * 0.2);
    g.strokeStyle = `rgb(${46 + rnd() * 40},${96 + rnd() * 50},${30 + rnd() * 20})`;
    g.lineWidth = 3.4;
    [-1, 1].forEach((s) => {
      g.beginPath();
      g.moveTo(x, h / 2);
      g.lineTo(x + 12, h / 2 + s * len);
      g.stroke();
    });
  }
  g.strokeStyle = "#8a8a3a";
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(0, h / 2);
  g.lineTo(w, h / 2);
  g.stroke();
});
frondT.wrapS = frondT.wrapT = THREE.ClampToEdgeWrapping;

type Spot = { x: number; z: number; y: number; r: number };
const dummy = new THREE.Object3D();
function instances(geo: THREE.BufferGeometry, mat: THREE.Material, spots: Spot[], place: (s: Spot, o: THREE.Object3D, c: THREE.Color) => void, tint = false) {
  const im = new THREE.InstancedMesh(geo, mat, spots.length);
  const c = new THREE.Color();
  spots.forEach((s, i) => {
    dummy.position.set(s.x, s.y, s.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    c.setRGB(1, 1, 1);
    place(s, dummy, c);
    dummy.updateMatrix();
    im.setMatrixAt(i, dummy.matrix);
    if (tint) im.setColorAt(i, c);
  });
  im.castShadow = im.receiveShadow = true;
  return im;
}

export function buildPalms(spots: Spot[]) {
  const curve = new THREE.CatmullRomCurve3([V(0, -0.4, 0), V(0.3, 3, 0), V(0.9, 6, 0), V(1.9, 8.8, 0)]);
  const nuts = [0, 1, 2, 3].map((i) => ball(0.2, 8, 6).translate(1.9 + Math.cos(i * 1.6) * 0.28, 8.45, Math.sin(i * 1.6) * 0.28));
  const trunk = mergeGeometries([new THREE.TubeGeometry(curve, 12, 0.22, 7), ...nuts])!;
  const fronds: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 15; i++) {
    const inner = i >= 10;
    const L = inner ? 3.6 : 5.2, f = new THREE.PlaneGeometry(L, 1.7, 10, 2);
    const p = f.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k) + L / 2, wy = p.getY(k), t = x / L;
      const rise = inner ? 1.9 * t - 0.9 * t * t : 1.1 * t - 2.6 * t * t;
      p.setXYZ(k, x, rise - Math.abs(wy) * 0.35, wy);
    }
    f.rotateY((i / (inner ? 5 : 10)) * Math.PI * 2 + (inner ? 0.3 : 0) + rnd() * 0.3);
    f.translate(1.9, 8.8, 0);
    fronds.push(f);
  }
  const crown = mergeGeometries(fronds)!;
  crown.computeVertexNormals();
  const place = (s: Spot, o: THREE.Object3D) => {
    o.rotation.y = s.r * Math.PI * 2;
    o.scale.setScalar(0.75 + ((s.r * 7) % 1) * 0.6);
  };
  const g = new THREE.Group();
  g.add(instances(trunk, std({ color: 0x7c6a55, rough: 1 }), spots, place));
  g.add(instances(crown, new THREE.MeshStandardMaterial({ map: frondT, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.75 }), spots, place));
  return g;
}

/** a spray of leaves on clear ground: the canopy is built from many of these, so its edge is leaves, not a ball */
const sprayT = tex(128, 128, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 52, x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r, v = rnd();
    g.fillStyle = `rgb(${150 + v * 90},${165 + v * 85},${120 + v * 70})`; // near-white greens: the tree's own colour tints them
    g.beginPath();
    g.ellipse(x, y, 5 + rnd() * 7, 2.2 + rnd() * 2.6, rnd() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
});
sprayT.wrapS = sprayT.wrapT = THREE.ClampToEdgeWrapping;

/**
 * One tree: a trunk that forks, and a crown of leaf sprays set on a few overlapping lobes. Every spray's normal points
 * out from its lobe's middle, so the crown takes the light as one soft round mass while its outline stays ragged.
 * spread > 1 gives the low, wide crown of a tree grown in sea wind.
 */
function treeGeometry(spread: number) {
  const sprays: THREE.BufferGeometry[] = [];
  const lobes = [[0, 5.2, 0, 2.5], [1.9, 4.5, 0.5, 1.9], [-1.6, 4.4, -0.9, 1.8], [0.3, 6.3, 1.0, 1.5], [-0.5, 4.2, 1.7, 1.6], [0.8, 4.1, -1.7, 1.5]];
  const q = new THREE.Quaternion(), e = new THREE.Euler(), n = new THREE.Vector3();
  lobes.forEach(([lx, ly, lz, lr]) => {
    const count = Math.round(lr * lr * 5.2);
    for (let i = 0; i < count; i++) {
      // points over the lobe's shell, a few sunk inside so no gap shows the far side
      const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, rr = lr * (0.62 + rnd() * 0.42), s = Math.sqrt(1 - u * u);
      n.set(s * Math.cos(a), u * 0.8 + 0.12, s * Math.sin(a)).normalize();
      const size = 1.5 + rnd() * 1.1, g = new THREE.PlaneGeometry(size, size);
      q.setFromEuler(e.set(rnd() * 6.3, rnd() * 6.3, rnd() * 6.3));
      g.applyQuaternion(q);
      g.translate((lx + n.x * rr) * spread, ly * (spread > 1 ? 0.82 : 1) + n.y * rr * (spread > 1 ? 0.7 : 1), (lz + n.z * rr) * spread);
      const nrm = g.attributes.normal as THREE.BufferAttribute, shade = 0.5 + 0.5 * Math.min(1, Math.max(0, n.y * 0.7 + 0.55)) * (0.75 + 0.25 * (rr / lr));
      const col = new Float32Array(12);
      for (let k = 0; k < 4; k++) {
        nrm.setXYZ(k, n.x, n.y * 0.9 + 0.25, n.z);
        col.set([shade, shade, shade], k * 3);
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      sprays.push(g);
    }
  });
  const crown = mergeGeometries(sprays)!;
  crown.normalizeNormals();
  // the trunk leans a little and forks into three boughs that reach into the lobes
  const limb = (a: number[], b: number[], r0: number, r1: number) => {
    const A = V(a[0], a[1], a[2]), B = V(b[0], b[1], b[2]), d = B.clone().sub(A), g = new THREE.CylinderGeometry(r1, r0, d.length(), 7);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize()));
    g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
    return g;
  };
  const k = spread > 1 ? 0.82 : 1;
  const trunk = mergeGeometries([
    limb([0, -0.4, 0], [0.15, 2.6 * k, 0.05], 0.34, 0.24),
    limb([0.15, 2.6 * k, 0.05], [1.5 * spread, 4.3 * k, 0.4 * spread], 0.2, 0.09),
    limb([0.15, 2.6 * k, 0.05], [-1.3 * spread, 4.2 * k, -0.7 * spread], 0.19, 0.09),
    limb([0.15, 2.6 * k, 0.05], [0.1, 5.0 * k, 0.5], 0.21, 0.09),
  ])!;
  return { crown, trunk };
}
/** broadleaf trees. west: the tall dark crowns of a wet island. east: lower, wider and greyer, shaped by the sea wind */
export function buildTrees(spots: Spot[], west: boolean) {
  const { crown, trunk } = treeGeometry(west ? 1 : 1.28);
  const place = (s: Spot, o: THREE.Object3D, c: THREE.Color) => {
    o.rotation.y = s.r * 6.283;
    const k = (west ? 0.85 : 0.7) + ((s.r * 13) % 1) * (west ? 0.85 : 0.6);
    o.scale.set(k, k * (0.9 + ((s.r * 5) % 1) * 0.3), k);
    const v = (s.r * 3) % 1;
    if (west) c.setRGB(0.2 + v * 0.1, 0.42 + v * 0.16, 0.12 + v * 0.06);
    else c.setRGB(0.42 + v * 0.1, 0.5 + v * 0.1, 0.27 + v * 0.07);
  };
  const g = new THREE.Group();
  g.add(instances(trunk, std({ color: 0x55402f, rough: 1 }), spots, place));
  const leaves = instances(crown, new THREE.MeshStandardMaterial({ map: sprayT, alphaTest: 0.5, vertexColors: true, side: THREE.DoubleSide, roughness: 0.85 }), spots, place, true);
  // shadows are cut to the leaves too, so the ground under a tree is dappled, not a blot
  leaves.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: sprayT, alphaTest: 0.5 });
  g.add(leaves);
  return g;
}
/** a groyne: the timber breakwaters that comb Brighton's shingle, running from the beach down into the sea along +x */
export function buildGroyne(len = 15) {
  const g = new THREE.Group();
  const wet = std({ map: rep(plankT, 5, 1), color: 0x5a4a3c, rough: 0.7 }), post = std({ map: woodT, color: 0x4a3d32, rough: 0.75 });
  const parts: THREE.BufferGeometry[] = [], posts: THREE.BufferGeometry[] = [];
  // the wall steps down toward the sea, as each bay is a plank lower than the last
  for (let i = 0; i < len / 2.5; i++) {
    const x = i * 2.5, top = 1.25 - i * 0.2;
    parts.push(box(2.5, 2.6, 0.16).translate(x + 1.25, top - 1.3, 0));
    posts.push(box(0.3, 3.4, 0.3).translate(x, top - 1.2, 0.2), box(0.3, 3.4, 0.3).translate(x, top - 1.2, -0.2));
  }
  posts.push(cyl(0.2, 0.22, 4.4, 8).translate(len + 0.1, 0.2, 0));
  mesh(mergeGeometries(parts)!, wet, 0, 0, 0, g);
  mesh(mergeGeometries(posts)!, post, 0, 0, 0, g);
  // a marker on the seaward post, green over the weed line
  mesh(cyl(0.21, 0.21, 0.5, 8), std({ color: 0x3f6b3a, rough: 0.6 }), len + 0.1, 2.15, 0, g);
  return g;
}

/** a raised bed of the sort an allotment is made of: what Windfall's suppers are cooked from. Long side along x. */
export function buildPlanter(seed = 0) {
  const g = new THREE.Group();
  const timber = std({ map: rep(plankT, 2, 1), color: 0x8a6e4e, rough: 0.9 });
  mesh(box(2.6, 0.5, 1.2), timber, 0, 0.25, 0, g);
  mesh(box(2.4, 0.06, 1.0), std({ color: 0x2e2218, rough: 1, bump: 0 }), 0, 0.5, 0, g);
  const leaves: THREE.BufferGeometry[] = [], fruit: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 12; i++) {
    const x = -1.0 + (i % 6) * 0.4, z = i < 6 ? -0.26 : 0.26, k = 0.75 + (((i + seed) * 0.37) % 1) * 0.5;
    leaves.push(ball(0.2, 8, 6).scale(1, 0.85 * k, 1).translate(x, 0.6 + 0.08 * k, z));
    if ((i + seed) % 3 === 0) fruit.push(ball(0.07, 8, 6).translate(x + 0.1, 0.72, z + 0.08));
  }
  mesh(mergeGeometries(leaves)!, std({ color: seed % 2 ? 0x4f7a34 : 0x6a8f3c, rough: 0.85, bump: 0 }), 0, 0, 0, g);
  if (fruit.length) mesh(mergeGeometries(fruit)!, std({ color: seed % 2 ? 0xd9482f : 0xf2a03a, rough: 0.5, bump: 0 }), 0, 0, 0, g);
  return g;
}

/** the soft shadow a building keeps round its own foot, whatever the sun is doing: without it a model sits on the ground like a toy on a table */
const shadeT = tex(128, 128, (g, w, h) => {
  const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  grd.addColorStop(0, "rgba(0,0,0,.62)");
  grd.addColorStop(0.55, "rgba(0,0,0,.4)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
});
export function groundShade(r: number) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shadeT, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, toneMapped: false }));
  m.renderOrder = 1;
  return m;
}

/** a boulder: a ball pushed out of round by a few broad swells, so it reads as worn by water, not broken */
function boulder() {
  const raw = new THREE.IcosahedronGeometry(1, 3);
  raw.deleteAttribute("normal");
  raw.deleteAttribute("uv");
  const g = mergeVertices(raw, 1e-3);
  const p = g.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + 0.2 * Math.sin(x * 2.3 + y * 1.7) * Math.cos(z * 2.1 + x * 1.3) + 0.1 * Math.sin(y * 3.9 + z * 2.6) + 0.035 * Math.sin(x * 9 + z * 7) * Math.cos(y * 8);
    p.setXYZ(i, x * k, y * k, z * k);
    const shade = 0.55 + 0.45 * Math.min(1, Math.max(0, y * 0.7 + 0.5));
    col.set([shade, shade, shade], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}
export function buildRocks(spots: Spot[]) {
  // dark basalt on the volcanic island, brown flint on the other, every one a little lighter on top where the weather reaches it
  return instances(
    boulder(),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 }),
    spots,
    (s, o, c) => {
      o.rotation.set(s.r * 3, s.r * 7, s.r * 5);
      const k = 0.5 + ((s.r * 11) % 1) * 1.6;
      o.scale.set(k * 1.35, k * 0.66, k * 1.05);
      const v = ((s.r * 3) % 1) * 0.1;
      if (s.x < 0) c.setRGB(0.2 + v, 0.185 + v, 0.175 + v);
      else c.setRGB(0.33 + v, 0.29 + v, 0.24 + v);
    },
    true,
  );
}
