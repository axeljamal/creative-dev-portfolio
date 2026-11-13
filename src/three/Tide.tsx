// Marea, the tide: a sea of points behind the page, drawn in WebGL between the aurora and the floating motifs. It swells
// on its own, rises under the pointer, sends a ring out from every tap, and rolls toward you as the page scrolls. Gold on
// teal in the dark, deep gold on pearl in the light. It stops while the welcome film covers it or the tab is hidden, and
// with "reduce motion" it is one still frame. This file is its own chunk: three.js never loads with the page.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useTheme } from "../theme";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const RIPPLES = 4;

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform float uSize;
  uniform vec3 uPointer; // x, z on the water, and how strongly it lifts
  uniform vec4 uRipples[${RIPPLES}]; // x, z, born, height
  varying float vHeight;
  varying float vFade;
  void main() {
    vec3 p = position;
    float z = p.z + uScroll;
    float h = sin(p.x * 0.35 + uTime * 0.6) * 0.45 + sin(z * 0.5 + uTime * 0.45) * 0.5 + sin((p.x + z) * 0.22 - uTime * 0.3) * 0.6;
    float d = distance(p.xz, uPointer.xy);
    h += uPointer.z * exp(-d * d * 0.09) * 1.1;
    for (int i = 0; i < ${RIPPLES}; i++) {
      float age = uTime - uRipples[i].z;
      if (age > 0.0 && age < 7.0) {
        float w = distance(p.xz, uRipples[i].xy) - age * 7.0;
        h += uRipples[i].w * exp(-w * w * 0.5) * exp(-age * 0.6) * cos(w * 1.6);
      }
    }
    p.y = h;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(uSize * (1.0 + h * 0.4) / -mv.z, uSize * 0.11); // the nearest points stay points
    vHeight = h;
    vFade = smoothstep(52.0, 10.0, -mv.z);
  }
`;
const fragment = /* glsl */ `
  uniform vec3 uCrest;
  uniform vec3 uDeep;
  uniform float uAlpha;
  varying float vHeight;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float dot = smoothstep(0.5, 0.12, d);
    float crest = smoothstep(-1.0, 1.3, vHeight);
    gl_FragColor = vec4(mix(uDeep, uCrest, crest), dot * vFade * uAlpha * (0.22 + 0.78 * crest * crest));
  }
`;

export default function Tide() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const paint = useRef<((dark: boolean) => void) | null>(null);
  const [on, setOn] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: el, alpha: true, antialias: false, powerPreference: "low-power" });
    } catch {
      return; // no WebGL: the aurora and the motifs carry the page as before
    }
    const small = window.innerWidth < 700;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 90);

    const cols = small ? 70 : 170, rows = small ? 70 : 100;
    const W = small ? 34 : 76, near = 2, far = -54;
    const pos = new Float32Array(cols * rows * 3);
    for (let r = 0, i = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++, i += 3) {
        pos[i] = (c / (cols - 1) - 0.5) * W + (r % 2 ? W / cols / 2 : 0); // every other row sits half a step across
        pos[i + 2] = near + (r / (rows - 1)) * (far - near);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const uniforms = {
      uTime: { value: 0 }, uScroll: { value: 0 }, uSize: { value: 60 },
      uPointer: { value: new THREE.Vector3(0, -20, 0) },
      uRipples: { value: Array.from({ length: RIPPLES }, () => new THREE.Vector4(0, 0, -100, 0)) },
      uCrest: { value: new THREE.Color() }, uDeep: { value: new THREE.Color() }, uAlpha: { value: 1 },
    };
    const material = new THREE.ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: fragment, transparent: true, depthTest: false, depthWrite: false });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);

    const water = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ray = new THREE.Raycaster();
    const at = new THREE.Vector3();
    const onWater = (x: number, y: number) => {
      ray.setFromCamera(new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1), camera);
      return ray.ray.intersectPlane(water, at) && at.z > far - 4 ? at : null;
    };

    const S = { t: 0, last: 0, raf: 0, lift: 0, wantLift: 0, tx: 0, tz: -20, scroll: window.scrollY, ripple: 0, dead: false };
    const home = document.getElementById("home");
    // nothing to draw while the welcome film fills the screen or the tab is away
    const covered = () => document.hidden || (!!home && home.getBoundingClientRect().bottom >= window.innerHeight - 1);

    const frame = () => {
      const k = S.scroll / window.innerHeight;
      camera.position.set(0, 3.6 + Math.sin(k * 0.9) * 0.6, 6);
      camera.lookAt(0, 1.2, -16);
      uniforms.uTime.value = S.t;
      uniforms.uScroll.value = reduceMotion ? 0 : S.scroll * 0.012;
      renderer.render(scene, camera);
    };
    const tick = (now: number) => {
      S.raf = 0;
      if (S.dead || covered()) return;
      S.t += Math.min(0.05, (now - S.last) / 1000);
      S.last = now;
      S.scroll += (window.scrollY - S.scroll) * 0.12;
      S.lift += (S.wantLift - S.lift) * 0.06;
      const P = uniforms.uPointer.value;
      P.x += (S.tx - P.x) * 0.1;
      P.y += (S.tz - P.y) * 0.1;
      P.z = S.lift;
      frame();
      S.raf = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (S.raf || S.dead || covered()) return;
      if (reduceMotion) { S.scroll = window.scrollY; frame(); return; }
      S.last = performance.now();
      S.raf = requestAnimationFrame(tick);
    };

    const fit = () => {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      uniforms.uSize.value = h * renderer.getPixelRatio() * (small ? 0.12 : 0.105);
      if (!S.raf) frame();
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || reduceMotion) return;
      const p = onWater(e.clientX, e.clientY);
      S.wantLift = p ? 1 : 0;
      if (p) { S.tx = p.x; S.tz = p.z; }
    };
    const tap = (e: PointerEvent) => {
      if (reduceMotion) return;
      const p = onWater(e.clientX, e.clientY);
      if (!p) return;
      uniforms.uRipples.value[S.ripple++ % RIPPLES].set(p.x, p.z, S.t, 0.9);
    };
    const calm = () => { S.wantLift = 0; };

    paint.current = (dark) => {
      // the page's own gold and teal, whatever the theme has made them
      const css = getComputedStyle(document.documentElement);
      uniforms.uCrest.value.set(css.getPropertyValue("--accent-solid").trim() || "#e0c27e");
      uniforms.uDeep.value.set(css.getPropertyValue("--leaf").trim() || "#2a6f74");
      uniforms.uAlpha.value = dark ? 1 : 0.7;
      material.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
      material.needsUpdate = true;
      if (!S.raf) frame();
    };

    fit();
    paint.current(document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
    setOn(true);
    wake();
    window.addEventListener("resize", fit);
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", tap, { passive: true });
    document.addEventListener("pointerleave", calm);
    document.addEventListener("visibilitychange", wake);
    return () => {
      S.dead = true;
      cancelAnimationFrame(S.raf);
      paint.current = null;
      window.removeEventListener("resize", fit);
      window.removeEventListener("scroll", wake);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", tap);
      document.removeEventListener("pointerleave", calm);
      document.removeEventListener("visibilitychange", wake);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  // after the theme's tokens have changed
  useEffect(() => { paint.current?.(theme === "dark"); }, [theme]);

  return <canvas ref={canvas} className={"tide" + (on ? " tide-on" : "")} aria-hidden="true" />;
}
