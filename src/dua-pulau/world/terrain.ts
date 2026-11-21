// The two islands: one height function for the ground, so the mesh, the trees, the buildings and the boat's
// collisions all agree on where the land is. Water sits at y = 0.
import * as THREE from "three";

const hash = (x: number, y: number) => {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
};
function vnoise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
/** fractal noise, about -1…1 */
export function fbm(x: number, y: number, octaves = 4) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    s += a * vnoise(x * f, y * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
}
export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export type Island = { id: "md" | "wf"; x: number; z: number; r: number; peak: number; seed: number };
/** west: Marea Dvīpa, taller and greener. east: Windfall, lower, sage downs above a pebble beach */
export const ISLANDS: Island[] = [
  { id: "md", x: -125, z: 0, r: 74, peak: 27, seed: 3.1 },
  { id: "wf", x: 125, z: 8, r: 68, peak: 15, seed: 11.7 },
];

/** a flattened site for a building */
export type Pad = { x: number; z: number; r: number; h: number };
const pads: Pad[] = [];
export const addPad = (p: Pad) => void pads.push(p);

function islandHeight(I: Island, x: number, z: number) {
  const dx = x - I.x, dz = z - I.z;
  const ang = Math.atan2(dz, dx);
  const warp = 1 + fbm(Math.cos(ang) * 1.3 + I.seed, Math.sin(ang) * 1.3 + I.seed, 3) * 0.3;
  const t = 1 - Math.hypot(dx, dz) / (I.r * warp);
  if (t < 0) return Math.max(-9, t * 42 - 0.6);
  const beach = 1.5 * smooth(0, 0.11, t);
  const hill = I.peak * Math.pow(smooth(0.14, 1, t), 1.6);
  const bumps = fbm(x * 0.028 + I.seed, z * 0.028, 4) * 7 * smooth(0.16, 0.6, t);
  const h = -0.6 + 0.6 * smooth(0, 0.035, t) + beach + hill + bumps;
  return t > 0.09 ? Math.max(h, 1.0) : h;
}

export function heightAt(x: number, z: number) {
  let h = -9;
  for (const I of ISLANDS) h = Math.max(h, islandHeight(I, x, z));
  for (const p of pads) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < p.r) h += (p.h - h) * (1 - smooth(p.r * 0.62, p.r, d));
  }
  return h;
}
export const slopeAt = (x: number, z: number) => Math.hypot(heightAt(x + 1.5, z) - heightAt(x - 1.5, z), heightAt(x, z + 1.5) - heightAt(x, z - 1.5)) / 3;
export const nearestIsland = (x: number) => (x < 0 ? ISLANDS[0] : ISLANDS[1]);
export const onPad = (x: number, z: number, margin = 0) => pads.some((p) => Math.hypot(x - p.x, z - p.z) < p.r + margin);

/** from a site on land, walk away from the island's centre to open water: where the boat moors */
export function dockFor(x: number, z: number, out = 16) {
  const I = nearestIsland(x);
  let dx = x - I.x, dz = z - I.z;
  const l = Math.hypot(dx, dz) || 1;
  dx /= l;
  dz /= l;
  let s = 0;
  while (s < 160 && heightAt(x + dx * s, z + dz * s) > -4) s += 2;
  return { x: x + dx * (s + out), z: z + dz * (s + out) };
}

export function buildTerrain() {
  const W = 580, D = 360, SX = 290, SZ = 180;
  const g = new THREE.PlaneGeometry(W, D, SX, SZ);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  g.computeVertexNormals();
  const nor = g.attributes.normal as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color(), c2 = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const wf = x > 0;
    const n = fbm(x * 0.09, z * 0.09, 3), n2 = fbm(x * 0.4 + 9, z * 0.4, 2);
    if (y < -0.5) c.setRGB(0.2, 0.36, 0.36).lerp(c2.setRGB(0.7, 0.66, 0.5), smooth(-4, -0.5, y));
    else if (y < 0.35) c.setRGB(0.5, 0.42, 0.3); // wet sand
    else if (y < 2.3 + n * 0.5) {
      // Sulawesi's pale coral sand in the west, Brighton's warmer shingle in the east
      if (wf) c.setRGB(0.68, 0.56, 0.4).lerp(c2.setRGB(0.5, 0.43, 0.35), 0.5 + n2 * 0.5);
      else c.setRGB(0.86, 0.74, 0.52).lerp(c2.setRGB(0.72, 0.6, 0.4), 0.5 + n2 * 0.5);
    } else {
      if (wf) c.setRGB(0.33, 0.4, 0.2).lerp(c2.setRGB(0.48, 0.5, 0.26), 0.5 + n * 0.9);
      else c.setRGB(0.14, 0.28, 0.09).lerp(c2.setRGB(0.28, 0.4, 0.13), 0.5 + n * 0.9);
      c.multiplyScalar(1 - smooth(8, 26, y) * 0.25 + n2 * 0.06);
    }
    const steep = 1 - nor.getY(i);
    if (y > 0.5 && steep > 0.16) c.lerp(c2.setRGB(0.42, 0.37, 0.32), smooth(0.16, 0.34, steep));
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  // grain: sand, shingle and turf are never one flat colour. The same speckle also roughens the light on them.
  const cv = document.createElement("canvas");
  cv.width = cv.height = 512;
  const cx = cv.getContext("2d")!;
  cx.fillStyle = "#c4c4c4";
  cx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26000; i++) {
    const v = hash(i, 3.3);
    cx.fillStyle = v > 0.5 ? `rgba(255,255,255,${0.1 + hash(i, 7) * 0.35})` : `rgba(0,0,0,${0.1 + hash(i, 9) * 0.4})`;
    const r = 0.6 + hash(i, 5) * 2.4;
    cx.fillRect(hash(i, 1.1) * 512, hash(i, 2.2) * 512, r, r);
  }
  const grain = new THREE.CanvasTexture(cv);
  grain.colorSpace = THREE.SRGBColorSpace;
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(110, 68);
  grain.anisotropy = 8;
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, map: grain, bumpMap: grain, bumpScale: 1.4, roughness: 0.96, metalness: 0 }));
  mesh.receiveShadow = true;
  return mesh;
}

/** scatter points on an island's land, away from the building sites */
export function scatter(I: Island, count: number, minH: number, maxH: number, maxSlope: number, seed: number) {
  const out: { x: number; z: number; y: number; r: number }[] = [];
  let k = 0;
  while (out.length < count && k < count * 40) {
    k++;
    const a = hash(k, seed) * Math.PI * 2, d = Math.sqrt(hash(seed, k * 1.7)) * I.r * 1.25;
    const x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d;
    const y = heightAt(x, z);
    if (y < minH || y > maxH || onPad(x, z, 2) || slopeAt(x, z) > maxSlope) continue;
    out.push({ x, z, y, r: hash(k * 3.3, seed + 1) });
  }
  return out;
}

/**
 * Where the sea meets the sand: the pale water of the shallows and lines of foam running in to the beach. A sheet laid
 * just over the water round both coasts; each point knows the height of the ground under it, so the foam follows the
 * real shoreline, bays and all. `time` is its uniform to advance.
 */
export function buildShore() {
  const STEP = 1.25, pos: number[] = [], hs: number[] = [], idx: number[] = [];
  for (const I of ISLANDS) {
    const R = I.r * 1.5, n = Math.ceil((R * 2) / STEP), base = pos.length / 3, H = new Float32Array((n + 1) * (n + 1));
    for (let j = 0; j <= n; j++)
      for (let i = 0; i <= n; i++) {
        const x = I.x - R + i * STEP, z = I.z - R + j * STEP, h = heightAt(x, z);
        H[j * (n + 1) + i] = h;
        pos.push(x, 0.05, z);
        hs.push(h);
      }
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1;
        const lo = Math.min(H[a], H[b], H[c], H[d]), hi = Math.max(H[a], H[b], H[c], H[d]);
        if (hi < -3.4 || lo > 0.5) continue; // only the strip along the coast
        idx.push(base + a, base + c, base + b, base + b, base + c, base + d);
      }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("ground", new THREE.Float32BufferAttribute(hs, 1));
  g.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { time: { value: 0 }, tint: { value: new THREE.Color(1, 0.93, 0.84) }, light: { value: 1 } },
    vertexShader: `
      attribute float ground; varying float vH; varying vec2 vP;
      void main(){ vH = ground; vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float time; uniform vec3 tint; uniform float light;
      varying float vH; varying vec2 vP;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        if (vH > 0.22) discard;
        float d = clamp((vH + 3.2) / 3.3, 0.0, 1.0);                 // 0 out at sea … 1 at the water's edge
        float n = noise(vP * 0.35) + 0.5 * noise(vP * 1.3 + time * 0.15);
        // sets of waves run up the sand, each line breaking into lace
        float run = d * 7.0 - time * 0.55 + n * 1.3;
        float line = pow(0.5 + 0.5 * sin(run * 6.2832), 5.0);
        float lace = smoothstep(0.35, 0.9, noise(vP * 2.4 + vec2(time * 0.3, 0.0)));
        float edge = smoothstep(0.78, 1.0, d);                       // the last wash on the sand, always white
        float foam = clamp(edge * (0.55 + 0.45 * lace) + smoothstep(0.25, 0.9, d) * line * (0.35 + 0.65 * lace) * 0.8, 0.0, 1.0);
        vec3 shallows = vec3(0.30, 0.74, 0.70);                      // sand showing through thin water
        float thin = smoothstep(0.15, 1.0, d) * 0.5;
        vec3 col = mix(shallows * (0.4 + 0.6 * light), tint * (0.35 + 0.65 * light), foam);
        gl_FragColor = vec4(col, max(thin * (1.0 - foam), foam * 0.92));
      }`,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.renderOrder = 1;
  return mesh;
}
