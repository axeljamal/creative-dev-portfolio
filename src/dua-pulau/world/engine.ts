// Dua Pulau's world: a physically lit sea and sky, two islands, and a pinisi to sail between them. It opens in the
// blue hour on an unlit oil lamp at her bow; lighting it brings up the sun. This file is its own chunk, so three.js
// arrives only with the world. The page tells it what to do (light, sailTo, moor) and hears back where the boat is.
import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { PlaceId } from "../places";
import * as audio from "./audio";
import { buildBale, buildBuoy, buildGate, buildGuestHouse, buildHuts, buildLamp, buildLighthouse, buildPalms, buildPavilion, buildPier, buildPinisi, buildPip, buildPlinth, buildRocks, buildSupper, buildTrees, glow } from "./models";
import { ISLANDS, addPad, buildShore, buildTerrain, dockFor, heightAt, nearestIsland, scatter, smooth } from "./terrain";

export type WorldEvents = {
  /** the boat is close enough to moor at this place, or has left it */
  onNear: (id: PlaceId | null) => void;
  /** the boat sailed itself here and has stopped */
  onArrive: (id: PlaceId) => void;
  onWaters: (w: "md" | "wf" | "strait" | "open") => void;
  onFound: (ids: PlaceId[]) => void;
  /** the weather in Brighton now, once the lighthouse has asked for it */
  onWeather?: (w: Weather) => void;
};
/** temp in °C, wind in km/h, from: the compass bearing the wind blows from */
export type Weather = { temp: number; wind: number; from: number };
export type World = {
  /** light the lamp: must be called inside a tap, so sound may start */
  light: () => void;
  sailTo: (id: PlaceId) => void;
  /** moor at a place (the camera turns to it) or cast off with null */
  moor: (id: PlaceId | null) => void;
  setMuted: (m: boolean) => void;
  dispose: () => void;
};

type Site = { id: PlaceId; island: "md" | "wf" | "strait"; x: number; z: number; pad?: [number, number]; view: [number, number]; /** how far out to sea from the site the camera should look (the pier's head) */ focus?: number; dock?: { x: number; z: number } };
const PIER_LEN = 52;
// where everything stands. pad: [radius, height]. view: [distance, height] of the camera when moored there.
const SITES: Site[] = [
  { id: "gate", island: "md", x: -70, z: 12, pad: [14, 2.4], view: [38, 9] },
  { id: "pavilion", island: "md", x: -112, z: -34, pad: [17, 8], view: [52, 16] },
  { id: "bale", island: "md", x: -150, z: 38, pad: [12, 3], view: [34, 8] },
  { id: "guesthouse", island: "md", x: -176, z: -18, pad: [19, 3], view: [44, 11] },
  { id: "barong", island: "md", x: -98, z: 46, pad: [8, 3.4], view: [26, 8] },
  { id: "pier", island: "wf", x: 72, z: 22, pad: [7, 3.1], view: [34, 11], focus: PIER_LEN - 6 },
  { id: "table", island: "wf", x: 112, z: -28, pad: [13, 4.2], view: [21, 6.5] },
  { id: "huts", island: "wf", x: 128, z: 56, pad: [16, 2.3], view: [38, 9] },
  { id: "lighthouse", island: "wf", x: 178, z: 2, pad: [10, 3.2], view: [54, 16] },
  { id: "buoy", island: "strait", x: 0, z: -34, view: [17, 6], dock: { x: 0, z: -18 } },
];

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = window.matchMedia("(pointer: coarse)").matches;
const ease = (t: number) => t * t * (3 - 2 * t);
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** a tileable normal map of crossing swells, for the water's ripples */
function waterNormals() {
  const N = 512, c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d")!, img = g.createImageData(N, N);
  // many small crossing wave trains, finer ones weaker: wind ripples rather than swell
  const waves = Array.from({ length: 46 }, (_, i) => {
    const k = 3 + Math.floor(Math.pow(i / 46, 1.6) * 58), dir = (i * 2.399) % (Math.PI * 2);
    const kx = Math.round(Math.cos(dir) * k), ky = Math.round(Math.sin(dir) * k);
    return { kx, ky, a: 1.5 / Math.pow(Math.hypot(kx, ky) || 1, 1.15), ph: i * 1.7 };
  });
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      let dx = 0, dy = 0;
      for (const w of waves) {
        const cs = Math.cos((2 * Math.PI * (w.kx * x + w.ky * y)) / N + w.ph) * w.a;
        dx += cs * w.kx;
        dy += cs * w.ky;
      }
      const nx = -dx * 0.22, ny = -dy * 0.22, l = Math.hypot(nx, ny, 1), i = (y * N + x) * 4;
      img.data[i] = (nx / l) * 127 + 128;
      img.data[i + 1] = (ny / l) * 127 + 128;
      img.data[i + 2] = (1 / l) * 127 + 128;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function cloudTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d")!;
  for (let i = 0; i < 46; i++) {
    const x = 70 + Math.random() * 372, y = 120 + (Math.random() - 0.5) * 80 * Math.sin((x / 512) * Math.PI), r = 30 + Math.random() * 62;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, "rgba(255,255,255,.34)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createWorld(canvas: HTMLCanvasElement, ev: WorldEvents): World {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a1220, 0.0011);
  const camera = new THREE.PerspectiveCamera(42, 1.6, 0.08, 14000);

  // ---------- sky, sun, sea ----------
  const sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);
  const skyU = sky.material.uniforms;
  skyU.turbidity.value = 9;
  skyU.rayleigh.value = 2.9;
  skyU.mieCoefficient.value = 0.004;
  skyU.mieDirectionalG.value = 0.86;
  const envScene = new THREE.Scene(), envSky = new Sky();
  envSky.scale.setScalar(10000);
  envScene.add(envSky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT: THREE.WebGLRenderTarget | null = null;

  const sunDir = new THREE.Vector3();
  const sun = new THREE.DirectionalLight(0xffe2b8, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(coarse ? 2048 : 4096);
  Object.assign(sun.shadow.camera, { left: -300, right: 300, top: 210, bottom: -210, near: 10, far: 1400 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.5;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xbcd3ee, 0x5a4a3a, 0.1);
  scene.add(hemi);

  const water = new Water(new THREE.PlaneGeometry(12000, 12000), {
    textureWidth: coarse ? 256 : 512,
    textureHeight: coarse ? 256 : 512,
    waterNormals: waterNormals(),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffe2b8,
    waterColor: 0x0b4048,
    distortionScale: 2.2,
    fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  water.material.uniforms.size.value = 4;
  scene.add(water);

  const starPos = new Float32Array(1400 * 3);
  for (let i = 0; i < 1400; i++) {
    const a = Math.random() * Math.PI * 2, y = Math.random() * 0.96 + 0.03, r = Math.sqrt(1 - y * y);
    starPos.set([Math.cos(a) * r * 6000, y * 6000, Math.sin(a) * r * 6000], i * 3);
  }
  const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(starPos, 3)), new THREE.PointsMaterial({ color: 0xfff4dc, size: 1.6, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false }));
  stars.layers.set(1); // the main camera sees layer 1; the water's mirror does not, so stars do not litter the sea
  camera.layers.enable(1);
  scene.add(stars);
  const cloudT = cloudTexture();
  const clouds = Array.from({ length: 16 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudT, transparent: true, depthWrite: false, fog: false, opacity: 0.8 }));
    const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3, d = 3200 + Math.random() * 1400;
    s.position.set(Math.cos(a) * d, 330 + Math.random() * 620, Math.sin(a) * d);
    s.scale.set(1500 + Math.random() * 1300, 420 + Math.random() * 300, 1);
    scene.add(s);
    return s;
  });

  const NIGHT = -5, DAY = 7.5;
  const cA = new THREE.Color(), cB = new THREE.Color();
  let lastEnv = -99;
  function setSun(elev: number, force = false) {
    sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elev), THREE.MathUtils.degToRad(164));
    const day = smooth(NIGHT, 6, elev), up = smooth(-0.5, 7, elev);
    skyU.sunPosition.value.copy(sunDir);
    water.material.uniforms.sunDirection.value.copy(sunDir).normalize();
    water.material.uniforms.sunColor.value.setRGB(1, 0.84, 0.62).multiplyScalar(up);
    water.material.uniforms.waterColor.value.copy(cA.set(0x020c16)).lerp(cB.set(0x0c4a50), day);
    sun.position.copy(sunDir).multiplyScalar(600);
    sun.intensity = 4.6 * up;
    sun.color.copy(cA.set(0xff8a45)).lerp(cB.set(0xffd9a6), smooth(1, 9, elev));
    hemi.intensity = 0.2 + 0.75 * day;
    hemi.color.copy(cA.set(0x33466a)).lerp(cB.set(0xcfe0f2), day);
    (scene.fog as THREE.FogExp2).color.copy(cA.set(0x0a1220)).lerp(cB.set(0xc9a48c), day);
    renderer.toneMappingExposure = 0.52 - 0.24 * day;
    (stars.material as THREE.PointsMaterial).opacity = 1 - smooth(-4, 1, elev);
    clouds.forEach((c) => c.material.color.copy(cA.set(0x1c2436)).lerp(cB.set(0xffdcc0), day));
    // the sky also lights every surface: re-bake it as the sun moves
    if (force || Math.abs(elev - lastEnv) > 1.4) {
      lastEnv = elev;
      Object.entries(skyU).forEach(([k, u]) => {
        const v = envSky.material.uniforms[k].value;
        if (v?.copy) v.copy(u.value);
        else envSky.material.uniforms[k].value = u.value;
      });
      const next = pmrem.fromScene(envScene, 0, 1, 12000);
      scene.environment = next.texture;
      envRT?.dispose();
      envRT = next;
    }
  }

  // ---------- land ----------
  SITES.forEach((s) => s.pad && addPad({ x: s.x, z: s.z, r: s.pad[0], h: s.pad[1] }));
  scene.add(buildTerrain());
  const shore = buildShore();
  scene.add(shore);
  const [MD, WF] = ISLANDS;
  scene.add(buildPalms([...scatter(MD, 110, 1.3, 6, 0.5, 2), ...scatter(WF, 26, 1.4, 4, 0.4, 5)]));
  scene.add(buildTrees(scatter(MD, 170, 3.2, 30, 0.7, 9), true));
  scene.add(buildTrees(scatter(WF, 70, 3.4, 20, 0.6, 14), false));
  scene.add(buildRocks([...scatter(MD, 46, -0.9, 1.1, 2, 21), ...scatter(WF, 60, -0.9, 1.3, 2, 23)]));

  const site = (id: PlaceId) => SITES.find((s) => s.id === id)!;
  const out = (s: Site) => {
    const I = nearestIsland(s.x), d = new THREE.Vector2(s.x - I.x, s.z - I.z).normalize();
    return d;
  };
  /** stand a model on its site, its front (+x) turned to the sea */
  function stand(id: PlaceId, o: THREE.Object3D, turn = 0) {
    const s = site(id), d = out(s);
    o.position.set(s.x, heightAt(s.x, s.z), s.z);
    o.rotation.y = Math.atan2(-d.y, d.x) + turn;
    scene.add(o);
    return o;
  }
  const gate = buildGate();
  stand("gate", gate.group);
  const pav = buildPavilion();
  stand("pavilion", pav.group);
  const bale = buildBale();
  stand("bale", bale.group);
  const guest = buildGuestHouse();
  stand("guesthouse", guest.group);
  const plinth = buildPlinth();
  stand("barong", plinth.group);
  const pier = buildPier(PIER_LEN);
  stand("pier", pier.group);
  pier.group.position.y = 0;
  const supper = buildSupper();
  stand("table", supper.group, Math.PI / 2);
  const pip = buildPip();
  pip.group.scale.setScalar(0.8);
  {
    const s = site("table"), d = out(s);
    pip.group.position.set(s.x + d.x * 8.5, heightAt(s.x, s.z) + 0.16, s.z + d.y * 8.5);
    scene.add(pip.group);
  }
  const huts = buildHuts();
  stand("huts", huts.group, Math.PI / 2); // doors to the sea
  const lighthouse = buildLighthouse();
  stand("lighthouse", lighthouse.group);
  const buoy = buildBuoy();
  buoy.group.position.set(site("buoy").x, 0, site("buoy").z);
  scene.add(buoy.group);

  // the Barong, sculpted from the motif, turns on its plinth in temple gold
  let barong: THREE.Object3D | null = null;
  new GLTFLoader().load("/models/barong-sculpt.glb", (gltf) => {
    const o = gltf.scene, b = new THREE.Box3().setFromObject(o), size = b.getSize(new THREE.Vector3()), mid = b.getCenter(new THREE.Vector3());
    const k = 3.4 / Math.max(size.x, size.y, size.z);
    o.position.set(-mid.x * k, -b.min.y * k, -mid.z * k);
    o.scale.setScalar(k);
    const gold = new THREE.MeshStandardMaterial({ color: 0xd9b266, roughness: 0.26, metalness: 1, side: THREE.DoubleSide });
    o.traverse((m) => {
      if (m instanceof THREE.Mesh) {
        m.material = gold;
        m.castShadow = true;
      }
    });
    barong = new THREE.Group();
    barong.add(o);
    plinth.seat.add(barong);
  });

  // moorings: a lit marker floats where the boat can tie up
  SITES.forEach((s) => {
    if (!s.dock) {
      if (s.id === "pier") {
        const d = out(s);
        s.dock = { x: s.x + d.x * (PIER_LEN + 4), z: s.z + d.y * (PIER_LEN + 4) + 17 };
      } else s.dock = dockFor(s.x, s.z, 20);
    }
  });
  const markers = new Map<PlaceId, { g: THREE.Group; lamp: THREE.Mesh; beam: THREE.Mesh }>();
  const markerCol = { md: [3.2, 2.3, 0.9], wf: [3.4, 1.5, 0.7], strait: [3.2, 2.3, 0.9] } as const;
  SITES.forEach((s) => {
    if (s.id === "buoy") return;
    const g = new THREE.Group(), d = out(s);
    g.position.set(s.dock!.x - d.x * 9, 0, s.dock!.z - d.y * 9);
    const float = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 1.1, 14), new THREE.MeshStandardMaterial({ color: s.island === "md" ? 0x7a1f14 : 0xc67139, roughness: 0.5 }));
    float.position.y = 0.2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), new THREE.MeshStandardMaterial({ color: 0x26302d, roughness: 0.6 }));
    post.position.y = 1.8;
    const [r, gr, b] = markerCol[s.island];
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), glow(r, gr, b));
    lamp.position.y = 3.05;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 60, 8, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(r / 3, gr / 3, b / 3), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    beam.position.y = 33;
    g.add(float, post, lamp, beam);
    scene.add(g);
    markers.set(s.id, { g, lamp, beam });
  });

  // gulls wheel over each island
  const gullM = new THREE.MeshBasicMaterial({ color: 0xe9e6df, side: THREE.DoubleSide });
  const wingG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -0.18), new THREE.Vector3(0, 0, 0.22), new THREE.Vector3(1.5, 0.1, 0.3)]);
  const gulls = Array.from({ length: 14 }, (_, i) => {
    const g = new THREE.Group(), wings = [-1, 1].map((s) => {
      const w = new THREE.Mesh(wingG, gullM);
      w.scale.x = s;
      g.add(w);
      return w;
    });
    scene.add(g);
    return { g, wings, I: ISLANDS[i % 2], r: 40 + Math.random() * 70, h: 26 + Math.random() * 26, sp: (0.08 + Math.random() * 0.07) * (i % 3 ? 1 : -1), ph: Math.random() * 6.3 };
  });

  // ---------- the pinisi and her lamp ----------
  const pinisi = buildPinisi();
  const helm = new THREE.Group(); // turns to the heading; the boat inside it heels and pitches
  helm.add(pinisi.boat);
  scene.add(helm);
  const lamp = buildLamp();
  lamp.lamp.position.y = 0.6;
  lamp.lamp.rotation.y = -0.5;
  pinisi.lampAt.add(lamp.lamp);

  // her wake: soft patches of foam laid on the water astern, spreading and fading
  const foamC = document.createElement("canvas");
  foamC.width = foamC.height = 64;
  const fg = foamC.getContext("2d")!, fr = fg.createRadialGradient(32, 32, 0, 32, 32, 32);
  fr.addColorStop(0, "rgba(255,255,255,.9)");
  fr.addColorStop(0.5, "rgba(255,255,255,.35)");
  fr.addColorStop(1, "rgba(255,255,255,0)");
  fg.fillStyle = fr;
  fg.fillRect(0, 0, 64, 64);
  const foamT = new THREE.CanvasTexture(foamC), foamG = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const wake = Array.from({ length: 48 }, () => {
    const m = new THREE.Mesh(foamG, new THREE.MeshBasicMaterial({ map: foamT, transparent: true, opacity: 0, depthWrite: false }));
    m.position.y = 0.06;
    m.renderOrder = 2;
    scene.add(m);
    return { m, born: -99 };
  });
  let wakeN = 0, wakeT = 0;

  // ---------- render pipeline ----------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.6, 2.1);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const holder = canvas.parentElement!;
  function resize() {
    const w = holder.clientWidth, h = holder.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(holder);
  resize();
  let inView = true;
  const io = new IntersectionObserver((es) => (inView = es[0].isIntersecting), { threshold: 0.02 });
  io.observe(holder);

  // ---------- state ----------
  const st = { x: -8, z: 128, yaw: Math.PI / 2, v: 0, roll: 0 };
  let phase: "dark" | "lighting" | "sailing" = "dark";
  let litAt = 0, lit = 0, elev = NIGHT;
  let auto: Site | null = null, autoSide = 0, autoIsle: (typeof ISLANDS)[number] | null = null, moored: Site | null = null, near: PlaceId | null = null;
  let waters = "";
  const found = new Set<PlaceId>();
  const keys: Record<string, boolean> = {};
  let pointer: PointerEvent | null = null;
  const flash = new Array(7).fill(-9);
  let beat = 0;
  setSun(NIGHT, true);

  const steering = () => phase === "sailing" && !moored;
  const onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase(), down = e.type === "keydown";
    if (down && !steering()) return;
    if ((e.target as HTMLElement | null)?.closest?.("input,textarea,select,[contenteditable]")) return;
    if (down && inView && ["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
    keys[k] = down;
    if (down && ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) auto = null;
  };
  const clearKeys = () => Object.keys(keys).forEach((k) => (keys[k] = false));
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  window.addEventListener("blur", clearKeys);
  const pDown = (e: PointerEvent) => {
    if (!steering()) return;
    pointer = e;
    auto = null;
    canvas.setPointerCapture(e.pointerId);
  };
  const pMove = (e: PointerEvent) => void (pointer && (pointer = e));
  const pUp = () => void (pointer = null);
  canvas.addEventListener("pointerdown", pDown);
  canvas.addEventListener("pointermove", pMove);
  canvas.addEventListener("pointerup", pUp);
  canvas.addEventListener("pointercancel", pUp);
  const onVis = () => audio.setAway(document.hidden);
  document.addEventListener("visibilitychange", onVis);

  const ray = new THREE.Raycaster(), seaPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(), ndc = new THREE.Vector2();
  /** the island that stands between two points at sea, if one does: the first land the straight course meets */
  const blocked = (x0: number, z0: number, x1: number, z1: number) => {
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 6);
    for (let i = 1; i < n; i++) {
      const x = x0 + ((x1 - x0) * i) / n, z = z0 + ((z1 - z0) * i) / n;
      if (heightAt(x, z) > -3.6) return ISLANDS.reduce((a, b) => (Math.hypot(x - a.x, z - a.z) / a.r < Math.hypot(x - b.x, z - b.z) / b.r ? a : b));
    }
    return null;
  };

  function sail(dt: number) {
    let turn = 0, thrust = 0, swing = 0; // swing: under her own pilot she may turn smartly even with little way on
    if (auto) {
      // steer for the mooring; if an island is in the way, follow its coast round until the way is clear
      const d = auto.dock!, dx = d.x - st.x, dz = d.z - st.z, dist = Math.hypot(dx, dz);
      let vx = dx / dist, vz = dz / dist;
      if (dist < 13) {
        const here = auto;
        auto = null;
        st.v *= 0.5;
        ev.onArrive(here.id);
        return;
      }
      const I = blocked(st.x, st.z, d.x, d.z);
      if (I) {
        // round the island that is in the way (not merely the nearest one), keeping to one side of it until the way is clear
        const rx = st.x - I.x, rz = st.z - I.z, r = Math.hypot(rx, rz), ring = I.r * 1.5 + 12;
        const tx = -rz / r, tz = rx / r;
        if (autoIsle !== I) {
          autoIsle = I;
          autoSide = tx * vx + tz * vz >= 0 ? 1 : -1;
        }
        const pull = clamp((ring - r) / 22, -1, 1);
        vx = tx * autoSide + (rx / r) * pull;
        vz = tz * autoSide + (rz / r) * pull;
      } else autoIsle = null;
      const off = wrap(Math.atan2(-vz, vx) - st.yaw);
      turn = clamp(off * 2.2, -1, 1);
      // her course lies astern (she has just cast off, bows to the shore): back away and swing round before making sail
      thrust = Math.abs(off) > 1.25 ? -0.4 : dist < 45 ? 0.45 : Math.abs(turn) > 0.8 ? 0.5 : 1;
      swing = Math.abs(off) > 0.5 ? 0.85 : 0;
    } else if (steering()) {
      if (keys.arrowleft || keys.a) turn += 1;
      if (keys.arrowright || keys.d) turn -= 1;
      if (keys.arrowup || keys.w) thrust = 1;
      if (keys.arrowdown || keys.s) thrust = -0.4;
      const pad = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
      if (pad) {
        if (Math.abs(pad.axes[0] ?? 0) > 0.15) turn -= pad.axes[0];
        if (pad.buttons[0]?.pressed || pad.buttons[7]?.pressed) thrust = 1;
        else if ((pad.axes[1] ?? 0) < -0.2) thrust = Math.max(thrust, -pad.axes[1]);
      }
      if (pointer) {
        const r = canvas.getBoundingClientRect();
        ndc.set(((pointer.clientX - r.left) / r.width) * 2 - 1, -((pointer.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        if (ray.ray.intersectPlane(seaPlane, hit)) {
          const d = wrap(Math.atan2(-(hit.z - st.z), hit.x - st.x) - st.yaw);
          turn = clamp(d * 2, -1, 1);
          thrust = Math.abs(d) < 1.3 ? 1 : 0.35;
        }
      }
    }
    turn = clamp(turn, -1, 1);
    st.yaw += turn * dt * 0.3 * Math.max(swing * 1.6, 0.35 + Math.min(1, Math.abs(st.v) / 7)); // a 28 m schooner turns slowly
    st.v += (thrust * 13 - st.v) * dt * (thrust ? 0.55 : 0.4);
    st.roll += (turn * Math.min(1, Math.abs(st.v) / 9) * 0.1 - st.roll) * Math.min(1, dt * 2);
    const fx = Math.cos(st.yaw), fz = -Math.sin(st.yaw);
    st.x += fx * st.v * dt;
    st.z += fz * st.v * dt;
    // keep her afloat: the shallows push the hull back out to sea
    let hitLand = false;
    for (const o of [12, 0, -11]) {
      const px = st.x + fx * o, pz = st.z + fz * o, h = heightAt(px, pz);
      if (h > -2.2) {
        const gx = heightAt(px + 1, pz) - heightAt(px - 1, pz), gz = heightAt(px, pz + 1) - heightAt(px, pz - 1), gl = Math.hypot(gx, gz) || 1;
        const push = Math.min(3, (h + 2.2) * 0.8);
        st.x -= (gx / gl) * push;
        st.z -= (gz / gl) * push;
        hitLand = true;
      }
    }
    if (hitLand) {
      if (Math.abs(st.v) > 5) audio.bump();
      st.v *= 0.82;
    }
    const far = Math.hypot(st.x, st.z);
    if (far > 520) {
      st.x *= 520 / far;
      st.z *= 520 / far;
      st.v *= 0.9;
    }
  }

  // ---------- camera ----------
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3(), lampW = new THREE.Vector3();
  let camSet = false, shift = 0;
  function aim(t: number, dt: number) {
    const fx = Math.cos(st.yaw), fz = -Math.sin(st.yaw);
    const tall = camera.aspect < 0.8;
    pinisi.lampAt.getWorldPosition(lampW);
    lampW.y += 0.85;
    // the close view of the lamp, circling slowly
    const a = st.yaw + 0.9 + (reduce ? 0 : Math.sin(t * 0.13) * 0.5), dLamp = tall ? 2.5 : 1.75;
    const lampPos = new THREE.Vector3(lampW.x + Math.cos(a) * dLamp, lampW.y + 0.34, lampW.z - Math.sin(a) * dLamp);
    // the words sit low and left, so the lamp is framed high and to the right of them
    const side = tall ? 0 : 0.42;
    const lampLook = new THREE.Vector3(lampW.x + Math.sin(a) * side, lampW.y - (tall ? 0.5 : 0.2), lampW.z + Math.cos(a) * side);
    const back = tall ? 70 : 50, off = back * 0.3; // a little off her quarter, so the sails and the sheer both show
    const followPos = new THREE.Vector3(st.x - fx * back - fz * off, tall ? 26 : 17, st.z - fz * back + fx * off), followLook = new THREE.Vector3(st.x + fx * 14, 7, st.z + fz * 14);
    let fov = 42, k = Math.min(1, dt * 2.2);
    if (phase === "dark") {
      wantPos.copy(lampPos);
      wantLook.copy(lampLook);
      fov = 34;
      k = 1;
    } else if (phase === "lighting") {
      // hold on the flame, then draw back as the sun comes up
      const p = ease(clamp((t - litAt - 2.2) / (reduce ? 0.01 : 6), 0, 1));
      wantPos.lerpVectors(lampPos, followPos, p);
      wantPos.y += Math.sin(p * Math.PI) * 14;
      wantLook.lerpVectors(lampLook, followLook, p);
      fov = 34 + 8 * p;
      k = 1;
      if (p >= 1) phase = "sailing";
    } else if (moored) {
      // moored: stand off the shore and look at the place
      const s = moored, d = s.island === "strait" ? new THREE.Vector2(0.3, 1).normalize() : out(s), [dist, h] = s.view, far = tall ? 1.45 : 1;
      const cx = s.x + d.x * (s.focus ?? 0), cz = s.z + d.y * (s.focus ?? 0), ground = Math.max(0, heightAt(cx, cz));
      // stand well off to one side of her: the boat lies on the line from the place straight out to sea, and seen from
      // astern her sails would hide what she has come to see. From the quarter she frames it instead.
      const ca = Math.cos(0.72), sa = Math.sin(0.72), ox = d.x * ca - d.y * sa, oz = d.y * ca + d.x * sa;
      wantPos.set(cx + ox * dist * far, h * far + ground * 0.6, cz + oz * dist * far);
      wantPos.y = Math.max(wantPos.y, heightAt(wantPos.x, wantPos.z) + 4);
      // on a phone the panel rises over the lower half, so aim low and the place sits in the clear upper part
      wantLook.set(cx, ground + h * 0.42 - (tall ? dist * 0.42 : 0), cz);
      k = Math.min(1, dt * 1.3);
    } else {
      wantPos.copy(followPos);
      wantLook.copy(followLook);
    }
    if (!camSet || reduce) k = 1;
    camSet = true;
    camPos.lerp(wantPos, k);
    camLook.lerp(wantLook, k);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov += (fov - camera.fov) * Math.min(1, dt * 3);
      camera.updateProjectionMatrix();
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    // a panel covers the right of a wide screen while moored: slide the picture left so the place stays in view
    const w = holder.clientWidth, h = holder.clientHeight, wantShift = moored && !tall && w > 720 ? Math.min(250, w * 0.17) : 0;
    shift += (wantShift - shift) * (reduce ? 1 : Math.min(1, dt * 2));
    if (shift > 0.5) camera.setViewOffset(w, h, shift, 0, w, h);
    else if (camera.view) camera.clearViewOffset();
  }

  // ---------- life: each place wakes a little as she comes near, and fully when she moors ----------
  const awake = {} as Record<PlaceId, number>;
  SITES.forEach((s) => (awake[s.id] = 0));
  const WARM: [number, number, number] = [3.2, 2.1, 0.9];
  const dim = (m: THREE.MeshBasicMaterial, r: number, g: number, b: number, k: number) => m.color.setRGB(r * k, g * k, b * k);
  /** lights or doors that come on one after another as a place wakes */
  const seq = (a: number, i: number, n: number) => clamp(a * (n + 0.6) - i, 0, 1);
  const flick = (t: number, i: number) => (reduce ? 1 : 0.92 + 0.08 * Math.sin(t * 9 + i * 2.1));
  let spinBarong = 0, spinBuoy = 0, spinBeam = 0, spinCups = 0, shuttleSide = -1, lastPick = 0;
  const pipY = pip.group.position.y, seatY = plinth.seat.position.y;
  const barongLight = new THREE.PointLight(0xffc870, 0, 16, 1.6);
  barongLight.position.y = 2;
  plinth.seat.add(barongLight);
  // the Pattern Studio's own motifs rise round the pavilion and turn about it, as they do in the welcome film
  const pavAt = site("pavilion"), pavY = heightAt(pavAt.x, pavAt.z);
  const motifs = ["bomba-rose--buya", "ketupat-lattice--buya", "cengkeh-sprig--buya", "dua-pulau-medallion--buya", "bomba-rosette--buya", "ntina-mark--gold", "rebung-border--buya"].map((name) => {
    const tx = new THREE.TextureLoader().load(`/motifs/${name}.png`);
    tx.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, opacity: 0, depthWrite: false }));
    sp.visible = false;
    scene.add(sp);
    return sp;
  });
  // the lighthouse shows the weather over Brighton as it is now: the vane turns into the wind, the cups spin at its speed
  let weather: Weather | null = null, weatherAsked = false;
  function askWeather() {
    weatherAsked = true;
    fetch("https://api.open-meteo.com/v1/forecast?latitude=50.82&longitude=-0.14&current=temperature_2m,wind_speed_10m,wind_direction_10m")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { current?: { temperature_2m?: number; wind_speed_10m?: number; wind_direction_10m?: number } }) => {
        const c = j.current;
        if (!c || typeof c.wind_speed_10m !== "number" || typeof c.wind_direction_10m !== "number" || typeof c.temperature_2m !== "number") return;
        weather = { temp: c.temperature_2m, wind: c.wind_speed_10m, from: c.wind_direction_10m };
        ev.onWeather?.(weather);
      })
      .catch(() => {}); // no weather, no harm: the vane keeps its idle swing
  }
  function life(t: number, dt: number, bob: number) {
    for (const s of SITES) {
      const want = moored?.id === s.id ? 1 : near === s.id ? 0.4 : 0;
      awake[s.id] += (want - awake[s.id]) * Math.min(1, dt * (want > awake[s.id] ? 1.3 : 0.7));
    }
    const still = reduce ? 0 : 1;
    // the gate: stone lamps light in pairs down the path to the water
    gate.lamps.forEach((m, i) => dim(m, ...WARM, (0.12 + 0.88 * seq(awake.gate, i, gate.lamps.length)) * flick(t, i)));
    // the pavilion: its lamps come up and the motifs rise and circle it
    dim(pav.lampM, ...WARM, 0.25 + 0.75 * awake.pavilion);
    motifs.forEach((sp, i) => {
      const a = clamp(awake.pavilion * 1.7 - i * 0.09, 0, 1), ang = t * 0.22 * still + (i / motifs.length) * Math.PI * 2, r = 11.5 + (i % 2) * 2.6;
      sp.visible = a > 0.01;
      if (!sp.visible) return;
      sp.position.set(pavAt.x + Math.cos(ang) * r, pavY + 4 + a * (4 + (i % 3) * 3.4) + Math.sin(t * 0.6 + i) * 0.5 * still, pavAt.z + Math.sin(ang) * r);
      sp.scale.setScalar(3.4 * (0.5 + 0.5 * a));
      sp.material.opacity = a;
      sp.material.rotation = Math.sin(t * 0.4 + i) * 0.14 * still;
    });
    // the bale: its gongs stir (the kettles ring when she moors)
    bale.gongs.forEach((g, i) => (g.rotation.y = Math.sin(t * 2.2 + i) * 0.12 * awake.bale * still));
    // the guest house: windows and lanterns come on, the door opens, and the loom on the veranda weaves
    const home = smooth(0.4, 1, awake.guesthouse);
    guest.glass.emissiveIntensity = awake.guesthouse * 1.8;
    dim(guest.lanternM, ...WARM, 0.2 + 0.8 * awake.guesthouse);
    guest.door.rotation.y = -1.25 * home;
    const pick = Math.floor(t * 1.5), beat = (t * 1.5) % 1;
    guest.beater.rotation.x = home * (beat < 0.2 ? Math.sin((beat / 0.2) * Math.PI) * 0.24 : 0) * still;
    if (home > 0.5 && pick !== lastPick) {
      lastPick = pick;
      shuttleSide = -shuttleSide;
      if (moored?.id === "guesthouse") audio.loom();
    }
    guest.shuttle.position.x += ((home > 0.5 ? shuttleSide * 0.55 : -0.55) - guest.shuttle.position.x) * Math.min(1, dt * 9);
    // the Barong: lifts off its plinth, turns faster and glows
    spinBarong += dt * (0.3 + awake.barong * 1.5) * still;
    if (barong) barong.rotation.y = reduce ? -Math.PI / 2 : spinBarong;
    plinth.seat.position.y = seatY + smooth(0.4, 1, awake.barong) * 0.5 + Math.sin(t * 1.3) * 0.06 * awake.barong * still;
    barongLight.intensity = awake.barong * 40;
    // the pier: its lamps come on one standard at a time from the shore, then the kiosk lights
    const head = smooth(0.6, 1, awake.pier);
    pier.lamps.forEach((m, i) => dim(m, ...WARM, (0.12 + 0.88 * seq(awake.pier, i, pier.lamps.length)) * flick(t, i)));
    dim(pier.kioskM, ...WARM, 0.15 + 0.85 * head);
    pier.kioskGlass.emissiveIntensity = head * 2;
    pier.flag.rotation.y = Math.sin(t * (2.6 + awake.pier * 3)) * 0.3 * bob;
    // the supper table: the festoon comes on and twinkles, the candles catch, and Pip jumps for joy
    dim(supper.festoonM, 3.4, 2.3, 1.0, (0.1 + 0.9 * awake.table) * (awake.table > 0.3 && !reduce ? 0.86 + 0.14 * Math.sin(t * 13) : 1));
    supper.candles.forEach((c, i) => c.scale.setScalar(0.3 + awake.table * (0.9 + 0.2 * Math.sin(t * 17 + i * 3) * still)));
    pip.group.position.y = pipY + Math.abs(Math.sin(t * 5)) * 0.45 * smooth(0.5, 1, awake.table) * still;
    // the beach huts: the doors swing open along the terrace, a light in each
    const open = smooth(0.3, 1, awake.huts);
    huts.huts.forEach((h, i) => {
      const k = seq(open, i, huts.huts.length);
      h.doors.forEach((d, n) => (d.rotation.y = (n ? 1 : -1) * 1.75 * k));
      dim(h.inside, ...WARM, 0.15 + 0.85 * k);
    });
    // the lighthouse: the lamp brightens and the beam strengthens; vane and cups show Brighton's wind as it is now
    if (awake.lighthouse > 0.2 && !weatherAsked) askWeather();
    const wind = weather ? clamp(weather.wind / 40, 0.08, 1.6) : 0.4;
    spinCups += dt * (1.5 + wind * 11) * still;
    spinBeam += dt * (0.5 + awake.lighthouse * 0.4) * still;
    lighthouse.cups.rotation.y = spinCups;
    lighthouse.beam.rotation.y = reduce ? 0.8 : spinBeam;
    lighthouse.beamM.opacity = 0.045 + 0.1 * awake.lighthouse;
    dim(lighthouse.lampM, 5, 4.2, 2.4, 0.5 + 0.9 * awake.lighthouse);
    // north is -z and east is +x: the arrow points to where the wind comes from
    const from = weather ? THREE.MathUtils.degToRad(weather.from) : 0;
    const into = weather ? Math.atan2(Math.cos(from), Math.sin(from)) - lighthouse.group.rotation.y : 0.6;
    lighthouse.vane.rotation.y += wrap(into + Math.sin(t * 0.3) * 0.12 * bob - lighthouse.vane.rotation.y) * Math.min(1, dt * 1.5);
    // the medallion: turns faster and its lantern beats
    spinBuoy += dt * (0.35 + awake.buoy * 1.8) * still;
    buoy.spin.rotation.y = reduce ? 0.6 : spinBuoy;
    dim(buoy.lightM, ...WARM, 0.4 + awake.buoy * (0.6 + 0.5 * Math.max(0, Math.sin(t * 6)) * still));
  }

  // ---------- the loop ----------
  let raf = 0, last = performance.now(), disposed = false;
  function frame(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    if (!inView || document.hidden) return void (last = now);
    const dt = Math.min(0.05, (now - last) / 1000), t = now / 1000;
    last = now;

    if (phase !== "dark") {
      lit = Math.min(1, lit + dt / 0.9);
      const want = NIGHT + (DAY - NIGHT) * ease(clamp((t - litAt - 1.6) / (reduce ? 0.01 : 7.5), 0, 1));
      if (want !== elev) setSun((elev = want));
    }
    if (phase === "sailing") sail(dt);
    else st.v *= 0.98;

    const bob = reduce ? 0 : 1;
    helm.position.set(st.x, Math.sin(t * 0.9) * 0.16 * bob - 0.1, st.z);
    helm.rotation.y = st.yaw;
    pinisi.boat.rotation.set(Math.sin(t * 0.7) * 0.022 * bob + st.roll, 0, Math.sin(t * 0.53 + 1) * 0.012 * bob + st.v * 0.0016);
    pinisi.sails.forEach((s, i) => (s.scale.z = 1 + Math.sin(t * 0.8 + i) * 0.1 * bob));
    pinisi.flag.rotation.y = Math.sin(t * 3) * 0.3 * bob;
    lamp.update(t, lit);

    wakeT -= dt * Math.abs(st.v);
    if (wakeT <= 0 && Math.abs(st.v) > 1.5) {
      wakeT = 1.6;
      const w = wake[wakeN++ % wake.length], side = wakeN % 2 ? 1 : -1, fx = Math.cos(st.yaw), fz = -Math.sin(st.yaw);
      w.born = t;
      w.m.position.set(st.x - fx * 12 - fz * side * 1.4, 0.06, st.z - fz * 12 + fx * side * 1.4);
    }
    wake.forEach((w) => {
      const age = (t - w.born) / 5;
      w.m.visible = age < 1;
      if (!w.m.visible) return;
      w.m.scale.setScalar(3 + age * 11);
      (w.m.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - age) * Math.min(1, age * 8);
    });
    water.material.uniforms.time.value = t * 0.45;
    shore.material.uniforms.time.value = reduce ? 0 : t;
    shore.material.uniforms.light.value = smooth(NIGHT, 6, elev);
    buoy.group.position.y = Math.sin(t * 1.1 + 2) * 0.14 * bob;
    markers.forEach((m, id) => {
      m.g.position.y = Math.sin(t * 1.3 + m.g.position.x) * 0.12 * bob;
      // the beam calls from far off and bows out as the boat comes near
      m.beam.visible = !found.has(id) && Math.hypot(camPos.x - m.g.position.x, camPos.z - m.g.position.z) > 70;
    });
    life(t, dt, bob);
    pip.group.rotation.y = Math.atan2(st.x - pip.group.position.x, st.z - pip.group.position.z);
    pip.update(t, reduce);
    bale.kettles.forEach((k, i) => {
      const a = Math.max(0, 1 - (t - flash[i]) / 0.7);
      (k.material as THREE.MeshStandardMaterial).emissive.setRGB(a * 1.6, a * 1.0, a * 0.3);
    });
    gulls.forEach((g) => {
      const a = g.ph + t * g.sp;
      g.g.position.set(g.I.x + Math.cos(a) * g.r, g.h + Math.sin(t * 0.4 + g.ph) * 3, g.I.z + Math.sin(a) * g.r);
      g.g.rotation.y = -a - (g.sp > 0 ? Math.PI / 2 : -Math.PI / 2) + Math.PI / 2;
      g.wings.forEach((w, n) => (w.rotation.z = (n ? -1 : 1) * Math.sin(t * 5 + g.ph) * 0.45 * bob));
    });

    if (phase === "sailing") {
      // where is she, and what is within reach
      let best = 34, at: PlaceId | null = null;
      for (const s of SITES) {
        const d = Math.hypot(st.x - s.dock!.x, st.z - s.dock!.z);
        if (d < best) {
          best = d;
          at = s.id;
        }
      }
      if (at !== near) {
        near = at;
        ev.onNear(at);
        if (at && !found.has(at)) {
          found.add(at);
          ev.onFound([...found]);
        }
      }
      const w = Math.abs(st.x) < 44 && Math.abs(st.z) < 150 ? "strait" : Math.hypot(st.x, st.z) > 330 ? "open" : st.x < 0 ? "md" : "wf";
      if (w !== waters) ev.onWaters((waters = w));
      beat -= dt;
      if (beat <= 0) {
        beat = 0.44;
        if (!moored) audio.phrase(smooth(-60, 60, st.x));
      }
    }
    audio.ambience(Math.min(1, Math.abs(st.v) / 13), 1 - Math.min(1, Math.abs(st.x) / 60), lit);

    aim(t, dt);
    composer.render();
  }
  raf = requestAnimationFrame(frame);

  const api: World = {
    light() {
      if (phase !== "dark") return;
      audio.startAudio();
      audio.lampLit();
      phase = "lighting";
      litAt = performance.now() / 1000;
    },
    sailTo(id) {
      if (phase !== "sailing") return;
      moored = null;
      auto = site(id);
      autoIsle = null;
    },
    moor(id) {
      moored = id ? site(id) : null;
      if (!moored) return;
      auto = null;
      st.v = 0;
      audio.arrive(moored.island);
      if (id === "bale") [0, 1, 2, 3, 4, 5, 6, 4, 3, 0].forEach((n, i) => window.setTimeout(() => ((flash[n] = performance.now() / 1000), audio.kettle(n, 0.36)), 900 + i * 190));
      if (id === "table") window.setTimeout(audio.boop, 700);
    },
    setMuted: audio.setMuted,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", clearKeys);
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("pointerdown", pDown);
      canvas.removeEventListener("pointermove", pMove);
      canvas.removeEventListener("pointerup", pUp);
      canvas.removeEventListener("pointercancel", pUp);
      audio.setAway(true);
      envRT?.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
  if (import.meta.env.DEV) Object.assign(window, { __dp: { api, st, skip: () => ((phase = "sailing"), (lit = 1), setSun((elev = DAY), true)) } });
  return api;
}
