// Everything standing in the world, built in code: the pinisi and her oil lamp, Marea Dvīpa's gate, meru pavilion,
// Gong and Tugu Perdamaian, the guest house, the Victorian bandstand, the Windfall supper on the shingle, beach huts and lighthouse, Pip, and the planting.
// Lengths are in metres. Materials are physically based so the sky lights them.
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";

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
// drawn on a 256 grid at twice the resolution: up close (the lamp on the foredeck) a coarser grain showed its texels as steps
const plankT = tex(512, 512, (g) => {
  g.scale(2, 2);
  const w = 256, h = 256;
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
  g.setTransform(1, 0, 0, 1, 0, 0); // a texture drawn scaled (the planks) is weathered in its own pixels, scaled below
  const k = w / 256 >= 2 && t === plankT ? 2 : 1;
  g.scale(k, k);
  const W = w / k, H = h / k;
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W, r = 10 + rnd() * 34, y = rnd() * H, dark = rnd() > 0.45;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, dark ? `rgba(40,32,24,${0.16 * (o.blot ?? 1)})` : `rgba(255,248,232,${0.13 * (o.blot ?? 1)})`);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 22; i++) {
    const x = rnd() * W, len = H * (0.2 + rnd() * 0.6), wd = 3 + rnd() * 12, grd = g.createLinearGradient(0, 0, 0, len);
    grd.addColorStop(0, `rgba(36,30,24,${0.3 * (o.streak ?? 0)})`);
    grd.addColorStop(1, "rgba(36,30,24,0)");
    g.fillStyle = grd;
    g.fillRect(x, 0, wd, len);
  }
  if (o.damp) {
    const d = g.createLinearGradient(0, H * 0.62, 0, H);
    d.addColorStop(0, "rgba(0,0,0,0)");
    d.addColorStop(1, o.green ? `rgba(52,66,30,${o.damp})` : `rgba(44,36,28,${o.damp})`);
    g.fillStyle = d;
    g.fillRect(0, H * 0.62, W, H * 0.38);
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
export const glow = (r: number, g: number, b: number) => {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(r, g, b) });
  m.userData.glow = true; // the world gives every small lamp a soft halo, so a distant bulb never shrinks below a pixel and winks
  return m;
};

const M = {
  brick: std({ map: rep(brickT, 2, 1), rough: 0.92 }),
  stone: std({ map: parasT, rough: 0.95 }),
  thatch: std({ map: rep(thatchT, 4, 1), rough: 1 }),
  wood: std({ map: woodT, rough: 0.8 }),
  darkWood: std({ map: woodT, color: 0x6b5a4e, rough: 0.75 }),
  teak: std({ map: rep(plankT, 4, 1), color: 0xb98a55, rough: 0.7, bump: 0.35 }),
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
const hullTop = (u: number) => 2.4 + 2.2 * Math.pow(1 - u, 5) + 2.4 * Math.pow(u, 5); // a high, sweeping bow
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

/** A Bugis pinisi in the cruising style: a white hull with dark sheer stripes, a long two-storey teak deckhouse aft,
 *  two gaff-rigged masts with topsails and rope ladders, and a long bowsprit with its own walkway. Bow along +x. */
export function buildPinisi() {
  const boat = new THREE.Group();
  // hull: U-shaped sections swept from stern to bow
  const U = 56, S = 22;
  const pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [];
  /** the hull's surface at a station u and a height up its side (0 keel … 1 sheer) */
  const hullAt = (u: number, up: number) => {
    const w = hullW(u), top = hullTop(u), bot = hullBottom(u);
    const phi = Math.acos(Math.pow(Math.max(0, 1 - up), 0.8));
    return V(-HULL_L / 2 + u * HULL_L + 1.6 * Math.pow(u, 7) * up - 1.1 * Math.pow(1 - u, 6) * up, bot + (top - bot) * up, w * Math.sin(phi) * (0.9 + 0.1 * up));
  };
  for (let i = 0; i <= U; i++) {
    const u = i / U, w = hullW(u), top = hullTop(u), bot = hullBottom(u);
    for (let j = 0; j <= S; j++) {
      const phi = -Math.PI / 2 + (Math.PI * j) / S;
      const up = 1 - Math.pow(Math.cos(phi), 1.25);
      const y = bot + (top - bot) * up;
      const x = -HULL_L / 2 + u * HULL_L + 1.6 * Math.pow(u, 7) * up - 1.1 * Math.pow(1 - u, 6) * up;
      pos.push(x, y, w * Math.sin(phi) * (0.9 + 0.1 * up));
      uv.push(u * 7, (j / S) * 3);
      // paint: red antifouling, a dark boot-top at the waterline, then white topsides with two dark sheer stripes
      const fromTop = top - y;
      if (y < 0.3) col.push(0.45, 0.1, 0.07);
      else if (y < 0.44) col.push(0.1, 0.09, 0.08);
      else if (fromTop < 0.14) col.push(0.32, 0.21, 0.13);
      else col.push(0.95, 0.94, 0.91);
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
  col.push(0.95, 0.94, 0.91);
  for (let j = 0; j < S; j++) idx.push(sternC, j + 1, j);
  const hg = new THREE.BufferGeometry();
  hg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  hg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  hg.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  hg.setIndex(idx);
  hg.computeVertexNormals();
  mesh(hg, std({ vertexColors: true, rough: 0.42, side: THREE.DoubleSide }), 0, 0, 0, boat);
  // two dark sheer stripes along each side, following the sheer from the transom to the stem: flat bands laid just
  // proud of the hull (the hull's own mesh is too coarse to paint bands this thin)
  const stripeM = std({ color: 0x2a1d14, rough: 0.4, side: THREE.DoubleSide });
  [[0.42, 0.2], [0.78, 0.1]].forEach(([drop, h]) =>
    [-1, 1].forEach((s) => {
      const p: number[] = [], ix: number[] = [], n = 60;
      for (let i = 0; i <= n; i++) {
        const u = 0.015 + (0.97 * i) / n, top = hullTop(u), bot = hullBottom(u);
        [drop, drop + h].forEach((d) => {
          const q = hullAt(u, (top - d - bot) / (top - bot));
          p.push(q.x, q.y, s * (q.z + 0.025));
        });
        if (i < n) ix.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
      g.setIndex(ix);
      g.computeVertexNormals();
      mesh(g, stripeM, 0, 0, 0, boat).castShadow = false;
    }),
  );
  // a row of portholes in the white band below the stripes, both sides
  const portM = std({ color: 0x18222a, rough: 0.15, metal: 0.5 }), rimM = std({ color: 0xc9b48a, rough: 0.35, metal: 0.6 });
  const portG = new THREE.CircleGeometry(0.15, 16), rimG = new THREE.RingGeometry(0.15, 0.21, 16);
  for (let x = -9.5; x <= 8; x += 1.25) {
    const u = (x + HULL_L / 2) / HULL_L, top = hullTop(u), bot = hullBottom(u), up = (top - 1.02 - bot) / (top - bot);
    [-1, 1].forEach((s) => {
      const p = hullAt(u, up);
      [portG, rimG].forEach((g, n) => {
        const m = mesh(g, n ? rimM : portM, p.x, p.y, s * (p.z + 0.03), boat);
        m.rotation.y = s > 0 ? 0 : Math.PI;
        m.castShadow = false;
      });
    });
  }

  // deck and rails, following the sheer
  const dp: number[] = [], du: number[] = [], di: number[] = [];
  const railL: THREE.Vector3[] = [], railR: THREE.Vector3[] = [];
  for (let i = 0; i <= U; i++) {
    const u = i / U, x = -HULL_L / 2 + u * HULL_L, w = hullW(u) * 0.97, y = hullTop(u) - 0.35;
    dp.push(x, y, -w, x, y, w);
    // planks run straight fore and aft and the narrowing hull cuts them off, as on a real deck: v by true distance
    // across, not stretched edge to edge (that pinched the planks at bow and stern and kinked them at every triangle)
    du.push(u * 10, 0.5 - w / (2 * HULL_B), u * 10, 0.5 + w / (2 * HULL_B));
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
  mesh(dg, std({ map: rep(plankT, 1, 8), color: 0xc49a66, rough: 0.75, side: THREE.DoubleSide, bump: 0.35 }), 0, 0, 0, boat);
  [railL, railR].forEach((r) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(r), 80, 0.13, 6), M.darkWood, 0, 0, 0, boat));
  // teak balusters along the bulwarks, forward of the deckhouse
  const balG = cyl(0.035, 0.035, 0.6, 6);
  for (let x = -2; x <= 12.5; x += 0.55) {
    const u = (x + HULL_L / 2) / HULL_L;
    [-1, 1].forEach((s) => mesh(balG, M.teak, x, hullTop(u) + 0.35, s * hullW(u) * 0.985, boat).castShadow = false);
  }
  [-1, 1].forEach((s) => {
    const r: THREE.Vector3[] = [];
    for (let x = -2; x <= 12.5; x += 0.5) {
      const u = (x + HULL_L / 2) / HULL_L;
      r.push(V(x, hullTop(u) + 0.68, s * hullW(u) * 0.985));
    }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(r), 40, 0.05, 5), M.teak, 0, 0, 0, boat);
  });

  // the deckhouse: two storeys of white walls and dark windows under teak decks, each deck railed with balusters,
  // and a sun deck on top with a canopy. Its plan follows the hull, which narrows towards the stern.
  const AFT = -12.9, FORE = -2.3;
  const plan = (x0: number, x1: number, k: number) => {
    const sh = new THREE.Shape(), n = 14;
    const half = (x: number) => hullW((x + HULL_L / 2) / HULL_L) * k;
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      i ? sh.lineTo(x, half(x)) : sh.moveTo(x, half(x));
    }
    for (let i = n; i >= 0; i--) {
      const x = x0 + ((x1 - x0) * i) / n;
      sh.lineTo(x, -half(x));
    }
    return { sh, half };
  };
  const slab = (x0: number, x1: number, k: number, y: number, h: number, mat: THREE.Material) => {
    const { sh, half } = plan(x0, x1, k);
    const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false }).rotateX(-Math.PI / 2);
    mesh(g, mat, 0, y, 0, boat);
    return half;
  };
  const wallM = std({ color: 0xf4f1ea, rough: 0.5 }), winM = std({ color: 0x1a2630, rough: 0.12, metal: 0.45, emissive: 0xffb262 }); // cabin lights: the world turns them up at dusk
  winM.emissiveIntensity = 0;
  const windows = (x0: number, x1: number, half: (x: number) => number, y: number, h: number) => {
    for (let x = x0 + 0.7; x < x1 - 0.5; x += 1.05)
      [-1, 1].forEach((s) => {
        const z = half(x), dz = half(x + 0.2) - half(x - 0.2);
        const w = mesh(box(0.78, h, 0.05), winM, x, y, s * (z + 0.02), boat);
        w.rotation.y = -s * Math.atan2(dz, 0.4);
        w.castShadow = false;
      });
  };
  const railAround = (x0: number, x1: number, half: (x: number) => number, y: number) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 20; i++) pts.push(V(x0 + ((x1 - x0) * i) / 20, y, half(x0 + ((x1 - x0) * i) / 20)));
    for (let i = 20; i >= 0; i--) pts.push(V(x0 + ((x1 - x0) * i) / 20, y, -half(x0 + ((x1 - x0) * i) / 20)));
    pts.push(pts[0].clone());
    for (let i = 0; i < pts.length - 1; i += 1) {
      const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.round(a.distanceTo(b) / 0.5));
      for (let j = 0; j < n; j++) mesh(balG, M.teak, a.x + ((b.x - a.x) * j) / n, y + 0.3, a.z + ((b.z - a.z) * j) / n, boat).castShadow = false;
    }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 90, 0.055, 5, true), M.teak, 0, 0.62, 0, boat);
  };
  const base = deckY(FORE) - 0.2, L1 = deckY(AFT) + 2.05, L2 = L1 + 1.75;
  const h1 = slab(AFT, FORE, 0.86, base, L1 - base, wallM);
  windows(AFT, FORE, h1, L1 - 0.85, 0.8);
  const d1 = slab(AFT - 0.2, FORE + 0.3, 0.9, L1, 0.14, M.teak);
  railAround(AFT - 0.1, FORE + 0.2, (x) => d1(x) - 0.08, L1 + 0.14);
  const U2A = AFT + 0.5, U2F = -5.6;
  const h2 = slab(U2A, U2F, 0.74, L1 + 0.14, L2 - L1 - 0.14, wallM);
  windows(U2A, U2F, h2, L2 - 0.75, 0.75);
  const d2 = slab(U2A - 0.15, U2F + 0.15, 0.77, L2, 0.12, M.teak);
  railAround(U2A - 0.05, U2F + 0.05, (x) => d2(x) - 0.08, L2 + 0.12);
  // the canopy over the forward half of the sun deck, on four posts
  const cx0 = -9.2, cx1 = U2F + 0.1, cy = L2 + 2.2;
  [cx0 + 0.2, cx1 - 0.2].forEach((x) => [-1, 1].forEach((s) => mesh(cyl(0.05, 0.05, cy - L2, 6), M.teak, x, (cy + L2) / 2, s * (d2(x) - 0.2), boat)));
  slab(cx0, cx1, 0.8, cy, 0.08, std({ color: 0xece4d4, rough: 0.9, side: THREE.DoubleSide }));
  const cabinTop = L2 + 0.12;

  // cargo hatch and coiled rope on the foredeck
  mesh(box(3.2, 0.5, 2.6), M.teak, 2.4, deckY(2.4) + 0.25, 0, boat);
  mesh(box(3.4, 0.08, 2.8), M.darkWood, 2.4, deckY(2.4) + 0.54, 0, boat);
  const coil = mesh(new THREE.TorusGeometry(0.36, 0.08, 6, 18), std({ color: 0xcdb88f, rough: 1 }), 8.4, deckY(8.4) + 0.09, 1.1, boat);
  coil.rotation.x = Math.PI / 2;

  // masts with crosstrees, a long bowsprit with a railed walkway, gaffs and booms
  const spars = new THREE.Group();
  boat.add(spars);
  const fx = 5.5, mx = -3.6, FT = 27, MT = 24; // mast tops: the foremast is the taller, as on a pinisi
  const fDeck = deckY(fx), mDeck = deckY(mx);
  spar(V(fx, fDeck, 0), V(fx - 0.5, FT, 0), 0.32, M.wood, spars, 0.14);
  spar(V(mx, mDeck, 0), V(mx - 0.5, MT, 0), 0.29, M.wood, spars, 0.13);
  [[fx - 0.42, 21.5, 1.7], [mx - 0.42, 19.5, 1.5]].forEach(([x, y, w]) => {
    spar(V(x, y, -w), V(x, y, w), 0.07, M.wood, spars);
    spar(V(x - 0.5, y + 0.05, 0), V(x + 0.6, y + 0.05, 0), 0.06, M.wood, spars);
  });
  const bow0 = V(13.2, hullTop(0.96) + 0.1, 0), bow1 = V(24.5, 7.4, 0);
  spar(bow0, bow1, 0.2, M.wood, spars, 0.1);
  {
    // the walkway out along the bowsprit, planked and railed, for whoever goes out to the jibs
    const a = bow0.clone(), b = bow0.clone().lerp(bow1, 0.6), d = b.clone().sub(a), len = d.length();
    const walk = new THREE.Group();
    walk.position.copy(a.clone().lerp(b, 0.5)).add(V(0, 0.18, 0));
    walk.rotation.z = Math.atan2(d.y, d.x);
    spars.add(walk);
    mesh(box(len, 0.08, 1.0), M.teak, 0, 0, 0, walk);
    [-1, 1].forEach((s) => {
      for (let i = 0; i <= 8; i++) mesh(cyl(0.03, 0.03, 0.55, 5), M.teak, -len / 2 + (len * i) / 8, 0.3, s * 0.48, walk);
      mesh(box(len, 0.05, 0.06), M.teak, 0, 0.58, s * 0.48, walk);
    });
  }
  const sailM = std({ map: sailT, rough: 0.95, side: THREE.DoubleSide }), mainSailM = std({ map: mainSailT, rough: 0.95, side: THREE.DoubleSide });
  const sails: THREE.Mesh[] = [];
  const sail = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, belly: number, m: THREE.Material = sailM) => {
    const s = mesh(sailGeo(a, b, c, d, belly), m, 0, 0, 0, boat);
    sails.push(s);
    return s;
  };
  // fore gaff sail and topsail
  const fTack = V(fx - 0.3, fDeck + 2.6, 0), fThroat = V(fx - 0.45, 17.6, 0), fPeak = V(-1.0, 22, 2.7), fClew = V(-2.2, fDeck + 3.2, 3.2); // sheeted out to leeward
  sail(fTack, fThroat, fPeak, fClew, 1.6);
  spar(fThroat, fPeak, 0.11, M.wood, spars);
  spar(fTack, fClew, 0.11, M.wood, spars);
  sail(V(fx - 0.45, 18.1, 0), V(fx - 0.5, FT - 0.6, 0), V(fx - 0.5, FT - 0.6, 0), V(-0.9, 22.4, 2.7), 0.9);
  // main (aft) gaff sail, its foot sheeted high enough to clear the sun deck's canopy, and its topsail
  const foot = cy + 0.8;
  const mTack = V(mx - 0.3, foot, 0), mThroat = V(mx - 0.45, 16.6, 0), mPeak = V(-10.8, 20.2, 2.5), mClew = V(-13.2, foot + 0.5, 3.0);
  sail(mTack, mThroat, mPeak, mClew, 1.3, mainSailM);
  spar(mThroat, mPeak, 0.1, M.wood, spars);
  spar(mTack, mClew, 0.1, M.wood, spars);
  sail(V(mx - 0.45, 17.1, 0), V(mx - 0.5, MT - 0.6, 0), V(mx - 0.5, MT - 0.6, 0), V(-10.6, 20.6, 2.5), 0.7);
  // three jibs out along the bowsprit
  [[1, FT - 1.2, 8.2], [0.68, FT - 5.2, 7.8], [0.36, FT - 9.2, 7.4]].forEach(([t, headY, clewY], i) => {
    const tack = bow0.clone().lerp(bow1, t).add(V(0, 0.15, 0));
    const head = V(fx - 0.2 + (FT - headY) * 0.02, headY, 0);
    sail(tack, head, head, V(fx + 1.2 + i * 0.5, clewY, 2.3), 0.9 - i * 0.15);
  });
  // standing rigging: stays, shrouds with their rope ladders (ratlines), the bobstay and a pennant
  const rig: THREE.Vector3[] = [
    V(fx - 0.5, FT, 0), bow1, V(fx - 0.5, FT, 0), V(mx - 0.5, MT, 0), V(mx - 0.5, MT, 0), V(-14, hullTop(0) + 0.2, 0),
    bow1, V(14.6, 0.9, 0),
  ];
  const shrouds = (x: number, top: number, u0: number, u1: number) =>
    [-1, 1].forEach((s) => {
      const T = V(x - 0.5, top, 0), A = V(x - 1, deckY(x) + 0.4, s * hullW(u0)), B = V(x + 1, deckY(x) + 0.4, s * hullW(u1));
      rig.push(T, A, T, B);
      for (let k = 0.05; k < 0.62; k += 0.035) rig.push(A.clone().lerp(T, k), B.clone().lerp(T, k));
    });
  shrouds(fx, FT - 1, 0.68, 0.72);
  shrouds(mx, MT - 1, 0.36, 0.4);
  lines(rig, 0x241a12, boat);
  const flag = mesh(new THREE.PlaneGeometry(1.5, 0.9, 6, 1), std({ color: 0xc67139, rough: 0.9, side: THREE.DoubleSide }), mx - 1.3, MT + 0.1, 0, boat);

  // where the oil lamp stands: a small teak stand on the foredeck
  const lampAt = new THREE.Group();
  lampAt.position.set(10.6, deckY(10.6), 0);
  boat.add(lampAt);
  mesh(box(0.5, 0.55, 0.5), M.teak, 0, 0.275, 0, lampAt);
  mesh(box(0.62, 0.05, 0.62), M.darkWood, 0, 0.575, 0, lampAt);
  // where Pip stands as crew. Before sailing: curled up beside the lamp, on the side the first view looks from,
  // kept inside the narrowing bow. Under way: on the sun deck at the stern, the part the following camera sees.
  const bx = 10.95, pipBow = new THREE.Group();
  pipBow.position.set(bx, deckY(bx), Math.min(0.55, hullW((bx + HULL_L / 2) / HULL_L) - 0.45));
  const pipStern = new THREE.Group();
  pipStern.position.set(-11.4, cabinTop, 0);
  boat.add(pipBow, pipStern);

  boat.traverse((o) => {
    if (o instanceof THREE.Mesh && o.castShadow !== false && o.geometry !== balG) o.castShadow = true;
  });
  return { boat, sails, flag, lampAt, pipBow, pipStern, cabinGlass: winM };
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
/** dark volcanic stone carved all over in relief: bands of scrollwork between ledges, as on a Balinese gate */
const carvedT = tex(256, 256, (g, w, h) => {
  g.fillStyle = "#5a554e";
  g.fillRect(0, 0, w, h);
  speckle(g, w, h, 2600, ["#3e3a35", "#77716a", "#4a463f"], 3);
  for (let y = 0; y < h; y += 64) {
    // a ledge: lit along its top, shadowed under
    g.fillStyle = "rgba(205,196,180,.35)";
    g.fillRect(0, y, w, 3);
    g.fillStyle = "rgba(20,18,15,.55)";
    g.fillRect(0, y + 3, w, 5);
    // scrolls: each curl drawn twice, a light edge up and left and a dark one down and right, so it reads as relief
    for (let x = 0; x < w; x += 32)
      [["rgba(20,18,15,.6)", 1.5], ["rgba(220,212,196,.38)", -1.2]].forEach(([c, o]) => {
        g.strokeStyle = c as string;
        g.lineWidth = 3;
        const ox = x + 16 + (o as number), oy = y + 36 + (o as number);
        g.beginPath();
        g.arc(ox, oy, 10, Math.PI * 0.1, Math.PI * 1.7);
        g.stroke();
        g.beginPath();
        g.arc(ox + 4, oy + 1, 4.5, Math.PI * 1.1, Math.PI * 2.6);
        g.stroke();
        g.beginPath();
        g.moveTo(ox - 14, oy + 18);
        g.quadraticCurveTo(ox, oy + 8, ox + 14, oy + 18);
        g.stroke();
      });
  }
});
age(carvedT, { streak: 0.9, damp: 0.55, green: true });
/** a pale paras panel set into the body: a framed field with a carved medallion at its heart */
const panelT = tex(128, 192, (g, w, h) => {
  g.fillStyle = "#d3cab8";
  g.fillRect(0, 0, w, h);
  speckle(g, w, h, 900, ["#a99f8c", "#ece5d6"], 2);
  g.strokeStyle = "#5c554b";
  g.lineWidth = 7;
  g.strokeRect(8, 8, w - 16, h - 16);
  g.lineWidth = 3;
  g.strokeRect(20, 20, w - 40, h - 40);
  g.fillStyle = "#6a6256";
  g.beginPath();
  g.ellipse(w / 2, h / 2, 26, 38, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#d3cab8";
  g.beginPath();
  g.ellipse(w / 2, h / 2, 17, 27, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#6a6256";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.beginPath();
    g.ellipse(w / 2 + Math.cos(a) * 9, h / 2 + Math.sin(a) * 14, 3.5, 6, a, 0, Math.PI * 2);
    g.fill();
  }
});
age(panelT, { streak: 0.6, damp: 0.3, green: true });

/** candi bentar: a carved temple tower split clean in two, the two halves mirror images, their inner faces sheer and
 *  plain where the cut runs. Round it: a pavilion either side, spiky agave and bougainvillea, two great shade trees,
 *  and a still pool laid before the steps. The path runs along x, out to the water at +x. */
export function buildGate() {
  const g = new THREE.Group();
  const carved = std({ map: carvedT, rough: 0.92, bump: 1.6 }), carvedS = std({ map: rep(carvedT, 2, 1), rough: 0.92, bump: 1.6 });
  const panel = std({ map: panelT, rough: 0.9, bump: 1.2 }), cut = std({ color: 0x766e64, rough: 0.8 }), redBrick = std({ map: rep(brickT, 3, 1), rough: 0.9 });
  mesh(box(9, 0.7, 19), M.stone, 0, 0.35, 0, g);
  for (let i = 0; i < 4; i++) [-1, 1].forEach((s) => mesh(box(0.5, 0.175, 2.6), M.stone, s * (4.75 + i * 0.5), 0.61 - i * 0.175, 0, g));
  const C = 1.25; // half the width of the cut
  // each half: [depth along the path, width out from the cut, height]
  const foot: [number, number, number] = [4.2, 4.0, 1.3], body: [number, number, number] = [3.5, 3.35, 4.4];
  const head: [number, number, number][] = [[3.9, 3.7, 0.55], [3.2, 3.05, 1.2], [2.75, 2.6, 1.1], [2.3, 2.15, 1.05], [1.9, 1.75, 1.0], [1.5, 1.38, 0.95], [1.12, 1.02, 0.9], [0.78, 0.7, 0.85]];
  const ornament = new THREE.ConeGeometry(0.22, 0.95, 5);
  [-1, 1].forEach((s) => {
    const h = new THREE.Group();
    h.scale.z = s;
    g.add(h);
    let y = 0.7;
    const outline: [number, number][] = []; // the cut face's outline, (x, y) up one side and down the other
    const tier = ([d, w, ht]: [number, number, number], mat: THREE.Material, rim = true) => {
      mesh(box(d, ht, w), mat, 0, y + ht / 2, C + w / 2, h);
      outline.push([d / 2, y], [d / 2, y + ht]);
      y += ht;
      if (rim) {
        mesh(box(d + 0.34, 0.2, w + 0.17), carved, 0, y + 0.1, C + (w + 0.17) / 2, h);
        outline.push([d / 2 + 0.17, y], [d / 2 + 0.17, y + 0.2]);
        y += 0.2;
      }
    };
    tier(foot, carvedS);
    // the body: a band of red brick at its foot and head, carved pilasters at the corners, a pale medallion panel each face
    const by = y;
    tier(body, carved, false);
    [by + 0.18, by + body[2] - 0.18].forEach((yy) => mesh(box(body[0] + 0.04, 0.36, body[1] + 0.02), redBrick, 0, yy, C + body[1] / 2, h));
    [-1, 1].forEach((e) => {
      mesh(box(0.05, 2.5, 1.55), panel, e * (body[0] / 2 + 0.025), by + 2.1, C + body[1] * 0.52, h);
      [0.2, body[1] - 0.25].forEach((zz) => mesh(box(0.32, body[2] - 0.6, 0.42), carved, e * (body[0] / 2 - 0.05), by + body[2] / 2, C + zz, h));
    });
    mesh(box(1.4, 2.2, 0.05), panel, 0, by + 2.2, C + body[1] + 0.03, h);
    // the head: tier on tier of cornices, each crowned at its corners with upturned flame-leaves (karang simbar)
    head.forEach((t, i) => {
      tier(t, i === 0 ? carvedS : carved);
      const [d, w] = t, k = Math.max(0.55, 1.15 - i * 0.08);
      [-1, 1].forEach((e) => {
        const o = mesh(ornament, carved, e * (d / 2 + 0.12), y + 0.42 * k, C + w + 0.05, h);
        o.scale.setScalar(k);
        o.rotation.set(0.28, 0, -e * 0.3);
        if (i < 6) {
          const m = mesh(ornament, carved, e * (d / 2 + 0.1), y + 0.38 * k, C + w * 0.5, h);
          m.scale.setScalar(k * 0.85);
          m.rotation.z = -e * 0.35;
        }
      });
      if (i > 0 && i < 4) mesh(box(0.2, 0.55, 0.7), panel, 0, y - 0.55, C + w + 0.12, h); // a little carved face on the outer side
    });
    const tip = mesh(new THREE.ConeGeometry(0.34, 1.9, 5), carved, 0, y + 0.95, C + 0.36, h);
    tip.scale.z = 1.1;
    outline.push([0.12, y + 1.6]);
    // the cut: one sheer, plain face from foot to tip, which is the whole point of a split gate
    const sh = new THREE.Shape();
    sh.moveTo(-outline[0][0], outline[0][1]);
    outline.forEach(([x, yy]) => sh.lineTo(x, yy));
    [...outline].reverse().forEach(([x, yy]) => sh.lineTo(-x, yy));
    const face = mesh(new THREE.ShapeGeometry(sh), cut, 0, 0, C - 0.012, h);
    face.rotation.y = Math.PI; // facing into the cut
    face.castShadow = false;
    // a lower carved wing stepping out from each half, with its own little crown, then the low wall beyond
    const wz = C + body[1] + 0.85;
    mesh(box(2.5, 4.2, 1.7), carved, 0, 0.7 + 2.1, wz, h);
    mesh(box(2.84, 0.22, 1.95), carved, 0, 0.7 + 4.31, wz, h);
    mesh(box(1.6, 0.8, 1.1), carved, 0, 0.7 + 4.82, wz, h);
    [-1, 1].forEach((e) => {
      mesh(box(0.05, 1.8, 0.9), panel, e * 1.26, 0.7 + 2.1, wz, h);
      const o = mesh(ornament, carved, e * 0.95, 0.7 + 4.8, wz + 0.6, h);
      o.rotation.set(0.3, 0, -e * 0.3);
    });
    mesh(new THREE.ConeGeometry(0.28, 1.2, 5), carved, 0, 0.7 + 5.8, wz, h);
    mesh(box(1.1, 2.3, 2.9), carved, 0, 0.7 + 1.15, wz + 2.3, h);
    mesh(box(1.4, 0.25, 3.1), carved, 0, 0.7 + 2.42, wz + 2.3, h);
  });
  // the fabric and the janur: poleng tied round the foot of each half, the ceremonial umbrellas, the penjor bowing
  // over the way down to the water, and the umbul-umbul banners
  const poleng = std({ map: rep(polengT.clone(), 10, 2), rough: 0.9 });
  tedung(g, 3.2, 3.0, 0xf4eee3);
  tedung(g, 3.2, -3.0, 0xf4eee3);
  [-1, 1].forEach((s) => {
    mesh(box(foot[0] + 0.06, 0.8, foot[1] + 0.06), poleng, 0, 0.7 + 0.72, s * (C + foot[1] / 2), g);
    penjor(g, 13.4, s * 4.6, s > 0 ? -0.5 : 0.5);
    umbul(g, 8.2, s * 11, s > 0 ? "indigo" : "terracotta", Math.PI / 2 - 0.3 * s);
  });

  // a pavilion either side: a stone plinth, four posts and a tiled roof
  const roofM = std({ map: rep(tileT, 5, 2), color: 0x8e8580, rough: 0.85 });
  [-1, 1].forEach((s) => {
    const b = new THREE.Group();
    b.position.set(3.4, 0, s * 9);
    g.add(b);
    mesh(box(3.6, 0.9, 3.6), carvedS, 0, 0.45, 0, b);
    [-1, 1].forEach((a) => [-1, 1].forEach((c) => mesh(cyl(0.1, 0.12, 2.1, 8), M.darkWood, a * 1.4, 0.9 + 1.05, c * 1.4, b)));
    mesh(box(3.2, 0.14, 3.2), M.darkWood, 0, 3.0, 0, b);
    roofTier(0.35, 2.35, 1.5, roofM, 3.05, b);
    mesh(new THREE.ConeGeometry(0.12, 0.5, 6), M.darkWood, 0, 4.8, 0, b);
  });

  // planting: spiky yellow agave in stone pots either side of the steps, bougainvillea in flower about the wings
  const spikes: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 34; i++) {
    const a = i * 2.4, tilt = 0.25 + (i % 5) * 0.2, len = 1.1 + (i % 3) * 0.25;
    spikes.push(new THREE.ConeGeometry(0.06, len, 3).translate(0, len / 2, 0).rotateZ(tilt).rotateY(a));
  }
  const agave = mergeGeometries(spikes)!, agaveM = std({ color: 0xcfd264, rough: 0.6 });
  [[5.7, 2.9], [5.7, -2.9], [-5.4, 3.1], [-5.4, -3.1]].forEach(([x, z]) => {
    mesh(cyl(0.42, 0.32, 0.7, 10), M.stone, x, 0.35, z, g);
    const a = mesh(agave, agaveM, x, 0.66, z, g);
    a.scale.setScalar(1.7);
    a.castShadow = false;
  });
  const leafM = std({ color: 0x3f6a2c, rough: 0.9 }), bloomM = std({ color: 0xe2576f, rough: 0.7 }), bloomG = ball(0.13, 6, 4);
  [[5.1, 4.9], [5.1, -4.9], [3.6, 6.2], [3.6, -6.2], [-4.2, 5.4], [-4.2, -5.4]].forEach(([x, z], j) => {
    const k = 1.35;
    mesh(ball(0.85, 10, 8), leafM, x, 0.6 * k, z, g).scale.set(1.2 * k, 0.85 * k, k);
    const pts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 70; i++) {
      // spread evenly over the dome of the bush: a golden-angle spiral, from its crown down to its sides
      const a = i * 2.39996 + j, e = Math.asin(1 - (i + 0.5) / 70 * 0.92);
      pts.push(bloomG.clone().translate(Math.cos(a) * Math.cos(e) * 0.98 * 1.2 * k, (0.6 + Math.sin(e) * 0.72) * k, Math.sin(a) * Math.cos(e) * 0.88 * k));
    }
    mesh(mergeGeometries(pts)!, bloomM, x, 0, z, g).castShadow = false;
  });
  // two great shade trees standing behind the pavilions, framing the gate as the banyans do
  const big = new THREE.Group();
  big.scale.setScalar(1.7);
  g.add(big);
  big.add(buildTrees([{ x: -5.2 / 1.7, z: 12.6 / 1.7, y: 0, r: 0.31 }, { x: -5.2 / 1.7, z: -12.6 / 1.7, y: 0, r: 0.77 }], true));

  // a still pool laid before the steps, so the gate stands in it twice over
  mesh(box(6.4, 0.3, 6.8), M.stone, 9.6, 0.15, 0, g);
  // a true mirror, kept small: it draws the world a second time only while it is on screen
  const pool = new Reflector(new THREE.PlaneGeometry(5.8, 6.2), { textureWidth: 512, textureHeight: 512, color: 0x7f949c, clipBias: 0.003 });
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(9.6, 0.31, 0);
  g.add(pool);
  // stone lamps down either side of the pool to the water: they light in pairs, from the gate outward, when someone comes
  const lamps = [0, 1, 2, 3].map((i) => {
    const m = glow(3.2, 2.1, 0.9);
    [-1, 1].forEach((s) => {
      mesh(box(0.4, 0.9, 0.4), M.stone, 7.0 + i * 1.7, 0.45, s * 4.0, g);
      mesh(ball(0.17), m, 7.0 + i * 1.7, 1.08, s * 4.0, g).castShadow = false;
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

// ---------- Gong Perdamaian and Tugu Perdamaian: the peace gong and the peace monument on the hill above Palu ----------
/** grey pavers laid in a running bond, as on the monument's plaza */
const paverT = tex(256, 256, (g, w, h) => {
  g.fillStyle = "#8f8d87";
  g.fillRect(0, 0, w, h);
  for (let r = 0; r < 16; r++)
    for (let c = -1; c < 9; c++) {
      const v = 168 + rnd() * 26;
      g.fillStyle = `rgb(${v},${v - 1},${v - 5})`;
      g.fillRect(c * 32 + (r % 2 ? 16 : 0) + 1, r * 16 + 1, 30, 14);
    }
});
/** light grey stone cladding, laid in thin courses */
const claddingT = tex(256, 256, (g, w, h) => {
  g.fillStyle = "#b9b6ae";
  g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 10)
    for (let x = (y / 10) % 2 ? -20 : 0; x < w; x += 40 + rnd() * 30) {
      const v = 170 + rnd() * 30;
      g.fillStyle = `rgb(${v},${v - 2},${v - 8})`;
      g.fillRect(x + 1, y + 1, 38 + rnd() * 20, 8);
    }
});
/** black glazed tiles */
const blackTileT = tex(128, 128, (g, w, h) => {
  g.fillStyle = "#121212";
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 8; j++) {
      const v = 26 + rnd() * 22;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(i * 32 + 1, j * 16 + 1, 30, 14);
    }
});
/** Merah Putih: red over white */
const merahPutihT = tex(64, 32, (g, w, h) => {
  g.fillStyle = "#ce1126";
  g.fillRect(0, 0, w, h / 2);
  g.fillStyle = "#f8f8f6";
  g.fillRect(0, h / 2, w, h / 2);
});
/** a white figure: a draped body and a head, as the carved statues by the steps and in the niche */
function statue(parent: THREE.Object3D, x: number, y: number, z: number, k = 1, turn = 0) {
  const m = std({ color: 0xeeebe4, rough: 0.5 });
  const s = new THREE.Group();
  s.position.set(x, y, z);
  s.rotation.y = turn;
  s.scale.setScalar(k);
  parent.add(s);
  mesh(new THREE.LatheGeometry([[0.26, 0], [0.24, 0.45], [0.15, 0.88], [0.2, 1.08], [0.11, 1.22], [0, 1.26]].map(([r, yy]) => new THREE.Vector2(r, yy)), 12), m, 0, 0, 0, s);
  mesh(ball(0.13, 12, 10), m, 0, 1.38, 0, s);
  [-1, 1].forEach((e) => {
    const a = mesh(cyl(0.05, 0.05, 0.55, 6), m, 0.08, 0.92, e * 0.2, s);
    a.rotation.x = e * 0.35;
  });
  return s;
}
/** a spiky plant: agave (yellow-green) or red cordyline, as planted round the monument */
function spiky(parent: THREE.Object3D, x: number, y: number, z: number, color: number, k = 1, n = 26) {
  const sp: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const tilt = 0.2 + (i % 5) * 0.2, len = 1 + (i % 3) * 0.25;
    sp.push(new THREE.ConeGeometry(0.07, len, 3).translate(0, len / 2, 0).rotateZ(tilt).rotateY(i * 2.4));
  }
  const o = mesh(mergeGeometries(sp)!, std({ color, rough: 0.6 }), x, y, z, parent);
  o.scale.setScalar(k);
  o.castShadow = false;
  return o;
}
/** bougainvillea in flower: a green dome scattered evenly with pink */
function bougainvillea(parent: THREE.Object3D, x: number, y: number, z: number, k = 1, bloom = 0xe2577f) {
  mesh(ball(0.85, 10, 8), std({ color: 0x3f6a2c, rough: 0.9 }), x, y + 0.6 * k, z, parent).scale.set(1.2 * k, 0.85 * k, k);
  const pts: THREE.BufferGeometry[] = [], b = ball(0.13, 6, 4);
  for (let i = 0; i < 70; i++) {
    const a = i * 2.39996 + x, e = Math.asin(1 - ((i + 0.5) / 70) * 0.92);
    pts.push(b.clone().translate(Math.cos(a) * Math.cos(e) * 1.18 * k, (0.6 + Math.sin(e) * 0.72) * k, Math.sin(a) * Math.cos(e) * 0.88 * k));
  }
  mesh(mergeGeometries(pts)!, std({ color: bloom, rough: 0.7 }), x, y, z, parent).castShadow = false;
}

/** Gong Perdamaian, the peace gong above Palu, where the Media Lab lives, with Tugu Perdamaian. On a paved hilltop plaza: a raised
 *  platform of black and grey stone with red railings, climbed by steps lined with white statues, its front wall
 *  holding a white figure in an orange-framed niche. On it, under a dark tiled roof with a gold finial, Gong
 *  Perdamaian hangs in a gilded arch, with the seven kettles of the gamelan set before it. Across the plaza stands
 *  Tugu Perdamaian, the monument itself: a white tower of two balconied storeys and a slender column crowned in gold. Faces +x. */
export function buildBale() {
  const g = new THREE.Group();
  const y0 = 0.3;
  const plaza = mesh(cyl(11.6, 11.8, 0.3, 40), std({ map: rep(paverT, 6, 6), rough: 0.85 }), 0, 0.15, 0, g);
  plaza.receiveShadow = true;
  const black = std({ map: blackTileT, rough: 0.35 }), clad = std({ map: rep(claddingT, 2, 1), rough: 0.9 });
  const yellow = std({ color: 0xd9b23c, rough: 0.5, metal: 0.3 }), red = std({ color: 0x7a2a22, rough: 0.55, metal: 0.25 });
  const lamps: THREE.MeshBasicMaterial[] = [];

  // the platform: grey stone walls, black pillars with gold caps and lanterns, a niche framed in orange
  const PX = 1.0, PZ = -2.0, PD = 5.6, PW = 8.4, PH = 3.0, front = PX + PD / 2;
  mesh(box(PD, PH, PW), clad, PX, y0 + PH / 2, PZ, g);
  mesh(box(PD + 0.9, 0.55, PW + 0.9), black, PX, y0 + 0.27, PZ, g);
  mesh(box(PD + 0.7, 0.24, PW + 0.7), std({ color: 0xd6d3cc, rough: 0.7 }), PX, y0 + PH + 0.12, PZ, g);
  mesh(box(PD + 0.74, 0.2, PW + 0.74), yellow, PX, y0 + PH - 0.08, PZ, g);
  const lanternM = glow(3.4, 1.7, 0.6);
  lamps.push(lanternM);
  [-3.7, -1.35, 1.35, 3.7].forEach((dz) => {
    const z = PZ + dz;
    mesh(box(0.7, PH - 0.55, 0.7), black, front + 0.12, y0 + 0.55 + (PH - 0.55) / 2, z, g);
    mesh(box(0.86, 0.22, 0.86), yellow, front + 0.12, y0 + PH - 0.35, z, g);
    mesh(box(0.86, 0.2, 0.86), yellow, front + 0.12, y0 + 0.65, z, g);
    mesh(box(0.06, 0.4, 0.3), lanternM, front + 0.5, y0 + 2.0, z, g).castShadow = false;
  });
  mesh(box(0.14, 2.3, 2.3), std({ color: 0xe0571f, rough: 0.6 }), front + 0.02, y0 + 1.75, PZ, g);
  mesh(box(0.16, 1.95, 1.95), black, front + 0.04, y0 + 1.75, PZ, g);
  mesh(box(0.9, 0.45, 2.4), clad, front + 0.5, y0 + 0.77, PZ, g);
  mesh(box(0.5, 0.35, 0.5), yellow, front + 0.5, y0 + 1.17, PZ, g);
  statue(g, front + 0.5, y0 + 1.34, PZ, 1.05, 0);
  spiky(g, front + 0.55, y0 + 1.0, PZ - 0.85, 0x4f7a34, 0.45);
  spiky(g, front + 0.55, y0 + 1.0, PZ + 0.85, 0x4f7a34, 0.45);
  // red cordyline in the beds along the front
  [-4.6, -3.0, 3.0, 4.6].forEach((dz, i) => spiky(g, front + 1.0, y0, PZ + dz, i % 2 ? 0x8e1f33 : 0xa8283c, 0.75));

  // the steps up from the -z end, lined with white statues
  const steps = 9, rise = PH / steps, run = 0.44, SX = PX - 0.6, SW = 2.8, z0 = PZ - PW / 2;
  for (let i = 0; i < steps; i++) mesh(box(SW, rise * (i + 1), run), black, SX, y0 + (rise * (i + 1)) / 2, z0 - (steps - i - 0.5) * run, g);
  [-1, 1].forEach((s) => {
    mesh(box(0.5, PH, steps * run), black, SX + s * (SW / 2 + 0.25), y0 + PH / 2 - 0.4, z0 - (steps * run) / 2, g).scale.y = 0.75;
    [1, 4, 7].forEach((i) => statue(g, SX + s * (SW / 2 + 0.25), y0 + rise * (steps - i) * 0.75 + 0.2, z0 - (i + 0.5) * run, 0.55, s > 0 ? Math.PI : 0));
  });
  spiky(g, SX - 2.4, y0, z0 - steps * run - 0.4, 0xc9cf5a, 1.0); // an agave in its pot at the foot
  mesh(cyl(0.42, 0.32, 0.7, 10), M.stone, SX - 2.4, y0 + 0.35, z0 - steps * run - 0.4, g);

  // red railings round the top, open where the steps arrive
  const top = y0 + PH + 0.24;
  const railM = cutout(rep(railT, 1, 1));
  railM.color.setHex(0x8a3a2c);
  const railRun = (ax: number, az: number, bx: number, bz: number) => {
    const l = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bz - az, bx - ax), n = Math.max(1, Math.round(l / 1.3));
    const m = railM.clone();
    m.map = rep(railT, n, 1);
    const p = mesh(new THREE.PlaneGeometry(l, 0.85), m, (ax + bx) / 2, top + 0.5, (az + bz) / 2, g);
    p.rotation.y = -ang;
    p.castShadow = false;
    const r = mesh(box(l + 0.1, 0.09, 0.12), red, (ax + bx) / 2, top + 0.98, (az + bz) / 2, g);
    r.rotation.y = -ang;
    const posts = Math.max(1, Math.round(l / 1.6));
    for (let k = 0; k <= posts; k++) mesh(box(0.12, 1.05, 0.12), red, ax + ((bx - ax) * k) / posts, top + 0.52, az + ((bz - az) * k) / posts, g);
  };
  const x0 = PX - PD / 2 + 0.1, x1 = PX + PD / 2 - 0.1, za = PZ - PW / 2 + 0.1, zb = PZ + PW / 2 - 0.1;
  railRun(x0, zb, x1, zb);
  railRun(x1, za, x1, zb);
  railRun(x0, za, x0, zb);
  railRun(x0, za, SX - SW / 2, za);
  railRun(SX + SW / 2, za, x1, za);

  // the pavilion: a dark dais, four black columns with gold, the gong in its gilded arch, a dark tiled roof
  const CX = PX - 0.5, CZ = PZ, cH = 3.3, half = 1.9;
  mesh(box(4.6, 0.22, 4.6), black, CX, top + 0.11, CZ, g);
  mesh(box(4.1, 0.22, 4.1), black, CX, top + 0.33, CZ, g);
  const base = top + 0.44;
  [-1, 1].forEach((a) => [-1, 1].forEach((b) => {
    const x = CX + a * half, z = CZ + b * half;
    mesh(box(0.42, cH, 0.42), black, x, base + cH / 2, z, g);
    mesh(box(0.62, 0.5, 0.62), M.gold, x, base + 0.25, z, g);
    mesh(box(0.6, 0.4, 0.6), M.gold, x, base + cH - 0.2, z, g);
  }));
  [-1, 1].forEach((s) => {
    mesh(box(2 * half + 0.6, 0.32, 0.3), black, CX, base + cH + 0.16, CZ + s * half, g);
    mesh(box(0.3, 0.32, 2 * half + 0.6), black, CX + s * half, base + cH + 0.16, CZ, g);
  });
  // Gong Perdamaian, in a gilded carved arch, hung on red ribbons
  const archR = 1.5;
  const arch = mesh(new THREE.TorusGeometry(archR, 0.17, 8, 28, Math.PI), M.gold, CX, base + 1.55, CZ, g);
  arch.rotation.y = Math.PI / 2;
  [-1, 1].forEach((s) => mesh(box(0.3, 1.55, 0.36), M.gold, CX, base + 0.78, CZ + s * archR, g));
  const gongM = std({ color: 0xb08a3a, rough: 0.32, metal: 1 });
  const gong = mesh(cyl(1.05, 1.05, 0.14, 44), gongM, CX + 0.05, base + 1.7, CZ, g);
  gong.rotation.z = Math.PI / 2;
  [0.95, 0.66, 0.4].forEach((r) => (mesh(new THREE.TorusGeometry(r, 0.035, 6, 40), M.gold, 0, -0.08, 0, gong).rotation.x = Math.PI / 2));
  mesh(ball(0.2, 14, 10), M.gold, 0, -0.1, 0, gong).scale.y = 0.6;
  [-1, 1].forEach((s) => mesh(box(0.05, 0.62, 0.08), std({ color: 0xc41e2a, rough: 0.8 }), CX + 0.05, base + 3.0, CZ + s * 0.5, g));
  // the kakula: seven bossed kettles on a lacquered frame before the gong, the instrument the Media Lab scores for
  const KX = CX + 1.25, ky = base + 0.35;
  mesh(box(0.7, 0.36, 3.2), M.lacquer, KX, ky, CZ, g);
  mesh(box(0.74, 0.05, 3.25), M.gold, KX, ky + 0.2, CZ, g);
  const kettles: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) {
    const m = std({ color: 0xb08a4a, rough: 0.3, metal: 1 });
    const k = mesh(ball(0.19, 16, 12), m, KX, ky + 0.3, CZ - 1.3 + i * 0.433, g);
    k.scale.y = 0.55;
    mesh(ball(0.06, 10, 8), m, 0, 0.17, 0, k);
    kettles.push(k);
  }
  // the roof: a gold fascia under dark tiles, upturned gold corners, a tall gold finial
  const ry = base + cH + 0.32;
  [-1, 1].forEach((s) => {
    mesh(box(5.6, 0.36, 0.12), M.gold, CX, ry + 0.18, CZ + s * 2.75, g);
    mesh(box(0.12, 0.36, 5.6), M.gold, CX + s * 2.75, ry + 0.18, CZ, g);
    mesh(box(5.62, 0.06, 0.13), std({ color: 0x2f5d47, rough: 0.6 }), CX, ry + 0.05, CZ + s * 2.76, g);
    mesh(box(0.13, 0.06, 5.62), std({ color: 0x2f5d47, rough: 0.6 }), CX + s * 2.76, ry + 0.05, CZ, g);
  });
  const roof = new THREE.Group();
  roof.position.set(CX, 0, CZ);
  g.add(roof);
  roofTier(0.35, 3.1, 1.9, std({ map: rep(tileT, 5, 2), color: 0x4e4c4a, rough: 0.8 }), ry + 0.3, roof);
  [-1, 1].forEach((a) => [-1, 1].forEach((b) => {
    const o = mesh(new THREE.ConeGeometry(0.16, 0.9, 5), M.gold, CX + a * 3.0, ry + 0.75, CZ + b * 3.0, g);
    o.rotation.set(b * 0.6, 0, -a * 0.6);
  }));
  mesh(ball(0.22, 12, 10), M.gold, CX, ry + 2.3, CZ, g);
  mesh(new THREE.ConeGeometry(0.22, 1.2, 8), M.gold, CX, ry + 3.0, CZ, g);

  // Tugu Perdamaian: a white tower of two balconied storeys, lamps at every post, and a slender column crowned in gold
  const TX = -4.4, TZ = 5.8, white = std({ map: plasterT, rough: 0.6 });
  const towerGlass = new THREE.MeshStandardMaterial({ color: 0x1c2833, roughness: 0.15, metalness: 0.4, emissive: 0xffc27a, emissiveIntensity: 0 });
  const storey = (w: number, h: number, y: number, n: number) => {
    mesh(box(w, h, w), white, TX, y + h / 2, TZ, g);
    for (let i = 0; i < n; i++)
      [0, 1, 2, 3].forEach((f) => {
        const a = (f * Math.PI) / 2, off = -w / 2 + (w / n) * (i + 0.5);
        const wnd = mesh(box(0.05, h * 0.5, (w / n) * 0.48), towerGlass, TX + Math.cos(a) * (w / 2 + 0.02) - Math.sin(a) * 0, y + h * 0.55, TZ + Math.sin(a) * (w / 2 + 0.02), g);
        wnd.rotation.y = -a;
        wnd.position.x += Math.sin(a) * off;
        wnd.position.z += Math.cos(a) * off;
        wnd.castShadow = false;
      });
    mesh(box(w + 0.3, 0.22, w + 0.3), white, TX, y + h + 0.11, TZ, g);
  };
  const balcony = (w: number, y: number, globe: THREE.MeshBasicMaterial) => {
    mesh(box(w, 0.2, w), white, TX, y + 0.1, TZ, g);
    const hw = w / 2 - 0.05;
    const c: [number, number][] = [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]];
    c.forEach(([ax, az], i) => {
      const [bx, bz] = c[(i + 1) % 4];
      const l = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bz - az, bx - ax);
      const m = railM.clone();
      m.map = rep(railT, Math.round(l / 1.2), 1);
      const p = mesh(new THREE.PlaneGeometry(l, 0.75), m, TX + (ax + bx) / 2, y + 0.58, TZ + (az + bz) / 2, g);
      p.rotation.y = -ang;
      p.castShadow = false;
      const r = mesh(box(l, 0.08, 0.1), red, TX + (ax + bx) / 2, y + 0.98, TZ + (az + bz) / 2, g);
      r.rotation.y = -ang;
      for (let k = 0; k < 3; k++) {
        const x = TX + ax + ((bx - ax) * k) / 3, z = TZ + az + ((bz - az) * k) / 3;
        mesh(cyl(0.05, 0.06, 1.2, 6), red, x, y + 0.8, z, g);
        mesh(ball(0.16, 10, 8), globe, x, y + 1.5, z, g).castShadow = false;
      }
    });
  };
  const orange = glow(3.4, 2.0, 0.8), pale = glow(3.2, 3.0, 2.6);
  lamps.push(orange, pale);
  mesh(box(6.4, 0.5, 6.4), white, TX, y0 + 0.25, TZ, g);
  for (let i = 0; i < 3; i++) mesh(box(2.2, 0.17, 0.4), white, TX + 3.3 + i * 0.4, y0 + 0.42 - i * 0.17, TZ, g);
  storey(5.6, 3.0, y0 + 0.5, 4);
  balcony(6.3, y0 + 3.72, orange);
  storey(4.4, 2.6, y0 + 3.92, 3);
  balcony(5.1, y0 + 6.74, pale);
  mesh(box(1.6, 1.2, 1.6), white, TX, y0 + 7.54, TZ, g);
  const col = mesh(cyl(0.36, 0.42, 9, 12), std({ color: 0xd9dcdc, rough: 0.5 }), TX, y0 + 8.14 + 4.5, TZ, g);
  col.castShadow = true;
  [0.25, 0.5, 0.75].forEach((f) => mesh(cyl(0.45, 0.45, 0.14, 12), std({ color: 0x7d8a92, rough: 0.5 }), TX, y0 + 8.14 + 9 * f, TZ, g));
  mesh(cyl(0.7, 0.55, 0.35, 12), white, TX, y0 + 17.3, TZ, g);
  const dome = mesh(new THREE.LatheGeometry([[0.5, 0], [0.6, 0.35], [0.5, 0.75], [0.25, 1.05], [0.05, 1.3], [0, 1.35]].map(([r, yy]) => new THREE.Vector2(r, yy)), 16), M.gold, TX, y0 + 17.47, TZ, g);
  dome.castShadow = true;
  mesh(new THREE.ConeGeometry(0.05, 0.7, 6), M.gold, TX, y0 + 19.1, TZ, g);
  // Merah Putih on a white pole beside the tower
  mesh(cyl(0.06, 0.08, 9, 8), white, TX + 4.2, y0 + 4.5, TZ + 3.4, g);
  const flag = mesh(new THREE.PlaneGeometry(1.8, 1.2, 8, 1), std({ map: merahPutihT, rough: 0.9, side: THREE.DoubleSide }), TX + 4.2 + 0.92, y0 + 8.3, TZ + 3.4, g);
  flag.castShadow = false;

  // bougainvillea round the plaza's edge, and an agave by the tower's steps
  [[6.5, 6.5], [-0.5, 9.8], [-9.6, 1.5], [-8.8, -4.5], [4.5, -8.6], [8.8, 2.2]].forEach(([x, z], i) => bougainvillea(g, x, y0, z, 1.1 + (i % 2) * 0.25, i % 3 ? 0xe2577f : 0xd6407a));
  spiky(g, TX + 3.0, y0, TZ - 2.6, 0xc9cf5a, 0.9);
  return { group: g, kettles, gongs: [gong], lamps, towerGlass };
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
// ---------- Brighton's Victorian bandstand, where Marea Dvīpa's look began ----------
const GREEN = "#2f5d47";
/** a cut-out texture: white ironwork drawn on clear, so a flat plane reads as lace */
const lace = (w: number, h: number, draw: Draw) => {
  const t = tex(w, h, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.strokeStyle = g.fillStyle = "#f6f2ea";
    g.lineCap = "round";
    draw(g, W, H);
  });
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
};
/** one bay of railing: rails top and bottom and a pair of mirrored scrolls meeting in a ring */
const railT = lace(128, 96, (g, w, h) => {
  g.lineWidth = 6;
  g.strokeRect(3, 3, w - 6, h - 6);
  g.lineWidth = 4.5;
  [-1, 1].forEach((s) => {
    g.beginPath();
    g.moveTo(w / 2, h - 6);
    g.bezierCurveTo(w / 2 + s * 4, h * 0.55, w / 2 + s * 46, h * 0.85, w / 2 + s * 44, h * 0.42);
    g.bezierCurveTo(w / 2 + s * 42, h * 0.16, w / 2 + s * 18, h * 0.2, w / 2 + s * 22, h * 0.38);
    g.stroke();
    g.beginPath();
    g.arc(w / 2 + s * 52, h * 0.7, 9, 0, Math.PI * 2);
    g.stroke();
  });
  g.beginPath();
  g.arc(w / 2, h * 0.3, 10, 0, Math.PI * 2);
  g.stroke();
  g.fillRect(w / 2 - 2.5, 4, 5, h * 0.18);
});
/** the lace between two columns: an arch with scrollwork above it and a rosette in each upper corner */
const spandrelT = lace(256, 128, (g, w, h) => {
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(0, 5);
  g.lineTo(w, 5);
  g.stroke();
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(6, h);
  g.bezierCurveTo(18, h * 0.3, w * 0.3, h * 0.42, w / 2, h * 0.34);
  g.bezierCurveTo(w * 0.7, h * 0.42, w - 18, h * 0.3, w - 6, h);
  g.stroke();
  g.lineWidth = 3.5;
  for (let i = 0; i < 7; i++) {
    const x = 34 + i * ((w - 68) / 6), r = 9 + (i % 2) * 4;
    g.beginPath();
    g.arc(x, h * 0.2, r, 0, Math.PI * 2);
    g.stroke();
  }
  [-1, 1].forEach((s) => {
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      g.arc(w / 2 + s * (40 + k * 30), h * 0.34 + 6 + k * 9, 12 - k * 2, Math.PI * (s > 0 ? 1 : 0), Math.PI * (s > 0 ? 2.4 : 1.4));
      g.stroke();
    }
  });
  // the rosettes: a dark green disc ringed in gold
  [26, w - 26].forEach((x) => {
    g.fillStyle = "#c9a44c";
    g.beginPath();
    g.arc(x, h * 0.42, 17, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = GREEN;
    g.beginPath();
    g.arc(x, h * 0.42, 12, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#c9a44c";
    g.beginPath();
    g.arc(x, h * 0.42, 4, 0, Math.PI * 2);
    g.fill();
  });
  g.fillStyle = "#f6f2ea";
  g.beginPath();
  g.moveTo(w / 2 - 6, h * 0.34);
  g.lineTo(w / 2, h * 0.62);
  g.lineTo(w / 2 + 6, h * 0.34);
  g.fill();
});
/** cresting along the top of the canopy: little fleurs between arches */
const crestT = lace(128, 32, (g, w, h) => {
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, h - 3);
  g.lineTo(w, h - 3);
  g.stroke();
  for (let i = 0; i < 4; i++) {
    const x = 16 + i * 32;
    g.beginPath();
    g.arc(x, h - 3, 12, Math.PI, 0);
    g.stroke();
    g.beginPath();
    g.moveTo(x, h - 15);
    g.lineTo(x, 4);
    g.stroke();
    g.beginPath();
    g.arc(x, 6, 3.5, 0, Math.PI * 2);
    g.fill();
  }
});
/** the fascia: white edges and a band of green ironwork lattice between them */
const friezeT = tex(256, 64, (g, w, h) => {
  g.fillStyle = "#f3efe6";
  g.fillRect(0, 0, w, h);
  g.fillStyle = GREEN;
  g.fillRect(0, h * 0.28, w, h * 0.5);
  g.strokeStyle = "#e9e2d2";
  g.lineWidth = 2;
  for (let x = -h; x < w + h; x += 16) {
    g.beginPath();
    g.moveTo(x, h * 0.28);
    g.lineTo(x + h * 0.5, h * 0.78);
    g.moveTo(x + h * 0.5, h * 0.28);
    g.lineTo(x, h * 0.78);
    g.stroke();
  }
  g.fillStyle = "#c9a44c";
  g.fillRect(0, h * 0.26, w, 2);
  g.fillRect(0, h * 0.77, w, 2);
});
/** pale square floor tiles */
const floorT = tex(256, 256, (g, w, h) => {
  g.fillStyle = "#a7a49c";
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++) {
      const v = 214 + rnd() * 14;
      g.fillStyle = `rgb(${v},${v - 2},${v - 6})`;
      g.fillRect(i * 32 + 1.5, j * 32 + 1.5, 29, 29);
    }
});
/** the black and white diamond border that edges the floor */
const borderT = tex(64, 32, (g, w, h) => {
  g.fillStyle = "#f1eee6";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#1d1d1b";
  for (let x = 0; x < w; x += 32) {
    g.beginPath();
    g.moveTo(x, h / 2);
    g.lineTo(x + 16, 0);
    g.lineTo(x + 32, h / 2);
    g.lineTo(x + 16, h);
    g.fill();
  }
});
const cutout = (t: THREE.Texture) => new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55 });

/** The bandstand: Brighton's octagonal Victorian bandstand on its iron legs, reached by a long tiled walkway with
 *  white scroll railings and green handrails. Laid out as the pier was, out to sea along +x, so mooring, the
 *  camera and the hull's course round it are unchanged. */
export function buildPier(length = 52) {
  const g = new THREE.Group();
  const deckH = 3.3, head = length - 5, R = 6.2, walkEnd = head - R + 0.4, W = 4.6;
  const green = std({ color: 0x2f5d47, rough: 0.45, metal: 0.35 }), white = M.white;
  const spanM = cutout(spandrelT), crestM = cutout(rep(crestT, 1, 1));
  // the iron legs, braced, standing in the shallows
  for (let x = 3; x < walkEnd; x += 5.5)
    [-1, 1].forEach((s) => {
      mesh(cyl(0.16, 0.18, deckH + 8, 8), green, x, deckH / 2 - 4, s * (W / 2 - 0.3), g);
      spar(V(x, deckH - 0.2, s * (W / 2 - 0.3)), V(x, deckH - 2.6, -s * (W / 2 - 0.3)), 0.05, green, g);
    });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    mesh(cyl(0.2, 0.22, deckH + 8, 8), green, head + Math.cos(a) * (R - 0.6), deckH / 2 - 4, Math.sin(a) * (R - 0.6), g);
  }
  // the walkway: tiles edged in diamonds, a white fretwork skirt along its side
  mesh(box(walkEnd, 0.32, W), white, walkEnd / 2, deckH - 0.16, 0, g);
  const walk = mesh(new THREE.PlaneGeometry(walkEnd, W - 1.1), std({ map: rep(floorT, walkEnd / 4, (W - 1.1) / 4), rough: 0.6 }), walkEnd / 2, deckH + 0.005, 0, g);
  walk.rotation.x = -Math.PI / 2;
  [-1, 1].forEach((s) => {
    const b = mesh(new THREE.PlaneGeometry(walkEnd, 0.45), std({ map: rep(borderT, walkEnd / 0.9, 1), rough: 0.55 }), walkEnd / 2, deckH + 0.006, s * (W / 2 - 0.78), g);
    b.rotation.x = -Math.PI / 2;
    const sk = mesh(new THREE.PlaneGeometry(walkEnd, 0.5), cutout(rep(crestT, walkEnd / 1.6, 1)), walkEnd / 2, deckH - 0.55, s * (W / 2 + 0.01), g);
    sk.rotation.x = Math.PI;
  });
  /** a run of railing from a to b at the deck's height: scroll panels, a green handrail, green posts with finials */
  const railRun = (ax: number, az: number, bx: number, bz: number) => {
    const l = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bz - az, bx - ax), n = Math.max(1, Math.round(l / 1.3));
    const p = mesh(new THREE.PlaneGeometry(l, 0.95), cutout(rep(railT, n, 1)), (ax + bx) / 2, deckH + 0.55, (az + bz) / 2, g);
    p.rotation.y = -ang;
    p.castShadow = false;
    const r = mesh(box(l + 0.1, 0.1, 0.14), green, (ax + bx) / 2, deckH + 1.08, (az + bz) / 2, g);
    r.rotation.y = -ang;
    const posts = Math.max(1, Math.round(l / 3.2));
    for (let k = 0; k <= posts; k++) {
      const x = ax + ((bx - ax) * k) / posts, z = az + ((bz - az) * k) / posts;
      mesh(box(0.14, 1.15, 0.14), green, x, deckH + 0.58, z, g);
      mesh(ball(0.1, 8, 6), green, x, deckH + 1.25, z, g);
      mesh(new THREE.ConeGeometry(0.05, 0.2, 6), green, x, deckH + 1.42, z, g);
    }
  };
  [-1, 1].forEach((s) => railRun(0.4, s * (W / 2 - 0.08), walkEnd, s * (W / 2 - 0.08)));
  // the platform: an octagon of tiles with its diamond border, a fretwork skirt below, railed all round but for the way in
  const oct = (r: number) => Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; return [head + Math.cos(a) * r, Math.sin(a) * r] as const; });
  const plat = mesh(cyl(R, R, 0.34, 8), white, head, deckH - 0.17, 0, g);
  plat.rotation.y = Math.PI / 8;
  const fl = mesh(new THREE.CircleGeometry(R - 0.15, 8), std({ map: rep(floorT, 3, 3), rough: 0.6 }), head, deckH + 0.005, 0, g);
  fl.rotation.set(-Math.PI / 2, 0, Math.PI / 8);
  const ring = mesh(new THREE.RingGeometry(R - 0.75, R - 0.3, 8, 1), std({ map: rep(borderT, 12, 1), rough: 0.55 }), head, deckH + 0.007, 0, g);
  ring.rotation.set(-Math.PI / 2, 0, Math.PI / 8);
  const skirt = mesh(new THREE.CylinderGeometry(R + 0.01, R + 0.01, 0.6, 8, 1, true), cutout(rep(crestT, 16, 1)), head, deckH - 0.6, 0, g);
  skirt.rotation.set(Math.PI, Math.PI / 8, 0);
  const o = oct(R - 0.1);
  for (let i = 0; i < 8; i++) {
    const [ax, az] = o[i], [bx, bz] = o[(i + 1) % 8];
    if ((ax + bx) / 2 < head - R * 0.8) continue; // the side facing the shore stays open to the walkway
    railRun(ax, az, bx, bz);
  }
  // the bandstand: eight slim green columns with white bases and capitals, lace between them, a white and green
  // fascia under cresting, a bell roof of dark green and a lantern on top
  const cR = 4.2, colH = 3.7, top = deckH + colH;
  const cols = oct(cR);
  cols.forEach(([x, z]) => {
    mesh(cyl(0.3, 0.34, 0.45, 8), white, x, deckH + 0.22, z, g);
    mesh(cyl(0.14, 0.14, colH, 10), green, x, deckH + colH / 2, z, g);
    mesh(cyl(0.2, 0.2, 0.5, 8), white, x, deckH + 1.1, z, g);
    mesh(cyl(0.34, 0.16, 0.5, 8), white, x, top - 0.3, z, g);
    mesh(box(0.62, 0.12, 0.62), white, x, top, z, g);
  });
  for (let i = 0; i < 8; i++) {
    const [ax, az] = cols[i], [bx, bz] = cols[(i + 1) % 8], l = Math.hypot(bx - ax, bz - az);
    const s = mesh(new THREE.PlaneGeometry(l - 0.25, 1.35), spanM, (ax + bx) / 2, top - 0.6, (az + bz) / 2, g);
    s.rotation.y = -Math.atan2(bz - az, bx - ax);
    s.castShadow = false;
  }
  const eaveR = 5.0;
  const fascia = mesh(new THREE.CylinderGeometry(eaveR, eaveR, 0.75, 8, 1, true), std({ map: rep(friezeT, 8, 1), rough: 0.6, side: THREE.DoubleSide }), head, top + 0.4, 0, g);
  fascia.rotation.y = Math.PI / 8;
  const ceil = mesh(new THREE.CircleGeometry(eaveR, 8), std({ color: 0xf1e9d8, rough: 0.8, side: THREE.DoubleSide }), head, top + 0.04, 0, g);
  ceil.rotation.set(Math.PI / 2, 0, Math.PI / 8);
  const lid = mesh(new THREE.CircleGeometry(eaveR + 0.15, 8), std({ color: 0xf3efe6, rough: 0.6, side: THREE.DoubleSide }), head, top + 0.78, 0, g);
  lid.rotation.set(-Math.PI / 2, 0, Math.PI / 8);
  const crest = mesh(new THREE.CylinderGeometry(eaveR + 0.05, eaveR + 0.05, 0.42, 8, 1, true), crestM, head, top + 0.98, 0, g);
  crest.rotation.y = Math.PI / 8;
  crest.material = cutout(rep(crestT, 10, 1));
  oct(eaveR + 0.05).forEach(([x, z]) => {
    mesh(box(0.06, 0.7, 0.06), white, x, top + 1.15, z, g);
    mesh(box(0.34, 0.06, 0.06), white, x, top + 1.32, z, g).rotation.y = Math.atan2(z, x - head);
  });
  // the bell roof: swelling out over the eaves, then drawing in to the lantern
  const prof = [[4.55, 0], [4.7, 0.35], [4.4, 0.9], [3.6, 1.45], [2.5, 1.8], [1.4, 2.0], [0.9, 2.1]].map(([r, y]) => new THREE.Vector2(r, y));
  const roofM = std({ color: 0x2d4a3e, rough: 0.4, metal: 0.45 });
  const roof = mesh(new THREE.LatheGeometry(prof, 8), roofM, head, top + 0.8, 0, g);
  roof.rotation.y = Math.PI / 8;
  const kioskGlass = new THREE.MeshStandardMaterial({ color: 0x3a2a40, roughness: 0.15, metalness: 0.3, emissive: 0xd884e0, emissiveIntensity: 0 });
  const ly = top + 2.9;
  const drum = mesh(cyl(0.82, 0.82, 0.9, 8), kioskGlass, head, ly + 0.45, 0, g);
  drum.rotation.y = Math.PI / 8;
  oct(0.84).forEach(([x, z]) => mesh(box(0.08, 0.95, 0.08), green, x, ly + 0.45, z, g));
  const cap = mesh(new THREE.LatheGeometry([[1.05, 0], [1.0, 0.2], [0.7, 0.45], [0.25, 0.7], [0.05, 0.75]].map(([r, y]) => new THREE.Vector2(r, y)), 8), roofM, head, ly + 0.9, 0, g);
  cap.rotation.y = Math.PI / 8;
  mesh(ball(0.16, 10, 8), roofM, head, ly + 1.75, 0, g);
  mesh(new THREE.ConeGeometry(0.07, 0.6, 8), roofM, head, ly + 2.15, 0, g);
  // a little pennant at the very top, as a weathervane
  mesh(cyl(0.025, 0.025, 1.2, 6), green, head, ly + 2.8, 0, g);
  const flag = mesh(new THREE.PlaneGeometry(0.8, 0.45), std({ color: 0xc67139, rough: 0.9, side: THREE.DoubleSide }), head + 0.42, ly + 3.15, 0, g);
  // its lights: a ring of bulbs along the eaves, lit warm at dusk and when someone moors
  const kioskM = glow(3.2, 2.1, 0.9);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    mesh(ball(0.09, 8, 6), kioskM, head + Math.cos(a) * (eaveR - 0.25), top - 0.05, Math.sin(a) * (eaveR - 0.25), g).castShadow = false;
  }
  // lamp standards down the walkway, in the same green, with white globes
  const lamps: THREE.MeshBasicMaterial[] = []; // shore first
  for (let x = 5; x < walkEnd - 4; x += 9) {
    const lm = glow(3.2, 2.1, 0.9);
    lamps.push(lm);
    [-1, 1].forEach((s) => {
      const z = s * (W / 2 + 0.05);
      mesh(cyl(0.07, 0.1, 3.3, 8), green, x, deckH + 1.8, z, g);
      mesh(box(0.9, 0.06, 0.06), green, x, deckH + 3.3, z, g);
      [-0.4, 0.4].forEach((off) => (mesh(ball(0.19, 12, 10), lm, x + off, deckH + 3.48, z, g).castShadow = false));
    });
  }
  return { group: g, flag, lamps, kioskM, kioskGlass };
}

/** what Pip is doing: waving hello, looking out to sea, cheering a find, or asleep */
export type PipMood = "wave" | "look" | "cheer" | "sleep";

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
  const lids: THREE.Mesh[] = [], eyes: THREE.Group[] = [];
  const head = new THREE.Group();
  head.position.set(0, 1.72, 0.47);
  head.rotation.z = 0.08;
  g.add(head);
  [-0.17, 0.17].forEach((x) => {
    const eye = new THREE.Group();
    eye.position.set(x, 0.02, 0);
    head.add(eye);
    eyes.push(eye);
    add(ball(0.11, 20, 16), white, 0, 0, 0, 1, 1.25, 0.5, eye);
    add(ball(0.07, 16, 12), black, 0, 0, 0.035, 1, 1.15, 0.5, eye);
    add(ball(0.022, 8, 6), glow(1.5, 1.5, 1.5), 0.025, 0.04, 0.07, 1, 1, 1, eye).castShadow = false;
    lids.push(add(new THREE.SphereGeometry(0.118, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), bodyM, 0, 0, 0, 1, 1.27, 0.56, eye)); // the lid, lifted further than in the drawings: here Pip is seen from above, which closes the eyes
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
  // each mood is a pose Pip eases into: how open the eyes are, where the waving arm rests, how the ears hold
  // (closed eyes are the eyes squashed to a line: turning the flattened lid down only stands it on edge)
  const POSE: Record<PipMood, { lid: number; open: number; arm: number; ear: number; tip: number }> = {
    wave: { lid: -0.34, open: 1, arm: 0, ear: 0.7, tip: 0.08 },
    look: { lid: -0.2, open: 0.9, arm: -2.1, ear: 0.62, tip: 0.02 },
    cheer: { lid: -0.5, open: 0.55, arm: 0.3, ear: 0.55, tip: 0.12 },
    sleep: { lid: -0.34, open: 0.1, arm: -2.25, ear: 1.05, tip: 0.3 },
  };
  const now = { ...POSE.wave };
  let last = -1;
  return {
    group: g,
    /** dark: 1 at night, 0 by day. Pip's own lift of colour is for the sun; in the dark it would make a lamp of them.
     *  mood: the pose to ease into (the supper table's Pip only ever waves). With `still` (Reduce Motion) Pip takes
     *  the pose at once and nothing loops. */
    update(t: number, still: boolean, dark = 0, mood: PipMood = "wave") {
      toons.forEach((m) => (m.emissiveIntensity = 0.05 + 0.29 * (1 - dark)));
      const want = POSE[mood], k = still || last < 0 ? 1 : 1 - Math.exp(-(t - last) * 4);
      last = t;
      (Object.keys(now) as (keyof typeof now)[]).forEach((key) => (now[key] += (want[key] - now[key]) * k));
      lids.forEach((l) => (l.rotation.x = now.lid));
      eyes.forEach((e) => (e.scale.y = now.open));
      head.rotation.z = now.tip;
      const asleep = mood === "sleep";
      if (still) {
        shoulder.rotation.z = now.arm;
        ears.forEach((e, n) => (e.rotation.z = (n ? -1 : 1) * now.ear));
        return;
      }
      // the arm moves round its resting place: a wave, a quick cheer, a slow sway at sea, nothing asleep
      const swing = mood === "wave" ? 0.35 * Math.sin(t * 4) : mood === "cheer" ? 0.5 * Math.sin(t * 9) : mood === "look" ? 0.08 * Math.sin(t * 1.3) : 0;
      shoulder.rotation.z = now.arm + swing;
      ears.forEach((e, n) => (e.rotation.z = (n ? -1 : 1) * (now.ear + (asleep ? 0.02 : 0.06) * Math.sin(t * (asleep ? 0.9 : 3.1) + n * 1.7))));
      bulb.scale.setScalar(asleep ? 0.75 + 0.1 * Math.sin(t * 1.1) : 1 + 0.18 * Math.sin(t * 3));
      g.scale.y = g.scale.x * (1 + (asleep ? 0.03 * Math.sin(t * 1.1) : 0.012 * Math.sin(t * 2.2)));
    },
  };
}

/** a Windfall supper on Brighton's shingle: a trestle laid for eight on a strip of boardwalk, a striped windbreak
 *  against the breeze (land side, -z), festoon lights overhead, and the host's cargo bike with crates of the day's
 *  surplus, Pip riding in its box. Long side along x; +z faces the sea. Colours are Windfall's own (DESIGN.md). */
const windbreakT = tex(512, 128, (g, w, h) => {
  const cols = ["#C67139", "#FAF7F2", "#7A8A5E", "#FAF7F2", "#1C7EAB", "#FAF7F2"];
  const sw = w / 12;
  for (let i = 0; i < 12; i++) {
    g.fillStyle = cols[i % cols.length];
    g.fillRect(i * sw, 0, sw + 1, h);
  }
  g.globalAlpha = 0.25;
  speckle(g, w, h, 700, ["#3a3026", "#ffffff"], 1); // canvas weave
  g.globalAlpha = 1;
  const sun = g.createLinearGradient(0, 0, 0, h);
  sun.addColorStop(0, "rgba(255,250,236,.12)");
  sun.addColorStop(1, "rgba(60,48,32,.18)");
  g.fillStyle = sun;
  g.fillRect(0, 0, w, h);
});
const boardT = tex(256, 256, (g) => {
  g.fillStyle = "#9c8a72";
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    const v = rnd();
    g.fillStyle = `rgb(${142 + v * 30},${124 + v * 26},${100 + v * 22})`;
    g.fillRect(0, y + 3, 256, 27);
  }
  speckle(g, 256, 256, 1800, ["#5d5040", "#c9b89c"], 2);
});
const signT = tex(256, 320, (g, w, h) => {
  g.fillStyle = "#1f2420";
  g.fillRect(0, 0, w, h);
  speckle(g, w, h, 1400, ["#3a403a", "#151815"], 3);
  g.textAlign = "center";
  g.fillStyle = "#FFC6A5";
  g.font = "bold 44px Georgia, serif";
  g.fillText("Windfall", w / 2, 70);
  g.fillStyle = "#f5ead8";
  g.font = "30px Georgia, serif";
  g.fillText("supper tonight", w / 2, 130);
  g.fillText("on the beach", w / 2, 168);
  g.fillStyle = "#CCDBB2";
  g.font = "26px Georgia, serif";
  g.fillText("8 seats", w / 2, 228);
  g.fillText("bring a plate", w / 2, 264);
});

export function buildSupper() {
  const g = new THREE.Group();
  // a strip of boardwalk on the shingle, its timber skirt running down into the beach where the ground falls away
  mesh(box(11, 0.12, 5.6), std({ map: rep(boardT, 6, 3), rough: 0.95 }), 0, 0.06, -0.2, g);
  mesh(box(10.9, 1.6, 5.5), std({ map: rep(woodT, 6, 1), color: 0x7a6a58, rough: 0.95 }), 0, -0.8, -0.2, g);
  const y0 = 0.12;
  // the trestle: a board on two A-frames, a terracotta cloth falling over the long sides, a pearl runner with sage hems
  const top = y0 + 0.76;
  mesh(box(4.8, 0.05, 0.95), M.wood, 0, top - 0.03, 0, g);
  [-1.7, 1.7].forEach((x) => {
    [-1, 1].forEach((s) => {
      [-0.1, 0.1].forEach((dx) => spar(V(x + dx, y0, s * 0.42), V(x + dx * 0.6, top - 0.06, s * 0.08), 0.035, M.darkWood, g));
    });
    mesh(box(0.06, 0.05, 0.84), M.darkWood, x, y0 + 0.28, 0, g);
  });
  const cloth = std({ color: 0xc67139, rough: 0.95, side: THREE.DoubleSide });
  mesh(box(5.0, 0.02, 1.15), cloth, 0, top, 0, g);
  [-1, 1].forEach((s) => mesh(box(5.0, 0.26, 0.02), cloth, 0, top - 0.13, s * 0.575, g));
  mesh(box(4.4, 0.012, 0.34), std({ color: 0xfaf7f2, rough: 0.9 }), 0, top + 0.016, 0, g);
  [-1, 1].forEach((s) => mesh(box(4.4, 0.013, 0.03), M.sage, 0, top + 0.017, s * 0.17, g));
  // eight mismatched chairs: painted ladder-backs, a folding bistro chair, a stool, in Windfall's colours
  const paint = [0xc67139, 0x7a8a5e, 0x1c7eab, 0xfaf7f2, 0xcc3f2f, 0x3b793f, 0x3f616f, 0xe08a52].map((c) => std({ color: c, rough: 0.7 }));
  const xs = [-1.8, -0.6, 0.6, 1.8];
  let k = 0;
  xs.forEach((x, i) =>
    [-1, 1].forEach((s) => {
      const c = new THREE.Group(), m = paint[k], kind = (i * 2 + (s > 0 ? 1 : 0) + k) % 3;
      c.position.set(x + (rnd() - 0.5) * 0.14, y0, s * 0.92);
      c.rotation.y = (s > 0 ? Math.PI : 0) + (rnd() - 0.5) * 0.28;
      g.add(c);
      if (kind === 0) {
        // ladder-back
        mesh(box(0.44, 0.05, 0.42), m, 0, 0.46, 0, c);
        [-0.19, 0.19].forEach((a) => [-0.18, 0.18].forEach((b) => mesh(box(0.04, b < 0 ? 0.95 : 0.46, 0.04), m, a, b < 0 ? 0.475 : 0.23, b, c)));
        [0.62, 0.76, 0.9].forEach((y) => mesh(box(0.38, 0.05, 0.02), m, 0, y, -0.18, c));
      } else if (kind === 1) {
        // folding bistro chair: round seat, splayed metal legs, a slatted back
        mesh(cyl(0.21, 0.21, 0.035, 18), m, 0, 0.46, 0, c);
        [-1, 1].forEach((a) => {
          spar(V(a * 0.18, 0, 0.18), V(a * 0.16, 0.9, -0.2), 0.014, M.iron, c);
          spar(V(a * 0.18, 0, -0.2), V(a * 0.16, 0.45, 0.16), 0.014, M.iron, c);
        });
        [0.66, 0.74, 0.82].forEach((y) => mesh(box(0.34, 0.05, 0.015), m, 0, y, -0.17 - (y - 0.66) * 0.04, c));
      } else {
        // a tall stool brought out from the kitchen
        mesh(cyl(0.18, 0.18, 0.05, 16), m, 0, 0.5, 0, c);
        [0, 1, 2, 3].forEach((q) => {
          const a = q * Math.PI / 2 + Math.PI / 4;
          spar(V(Math.cos(a) * 0.13, 0.48, Math.sin(a) * 0.13), V(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2), 0.016, M.darkWood, c);
        });
        mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 20).rotateX(Math.PI / 2), M.darkWood, 0, 0.2, 0, c);
      }
      // place setting: plate, sage napkin, glass
      mesh(cyl(0.14, 0.11, 0.022, 20), M.white, x, top + 0.02, s * 0.36, g);
      mesh(box(0.1, 0.008, 0.18), M.sage, x - 0.22, top + 0.016, s * 0.36, g);
      mesh(cyl(0.032, 0.028, 0.11, 10), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0.9, thickness: 0.05 }), x + 0.2, top + 0.065, s * 0.28, g);
      k++;
    }),
  );
  // shared dishes down the runner: bread, salad, a pie, a bowl of apples, a jug of water
  {
    const loaf = mesh(ball(0.15, 14, 10), std({ color: 0xb5793a, rough: 0.8 }), -1.25, top + 0.08, 0, g);
    loaf.scale.set(1.7, 0.7, 0.9);
    mesh(box(0.5, 0.025, 0.22), M.wood, -1.25, top + 0.025, 0, g);
    const bowl = (x: number, col: number, fill: number) => {
      mesh(new THREE.SphereGeometry(0.17, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std({ color: col, rough: 0.4, side: THREE.DoubleSide }), x, top + 0.18, 0, g);
      const f = mesh(ball(0.14, 12, 8), std({ color: fill, rough: 0.9 }), x, top + 0.13, 0, g);
      f.scale.y = 0.45;
    };
    bowl(-0.45, 0xfaf7f2, 0x6a9a3a);
    mesh(cyl(0.19, 0.16, 0.06, 22), std({ color: 0xc67139, rough: 0.5 }), 0.35, top + 0.04, 0, g);
    mesh(cyl(0.17, 0.17, 0.03, 22), std({ color: 0xd9a441, rough: 0.85 }), 0.35, top + 0.075, 0, g);
    bowl(1.2, 0x3f616f, 0xcc3f2f);
    for (let i = 0; i < 5; i++) mesh(ball(0.055, 10, 8), std({ color: 0xcc3f2f, rough: 0.45 }), 1.2 + Math.cos(i * 1.3) * 0.07, top + 0.17, Math.sin(i * 1.3) * 0.07, g);
    mesh(cyl(0.07, 0.09, 0.24, 14), new THREE.MeshPhysicalMaterial({ color: 0xdff2f5, roughness: 0.05, transmission: 0.85, thickness: 0.2 }), 1.85, top + 0.12, 0.08, g);
  }
  // jam-jar candles
  const candles = [-1.85, -0.85, 0.8].map((x) => {
    mesh(cyl(0.05, 0.05, 0.12, 12), new THREE.MeshPhysicalMaterial({ color: 0xffe6c0, roughness: 0.1, transmission: 0.7, thickness: 0.1 }), x, top + 0.06, 0.02, g);
    const f = mesh(ball(0.026, 8, 6), glow(4, 2.4, 0.8), x, top + 0.09, 0.02, g);
    f.castShadow = false;
    return f;
  });
  // the windbreak: striped canvas between timber stakes, bellied by the wind off the sea, on the land side
  {
    const zW = -2.55, xs = [-4.8, -2.4, 0, 2.4, 4.8], H = 1.35;
    xs.forEach((x) => mesh(cyl(0.035, 0.045, H + 0.35, 8), M.darkWood, x, y0 + (H + 0.35) / 2 - 0.1, zW, g));
    const geo = new THREE.PlaneGeometry(9.6, H, 48, 6), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), u = ((x + 4.8) / 2.4) % 1;
      p.setZ(i, -Math.sin(Math.PI * u) * 0.16);
    }
    geo.computeVertexNormals();
    const wb = mesh(geo, std({ map: rep(windbreakT, 2, 1), rough: 0.9, side: THREE.DoubleSide, bump: 0.3 }), 0, y0 + H / 2 + 0.12, zW, g);
    wb.castShadow = true;
  }
  // festoon lights from the windbreak's end stakes to two poles on the sea side
  const P = [V(-4.8, y0 + 2.6, -2.55), V(4.8, y0 + 2.6, -2.55), V(4.8, y0 + 2.6, 2.4), V(-4.8, y0 + 2.6, 2.4)];
  [P[0], P[1]].forEach((p) => mesh(cyl(0.03, 0.035, 1.2, 6), M.darkWood, p.x, y0 + 2.0, p.z, g));
  [P[2], P[3]].forEach((p) => mesh(cyl(0.05, 0.07, 2.6, 8), M.iron, p.x, y0 + 1.3, p.z, g));
  const bulbs: THREE.BufferGeometry[] = [], wire: THREE.Vector3[] = [];
  [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3]].forEach(([a, b]) => {
    const n = Math.round(P[a].distanceTo(P[b]) / 0.7);
    let prev = P[a].clone();
    for (let i = 1; i <= n; i++) {
      const t = i / n, q = P[a].clone().lerp(P[b], t);
      q.y -= Math.sin(Math.PI * t) * 0.55;
      wire.push(prev, q.clone());
      prev = q.clone();
      if (i < n) bulbs.push(ball(0.065, 8, 6).translate(q.x, q.y - 0.09, q.z));
    }
  });
  lines(wire, 0x1a1a1a, g);
  const festoonM = glow(3.4, 2.3, 1.0);
  g.add(new THREE.Mesh(mergeGeometries(bulbs)!, festoonM));
  // the host's long-john cargo bike, parked at the sea end, its box full of the day's surplus; Pip rides on top
  const pipSeat = new THREE.Object3D();
  {
    const b = new THREE.Group();
    b.position.set(4.0, y0, 0.9);
    b.rotation.y = -0.35;
    g.add(b);
    const frameM = std({ color: 0x1c7eab, rough: 0.35, metal: 0.4 });
    const wheel = (x: number, r: number) => {
      mesh(new THREE.TorusGeometry(r, 0.03, 8, 28), M.iron, x, r, 0, b);
      mesh(new THREE.TorusGeometry(r - 0.035, 0.012, 6, 28), M.brass, x, r, 0, b);
      const sp: THREE.Vector3[] = [];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        sp.push(V(x, r, 0), V(x + Math.cos(a) * (r - 0.03), r + Math.sin(a) * (r - 0.03), 0));
      }
      lines(sp, 0x9a9a9a, b);
      mesh(cyl(0.03, 0.03, 0.1, 8).rotateX(Math.PI / 2), M.iron, x, r, 0, b);
    };
    wheel(-1.05, 0.34); // rear
    wheel(0.95, 0.24); // small front wheel under the box
    // frame: rear triangle, the long low spine under the box, head tube and bars
    spar(V(-1.05, 0.34, 0), V(-0.55, 0.95, 0), 0.025, frameM, b);
    spar(V(-1.05, 0.34, 0), V(-0.45, 0.32, 0), 0.025, frameM, b);
    spar(V(-0.45, 0.32, 0), V(-0.55, 0.95, 0), 0.028, frameM, b);
    spar(V(-0.45, 0.32, 0), V(0.95, 0.24, 0), 0.03, frameM, b);
    spar(V(-0.55, 0.95, 0), V(-0.05, 0.88, 0), 0.025, frameM, b);
    spar(V(-0.05, 1.05, 0), V(-0.1, 0.45, 0), 0.025, frameM, b);
    spar(V(-0.15, 1.08, -0.28), V(-0.15, 1.08, 0.28), 0.015, M.iron, b);
    mesh(box(0.22, 0.05, 0.12), M.darkWood, -0.6, 1.0, 0, b); // saddle
    // the box between the bars and the front wheel
    const bx = 0.45, by = 0.62;
    mesh(box(0.9, 0.04, 0.62), M.teak, bx, by - 0.2, 0, b);
    [-1, 1].forEach((s) => mesh(box(0.9, 0.44, 0.03), M.teak, bx, by, s * 0.31, b));
    [-1, 1].forEach((s) => mesh(box(0.03, 0.44, 0.62), M.teak, bx + s * 0.45, by, 0, b));
    // crates in the box: apples, squash, greens
    [[0.2, 0xcc3f2f], [0.68, 0xe08a2a]].forEach(([x, col]) => {
      for (let i = 0; i < 9; i++) mesh(ball(0.07, 10, 8), std({ color: col, rough: 0.5 }), x - 0.12 + (i % 3) * 0.12, by + 0.06, -0.15 + Math.floor(i / 3) * 0.15, b);
    });
    for (let i = 0; i < 4; i++) {
      const lf = mesh(new THREE.ConeGeometry(0.07, 0.3, 6), std({ color: 0x3b793f, rough: 0.7 }), 0.75 + (i % 2) * 0.08, by + 0.2, -0.18 + i * 0.12, b);
      lf.rotation.z = -0.3 + i * 0.15;
    }
    pipSeat.position.set(0.45, by - 0.02, 0);
    b.add(pipSeat);
    // more crates stacked on the boards beside the bike
    [[-0.1, -0.85, 0, 0xcc3f2f], [-0.1, -0.85, 0.47, 0xd9a441], [0.75, -0.9, 0, 0x7a8a5e]].forEach(([x, z, y, col]) => {
      mesh(box(0.62, 0.42, 0.45), std({ map: plankT, color: 0xb08a5a, rough: 0.9 }), x, y + 0.21, z, b);
      for (let i = 0; i < 6; i++) mesh(ball(0.09, 10, 8), std({ color: col, rough: 0.55 }), x - 0.18 + (i % 3) * 0.18, y + 0.45, z - 0.1 + Math.floor(i / 3) * 0.2, b);
    });
  }
  // an A-board at the top of the beach, chalked for tonight
  {
    const sgn = new THREE.Group();
    sgn.position.set(-4.3, y0, 1.6);
    sgn.rotation.y = 0.4;
    g.add(sgn);
    [-1, 1].forEach((s) => {
      const leaf = new THREE.Group();
      leaf.position.set(0, 0.9, 0);
      leaf.rotation.x = -s * 0.2;
      sgn.add(leaf);
      mesh(box(0.66, 0.92, 0.04), M.darkWood, 0, -0.46, s * 0.02, leaf);
      mesh(new THREE.PlaneGeometry(0.56, 0.7).rotateY(s > 0 ? 0 : Math.PI), std({ map: signT, rough: 0.95, bump: 0 }), 0, -0.44, s * 0.045, leaf);
    });
  }
  return { group: g, festoonM, candles, pipSeat };
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
