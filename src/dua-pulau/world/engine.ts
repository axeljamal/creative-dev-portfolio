// Dua Pulau's world: a physically lit sea and sky, two islands, and a pinisi to sail between them. It opens in the
// blue hour on an unlit oil lamp at her bow; lighting it brings up the sun. This file is its own chunk, so three.js
// arrives only with the world. The page tells it what to do (light, sailTo, moor) and hears back where the boat is.
import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { PlaceId } from "../places";
import { earlierWork } from "../../content/work";
import * as audio from "./audio";
import { buildBale, buildBuoy, buildGate, buildGroyne, buildGuestHouse, buildHuts, buildLamp, buildLighthouse, buildPalms, buildPavilion, buildPier, buildPinisi, buildPip, buildPlanter, type PipMood, buildPlinth, buildRocks, buildSupper, buildTrees, glow , groundShade } from "./models";
import { ISLANDS, addClear, addPad, buildShore, buildTerrain, dockFor, heightAt, nearestIsland, scatter, smooth } from "./terrain";

export type WorldEvents = {
  /** the boat is close enough to moor at this place, or has left it */
  onNear: (id: PlaceId | null) => void;
  /** the boat sailed itself here and has stopped */
  onArrive: (id: PlaceId) => void;
  onWaters: (w: "md" | "wf" | "strait" | "open") => void;
  onFound: (ids: PlaceId[]) => void;
  /** the weather in Brighton now, once the lighthouse has asked for it */
  onWeather?: (w: Weather) => void;
  /** the part of the day it has become */
  onTime?: (part: DayPart) => void;
  /** Pip, the crew on deck, was tapped: the page opens his questions */
  onPip?: () => void;
  /** the view changed from the keyboard (V) */
  onView?: (v: BoatView) => void;
};
/** where the camera follows her from: off the stern quarter, or broadside from either side */
export type BoatView = "astern" | "starboard" | "port";
export type DayPart = "First light" | "Morning" | "Midday" | "Afternoon" | "Golden hour" | "Dusk" | "Night";
/** what a chart of these waters needs: each island's shoreline and where each place lies (x east, z south) */
export type Chart = { isles: { id: "md" | "wf"; shore: [number, number][] }[]; places: { id: PlaceId; island: "md" | "wf" | "strait"; x: number; z: number }[] };
/** temp in °C, wind in km/h, from: the compass bearing the wind blows from */
export type Weather = { temp: number; wind: number; from: number };
export type World = {
  /** light the lamp: must be called inside a tap, so sound may start */
  light: () => void;
  sailTo: (id: PlaceId) => void;
  /** moor at a place (the camera turns to it) or cast off with null */
  moor: (id: PlaceId | null) => void;
  setMuted: (m: boolean) => void;
  /** move the day on to its next part */
  skipTime: () => void;
  /** the questions panel is open: Pip on deck stays awake and turns to the visitor */
  pipTalking: (on: boolean) => void;
  /** follow her from astern, or from her starboard or port side */
  setView: (v: BoatView) => void;
  /** filming only: hold the camera at a fixed point looking at another while she sails past (null: follow again) */
  filmCam: (c: { pos: [number, number, number]; look: [number, number, number]; track?: boolean } | null) => void;
  /** moored: hide the panel's room and let the camera have the whole screen */
  look: (on: boolean) => void;
  chart: () => Chart;
  /** where she is now and which way she heads (yaw 0 = east, turning to the north) */
  boat: () => { x: number; z: number; yaw: number };
  dispose: () => void;
};

type Site = { id: PlaceId; island: "md" | "wf" | "strait"; x: number; z: number; pad?: [number, number]; view: [number, number]; /** how far out to sea from the site the camera should look (the pier's head) */ focus?: number; dock?: { x: number; z: number } };
const PIER_LEN = 52;
// where everything stands. pad: [radius, height]. view: [distance, height] of the camera when moored there.
const SITES: Site[] = [
  { id: "gate", island: "md", x: -70, z: 12, pad: [14, 2.4], view: [46, 12] },
  { id: "pavilion", island: "md", x: -112, z: -34, pad: [17, 8], view: [52, 16] },
  { id: "bale", island: "md", x: -150, z: 38, pad: [12, 3], view: [46, 13] },
  { id: "guesthouse", island: "md", x: -176, z: -18, pad: [19, 3], view: [44, 11] },
  { id: "barong", island: "md", x: -98, z: 46, pad: [8, 3.4], view: [26, 8] },
  { id: "pier", island: "wf", x: 72, z: 22, pad: [7, 3.1], view: [34, 11], focus: PIER_LEN - 6 },
  // down on the shingle at the top of the beach, below the downs
  { id: "table", island: "wf", x: 105.5, z: -45.6, pad: [10, 1.5], view: [21, 6.5] },
  { id: "huts", island: "wf", x: 128, z: 56, pad: [16, 2.3], view: [38, 9] },
  { id: "lighthouse", island: "wf", x: 178, z: 2, pad: [10, 3.2], view: [54, 16] },
  // she lies on the far side of the medallion: the camera stands to the south, and a mooring there put it inside the hull
  { id: "buoy", island: "strait", x: 0, z: -34, view: [17, 6], dock: { x: -6, z: -56 } },
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

/** a cumulus: heaped white tops over a flat, shaded base. Three of these, turned and stretched, make a whole sky. */
function cloudTexture(seed: number) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d")!;
  let r0 = seed * 9301 + 49297;
  const rnd = () => ((r0 = (r0 * 9301 + 49297) % 233280) / 233280);
  const BASE = 196;
  for (let i = 0; i < 64; i++) {
    // heaped toward the middle: a mound with a lumpy outline, never a slab
    const x = 256 + (rnd() + rnd() + rnd() - 1.5) * 250, dome = Math.pow(Math.max(0, Math.sin(((x - 40) / 432) * Math.PI)), 1.7);
    const r = (16 + rnd() * 40) * (0.4 + 0.6 * dome), y = BASE - r * 0.55 - rnd() * 112 * dome;
    const grd = g.createRadialGradient(x, y, r * 0.15, x, y, r);
    grd.addColorStop(0, "rgba(255,255,255,.95)");
    grd.addColorStop(0.6, "rgba(255,255,255,.55)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // the underside sits in its own shadow
  g.globalCompositeOperation = "source-atop";
  const shade = g.createLinearGradient(0, 70, 0, BASE + 10);
  shade.addColorStop(0, "rgba(120,134,160,0)");
  shade.addColorStop(0.62, "rgba(120,134,160,0)");
  shade.addColorStop(1, "rgba(100,116,146,.5)");
  g.fillStyle = shade;
  g.fillRect(0, 0, 512, 256);
  // and ends level, where the air stops lifting it
  g.globalCompositeOperation = "destination-out";
  const cut = g.createLinearGradient(0, BASE - 16, 0, BASE + 14);
  cut.addColorStop(0, "rgba(0,0,0,0)");
  cut.addColorStop(1, "rgba(0,0,0,1)");
  g.fillStyle = cut;
  g.fillRect(0, BASE - 16, 512, 90);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** seen: places found on an earlier visit (the log's ticks), so the counts and the chart pick up where they stopped */
export function createWorld(canvas: HTMLCanvasElement, ev: WorldEvents, seen: PlaceId[] = []): World {
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
  // the sky model runs far brighter than the lit land at a high sun, and the tone curve then bleaches it white:
  // gain holds it down so noon stays blue. (The sky that lights the scene, envSky below, is left as it is.)
  skyU.gain = { value: 1 };
  sky.material.fragmentShader = sky.material.fragmentShader.replace("uniform vec3 up;", "uniform vec3 up;\n\t\tuniform float gain;\n\t\tuniform vec3 tint;").replace("vec4( retColor, 1.0 )", "vec4( retColor * gain * tint, 1.0 )");
  skyU.tint = { value: new THREE.Vector3(1, 1, 1) };
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
  Object.assign(sun.shadow.camera, { left: -330, right: 330, top: 330, bottom: -330, near: 10, far: 1400 }); // square: the sun goes all the way round
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
  // fair-weather cumulus standing off round the horizon, the far ones lower and smaller as real ones look
  const cloudT = [cloudTexture(1), cloudTexture(2), cloudTexture(3)];
  const clouds = Array.from({ length: 26 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudT[i % 3], transparent: true, depthWrite: false, fog: false, opacity: 0.94 }));
    const a = (i / 26) * Math.PI * 2 + Math.random() * 0.2, d = 3000 + Math.random() * 2600, near = 1 - (d - 3000) / 2600;
    const w = 520 + Math.random() * 700 + near * 300;
    s.position.set(Math.cos(a) * d, 260 + near * 300 + Math.random() * 240, Math.sin(a) * d);
    s.scale.set(w * (Math.random() < 0.5 ? -1 : 1), w * (0.36 + Math.random() * 0.14), 1);
    scene.add(s);
    return s;
  });

  const NIGHT = -5, DAY = 7.5;
  // The day: the sun rises in the north-east, stands high in the south at noon and sets in the north-west, then a
  // short night. tod counts seconds through it. The lamp is lit at first light, so sailing begins a little after sunrise.
  const DAY_S = 330, NIGHT_S = 110, TOD0 = 0.0656 * DAY_S, AZ0 = 120 - 240 * 0.0656;
  const sunAt = (tod: number) => {
    if (tod < DAY_S) {
      const f = tod / DAY_S;
      return { elev: -6 + 66 * Math.sin(Math.PI * f), az: 120 - 240 * f };
    }
    const n = (tod - DAY_S) / NIGHT_S;
    return { elev: -6 - 8 * Math.sin(Math.PI * n), az: -120 - 120 * n };
  };
  const PARTS: [number, DayPart][] = [[0, "First light"], [0.05 * DAY_S, "Morning"], [0.36 * DAY_S, "Midday"], [0.64 * DAY_S, "Afternoon"], [0.84 * DAY_S, "Golden hour"], [0.955 * DAY_S, "Dusk"], [DAY_S + 4, "Night"]];
  const partAt = (tod: number) => PARTS.reduce((a, p) => (tod >= p[0] ? p[1] : a), PARTS[0][1]);
  const moon = new THREE.DirectionalLight(0x8fa8dc, 0);
  moon.position.set(-200, 420, 160);
  scene.add(moon);
  const cA = new THREE.Color(), cB = new THREE.Color();
  let lastEnv = -99, lastAz = -999, dusk = 1; // dusk: 1 in the dark, 0 in full day: every lamp in the world is turned by it
  function setSun(elev: number, az = AZ0, force = false) {
    sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elev), THREE.MathUtils.degToRad(az));
    const day = smooth(NIGHT, 6, elev), up = smooth(-0.5, 7, elev), high = smooth(12, 42, elev);
    dusk = 1 - smooth(-3, 10, elev);
    // low sun through thick air is gold; as it climbs the air clears and the sky goes blue
    skyU.turbidity.value = 9 - 7 * high;
    skyU.rayleigh.value = 2.9 - 0.5 * high;
    skyU.mieCoefficient.value = 0.004 - 0.002 * high;
    skyU.gain.value = 1 - 0.5 * high;
    skyU.tint.value.set(1 - 0.24 * high, 1 - 0.07 * high, 1 + 0.16 * high); // a high sun's sky is a deeper blue than the model gives
    moon.intensity = 0.6 * (1 - day);
    skyU.sunPosition.value.copy(sunDir);
    water.material.uniforms.sunDirection.value.copy(sunDir).normalize();
    water.material.uniforms.sunColor.value.setRGB(1, 0.84 + 0.12 * high, 0.62 + 0.3 * high).multiplyScalar(up);
    water.material.uniforms.waterColor.value.copy(cA.set(0x020c16)).lerp(cB.set(0x0c4a50), day).lerp(cB.set(0x06607a), high);
    sun.intensity = 4.6 * up;
    sun.color.copy(cA.set(0xff8a45)).lerp(cB.set(0xffd9a6), smooth(1, 9, elev)).lerp(cB.set(0xfff6ea), high);
    hemi.intensity = 0.2 + 0.75 * day;
    hemi.color.copy(cA.set(0x33466a)).lerp(cB.set(0xcfe0f2), day);
    (scene.fog as THREE.FogExp2).color.copy(cA.set(0x0a1220)).lerp(cB.set(0xc9a48c), day).lerp(cB.set(0x9dc4de), high); // the haze cools as the sun climbs
    (scene.fog as THREE.FogExp2).density = 0.0011 - 0.00045 * high; // and thins: at noon the far island stands clear
    renderer.toneMappingExposure = 0.52 - 0.24 * day + 0.06 * high;
    (stars.material as THREE.PointsMaterial).opacity = 1 - smooth(-4, 1, elev);
    clouds.forEach((c) => c.material.color.copy(cA.set(0x161d2c)).lerp(cB.set(0xffc9a2), day).lerp(cB.set(0xffffff), smooth(4, 26, elev)).multiplyScalar(0.7 + 2.3 * up)); // unlit, so they must be as bright as the sky they stand in
    // the sky also lights every surface: re-bake it as the sun moves
    if (force || Math.abs(elev - lastEnv) > 1.4 || (elev > -5 && Math.abs(az - lastAz) > 6)) {
      lastEnv = elev;
      lastAz = az;
      Object.entries(skyU).forEach(([k, u]) => {
        if (k === "gain" || k === "tint") return;
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
  // Gong and Tugu Perdamaian stand on an open hilltop: keep its plaza clear all round, and keep clear the line the
  // camera looks along when moored there (off the quarter, as aim() sets it), so no palm stands in the way
  {
    const s = SITES.find((q) => q.id === "bale")!, I = nearestIsland(s.x), d = new THREE.Vector2(s.x - I.x, s.z - I.z).normalize();
    const c = Math.cos(0.72), sn = Math.sin(0.72), ox = d.x * c - d.y * sn, oz = d.y * c + d.x * sn;
    addClear({ x: s.x, z: s.z, r: 18 });
    for (let k = 14; k <= 44; k += 6) addClear({ x: s.x + ox * k, z: s.z + oz * k, r: 6 + k * 0.15 });
  }
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
  const placed = new Map<PlaceId, THREE.Object3D>();
  function stand(id: PlaceId, o: THREE.Object3D, turn = 0) {
    const s = site(id), d = out(s);
    placed.set(id, o);
    o.position.set(s.x, heightAt(s.x, s.z), s.z);
    o.rotation.y = Math.atan2(-d.y, d.x) + turn;
    scene.add(o);
    // every building on land keeps a soft shadow round its foot
    if (s.pad && s.island !== "strait") {
      const sh = groundShade(s.pad[0] * 0.98);
      sh.position.set(s.x, heightAt(s.x, s.z) + 0.05, s.z);
      scene.add(sh);
    }
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
    // Pip rides in the box of the host's cargo bike
    supper.group.updateMatrixWorld(true);
    supper.pipSeat.getWorldPosition(pip.group.position);
    pip.group.scale.setScalar(0.38);
    scene.add(pip.group);
  }
  // Windfall's shore, dressed as Brighton's: raised beds by the supper table, and groynes combing the shingle
  {
    const s = site("table"), d = out(s);
    // the raised beds stand behind the supper, where the shingle meets the downs
    [-1, 1].forEach((sd, i) => {
      const b = buildPlanter(i), px = s.x - d.x * 7.5 - d.y * sd * 5, pz = s.z - d.y * 7.5 + d.x * sd * 5;
      b.position.set(px, heightAt(px, pz), pz);
      b.rotation.y = Math.atan2(-d.y, d.x) + Math.PI / 2;
      scene.add(b);
    });
    const I = ISLANDS[1];
    [100, 132, 205, 230].forEach((deg) => {
      const a = THREE.MathUtils.degToRad(deg), dx = Math.cos(a), dz = Math.sin(a);
      let r = I.r * 0.4;
      while (r < I.r * 1.4 && heightAt(I.x + dx * r, I.z + dz * r) > 0.9) r += 0.5; // walk out to the top of the beach
      const gr = buildGroyne();
      gr.position.set(I.x + dx * r, 0, I.z + dz * r);
      gr.rotation.y = Math.atan2(-dz, dx);
      gr.userData.groyne = 15.5; // its length out to the marker post: the hull keeps clear of it
      scene.add(gr);
    });
  }
  const huts = buildHuts([{ name: "Bootcamp Connect", line: "A team app for bootcamp graduates: an AI CV and LinkedIn import, Google sign-in and a ranked feed." }, ...earlierWork.map((w) => ({ name: w.name, line: w.details }))]);
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

  // what stands in the water is solid: the mooring floats, the strait's buoy, the pier and its head, the groynes.
  // Each is a stroke on the sea (a to b) with a thickness; the hull is kept clear of all of them.
  type Rock = { ax: number; az: number; bx: number; bz: number; r: number };
  const rocks: Rock[] = [];
  const dot = (x: number, z: number, r: number) => rocks.push({ ax: x, az: z, bx: x, bz: z, r });
  markers.forEach((m) => dot(m.g.position.x, m.g.position.z, 1.4));
  dot(site("buoy").x, site("buoy").z, 3);
  {
    const s = site("pier"), d = out(s), at = (k: number) => [s.x + d.x * k, s.z + d.y * k] as const;
    const [ax, az] = at(0), [bx, bz] = at(PIER_LEN - 9), [hx, hz] = at(PIER_LEN - 11), [ex, ez] = at(PIER_LEN + 1);
    rocks.push({ ax, az, bx, bz, r: 3 }, { ax: hx, az: hz, bx: ex, bz: ez, r: 6.8 });
  }
  scene.traverse((o) => {
    if (o.userData.groyne) {
      const a = -o.rotation.y, len = o.userData.groyne as number;
      rocks.push({ ax: o.position.x, az: o.position.z, bx: o.position.x + Math.cos(a) * len, bz: o.position.z + Math.sin(a) * len, r: 0.6 });
    }
  });
  /** nearest point of a rock to (x, z), and how far off it is */
  const near2 = (k: Rock, x: number, z: number) => {
    const vx = k.bx - k.ax, vz = k.bz - k.az, l2 = vx * vx + vz * vz;
    const u = l2 ? clamp(((x - k.ax) * vx + (z - k.az) * vz) / l2, 0, 1) : 0;
    const px = k.ax + vx * u, pz = k.az + vz * u;
    return { px, pz, d: Math.hypot(x - px, z - pz) };
  };
  // the lamps at night: a bulb a few centimetres across is smaller than a pixel from out at sea, so as the boat bobs it
  // falls on a pixel one frame and between pixels the next, and the bloom turns that into a flicker. Each small lamp
  // gets a soft halo a few pixels wide, sharing the bulb's colour, so it brightens and dims with it and never winks out.
  {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!, grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.25, "rgba(255,255,255,.45)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const haloT = new THREE.CanvasTexture(c), bulbs: THREE.Mesh[] = [];
    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || !(o.material instanceof THREE.MeshBasicMaterial) || !o.material.userData.glow) return;
      o.geometry.computeBoundingSphere();
      if (o.geometry.boundingSphere!.radius < 0.7) bulbs.push(o);
    });
    bulbs.forEach((b) => {
      const m = new THREE.SpriteMaterial({ map: haloT, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
      m.color = (b.material as THREE.MeshBasicMaterial).color; // the same colour object: it follows every dim and flicker
      const s = new THREE.Sprite(m);
      s.scale.setScalar(Math.max(1.1, b.geometry.boundingSphere!.radius * 7));
      s.raycast = () => {};
      b.add(s);
    });
  }
  /** the hull's half-beam at o metres forward of midships (−14 stern … +14 bow) */
  const beamAt = (o: number) => 3.6 * Math.pow(Math.sin(Math.PI * (0.08 + 0.92 * clamp((o + 14) / 28, 0, 1))), 0.6) + 0.3;

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
  // Pip sails as crew: asleep by the lamp in the dark, waking with it, looking out at sea, cheering each place you
  // moor at, turning to you when you ask him something, and dozing off again at night while she sails on
  const crew = buildPip();
  crew.group.scale.setScalar(0.27); // by the lamp, seen close; on the stern roof he is drawn larger, to read from astern
  pinisi.pipBow.add(crew.group);
  let cheerAt = -99, talking = false;
  const toCam = new THREE.Vector3();

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
  // ambient occlusion: the darkening where things meet (a chair on the boards, a hut on the promenade, a rock in the sand)
  // that tells the eye they are touching. It costs a frame's worth of depth and normals, so phones go without.
  const gtao = coarse ? null : new GTAOPass(scene, camera, 800, 500);
  if (gtao) {
    gtao.blendIntensity = 0.85;
    gtao.updateGtaoMaterial({ radius: 1.4, distanceExponent: 1.6, thickness: 1.2, scale: 1, samples: 16 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
    composer.addPass(gtao);
    // it reads depth and normals with one plain material, which knows nothing of transparency: the sky, the sea,
    // the clouds and every glow or halo would come out as solid shapes. Hide them while it looks, and only then.
    const skip: THREE.Object3D[] = [];
    let found = -1;
    const render = gtao.render.bind(gtao);
    gtao.render = (...args: Parameters<GTAOPass["render"]>) => {
      if (found !== scene.children.length) {
        found = scene.children.length;
        skip.length = 0;
        scene.traverse((o) => {
          const m = (o as THREE.Mesh).material as THREE.Material | undefined;
          if (o === sky || o === water || o instanceof THREE.Sprite || o instanceof THREE.Points || (m && !Array.isArray(m) && (m.transparent || (m as THREE.MeshBasicMaterial).userData?.glow))) skip.push(o);
        });
      }
      const was = skip.map((o) => o.visible);
      skip.forEach((o) => (o.visible = false));
      render(...args);
      skip.forEach((o, i) => (o.visible = was[i]));
    };
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.6, 2.1);
  composer.addPass(bloom);
  // the grade: a little more colour, shadows leaning to indigo and lights to gold (Marea Dvīpa's own pair), and the
  // corners drawn in, as a lens would
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, amount: { value: 1 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; varying vec2 vUv;
      void main(){
        vec4 c = texture2D(tDiffuse, vUv);
        float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
        vec3 col = mix(vec3(l), c.rgb, 1.0 + 0.14 * amount);
        float hi = smoothstep(0.25, 1.4, l), lo = 1.0 - smoothstep(0.0, 0.3, l);
        col *= mix(vec3(1.0), vec3(1.045, 1.0, 0.94), hi * amount);
        col *= mix(vec3(1.0), vec3(0.93, 0.97, 1.07), lo * amount);
        vec2 q = vUv - 0.5;
        col *= 1.0 - amount * 0.34 * smoothstep(0.32, 0.86, length(q * vec2(1.0, 0.82)));
        gl_FragColor = vec4(max(col, 0.0), c.a);
      }`,
  });
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  const holder = canvas.parentElement!;
  function resize() {
    const w = holder.clientWidth, h = holder.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    // occlusion is soft by nature: work it out at half the resolution
    const pr = renderer.getPixelRatio();
    gtao?.setSize(Math.round((w * pr) / 2), Math.round((h * pr) / 2));
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
  let litAt = 0, lit = 0, elev = NIGHT, tod = TOD0, ffTo = -1, dayPart: DayPart = "First light";
  let todHold = false; // dev only: hold the clock still, for comparing looks
  let auto: Site | null = null, autoSide = 0, autoIsle: (typeof ISLANDS)[number] | null = null, moored: Site | null = null, near: PlaceId | null = null;
  let waters = "";
  const found = new Set<PlaceId>(seen);
  const keys: Record<string, boolean> = {};
  let pointer: PointerEvent | null = null;
  // moored, the camera can be walked round the place: drag to circle it, scroll or pinch to come closer, arrows too
  const orb = { yaw: 0, pitch: 0, zoom: 1 }, orbWant = { yaw: 0, pitch: 0, zoom: 1 };
  const touches = new Map<number, { x: number; y: number }>();
  let pinch0 = 0, zoom0 = 1, looking = false;
  const solids = new Map<PlaceId, THREE.Box3[]>();
  const orbiting = () => !!moored && phase === "sailing";
  const pinchGap = () => {
    const [a, b] = [...touches.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const flash = new Array(7).fill(-9);
  let beat = 0;
  setSun(NIGHT, AZ0, true);

  const steering = () => phase === "sailing" && !moored;
  const onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase(), down = e.type === "keydown";
    if (down && !steering() && !orbiting()) return;
    if ((e.target as HTMLElement | null)?.closest?.("input,textarea,select,[contenteditable]")) return;
    if (down && inView && ["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
    if (down && k === "v" && !e.repeat) {
      view = VIEWS[(VIEWS.indexOf(view) + 1) % VIEWS.length];
      ev.onView?.(view);
      return;
    }
    keys[k] = down;
    if (down && ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) auto = null;
  };
  const clearKeys = () => Object.keys(keys).forEach((k) => (keys[k] = false));
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  window.addEventListener("blur", clearKeys);
  const pDown = (e: PointerEvent) => {
    // a tap on Pip asks him something, wherever she is
    if (phase !== "dark" && ev.onPip) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.intersectObject(crew.group, true).length) return void ev.onPip();
    }
    if (orbiting()) {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture(e.pointerId);
      if (touches.size === 2) (pinch0 = pinchGap()), (zoom0 = orbWant.zoom);
      return;
    }
    if (!steering()) return;
    pointer = e;
    auto = null;
    canvas.setPointerCapture(e.pointerId);
  };
  const pMove = (e: PointerEvent) => {
    const p = touches.get(e.pointerId);
    if (p) {
      if (touches.size === 1) {
        orbWant.yaw -= (e.clientX - p.x) * 0.006;
        orbWant.pitch = clamp(orbWant.pitch + (e.clientY - p.y) * 0.004, -0.25, 1.1);
      }
      p.x = e.clientX;
      p.y = e.clientY;
      if (touches.size === 2 && pinch0 > 0) orbWant.zoom = clamp((zoom0 * pinch0) / Math.max(1, pinchGap()), 0.28, 1.8);
      return;
    }
    if (pointer) pointer = e;
  };
  const pUp = (e: PointerEvent) => {
    touches.delete(e.pointerId);
    pointer = null;
  };
  const onWheel = (e: WheelEvent) => {
    if (!orbiting()) return;
    e.preventDefault();
    orbWant.zoom = clamp(orbWant.zoom * Math.exp(e.deltaY * 0.0012), 0.28, 1.8);
  };
  canvas.addEventListener("wheel", onWheel, { passive: false });
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
        const l = Math.hypot(vx, vz) || 1;
        vx /= l;
        vz /= l;
      } else autoIsle = null;
      // the pier (anything large in the water) lies across her course, whether she is heading straight for the mooring
      // or rounding an island (the bandstand's pier reaches out past the coast she follows): keep a beam's length off
      // it and work round it on the side her course already favours, instead of pressing into it
      for (const k of rocks) {
        if (k.r < 2.5) continue;
        const clear = k.r + 7;
        let cut = false;
        for (let s = 0; s <= Math.min(dist, 70) && !cut; s += 3) cut = near2(k, st.x + vx * s, st.z + vz * s).d < clear;
        if (!cut) continue;
        const n = near2(k, st.x, st.z), nx = (st.x - n.px) / (n.d || 1), nz = (st.z - n.pz) / (n.d || 1);
        const len = Math.hypot(k.bx - k.ax, k.bz - k.az);
        if (len > 1) {
          // a pier runs out from the land, so the only way round is past its seaward end: make for a point clear beyond it
          const sea = heightAt(k.ax, k.az) < heightAt(k.bx, k.bz), ex = sea ? k.ax : k.bx, ez = sea ? k.az : k.bz;
          const ux = (ex - (sea ? k.bx : k.ax)) / len, uz = (ez - (sea ? k.bz : k.az)) / len;
          let wx = ex + ux * (clear + 4), wz = ez + uz * (clear + 4);
          // past the pier's whole length, head and all, not only this stretch of it
          for (let i = 0; i < 20 && rocks.some((q) => q.r >= 2.5 && near2(q, wx, wz).d < q.r + 9); i++) (wx += ux * 3), (wz += uz * 3);
          vx = wx - st.x + nx * clamp(clear + 3 - n.d, 0, 6);
          vz = wz - st.z + nz * clamp(clear + 3 - n.d, 0, 6);
        } else {
          let tx = -nz, tz = nx;
          if (tx * vx + tz * vz < 0) (tx = -tx), (tz = -tz);
          const pull = clamp((clear + 3 - n.d) / 6, -0.6, 1);
          vx = tx + nx * pull;
          vz = tz + nz * pull;
        }
        const l = Math.hypot(vx, vz) || 1;
        vx /= l;
        vz /= l;
        break;
      }
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
    // and nothing in the water passes through her: test the hull from bow to stern against every rock
    for (let o = 13; o >= -13; o -= 2.6) {
      const px = st.x + fx * o, pz = st.z + fz * o, hb = beamAt(o);
      for (const k of rocks) {
        const n = near2(k, px, pz), gap = k.r + hb - n.d;
        if (gap > 0) {
          const nx = n.d > 1e-4 ? (px - n.px) / n.d : -fx, nz = n.d > 1e-4 ? (pz - n.pz) / n.d : -fz;
          st.x += nx * gap;
          st.z += nz * gap;
          hitLand = true;
        }
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
  let filmAt: { pos: [number, number, number]; look: [number, number, number]; track?: boolean } | null = null;
  // the follow view: an angle round her from dead astern (towards starboard is positive), eased, so a change of view
  // swings the camera round behind the stern rather than straight through the hull
  const VIEWS: BoatView[] = ["astern", "starboard", "port"];
  const VIEW_ANG: Record<BoatView, number> = { astern: Math.atan(0.3), starboard: 1.38, port: -1.38 };
  let view: BoatView = "astern", camAng = VIEW_ANG.astern, camNear = 0;
  function aim(t: number, dt: number) {
    const fx = Math.cos(st.yaw), fz = -Math.sin(st.yaw);
    const tall = camera.aspect < 0.8;
    pinisi.lampAt.getWorldPosition(lampW);
    lampW.y += 0.85;
    // the close view of the lamp, circling slowly
    const a = st.yaw + 0.9 + (reduce ? 0 : Math.sin(t * 0.13) * 0.5), dLamp = tall ? 2.5 : 1.75;
    const lampPos = new THREE.Vector3(lampW.x + Math.cos(a) * dLamp, lampW.y + 0.34, lampW.z - Math.sin(a) * dLamp);
    // the words sit low and left, so the lamp is framed high and to the right of them
    // (on a phone the lamp sits a little right of centre too, so Pip, asleep beside it, is in the picture)
    const side = tall ? 0.17 : 0.42;
    const lampLook = new THREE.Vector3(lampW.x + Math.sin(a) * side, lampW.y - (tall ? 0.5 : 0.2), lampW.z + Math.cos(a) * side);
    // astern: a little off her quarter, so the sails and the sheer both show. Broadside: her whole length side on,
    // hull, deckhouse and every sail, like a photograph of her from a passing boat.
    const ease1 = reduce ? 1 : Math.min(1, dt * 1.6);
    camAng += (VIEW_ANG[view] - camAng) * ease1;
    camNear += ((view === "astern" ? 0 : 1) - camNear) * ease1;
    // (a phone is narrow: side on, she needs standing well off to fit stem to bowsprit)
    const dist = tall ? 73 + camNear * 62 : 52 * (1 - camNear * 0.08), sx = -fz, sz = fx; // (sx, sz): her starboard side
    const ca = Math.cos(camAng), sa = Math.sin(camAng);
    const followPos = new THREE.Vector3(st.x - fx * ca * dist + sx * sa * dist, (tall ? 26 : 17) - camNear * (tall ? 12 : 8), st.z - fz * ca * dist + sz * sa * dist);
    const lead = 14 - camNear * 10; // side on, look at the middle of her length, bowsprit included
    const followLook = new THREE.Vector3(st.x + fx * lead, 7 + camNear * 2, st.z + fz * lead);
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
      // once the camera has drawn back behind her sails, Pip hops up onto the deckhouse roof, where it can see him
      if (p > 0.55 && crew.group.parent !== pinisi.pipStern) {
        pinisi.pipStern.add(crew.group);
        crew.group.scale.setScalar(0.9);
        cheerAt = t;
      }
    } else if (moored) {
      // moored: stand off the shore and look at the place
      const s = moored, d = s.island === "strait" ? new THREE.Vector2(0.3, 1).normalize() : out(s), [dist, h] = s.view, far = tall ? 1.45 : 1;
      const cx = s.x + d.x * (s.focus ?? 0), cz = s.z + d.y * (s.focus ?? 0), ground = Math.max(0, heightAt(cx, cz));
      // stand well off to one side of her: the boat lies on the line from the place straight out to sea, and seen from
      // astern her sails would hide what she has come to see. From the quarter she frames it instead.
      // ...and from there the visitor can walk the camera round it: arrows or A/D circle, W/S come closer
      const kTurn = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0), kZoom = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
      orbWant.yaw += kTurn * dt * 0.9;
      orbWant.zoom = clamp(orbWant.zoom * Math.exp(kZoom * dt * 0.9), 0.28, 1.8);
      const ko = reduce ? 1 : Math.min(1, dt * 6);
      orb.yaw += (orbWant.yaw - orb.yaw) * ko;
      orb.pitch += (orbWant.pitch - orb.pitch) * ko;
      orb.zoom += (orbWant.zoom - orb.zoom) * ko;
      const A = 0.72 + orb.yaw, ca = Math.cos(A), sa = Math.sin(A), ox = d.x * ca - d.y * sa, oz = d.y * ca + d.x * sa, r = dist * far * orb.zoom;
      wantPos.set(cx + ox * r, (h * far + orb.pitch * dist * far) * orb.zoom + ground * 0.6 + (1 - orb.zoom) * ground * 0.4, cz + oz * r);
      wantPos.y = Math.max(wantPos.y, heightAt(wantPos.x, wantPos.z) + 1.4 + 2.6 * Math.min(1, orb.zoom));
      // nor inside the place itself: if it stands within any part of the model, lift it clear over the top
      {
        let boxes = solids.get(moored.id);
        if (!boxes) {
          const o = placed.get(moored.id);
          o?.updateMatrixWorld(true);
          boxes = (o?.children ?? []).map((c) => new THREE.Box3().setFromObject(c).expandByScalar(0.45)).filter((b) => !b.isEmpty());
          solids.set(moored.id, boxes);
        }
        for (const b of boxes) if (b.containsPoint(wantPos)) wantPos.y = b.max.y + 0.5;
      }
      // walking round must not put the camera inside her: keep it outside an ellipse round her hull and rig
      {
        const bx = wantPos.x - st.x, bz = wantPos.z - st.z, along = bx * fx + bz * fz, across = bx * -fz + bz * fx, L = 19, B = 7;
        const e = Math.hypot(along / L, across / B);
        if (e < 1.08 && wantPos.y < 26) {
          const k2 = 1.08 / Math.max(e, 0.05);
          wantPos.x = st.x + (along * k2) * fx + (across * k2) * -fz;
          wantPos.z = st.z + (along * k2) * fz + (across * k2) * fx;
        }
      }
      // on a phone the panel rises over the lower half, so aim low and the place sits in the clear upper part
      wantLook.set(cx, ground + h * 0.42 * Math.min(1, 0.45 + orb.zoom * 0.55) - (tall && !looking ? dist * 0.42 * orb.zoom : 0), cz);
      k = Math.min(1, dt * 1.3);
    } else {
      wantPos.copy(followPos);
      wantLook.copy(followLook);
    }
    if (filmAt) {
      wantPos.set(...filmAt.pos);
      if (filmAt.track) wantLook.set(st.x + Math.cos(st.yaw) * 4, filmAt.look[1], st.z - Math.sin(st.yaw) * 4); // pan with her
      else wantLook.set(...filmAt.look);
      k = 1;
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
    const w = holder.clientWidth, h = holder.clientHeight, wantShift = moored && !looking && !tall && w > 720 ? Math.min(250, w * 0.17) : 0;
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
    gate.lamps.forEach((m, i) => dim(m, ...WARM, (0.12 + 0.88 * Math.max(dusk, seq(awake.gate, i, gate.lamps.length))) * flick(t, i)));
    // the pavilion: its lamps come up and the motifs rise and circle it
    dim(pav.lampM, ...WARM, 0.25 + 0.75 * Math.max(dusk, awake.pavilion));
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
    // Gong Perdamaian and Tugu Perdamaian: the lanterns and the tower's balcony lamps light at dusk, and when she moors
    const tugu = Math.max(dusk, awake.bale);
    bale.lamps.forEach((m, i) => dim(m, ...WARM, (0.12 + 0.88 * tugu) * flick(t, i)));
    bale.towerGlass.emissiveIntensity = tugu * 1.4;
    // the guest house: windows and lanterns come on, the door opens, and the loom on the veranda weaves
    const home = smooth(0.4, 1, awake.guesthouse);
    guest.glass.emissiveIntensity = Math.max(dusk * 0.8, awake.guesthouse) * 1.8;
    pinisi.cabinGlass.emissiveIntensity = smooth(0.35, 0.9, dusk) * 0.9; // her cabins light up as the day goes
    dim(guest.lanternM, ...WARM, 0.2 + 0.8 * Math.max(dusk, awake.guesthouse));
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
    const head = Math.max(dusk, smooth(0.6, 1, awake.pier));
    pier.lamps.forEach((m, i) => dim(m, ...WARM, (0.12 + 0.88 * Math.max(dusk, seq(awake.pier, i, pier.lamps.length))) * flick(t, i)));
    dim(pier.kioskM, ...WARM, 0.15 + 0.85 * head);
    pier.kioskGlass.emissiveIntensity = head * 2;
    pier.flag.rotation.y = Math.sin(t * (2.6 + awake.pier * 3)) * 0.3 * bob;
    // the supper table: the festoon comes on and twinkles, the candles catch, and Pip jumps for joy
    dim(supper.festoonM, 3.4, 2.3, 1.0, (0.1 + 0.9 * Math.max(dusk * 0.85, awake.table)) * (Math.max(dusk, awake.table) > 0.3 && !reduce ? 0.86 + 0.14 * Math.sin(t * 13) : 1));
    supper.candles.forEach((c, i) => c.scale.setScalar(0.3 + awake.table * (0.9 + 0.2 * Math.sin(t * 17 + i * 3) * still)));
    pip.group.position.y = pipY + Math.abs(Math.sin(t * 5)) * 0.45 * smooth(0.5, 1, awake.table) * still;
    // the beach huts: the doors swing open along the terrace, a light in each
    const open = smooth(0.3, 1, awake.huts);
    huts.huts.forEach((h, i) => {
      const k = seq(open, i, huts.huts.length);
      h.doors.forEach((d, n) => (d.rotation.y = (n ? 1 : -1) * 1.75 * k));
      const on = Math.max(dusk * 0.55, k);
      dim(h.inside, ...WARM, 0.15 + 0.85 * on);
      h.lit.forEach((m) => m.color.copy(m.userData.base).multiplyScalar(0.06 + 0.94 * on));
    });
    // the lighthouse: the lamp brightens and the beam strengthens; vane and cups show Brighton's wind as it is now
    if (awake.lighthouse > 0.2 && !weatherAsked) askWeather();
    const wind = weather ? clamp(weather.wind / 40, 0.08, 1.6) : 0.4;
    spinCups += dt * (1.5 + wind * 11) * still;
    spinBeam += dt * (0.5 + awake.lighthouse * 0.4) * still;
    lighthouse.cups.rotation.y = spinCups;
    lighthouse.beam.rotation.y = reduce ? 0.8 : spinBeam;
    lighthouse.beamM.opacity = 0.045 + 0.1 * Math.max(dusk, awake.lighthouse);
    dim(lighthouse.lampM, 5, 4.2, 2.4, 0.5 + 0.9 * Math.max(dusk, awake.lighthouse));
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
      if (phase === "sailing" && t - litAt > 9.3) {
        // the day goes by; asked to move on, it hurries to the next part and settles there
        if (ffTo >= 0) {
          const left = (ffTo - tod + DAY_S + NIGHT_S) % (DAY_S + NIGHT_S);
          const stepS = reduce ? left : Math.min(left, dt * Math.max(24, left * 1.6));
          tod = (tod + stepS) % (DAY_S + NIGHT_S);
          if (left - stepS < 0.01) ffTo = -1;
        } else if (!reduce && !todHold) tod = (tod + dt) % (DAY_S + NIGHT_S);
        const sp = sunAt(tod);
        if (Math.abs(sp.elev - elev) > 0.02 || ffTo >= 0) setSun((elev = sp.elev), sp.az);
        const part = partAt(tod);
        if (part !== dayPart) ev.onTime?.((dayPart = part));
      } else {
        const want = NIGHT + (DAY - NIGHT) * ease(clamp((t - litAt - 1.6) / (reduce ? 0.01 : 7.5), 0, 1));
        if (want !== elev) setSun((elev = want));
      }
    }
    if (phase === "sailing") sail(dt);
    else st.v *= 0.98;

    const bob = reduce ? 0 : 1;
    helm.position.set(st.x, Math.sin(t * 0.9) * 0.16 * bob - 0.1, st.z);
    helm.rotation.y = st.yaw;
    pinisi.boat.rotation.set(Math.sin(t * 0.7) * 0.022 * bob + st.roll, 0, Math.sin(t * 0.53 + 1) * 0.012 * bob + st.v * 0.0016);
    pinisi.sails.forEach((s, i) => (s.scale.z = 1 + Math.sin(t * 0.8 + i) * 0.1 * bob));
    pinisi.flag.rotation.y = Math.PI + Math.sin(t * 3) * 0.3 * bob;
    pinisi.foreFlag.rotation.y = Math.PI + Math.sin(t * 3 + 1.3) * 0.3 * bob;
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
    pip.group.rotation.y = Math.atan2(camera.position.x - pip.group.position.x, camera.position.z - pip.group.position.z); // Pip waves at whoever is looking
    pip.update(t, reduce, dusk);
    {
      const cheering = t - cheerAt < 2.6, night = dusk > 0.85 && !moored && !talking && !cheering;
      const mood: PipMood = phase === "dark" ? "sleep" : talking ? "wave" : cheering ? "cheer" : t - litAt < 4.5 ? "wave" : night ? "sleep" : moored ? "wave" : "look";
      // he turns to the visitor (the camera) to wave, cheer or answer; at sea he looks out over the bow, glancing back now and then
      crew.group.parent!.worldToLocal(toCam.copy(camera.position));
      const face = Math.atan2(toCam.x - crew.group.position.x, toCam.z - crew.group.position.z);
      const glance = reduce ? 0.6 : 0.45 + 0.5 * smooth(0.5, 1, Math.sin(t * 0.45));
      const want = mood === "look" ? Math.PI / 2 + Math.atan2(Math.sin(face - Math.PI / 2), Math.cos(face - Math.PI / 2)) * glance : mood === "sleep" ? Math.PI / 2 + 0.6 : face;
      const d = Math.atan2(Math.sin(want - crew.group.rotation.y), Math.cos(want - crew.group.rotation.y));
      crew.group.rotation.y += reduce ? d : d * (1 - Math.exp(-dt * 5));
      crew.group.position.y = cheering && !reduce ? Math.abs(Math.sin((t - cheerAt) * 7)) * 0.35 : 0;
      crew.update(t, reduce, dusk, mood);
    }
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
      // moored, the waters are the place's own: the pier's end lies far enough out to read as the strait otherwise
      const w = moored ? moored.island : Math.abs(st.x) < 44 && Math.abs(st.z) < 150 ? "strait" : Math.hypot(st.x, st.z) > 330 ? "open" : st.x < 0 ? "md" : "wf";
      if (w !== waters) ev.onWaters((waters = w));
      beat -= dt;
      if (beat <= 0) {
        beat = 0.44;
        if (!moored) audio.phrase(smooth(-60, 60, st.x));
      }
    }
    audio.ambience(Math.min(1, Math.abs(st.v) / 13), 1 - Math.min(1, Math.abs(st.x) / 60), lit);

    aim(t, dt);
    // the sun's shadow follows the view: a box sized to what the camera is looking at, so up close a texel is a
    // centimetre or two and a chair leg casts a real shadow, while out at sea it widens to take in the islands
    {
      const reach = clamp(camPos.distanceTo(camLook) * 1.5 + 22, moored ? 34 : 90, 330), sc = sun.shadow.camera;
      const texel = (2 * reach) / sun.shadow.mapSize.x;
      const fx = Math.round(camLook.x / texel) * texel, fz = Math.round(camLook.z / texel) * texel;
      sun.target.position.set(fx, 0, fz);
      sun.position.copy(sun.target.position).addScaledVector(sunDir, 600);
      if (Math.abs(sc.right - reach) > reach * 0.1) {
        Object.assign(sc, { left: -reach, right: reach, top: reach, bottom: -reach });
        sc.updateProjectionMatrix();
        sun.shadow.normalBias = 0.04 + (0.46 * reach) / 330;
      }
    }
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
      Object.assign(orbWant, { yaw: 0, pitch: 0, zoom: 1 });
      touches.clear();
      looking = false;
      if (!moored) return;
      auto = null;
      st.v = 0;
      audio.arrive(moored.island);
      cheerAt = performance.now() / 1000;
      if (id === "bale") [0, 1, 2, 3, 4, 5, 6, 4, 3, 0].forEach((n, i) => window.setTimeout(() => ((flash[n] = performance.now() / 1000), audio.kettle(n, 0.36)), 900 + i * 190));
      if (id === "table") window.setTimeout(audio.boop, 700);
    },
    setMuted: audio.setMuted,
    pipTalking: (on) => void (talking = on),
    setView: (v) => void (view = v),
    filmCam: (c) => void (filmAt = c),
    look: (on) => void (looking = on),
    skipTime() {
      if (phase !== "sailing") return;
      const next = PARTS.find((p) => p[0] > tod + 1) ?? PARTS[0];
      ffTo = next[0] + (next[1] === "Night" ? NIGHT_S * 0.3 : next[1] === "First light" ? 0 : 2);
    },
    chart: () => ({
      // each shoreline: walk in from the sea along 72 bearings until the ground comes up through the water
      isles: ISLANDS.map((I) => ({
        id: I.id,
        shore: Array.from({ length: 72 }, (_, i): [number, number] => {
          const a = (i / 72) * Math.PI * 2;
          let r = I.r * 1.6;
          while (r > 4 && heightAt(I.x + Math.cos(a) * r, I.z + Math.sin(a) * r) < 0) r -= 1.5;
          return [I.x + Math.cos(a) * r, I.z + Math.sin(a) * r];
        }),
      })),
      places: SITES.map((s) => ({ id: s.id, island: s.island, x: s.x, z: s.z })),
    }),
    boat: () => ({ x: st.x, z: st.z, yaw: st.yaw }),
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", clearKeys);
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("wheel", onWheel);
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
  if (import.meta.env.DEV) Object.assign(window, { __dp: { api, st, pip: () => { const v = crew.group.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, crew.group.scale.y * 1.1, 0)).project(camera), r = canvas.getBoundingClientRect(); return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, onScreen: Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1 }; }, skip: () => ((phase = "sailing"), (lit = 1), setSun((elev = DAY), AZ0, true)), tod: (f: number) => ((tod = f * DAY_S), (todHold = true)), r: { renderer, gtao, sun, bloom, THREE } } });
  return api;
}
