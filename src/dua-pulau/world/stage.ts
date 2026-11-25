// The stage Dua Pulau's world stands on: a physically lit sea and sky, the sun that crosses it, and the render
// pipeline that draws it. It knows nothing of islands, places or the boat; the portfolio world and the race game both
// build on it. Quality "high" (the default) is the home page's look; "medium" and "low" are for slower machines.
import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { clamp } from "./num";
import { smooth } from "./terrain";

export type Quality = "high" | "medium" | "low";
export type Stage = {
  renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera;
  /** as today's setSun */ setSun(elev: number, az?: number, force?: boolean): void;
  sunAt(tod: number): { elev: number; az: number };
  /** 1 in the dark, 0 in full day */ dusk(): number;
  sunDir: THREE.Vector3; elev(): number;
  /** fit the sun's shadow box to the view, as the block at the end of frame() does */ shadowFor(camPos: THREE.Vector3, camLook: THREE.Vector3, tight: boolean): void;
  /** advance sea and sky uniforms */ tick(t: number): void;
  render(): void; inView(): boolean; dispose(): void;
  /** the sun itself, the occlusion pass and the bloom (null where the quality leaves them out): for the dev hook */
  sun: THREE.DirectionalLight; gtao: GTAOPass | null; bloom: UnrealBloomPass | null;
};

export const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const coarse = window.matchMedia("(pointer: coarse)").matches;
export { clamp, wrap } from "./num";

export const NIGHT = -5, DAY = 7.5;
// The day: the sun rises in the north-east, stands high in the south at noon and sets in the north-west, then a
// short night. tod counts seconds through it. AZ0: where the sun stands at first light, when the lamp is lit.
export const DAY_S = 330, NIGHT_S = 110, AZ0 = 120 - 240 * 0.0656;

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

export function createStage(canvas: HTMLCanvasElement, opts: { quality?: Quality } = {}): Stage {
  const quality = opts.quality ?? "high", isHigh = quality === "high", low = quality === "low";
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse, powerPreference: "high-performance" });
  renderer.setPixelRatio(low ? 1 : Math.min(window.devicePixelRatio, coarse || !isHigh ? 1.5 : 2));
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
  sun.shadow.mapSize.setScalar(low ? 1024 : coarse || !isHigh ? 2048 : 4096);
  Object.assign(sun.shadow.camera, { left: -330, right: 330, top: 330, bottom: -330, near: 10, far: 1400 }); // square: the sun goes all the way round
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.5;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xbcd3ee, 0x5a4a3a, 0.1);
  scene.add(hemi);

  const water = new Water(new THREE.PlaneGeometry(12000, 12000), {
    textureWidth: coarse || low ? 256 : 512,
    textureHeight: coarse || low ? 256 : 512,
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

  const sunAt = (tod: number) => {
    if (tod < DAY_S) {
      const f = tod / DAY_S;
      return { elev: -6 + 66 * Math.sin(Math.PI * f), az: 120 - 240 * f };
    }
    const n = (tod - DAY_S) / NIGHT_S;
    return { elev: -6 - 8 * Math.sin(Math.PI * n), az: -120 - 120 * n };
  };
  const moon = new THREE.DirectionalLight(0x8fa8dc, 0);
  moon.position.set(-200, 420, 160);
  scene.add(moon);
  const cA = new THREE.Color(), cB = new THREE.Color();
  let lastEnv = -99, lastAz = -999, dusk = 1; // dusk: 1 in the dark, 0 in full day: every lamp in the world is turned by it
  let sunElev = NIGHT; // the elevation last given to setSun
  function setSun(elev: number, az = AZ0, force = false) {
    sunElev = elev;
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

  // ---------- render pipeline ----------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // ambient occlusion: the darkening where things meet (a chair on the boards, a hut on the promenade, a rock in the sand)
  // that tells the eye they are touching. It costs a frame's worth of depth and normals, so phones go without.
  const gtao = coarse || !isHigh ? null : new GTAOPass(scene, camera, 800, 500);
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
  const bloom = low ? null : new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.6, 2.1);
  if (bloom) composer.addPass(bloom);
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

  return {
    renderer,
    scene,
    camera,
    setSun,
    sunAt,
    dusk: () => dusk,
    sunDir,
    elev: () => sunElev,
    // the sun's shadow follows the view: a box sized to what the camera is looking at, so up close a texel is a
    // centimetre or two and a chair leg casts a real shadow, while out at sea it widens to take in the islands
    shadowFor(camPos, camLook, tight) {
      const reach = clamp(camPos.distanceTo(camLook) * 1.5 + 22, tight ? 34 : 90, 330), sc = sun.shadow.camera;
      const texel = (2 * reach) / sun.shadow.mapSize.x;
      const fx = Math.round(camLook.x / texel) * texel, fz = Math.round(camLook.z / texel) * texel;
      sun.target.position.set(fx, 0, fz);
      sun.position.copy(sun.target.position).addScaledVector(sunDir, 600);
      if (Math.abs(sc.right - reach) > reach * 0.1) {
        Object.assign(sc, { left: -reach, right: reach, top: reach, bottom: -reach });
        sc.updateProjectionMatrix();
        sun.shadow.normalBias = 0.04 + (0.46 * reach) / 330;
      }
    },
    tick(t) {
      water.material.uniforms.time.value = t * 0.45;
    },
    render: () => composer.render(),
    inView: () => inView,
    sun,
    gtao,
    bloom,
    dispose() {
      ro.disconnect();
      io.disconnect();
      envRT?.dispose();
      pmrem.dispose();
      composer.passes.forEach((p) => p.dispose());
      composer.dispose();
      [sky, envSky, water, stars].forEach((o) => {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      });
      water.material.uniforms.normalSampler.value.dispose();
      (water.material.uniforms.mirrorSampler.value as THREE.Texture).renderTarget?.dispose(); // the sea's mirror
      cloudT.forEach((t) => t.dispose());
      clouds.forEach((c) => c.material.dispose());
      sun.shadow.map?.dispose();
      renderer.dispose();
    },
  };
}
