// Pinisi Yard: a brick-built boatyard on a sunny day, like a model village at a toy theme park. A boat stands on a
// cradle at the top of a slipway on a studded beach; Launch slides her stern first down the slip into a sea of
// translucent blue plates, where she floats, leans as her stability allows and sails a slow circle at her speed, or,
// if she is top-heavy, rolls over. The camera orbits her and follows her out.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildBoat, keelDepth as keelOf, hullLines, type Boat } from "./boat";
import { baseplate, Bricks, plastic } from "./bricks";
import { stats, type Design } from "./design";

export type Phase = "yard" | "launching" | "afloat" | "capsized";

export type Yard = {
  setDesign: (d: Design) => void;
  launch: () => void;
  reset: () => void;
  onPhase: (fn: (p: Phase) => void) => void;
  dispose: () => void;
};

// toy colours
const C = {
  red: "#c91a09", yellow: "#ffcf00", blue: "#0055bf", green: "#00852b", lime: "#a5ca18", white: "#f4f4f4",
  tan: "#e4cd9e", brown: "#7c4a24", grey: "#a0a5a9", dark: "#6c6e68", black: "#1b1b1b", orange: "#fe8a18",
};

// the beach is a baseplate whose edge is at BEACH_X; the slip runs from its head on the beach down into the sea, along -x
const BEACH_X = 6;
const BEACH_Y = 0.3;
const SLIP_TOP = new THREE.Vector3(20, 1.0, 0);
const SLIP_END = new THREE.Vector3(-14, -1.6, 0);
const SLOPE = Math.atan2(SLIP_TOP.y - SLIP_END.y, SLIP_TOP.x - SLIP_END.x);
const ON_SLIP = 0.15; // how far down the slip she stands while being built, 0 = top
const AFLOAT = new THREE.Vector3(-34, 0, 0);

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** a baseplate: a thin slab with a studded top, its studs one world unit apart */
function slab(w: number, d: number, color: string, opts: { y?: number; opacity?: number } = {}) {
  const tex = baseplate(color).clone();
  tex.needsUpdate = true;
  tex.repeat.set(w / 2, d / 2);
  const top = plastic({ color: "#ffffff", map: tex, transparent: (opts.opacity ?? 1) < 1, opacity: opts.opacity ?? 1 });
  const side = plastic({ color });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), [side, side, top, side, side, side]);
  m.position.y = (opts.y ?? 0) - 0.2;
  m.receiveShadow = true;
  return m;
}

/** a palm: a trunk of round bricks with a crown of green plates */
function palm(kit: Bricks, x: number, z: number, tall: number, lean: number) {
  for (let y = 0; y < tall; y++) kit.set(x + Math.round((y * lean) / tall), y, z, C.brown, "round");
  const tx = x + lean, ty = tall;
  kit.set(tx, ty, z, C.green);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
    for (let r = 1; r <= 3; r++) kit.set(tx + dx * r, ty, z + dz * r, r === 3 ? C.lime : C.green, "plate");
}

export function createYard(canvas: HTMLCanvasElement, opts: { reducedMotion?: boolean } = {}): Yard {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps toy colours bright and true
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const sky = document.createElement("canvas");
  sky.width = 4;
  sky.height = 256;
  const sg = sky.getContext("2d")!;
  const grad = sg.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#3d8fe0");
  grad.addColorStop(0.7, "#9fd0f5");
  grad.addColorStop(1, "#e6f4fd");
  sg.fillStyle = grad;
  sg.fillRect(0, 0, 4, 256);
  const skyTex = new THREE.CanvasTexture(sky);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;
  scene.fog = new THREE.Fog("#cfe8fa", 140, 520);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 1400);
  camera.position.set(30, 16, 36);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.minDistance = 14;
  controls.maxDistance = 95;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.autoRotate = !opts.reducedMotion;
  controls.autoRotateSpeed = 0.5;
  controls.addEventListener("start", () => (controls.autoRotate = false));

  scene.add(new THREE.HemisphereLight("#dff0ff", "#b59a6a", 1.5));
  const sun = new THREE.DirectionalLight("#fff4dc", 2.4);
  sun.position.set(-30, 55, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 180 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  // the sea: translucent blue studded plates over a deeper blue floor, rising and falling gently
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshBasicMaterial({ color: "#0a3f86" }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.5;
  scene.add(floor);
  const sea = slab(1000, 1000, "#1e8be0", { opacity: 0.82 });
  sea.receiveShadow = true;
  scene.add(sea);

  // the beach and, behind it, a lawn
  const beach = slab(120, 200, C.tan, { y: BEACH_Y });
  beach.position.x = BEACH_X + 60;
  const lawn = slab(200, 260, C.green, { y: BEACH_Y + 0.4 });
  lawn.position.x = BEACH_X + 60 + 60 + 100;
  scene.add(beach, lawn);

  const props: THREE.Object3D[] = [];
  const addKit = (kit: Bricks, at: THREE.Vector3, rotY = 0) => {
    const g = kit.build();
    g.position.copy(at);
    g.rotation.y = rotY;
    scene.add(g);
    props.push(g);
    return g;
  };

  // the slipway: two grey rails on brown sleepers, laid along the slope
  {
    const kit = new Bricks(0.5);
    const len = Math.round(SLIP_TOP.distanceTo(SLIP_END) / 0.5);
    for (let x = 0; x <= len; x++) {
      for (const z of [-4, 4]) kit.set(x, 0, z, C.dark);
      if (x % 4 === 0) for (let z = -6; z <= 6; z++) if (Math.abs(z) !== 4) kit.set(x, -1, z, C.brown, "plate");
    }
    const g = addKit(kit, SLIP_END.clone().add(new THREE.Vector3(0, -0.9, 0)));
    g.rotation.z = SLOPE;
  }

  // a work shed: white pillars, a red stepped roof, a yellow sign board
  {
    const kit = new Bricks(0.8);
    for (const [x, z] of [[0, 0], [12, 0], [0, 10], [12, 10]]) for (let y = 0; y < 7; y++) kit.set(x, y, z, y % 2 ? C.white : C.red);
    for (let s = 0; s < 4; s++) kit.box(-1 + s, 13 - s, 7 + s, 7 + s, -1 + s, 11 - s, s % 2 ? C.white : C.red);
    kit.box(3, 9, 4, 5, -1, -1, C.yellow, "tile");
    addKit(kit, new THREE.Vector3(30, BEACH_Y, -20));
  }
  // timber stack, crates, palms, a lifebuoy post and a lighthouse on the point
  {
    const kit = new Bricks(0.8);
    for (let y = 0; y < 3; y++) for (let z = 0; z < 3 - y; z++) kit.box(0, 9, y, y, z * 1 + y * 0.5 | 0, z * 1 + y * 0.5 | 0, C.brown, "round");
    kit.box(13, 14, 0, 1, 0, 1, C.orange);
    kit.box(13, 13, 2, 2, 0, 0, C.yellow);
    addKit(kit, new THREE.Vector3(26, BEACH_Y, 12));
  }
  {
    const kit = new Bricks(0.8);
    palm(kit, 0, 0, 12, 2);
    palm(kit, 16, -5, 10, -2);
    palm(kit, 30, 6, 13, 1);
    addKit(kit, new THREE.Vector3(14, BEACH_Y, 26));
    const kit2 = new Bricks(0.8);
    palm(kit2, 0, 0, 11, -2);
    palm(kit2, 10, 4, 9, 2);
    addKit(kit2, new THREE.Vector3(40, BEACH_Y, -38));
  }
  {
    // a lighthouse in red and white rings at the end of the beach
    const kit = new Bricks(0.8);
    for (let y = 0; y < 22; y++) {
      const r = y < 2 ? 3 : 2;
      for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) if (x * x + z * z <= r * r + 1) kit.set(x, y, z, Math.floor(y / 3) % 2 ? C.white : C.red);
    }
    kit.box(-1, 1, 22, 23, -1, 1, C.yellow, "tile");
    kit.box(-2, 2, 24, 24, -2, 2, C.red);
    addKit(kit, new THREE.Vector3(BEACH_X + 6, BEACH_Y, 70));
  }
  // bunting between two poles, in the four toy colours
  const flags = new THREE.Group();
  const flagCols = [C.red, C.yellow, C.blue, C.green];
  for (let i = 0; i < 16; i++) {
    const t = i / 15, x = 28 - t * 22, y = 10 - Math.sin(Math.PI * t) * 1.6;
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 3), plastic({ color: flagCols[i % 4] }));
    f.position.set(x, y - 0.6, -10);
    f.rotation.z = Math.PI;
    flags.add(f);
  }
  scene.add(flags);
  {
    const kit = new Bricks(0.5);
    for (let y = 0; y < 17; y++) {
      kit.set(0, y, 0, y % 2 ? C.white : C.blue, "round");
      kit.set(44, y, 0, y % 2 ? C.white : C.blue, "round");
    }
    addKit(kit, new THREE.Vector3(6, BEACH_Y, -10));
  }
  // two terraced islands on the horizon (Dua Pulau), and block clouds
  for (const [x, z, r] of [[-240, -110, 9], [-280, 90, 7]] as const) {
    const kit = new Bricks(4);
    for (let y = 0; y < r - 2; y++) {
      const rr = r - y;
      for (let i = -rr; i <= rr; i++) for (let k = -rr; k <= rr; k++) if (i * i + k * k <= rr * rr) kit.set(i, y, k, y === 0 ? C.tan : y % 2 ? C.green : "#4b9f4a");
    }
    addKit(kit, new THREE.Vector3(x, -1, z));
  }
  for (const [x, y, z] of [[-120, 60, -80], [-60, 70, 120], [80, 65, -140], [-200, 55, 40]] as const) {
    const kit = new Bricks(3);
    kit.box(0, 6, 0, 0, 0, 3, C.white);
    kit.box(1, 4, 1, 1, 0, 3, C.white);
    kit.box(2, 3, 2, 2, 1, 2, C.white);
    addKit(kit, new THREE.Vector3(x, y, z));
  }

  // a ring of foam where she meets the water
  const splash = new THREE.Mesh(new THREE.RingGeometry(1, 1.8, 6), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0 }));
  splash.rotation.x = -Math.PI / 2;
  splash.position.y = 0.08;
  scene.add(splash);

  // ---------- the boat ----------
  const holder = new THREE.Group(); // where she is
  const heel = new THREE.Group(); // how she leans
  holder.add(heel);
  scene.add(holder);
  let boat: Boat | null = null;
  let design: Design | null = null;
  let phase: Phase = "yard";
  let phaseStart = 0;
  let listener: (p: Phase) => void = () => {};
  const cradle = new THREE.Group();
  scene.add(cradle);
  let cradleKit: THREE.Group | null = null;

  const clock = new THREE.Clock();
  const setPhase = (p: Phase) => {
    phase = p;
    phaseStart = clock.elapsedTime;
    listener(p);
  };

  const keelDepth = () => (design ? keelOf(design) : 1.2);
  const onSlip = (f: number) => SLIP_TOP.clone().lerp(SLIP_END, f).add(new THREE.Vector3(0, keelDepth() + 1.0, 0));

  const rebuild = () => {
    if (!design) return;
    boat?.dispose();
    if (boat) heel.remove(boat.group);
    boat = buildBoat(design, rebuild);
    heel.add(boat.group);
    // a yellow cradle of bricks under her keel
    if (cradleKit) cradle.remove(cradleKit);
    const h = hullLines(design), kit = new Bricks(0.5);
    const k = Math.round(keelDepth() / 0.6) + 1;
    for (const f of [-0.28, 0, 0.28]) {
      const x = Math.round((f * h.L) / 0.5), w = Math.max(1, Math.round((h.half(f + 0.5) * 0.5) / 0.5));
      kit.box(x, x + 1, 0, 0, -w, w, C.yellow);
      for (let y = 1; y < k; y++) kit.box(x, x + 1, y, y, -1, 1, C.yellow);
    }
    cradleKit = kit.build();
    cradleKit.position.y = -keelDepth() - 1.0 - 0.1;
    cradle.add(cradleKit);
    if (phase === "yard") placeInYard();
  };

  const placeInYard = () => {
    holder.position.copy(onSlip(ON_SLIP));
    holder.rotation.set(0, 0, SLOPE);
    heel.rotation.set(0, 0, 0);
    cradle.position.copy(holder.position);
    cradle.rotation.copy(holder.rotation);
    cradle.visible = true;
  };

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 58 : 42;
    // keep her clear of the panel: left of the column on a wide screen, above the sheet on a narrow one
    const sheet = w <= 720 || w / h < 0.8;
    if (sheet) camera.setViewOffset(w, h, 0, h * 0.2, w, h);
    else camera.setViewOffset(w, h, Math.min(380, w * 0.4) / 2, 0, w, h);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  // a portrait screen starts further back, so her whole rig fits above the sheet
  if (canvas.clientWidth < canvas.clientHeight) camera.position.multiplyScalar(1.6);

  const target = new THREE.Vector3();
  let circle = 0;
  let raf = 0;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime, since = t - phaseStart;
    sea.position.y = -0.2 + 0.06 * Math.sin(t * 0.9); // the plates breathe a little

    const s = design ? stats(design) : null;
    if (phase === "launching") {
      const k = Math.min(since / 3.4, 1), e = k * k;
      const slipEnd = onSlip(1), start = onSlip(ON_SLIP);
      if (k < 0.72) {
        holder.position.lerpVectors(start, slipEnd, e / (0.72 * 0.72));
        holder.rotation.z = SLOPE;
      } else {
        const j = ease((k - 0.72) / 0.28);
        holder.position.lerpVectors(slipEnd, AFLOAT, j);
        holder.rotation.z = SLOPE * (1 - j);
        if (splash.material.opacity === 0 && j > 0.05) {
          splash.position.x = holder.position.x;
          splash.material.opacity = 0.9;
          splash.scale.setScalar(1);
        }
      }
      if (k >= 1) {
        circle = 0;
        setPhase(s?.capsizes ? "capsized" : "afloat");
      }
    } else if (phase === "afloat" && s) {
      const lean = (0.22 - s.stability * 0.018) * (1 + 0.15 * Math.sin(t * 0.6));
      circle += dt * (0.02 + s.speed * 0.008);
      const R = 26;
      holder.position.set(AFLOAT.x - R + R * Math.cos(circle), 0.08 * Math.sin(t * 1.3), R * Math.sin(circle));
      // bow (+x) along the circle's tangent, turning to it over her first two seconds afloat
      holder.rotation.set(0, (-circle - Math.PI / 2) * ease(Math.min(1, since / 2)), 0);
      heel.rotation.set(lean, 0, 0.03 * Math.sin(t * 1.1));
    } else if (phase === "capsized") {
      const k = Math.min(since / 2.6, 1);
      heel.rotation.x = ease(k) * 2.5;
      holder.position.y = -0.9 * ease(k) + 0.06 * Math.sin(t * 1.2);
    }
    if (boat) boat.flag.rotation.y = (phase === "yard" ? 0.25 : 0.35) * Math.sin(t * (phase === "yard" ? 2.2 : 3));
    if (splash.material.opacity > 0) {
      splash.scale.multiplyScalar(1 + dt * 1.6);
      splash.material.opacity = Math.max(0, splash.material.opacity - dt * 0.4);
    }

    target.copy(holder.position).add(new THREE.Vector3(0, 4, 0));
    const shift = target.clone().sub(controls.target).multiplyScalar(Math.min(1, dt * 2.5));
    controls.target.add(shift);
    camera.position.add(shift);
    controls.update();
    renderer.render(scene, camera);
  };
  frame();

  return {
    setDesign(d) {
      design = d;
      rebuild();
    },
    launch() {
      if (phase !== "yard") return;
      cradle.visible = false;
      splash.material.opacity = 0;
      setPhase("launching");
    },
    reset() {
      setPhase("yard");
      placeInYard();
    },
    onPhase(fn) {
      listener = fn;
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      boat?.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!(m as unknown as THREE.InstancedMesh).isInstancedMesh) m.geometry?.dispose();
        for (const mat of ([] as THREE.Material[]).concat((m.material as THREE.Material) ?? [])) mat.dispose();
      });
      skyTex.dispose();
      renderer.dispose();
    },
  };
}
