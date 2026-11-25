// The race's other pinisi: the two designs the home page's boat had before today's, brought back from the history of
// src/dua-pulau/world/models.ts so the rivals each sail a boat of their own. buildOriginalPinisi is buildPinisi as it
// stood at d8495fd (the first one: a varnished teak hull with a white strake, a low deckhouse, two gaff rigs and three
// jibs); buildCruisingPinisi is buildPinisi at 1fe41aa (the cruising style: a white hull with dark sheer stripes and
// portholes, a two-storey deckhouse, taller gaff rigs with ratlines, and a railed bowsprit walkway). Both are as they
// were, line for line, with three changes: topsides (her hull colour, so each rival can be told apart), a foreFlag
// (neither had a pennant on the foremast, so it is an empty placeholder for the vessel to swing), and their own copies
// of the kit they were built with (the textures, materials and shapes below), because models.ts has since changed or
// no longer has them: today's sailcloth is cleaner and carries a different mark, and the original's bow sheer is lower.
// Same length (28), beam and keel line as today's boat, so they float at the same waterline and one hull shape serves
// all of them in the collisions. Game only: nothing on the home page imports this file.
import * as THREE from "three";

// ---------- the kit, as models.ts had it at both commits ----------
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

/** the textures and materials the two builders share: made on first use (they draw on canvases), then kept, as
 *  models.ts kept its own for the whole page */
type Kit = ReturnType<typeof makeKit>;
let kit: Kit | null = null;
function makeKit() {
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
  age(plankT, { streak: 0.3, blot: 1.1 });
  age(woodT, { streak: 0.3, blot: 0.9 });
  const M = {
    wood: std({ map: woodT, rough: 0.8 }),
    darkWood: std({ map: woodT, color: 0x6b5a4e, rough: 0.75 }),
    teak: std({ map: rep(plankT, 4, 1), color: 0xb98a55, rough: 0.7, bump: 0.35 }),
    white: std({ color: 0xf3efe6, rough: 0.6 }),
  };
  return { plankT, sailT, mainSailT, M };
}

type MatOpts = { color?: number; map?: THREE.Texture; rough?: number; metal?: number; side?: THREE.Side; emissive?: number; vertexColors?: boolean; /** how deep the texture's own relief reads; 0 for none */ bump?: number };
const std = (o: MatOpts) => new THREE.MeshStandardMaterial({ color: o.color ?? 0xffffff, map: o.map ?? null, bumpMap: o.map && o.bump !== 0 ? o.map : null, bumpScale: o.bump ?? 1.1, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, side: o.side ?? THREE.FrontSide, emissive: o.emissive ?? 0x000000, vertexColors: o.vertexColors ?? false });

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0, parent?: THREE.Object3D) {
  const o = new THREE.Mesh(geo, mat);
  o.position.set(x, y, z);
  o.castShadow = o.receiveShadow = true;
  parent?.add(o);
  return o;
}
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt: number, rb: number, h: number, seg = 12) => new THREE.CylinderGeometry(rt, rb, h, seg);
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

// ---------- the hull's lines: one length, beam and keel for all three designs ----------
const HULL_L = 28, HULL_B = 3.6;
const hullW = (u: number) => HULL_B * Math.pow(Math.sin(Math.PI * (0.08 + 0.92 * u)), 0.6);
const hullBottom = (u: number) => -2.2 * Math.pow(Math.sin(Math.PI * (0.05 + 0.9 * u)), 0.5);
/** the sheer: the original's bow rose gently; the cruising pinisi's (and today's) sweeps up high */
const hullTopO = (u: number) => 2.4 + 2.2 * Math.pow(1 - u, 5) + 1.4 * Math.pow(u, 4);
const hullTopC = (u: number) => 2.4 + 2.2 * Math.pow(1 - u, 5) + 2.4 * Math.pow(u, 5); // a high, sweeping bow
/** deck height at a point along the hull (x: -14 stern … +14 bow) */
const deckYO = (x: number) => hullTopO((x + HULL_L / 2) / HULL_L) - 0.35;
const deckYC = (x: number) => hullTopC((x + HULL_L / 2) / HULL_L) - 0.35;

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


/** her topsides' paint: her own colour if given, else the design's */
const paintOf = (tint: number | undefined, own: [number, number, number]): [number, number, number] => {
  if (tint === undefined) return own;
  const c = new THREE.Color(tint);
  return [c.r, c.g, c.b];
};
/** neither design flew a pennant at the foremast: an empty stand-in, so the vessel has one to swing */
const noForeFlag = () => new THREE.Object3D();

/** The first pinisi (models.ts at d8495fd): a Bugis pinisi with two masts, seven sails, a high stern and a long
 *  bowsprit. Bow points along +x. tint: her white strake in another colour. */
export function buildOriginalPinisi(tint?: number) {
  const { plankT, sailT, mainSailT, M } = (kit ??= makeKit());
  const topsides = paintOf(tint, [0.95, 0.93, 0.88]);
  const boat = new THREE.Group();
  // hull: U-shaped sections swept from stern to bow
  const U = 56, S = 22;
  const pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [];
  for (let i = 0; i <= U; i++) {
    const u = i / U, w = hullW(u), top = hullTopO(u), bot = hullBottom(u);
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
      else if (fromTop < 0.62) col.push(...topsides);
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
  pos.push(-HULL_L / 2 - 0.5, (hullTopO(0) + hullBottom(0)) / 2 + 0.6, 0);
  uv.push(0, 1.5);
  col.push(0.63, 0.41, 0.22);
  for (let j = 0; j < S; j++) idx.push(sternC, j + 1, j);
  const hg = new THREE.BufferGeometry();
  hg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  hg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  hg.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  hg.setIndex(idx);
  hg.computeVertexNormals();
  mesh(hg, std({ map: plankT, vertexColors: true, rough: 0.55, side: THREE.DoubleSide, bump: 0.35 }), 0, 0, 0, boat);

  // deck and rails, following the sheer
  const dp: number[] = [], du: number[] = [], di: number[] = [];
  const railL: THREE.Vector3[] = [], railR: THREE.Vector3[] = [];
  for (let i = 0; i <= U; i++) {
    const u = i / U, x = -HULL_L / 2 + u * HULL_L, w = hullW(u) * 0.97, y = hullTopO(u) - 0.35;
    dp.push(x, y, -w, x, y, w);
    // planks run straight fore and aft and the narrowing hull cuts them off, as on a real deck: v by true distance
    // across, not stretched edge to edge (that pinched the planks at bow and stern and kinked them at every triangle)
    du.push(u * 10, 0.5 - w / (2 * HULL_B), u * 10, 0.5 + w / (2 * HULL_B));
    const rx = x + 1.6 * Math.pow(u, 7) - 1.1 * Math.pow(1 - u, 6);
    railL.push(V(rx, hullTopO(u) + 0.05, -hullW(u)));
    railR.push(V(rx, hullTopO(u) + 0.05, hullW(u)));
    if (i < U) di.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.Float32BufferAttribute(dp, 3));
  dg.setAttribute("uv", new THREE.Float32BufferAttribute(du, 2));
  dg.setIndex(di);
  dg.computeVertexNormals();
  mesh(dg, std({ map: rep(plankT, 1, 8), color: 0xc49a66, rough: 0.75, side: THREE.DoubleSide, bump: 0.35 }), 0, 0, 0, boat);
  [railL, railR].forEach((r) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(r), 80, 0.13, 6), M.darkWood, 0, 0, 0, boat));

  // deckhouse on the poop, with a carved stern rail
  const cabinY = deckYO(-9.5);
  mesh(box(5.6, 2.3, 4.0), std({ map: rep(plankT, 2, 2), color: 0xf1ece2, rough: 0.6, bump: 0.35 }), -9.6, cabinY + 1.15, 0, boat);
  mesh(box(6.3, 0.16, 4.7), M.teak, -9.6, cabinY + 2.38, 0, boat);
  for (let i = 0; i < 4; i++) [-1, 1].forEach((s) => mesh(box(0.8, 0.7, 0.06), std({ color: 0x14212b, rough: 0.2, metal: 0.4 }), -11.4 + i * 1.2, cabinY + 1.45, s * 2.02, boat));
  mesh(box(0.06, 1.6, 0.9), M.wood, -6.78, cabinY + 0.85, 0, boat);
  for (let i = 0; i < 9; i++) [-1, 1].forEach((s) => mesh(cyl(0.035, 0.035, 0.75, 6), M.white, -12.4 + i * 0.7, cabinY + 2.8, s * 2.25, boat));
  [-1, 1].forEach((s) => mesh(box(6.1, 0.07, 0.09), M.darkWood, -9.6, cabinY + 3.2, s * 2.25, boat));
  // cargo hatch, coiled rope and a tender amidships
  mesh(box(3.2, 0.5, 2.6), M.teak, 0.8, deckYO(0.8) + 0.25, 0, boat);
  mesh(box(3.4, 0.08, 2.8), M.darkWood, 0.8, deckYO(0.8) + 0.54, 0, boat);
  const coil = mesh(new THREE.TorusGeometry(0.36, 0.08, 6, 18), std({ color: 0xcdb88f, rough: 1 }), 8.4, deckYO(8.4) + 0.09, 1.1, boat);
  coil.rotation.x = Math.PI / 2;

  // masts, bowsprit, gaffs and booms
  const spars = new THREE.Group();
  boat.add(spars);
  const fx = 5.5, mx = -3.6;
  const fDeck = deckYO(fx), mDeck = deckYO(mx);
  spar(V(fx, fDeck, 0), V(fx - 0.5, 24, 0), 0.3, M.wood, spars, 0.14);
  spar(V(mx, mDeck, 0), V(mx - 0.5, 21, 0), 0.28, M.wood, spars, 0.13);
  const bow0 = V(13.2, hullTopO(0.96) + 0.1, 0), bow1 = V(23.6, 6.4, 0);
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
      V(fx - 0.5, 24, 0), bow1, V(fx - 0.5, 24, 0), V(mx - 0.5, 21, 0), V(mx - 0.5, 21, 0), V(-14, hullTopO(0) + 0.2, 0),
      ...[-1, 1].flatMap((s) => [V(fx - 0.5, 23, 0), V(fx - 1, deckYO(fx) + 0.4, s * hullW(0.68)), V(fx - 0.5, 23, 0), V(fx + 1, deckYO(fx) + 0.4, s * hullW(0.72)), V(mx - 0.5, 20, 0), V(mx - 1, deckYO(mx) + 0.4, s * hullW(0.36)), V(mx - 0.5, 20, 0), V(mx + 1, deckYO(mx) + 0.4, s * hullW(0.4))]),
      bow1, V(14.6, 0.9, 0),
    ],
    0x241a12,
    boat,
  );
  const flag = mesh(new THREE.PlaneGeometry(1.5, 0.9, 6, 1), std({ color: 0xc67139, rough: 0.9, side: THREE.DoubleSide }), mx - 1.3, 21.1, 0, boat);

  // where the oil lamp stands: a small teak stand on the foredeck
  const lampAt = new THREE.Group();
  lampAt.position.set(10.6, deckYO(10.6), 0);
  boat.add(lampAt);
  mesh(box(0.5, 0.55, 0.5), M.teak, 0, 0.275, 0, lampAt);
  mesh(box(0.62, 0.05, 0.62), M.darkWood, 0, 0.575, 0, lampAt);
  // where Pip stands as crew. Before sailing: curled up beside the lamp, on the side the first view looks from,
  // kept inside the narrowing bow. Under way: on the deckhouse roof at the stern, the part the following camera sees.
  const bx = 10.95, pipBow = new THREE.Group();
  pipBow.position.set(bx, deckYO(bx), Math.min(0.55, hullW((bx + HULL_L / 2) / HULL_L) - 0.35));
  const pipStern = new THREE.Group();
  pipStern.position.set(-11.6, cabinY + 2.46, 0);
  boat.add(pipBow, pipStern);

  boat.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  return { boat, sails, flag, foreFlag: noForeFlag(), lampAt, pipBow, pipStern };
}


/** The cruising pinisi (models.ts at 1fe41aa): a white hull with dark sheer stripes, a long two-storey teak deckhouse
 *  aft, two gaff-rigged masts with topsails and rope ladders, and a long bowsprit with its own walkway. Bow along +x.
 *  tint: her white topsides in another colour. */
export function buildCruisingPinisi(tint?: number) {
  const { plankT, sailT, mainSailT, M } = (kit ??= makeKit());
  const topsides = paintOf(tint, [0.95, 0.94, 0.91]);
  const boat = new THREE.Group();
  // hull: U-shaped sections swept from stern to bow
  const U = 56, S = 22;
  const pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [];
  /** the hull's surface at a station u and a height up its side (0 keel … 1 sheer) */
  const hullAt = (u: number, up: number) => {
    const w = hullW(u), top = hullTopC(u), bot = hullBottom(u);
    const phi = Math.acos(Math.pow(Math.max(0, 1 - up), 0.8));
    return V(-HULL_L / 2 + u * HULL_L + 1.6 * Math.pow(u, 7) * up - 1.1 * Math.pow(1 - u, 6) * up, bot + (top - bot) * up, w * Math.sin(phi) * (0.9 + 0.1 * up));
  };
  for (let i = 0; i <= U; i++) {
    const u = i / U, w = hullW(u), top = hullTopC(u), bot = hullBottom(u);
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
      else col.push(...topsides);
    }
  }
  for (let i = 0; i < U; i++)
    for (let j = 0; j < S; j++) {
      const k = i * (S + 1) + j;
      idx.push(k, k + 1, k + S + 1, k + 1, k + S + 2, k + S + 1);
    }
  // close the stern with a transom
  const sternC = pos.length / 3;
  pos.push(-HULL_L / 2 - 0.5, (hullTopC(0) + hullBottom(0)) / 2 + 0.6, 0);
  uv.push(0, 1.5);
  col.push(...topsides);
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
        const u = 0.015 + (0.97 * i) / n, top = hullTopC(u), bot = hullBottom(u);
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
    const u = (x + HULL_L / 2) / HULL_L, top = hullTopC(u), bot = hullBottom(u), up = (top - 1.02 - bot) / (top - bot);
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
    const u = i / U, x = -HULL_L / 2 + u * HULL_L, w = hullW(u) * 0.97, y = hullTopC(u) - 0.35;
    dp.push(x, y, -w, x, y, w);
    // planks run straight fore and aft and the narrowing hull cuts them off, as on a real deck: v by true distance
    // across, not stretched edge to edge (that pinched the planks at bow and stern and kinked them at every triangle)
    du.push(u * 10, 0.5 - w / (2 * HULL_B), u * 10, 0.5 + w / (2 * HULL_B));
    const rx = x + 1.6 * Math.pow(u, 7) - 1.1 * Math.pow(1 - u, 6);
    railL.push(V(rx, hullTopC(u) + 0.05, -hullW(u)));
    railR.push(V(rx, hullTopC(u) + 0.05, hullW(u)));
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
    [-1, 1].forEach((s) => mesh(balG, M.teak, x, hullTopC(u) + 0.35, s * hullW(u) * 0.985, boat).castShadow = false);
  }
  [-1, 1].forEach((s) => {
    const r: THREE.Vector3[] = [];
    for (let x = -2; x <= 12.5; x += 0.5) {
      const u = (x + HULL_L / 2) / HULL_L;
      r.push(V(x, hullTopC(u) + 0.68, s * hullW(u) * 0.985));
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
  const base = deckYC(FORE) - 0.2, L1 = deckYC(AFT) + 2.05, L2 = L1 + 1.75;
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
  mesh(box(3.2, 0.5, 2.6), M.teak, 2.4, deckYC(2.4) + 0.25, 0, boat);
  mesh(box(3.4, 0.08, 2.8), M.darkWood, 2.4, deckYC(2.4) + 0.54, 0, boat);
  const coil = mesh(new THREE.TorusGeometry(0.36, 0.08, 6, 18), std({ color: 0xcdb88f, rough: 1 }), 8.4, deckYC(8.4) + 0.09, 1.1, boat);
  coil.rotation.x = Math.PI / 2;

  // masts with crosstrees, a long bowsprit with a railed walkway, gaffs and booms
  const spars = new THREE.Group();
  boat.add(spars);
  const fx = 5.5, mx = -3.6, FT = 27, MT = 24; // mast tops: the foremast is the taller, as on a pinisi
  const fDeck = deckYC(fx), mDeck = deckYC(mx);
  spar(V(fx, fDeck, 0), V(fx - 0.5, FT, 0), 0.32, M.wood, spars, 0.14);
  spar(V(mx, mDeck, 0), V(mx - 0.5, MT, 0), 0.29, M.wood, spars, 0.13);
  [[fx - 0.42, 21.5, 1.7], [mx - 0.42, 19.5, 1.5]].forEach(([x, y, w]) => {
    spar(V(x, y, -w), V(x, y, w), 0.07, M.wood, spars);
    spar(V(x - 0.5, y + 0.05, 0), V(x + 0.6, y + 0.05, 0), 0.06, M.wood, spars);
  });
  const bow0 = V(13.2, hullTopC(0.96) + 0.1, 0), bow1 = V(24.5, 7.4, 0);
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
    V(fx - 0.5, FT, 0), bow1, V(fx - 0.5, FT, 0), V(mx - 0.5, MT, 0), V(mx - 0.5, MT, 0), V(-14, hullTopC(0) + 0.2, 0),
    bow1, V(14.6, 0.9, 0),
  ];
  const shrouds = (x: number, top: number, u0: number, u1: number) =>
    [-1, 1].forEach((s) => {
      const T = V(x - 0.5, top, 0), A = V(x - 1, deckYC(x) + 0.4, s * hullW(u0)), B = V(x + 1, deckYC(x) + 0.4, s * hullW(u1));
      rig.push(T, A, T, B);
      for (let k = 0.05; k < 0.62; k += 0.035) rig.push(A.clone().lerp(T, k), B.clone().lerp(T, k));
    });
  shrouds(fx, FT - 1, 0.68, 0.72);
  shrouds(mx, MT - 1, 0.36, 0.4);
  lines(rig, 0x241a12, boat);
  const flag = mesh(new THREE.PlaneGeometry(1.5, 0.9, 6, 1), std({ color: 0xc67139, rough: 0.9, side: THREE.DoubleSide }), mx - 1.3, MT + 0.1, 0, boat);

  // where the oil lamp stands: a small teak stand on the foredeck
  const lampAt = new THREE.Group();
  lampAt.position.set(10.6, deckYC(10.6), 0);
  boat.add(lampAt);
  mesh(box(0.5, 0.55, 0.5), M.teak, 0, 0.275, 0, lampAt);
  mesh(box(0.62, 0.05, 0.62), M.darkWood, 0, 0.575, 0, lampAt);
  // where Pip stands as crew. Before sailing: curled up beside the lamp, on the side the first view looks from,
  // kept inside the narrowing bow. Under way: on the sun deck at the stern, the part the following camera sees.
  const bx = 10.95, pipBow = new THREE.Group();
  pipBow.position.set(bx, deckYC(bx), Math.min(0.55, hullW((bx + HULL_L / 2) / HULL_L) - 0.45));
  const pipStern = new THREE.Group();
  pipStern.position.set(-11.4, cabinTop, 0);
  boat.add(pipBow, pipStern);

  boat.traverse((o) => {
    if (o instanceof THREE.Mesh && o.castShadow !== false && o.geometry !== balG) o.castShadow = true;
  });
  return { boat, sails, flag, foreFlag: noForeFlag(), lampAt, pipBow, pipStern, cabinGlass: winM };
}
