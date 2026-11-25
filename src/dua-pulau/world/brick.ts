// Dua Pulau in bricks (/bricks/): the same world, built as a toy. The islands are stepped columns of plates read off
// the same heightAt the boat and every building use, so moorings, docks and the pilot are unchanged; the sea is
// clear blue studded plastic with the brick seabed showing through in the shallows; palms, trees and rocks are
// stacked bricks; and every other model (buildings, the pinisi, Pip) is given a glossy plastic finish in a toy palette.
// No toy maker's names, logos or figures: plain studs, generic bricks.
import * as THREE from "three";
import { ISLANDS, heightAt, scatter } from "./terrain";

/** one stud's spacing on the land, in metres; a plate is 0.4 of it tall (a brick is three plates) */
export const P = 2;
const L = P * 0.4;
const STUD_R = P * 0.3, STUD_H = P * 0.17;

const hex = (c: number) => new THREE.Color(c);
const C = {
  sand: hex(0xe4cd9e), darkTan: hex(0x958a73), white: hex(0xf4f4f4), lightGrey: hex(0xa0a5a9), darkGrey: hex(0x6c6e68),
  bright: hex(0x4b9f4a), green: hex(0x237841), lime: hex(0xa5ca18), olive: hex(0x9b9a5a), sage: hex(0xa0bcac),
  brown: hex(0x583927), redBrown: hex(0x82422a), mBlue: hex(0x5a93db),
};

/** the colour of the land at a height, on the west island (green, volcanic) or the east (shingle and downs) */
function landColor(h: number, west: boolean, x: number, z: number): THREE.Color {
  const n = Math.sin(x * 0.37 + z * 0.21) * Math.cos(z * 0.29 - x * 0.13); // a little patchiness, as built by hand
  if (h < -1.6) return C.mBlue;
  if (h < 0.2) return west ? C.sand : C.lightGrey;
  if (west) {
    if (h < 1.4) return C.sand;
    if (h < 7) return n > 0.35 ? C.lime : C.bright;
    if (h < 19) return n > 0.4 ? C.bright : C.green;
    return n > 0 ? C.darkGrey : C.lightGrey;
  }
  if (h < 1.3) return n > 0.2 ? C.darkTan : C.lightGrey;
  if (h < 10) return n > 0.3 ? C.olive : C.sage;
  return C.white; // chalk on the tops of the downs
}

type Inst = { m: THREE.Matrix4; c: THREE.Color };
function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, list: Inst[], shadows = true) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  list.forEach((it, i) => {
    mesh.setMatrixAt(i, it.m);
    mesh.setColorAt(i, it.c);
  });
  mesh.count = list.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  mesh.userData.brick = true;
  mesh.computeBoundingSphere();
  return mesh;
}
const UP = new THREE.Vector3(0, 1, 0);
const box = (x: number, y: number, z: number, w: number, h: number, d: number, ry = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, ry), new THREE.Vector3(w, h, d));

/** glossy toy plastic */
export const toyPlastic = () => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32, metalness: 0 });

/** a stud: an eight-sided post with its top, as one small geometry */
function studGeometry() {
  const side = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true).toNonIndexed();
  const top = new THREE.CircleGeometry(1, 8).rotateX(-Math.PI / 2).translate(0, 0.5, 0).toNonIndexed();
  const cat = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, b: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) =>
    new THREE.BufferAttribute(new Float32Array([...(a.array as Float32Array), ...(b.array as Float32Array)]), 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", cat(side.attributes.position, top.attributes.position));
  g.setAttribute("normal", cat(side.attributes.normal, top.attributes.normal));
  return g;
}

/** both islands, and the seabed round them, as stepped columns of plates with studs on top */
export function buildBrickLand(): THREE.Group {
  const group = new THREE.Group();
  const blocks: Inst[] = [], studs: Inst[] = [];
  const gap = P * 0.03;
  for (const I of ISLANDS) {
    const R = I.r * 1.45, n = Math.ceil(R / P);
    const cx = Math.round(I.x / P), cz = Math.round(I.z / P);
    const level = new Map<string, number>();
    const lv = (i: number, j: number) => {
      const k = `${i},${j}`;
      let v = level.get(k);
      if (v === undefined) {
        v = Math.round(heightAt(i * P, j * P) / L);
        level.set(k, v);
      }
      return v;
    };
    for (let j = cz - n; j <= cz + n; j++)
      for (let i = cx - n; i <= cx + n; i++) {
        const x = i * P, z = j * P;
        if (Math.hypot(x - I.x, z - I.z) > R) continue;
        const top = lv(i, j);
        if (top * L < -4.5) continue; // deep water: the sea floor is not drawn
        const c = landColor(top * L, I.id === "md", x, z);
        // only the faces that show: down to the lowest neighbour, never less than one plate
        const low = Math.min(lv(i + 1, j), lv(i - 1, j), lv(i, j + 1), lv(i, j - 1), top - 1);
        // stacked as bricks (three plates) from the top down, so the seams read like a built model
        for (let t = top; t > low; ) {
          const b = Math.max(low, t - 3), h = (t - b) * L;
          blocks.push({ m: box(x, b * L + h / 2, z, P - gap, h - gap * 0.6, P - gap), c: t === top ? c : c.clone().multiplyScalar(0.9) });
          t = b;
        }
        studs.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(x, top * L + STUD_H / 2, z), new THREE.Quaternion(), new THREE.Vector3(STUD_R, STUD_H, STUD_R)), c });
      }
  }
  const mat = toyPlastic();
  group.add(instanced(new THREE.BoxGeometry(1, 1, 1), mat, blocks));
  group.add(instanced(studGeometry(), mat, studs, false));
  return group;
}

/** a studded baseplate's light and shade, repeated over the whole sea */
function studTexture() {
  const s = 64, cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const g = cv.getContext("2d")!;
  g.fillStyle = "#c8c8c8";
  g.fillRect(0, 0, s, s);
  g.fillStyle = "rgba(0,0,0,0.28)";
  g.beginPath();
  g.arc(s / 2 + 3, s / 2 + 4, s * 0.3, 0, Math.PI * 2);
  g.fill();
  const gr = g.createRadialGradient(s / 2 - 5, s / 2 - 6, 2, s / 2, s / 2, s * 0.3);
  gr.addColorStop(0, "#ffffff");
  gr.addColorStop(1, "#d6d6d6");
  g.fillStyle = gr;
  g.beginPath();
  g.arc(s / 2, s / 2, s * 0.3, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** the sea: clear blue plastic studded all over; the brick seabed shows through in the shallows */
export function buildBrickSea(): THREE.Mesh {
  const SIZE = 12000, map = studTexture();
  map.repeat.set(SIZE / P, SIZE / P);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(SIZE, SIZE),
    new THREE.MeshStandardMaterial({ color: 0x3f8fe0, map, roughness: 0.18, metalness: 0, transparent: true, opacity: 0.8 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.receiveShadow = true;
  sea.renderOrder = 1;
  sea.userData.brick = true;
  return sea;
}

/** palms, trees and rocks, each a small brick build, standing where the real world scatters its own */
export function buildBrickFlora(): THREE.Group {
  const [MD, WF] = ISLANDS;
  const boxes: Inst[] = [], rounds: Inst[] = [];
  const q = (v: number) => Math.round(v / L) * L; // sit on the plate grid
  const B = 0.8, H = B * 1.2; // a brick of these builds: 0.8 m across, 0.96 m tall
  for (const s of [...scatter(MD, 110, 1.3, 6, 0.5, 2), ...scatter(WF, 26, 1.4, 4, 0.4, 5)]) {
    const y0 = q(s.y), n = 6 + Math.floor(s.r * 3), lean = (s.r - 0.5) * 0.5;
    for (let k = 0; k < n; k++) rounds.push({ m: box(s.x + lean * k * 0.12, y0 + k * H + H / 2, s.z, B * 0.9, H * 0.96, B * 0.9), c: k % 2 ? C.redBrown : C.brown });
    const tx = s.x + lean * n * 0.12, ty = y0 + n * H, a = s.r * 6.283;
    for (let f = 0; f < 5; f++) {
      const ang = a + (f / 5) * Math.PI * 2, dx = Math.cos(ang), dz = Math.sin(ang);
      boxes.push({ m: box(tx + dx * B * 1.6, ty + H * 0.15, s.z + dz * B * 1.6, B * 3, H / 3, B, -ang), c: f % 2 ? C.bright : C.green });
      boxes.push({ m: box(tx + dx * B * 3.4, ty - H * 0.25, s.z + dz * B * 3.4, B * 1.2, H / 3, B, -ang), c: C.lime });
    }
    rounds.push({ m: box(tx, ty + H * 0.3, s.z, B * 0.8, H * 0.6, B * 0.8), c: C.darkTan });
  }
  const trees = (I: (typeof ISLANDS)[number], count: number, west: boolean, seed: number) => {
    for (const s of scatter(I, count, west ? 3.2 : 3.4, west ? 30 : 20, west ? 0.7 : 0.6, seed)) {
      const y0 = q(s.y), tall = 2 + Math.floor(s.r * 2), a = s.r * 1.6;
      for (let k = 0; k < tall; k++) boxes.push({ m: box(s.x, y0 + k * H + H / 2, s.z, B, H, B, a), c: C.brown });
      const leaf = west ? (s.r > 0.5 ? C.green : C.bright) : s.r > 0.5 ? C.olive : C.sage;
      const tiers = west ? [4, 3, 2] : [3, 3, 2];
      tiers.forEach((w, k) => boxes.push({ m: box(s.x, y0 + (tall + k) * H + H / 2, s.z, B * w, H, B * w, a), c: k === tiers.length - 1 ? leaf.clone().multiplyScalar(1.08) : leaf }));
      boxes.push({ m: box(s.x, y0 + (tall + tiers.length) * H + H * 0.17, s.z, B, H / 3, B, a), c: leaf });
    }
  };
  trees(MD, 170, true, 9);
  trees(WF, 70, false, 14);
  for (const s of [...scatter(MD, 46, -0.9, 1.1, 2, 21), ...scatter(WF, 60, -0.9, 1.3, 2, 23)]) {
    const w = 1 + Math.floor(s.r * 3), west = s.x < 0;
    boxes.push({ m: box(s.x, q(s.y) + H / 2, s.z, B * w, H, B * (w + 1), s.r * 3), c: west ? C.darkGrey : C.lightGrey });
    if (w > 1) boxes.push({ m: box(s.x, q(s.y) + H * 1.5, s.z, B * (w - 1), H, B * w, s.r * 3), c: west ? C.darkGrey : C.darkTan });
  }
  const mat = toyPlastic();
  const g = new THREE.Group();
  g.add(instanced(new THREE.BoxGeometry(1, 1, 1), mat, boxes));
  g.add(instanced(new THREE.CylinderGeometry(0.5, 0.5, 1, 10), mat, rounds));
  return g;
}

// ---------- the toy finish for every other model ----------
const PALETTE = [
  0xf4f4f4, 0xa0a5a9, 0x6c6e68, 0x1b2a34, 0xc91a09, 0x720e0f, 0xfe8a18, 0xf2cd37, 0xe4cd9e, 0x958a73, 0x583927, 0x82422a,
  0x4b9f4a, 0x237841, 0xa5ca18, 0x9b9a5a, 0xa0bcac, 0x0055bf, 0x5a93db, 0x078bc9, 0x0a3463, 0x6074a1, 0xfc97ac, 0x923978,
  0xdcbc81, 0xa95500, 0xd09168, 0xf6d7b3,
].map((h) => new THREE.Color(h));
const srgb = (c: THREE.Color) => {
  const o = { r: 0, g: 0, b: 0 };
  c.getRGB(o, THREE.SRGBColorSpace);
  return o;
};
const PAL_S = PALETTE.map(srgb);
/** the nearest toy colour, measured with weights for how the eye sees each channel */
export function toyColor(c: THREE.Color, out = new THREE.Color()) {
  const s = srgb(c);
  let best = 0, bd = Infinity;
  PAL_S.forEach((p, i) => {
    const dr = s.r - p.r, dg = s.g - p.g, db = s.b - p.b, rm = (s.r + p.r) / 2;
    const d = (2 + rm) * dr * dr + 4 * dg * dg + (3 - rm) * db * db;
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return out.copy(PALETTE[best]);
}

const done = new WeakSet<object>();
/**
 * Give every model under root a glossy plastic finish: surface textures (bumps, roughness, normals) go, and colours
 * snap to the toy palette. Pictures painted on (posters, signs) keep their map; glowing lamps keep their glow. Safe to
 * call again: it only touches what it has not seen, so models that arrive later (the carved Barong) are finished on
 * the next call.
 */
export function plasticize(root: THREE.Object3D) {
  const tmp = new THREE.Color();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || o.userData.brick) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (!(m instanceof THREE.MeshStandardMaterial) || done.has(m)) continue;
      done.add(m);
      m.normalMap = null;
      m.roughnessMap = null;
      m.metalnessMap = null;
      m.bumpMap = null;
      m.roughness = 0.32;
      m.metalness = 0;
      if (!m.map) toyColor(m.color, m.color);
      m.needsUpdate = true;
    }
    const geo = mesh.geometry, col = geo?.getAttribute("color") as THREE.BufferAttribute | undefined;
    if (col && mats.some((m) => m.vertexColors) && !done.has(geo)) {
      done.add(geo);
      for (let i = 0; i < col.count; i++) {
        toyColor(tmp.setRGB(col.getX(i), col.getY(i), col.getZ(i)), tmp);
        col.setXYZ(i, tmp.r, tmp.g, tmp.b);
      }
      col.needsUpdate = true;
    }
    // instanced models carry a colour per instance
    const im = o as THREE.InstancedMesh;
    if (im.isInstancedMesh && im.instanceColor && !done.has(im)) {
      done.add(im);
      for (let i = 0; i < im.count; i++) {
        im.getColorAt(i, tmp);
        im.setColorAt(i, toyColor(tmp, tmp));
      }
      im.instanceColor.needsUpdate = true;
    }
  });
}
