// The 3D product demo's own demo: Marea Dvīpa motifs lifted from the flat drawings into meshes (Higgsfield image-to-3D) and
// shown in a small Three.js studio. Drag to turn it (it keeps the spin you give it), move the pointer and the key light
// follows, change the finish, swap the piece. It renders only while its card is on screen. This file is its own chunk,
// so three.js loads when the card is first needed and never with the page.
import { useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Finish = "gold" | "teal" | "lacquer" | "pearl" | "painted";
type Piece = { label: string; url: string; /** turn that brings its face to the camera */ face: number; /** it carries its drawing as a texture */ painted: boolean; blurb: string };

const PIECES: Piece[] = [
  { label: "Barong", url: "/models/barong-sculpt.glb", face: Math.PI / 2, painted: false, blurb: "Sculpted from the Barong motif" },
  { label: "Perahu", url: "/models/perahu.glb", face: 0, painted: true, blurb: "The Perahu motif as a painted relief" },
];
const FINISHES: { id: Finish; label: string; swatch: string }[] = [
  { id: "gold", label: "Temple gold", swatch: "linear-gradient(135deg,#f3dfa6,#c39b65 55%,#7a5a22)" },
  { id: "teal", label: "Selat teal", swatch: "linear-gradient(135deg,#7fc4c8,#2a6f74 55%,#02213d)" },
  { id: "lacquer", label: "Bomba black", swatch: "linear-gradient(135deg,#6b6357,#0e0c09 55%)" },
  { id: "pearl", label: "Pearl", swatch: "linear-gradient(135deg,#ffffff,#f4eee3 55%,#cfc3a8)" },
  { id: "painted", label: "As drawn", swatch: "conic-gradient(#c39b65,#1f5c63,#02213d,#e0c27e,#c39b65)" },
];

function makeMaterial(finish: Finish, map: THREE.Texture | null): THREE.Material {
  if (finish === "painted" && map) return new THREE.MeshStandardMaterial({ map, roughness: 0.55, metalness: 0.15, side: THREE.DoubleSide });
  if (finish === "teal") return new THREE.MeshStandardMaterial({ color: 0x2f7f85, roughness: 0.34, metalness: 0.95, side: THREE.DoubleSide });
  if (finish === "lacquer") return new THREE.MeshPhysicalMaterial({ color: 0x0e0c09, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, side: THREE.DoubleSide });
  if (finish === "pearl") return new THREE.MeshPhysicalMaterial({ color: 0xf4eee3, roughness: 0.42, metalness: 0, sheen: 1, sheenColor: 0xe0c27e, sheenRoughness: 0.4, side: THREE.DoubleSide });
  return new THREE.MeshStandardMaterial({ color: 0xd9b266, roughness: 0.26, metalness: 1, side: THREE.DoubleSide });
}

type Loaded = { object: THREE.Group; map: THREE.Texture | null };
type Stage = { show: (p: Piece, f: Finish) => void; finish: (f: Finish) => void; nudge: (yaw: number, pitch: number) => void; dispose: () => void };

function createStage(canvas: HTMLCanvasElement, onState: (s: "ready" | "error") => void): Stage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  const camera = new THREE.PerspectiveCamera(30, 1.6, 0.1, 50);
  camera.position.set(0, 0, 6.4);
  const key = new THREE.DirectionalLight(0xfff0d0, 2.6);
  key.position.set(2, 3, 4);
  const rim = new THREE.DirectionalLight(0x6fd0d8, 1.6);
  rim.position.set(-3, 1.5, -3);
  scene.add(key, rim);
  const pivot = new THREE.Group();
  scene.add(pivot);

  const loader = new GLTFLoader();
  const cache = new Map<string, Promise<Loaded>>();
  const S = { yaw: -0.5, pitch: 0.08, vy: 0, drag: false, px: 0, py: 0, visible: false, born: 0, lx: 0.4, ly: 0.5, tlx: 0.4, tly: 0.5 };
  let current: Loaded | null = null;
  let wanted = "";
  let finish: Finish = "gold";
  let material: THREE.Material | null = null;
  let raf = 0;
  let last = 0;
  let disposed = false;

  const load = (p: Piece) => {
    let got = cache.get(p.url);
    if (!got) {
      got = loader.loadAsync(p.url).then((gltf) => {
        let map: THREE.Texture | null = null;
        gltf.scene.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          if (!mesh.geometry.getAttribute("normal")) mesh.geometry.computeVertexNormals();
          const m = mesh.material as THREE.MeshStandardMaterial;
          if (m.map) map = m.map;
        });
        // every piece is centred, faces the camera and stands the same height
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = box.getSize(new THREE.Vector3());
        const centre = box.getCenter(new THREE.Vector3());
        gltf.scene.position.sub(centre);
        const turned = new THREE.Group();
        turned.add(gltf.scene);
        turned.rotation.y = p.face;
        const object = new THREE.Group();
        object.add(turned);
        object.scale.setScalar(2.5 / Math.max(size.x, size.y, size.z));
        return { object, map };
      });
      cache.set(p.url, got);
    }
    return got;
  };

  const paint = () => {
    if (!current) return;
    material?.dispose();
    material = makeMaterial(finish, current.map);
    const m = material;
    current.object.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = m; });
  };

  const tick = (now: number) => {
    raf = 0;
    if (disposed) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const idle = reduceMotion ? 0 : 0.45; // it turns on its own, slowly, and eases back to that after a throw
    if (!S.drag) {
      S.yaw += S.vy * dt;
      S.vy += (idle - S.vy) * Math.min(1, dt * 1.6);
      S.pitch += (0.08 - S.pitch) * Math.min(1, dt * 0.8);
    }
    const age = (now - S.born) / 900;
    const arrive = reduceMotion || age >= 1 ? 1 : 1 - Math.pow(1 - Math.max(0, age), 3);
    pivot.rotation.set(S.pitch, S.yaw + (1 - arrive) * -2.2, 0);
    pivot.scale.setScalar(0.55 + 0.45 * arrive);
    pivot.position.y = reduceMotion ? 0 : Math.sin(now / 1400) * 0.06;
    // the key light leans to wherever the pointer is
    S.lx += (S.tlx - S.lx) * 0.08;
    S.ly += (S.tly - S.ly) * 0.08;
    key.position.set(S.lx * 7, S.ly * 6, 4);
    renderer.render(scene, camera);
    const moving = !reduceMotion || S.drag || Math.abs(S.vy) > 0.02 || age < 1 || Math.abs(S.tlx - S.lx) > 0.01 || Math.abs(S.tly - S.ly) > 0.01;
    if (S.visible && moving) raf = requestAnimationFrame(tick);
  };
  const kick = () => {
    if (raf || disposed || !S.visible) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };

  const fit = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!raf) renderer.render(scene, camera);
  };
  const ro = new ResizeObserver(fit);
  ro.observe(canvas);
  const io = new IntersectionObserver(([e]) => { S.visible = e.isIntersecting; kick(); });
  io.observe(canvas);

  const down = (e: PointerEvent) => { S.drag = true; S.px = e.clientX; S.py = e.clientY; S.vy = 0; canvas.setPointerCapture(e.pointerId); kick(); };
  const move = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    S.tlx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    S.tly = -((e.clientY - r.top) / r.height - 0.5) * 2 + 0.3;
    if (S.drag) {
      const dx = e.clientX - S.px, dy = e.clientY - S.py;
      S.px = e.clientX; S.py = e.clientY;
      S.yaw += dx * 0.011;
      S.pitch = Math.max(-0.7, Math.min(0.7, S.pitch + dy * 0.006));
      S.vy = Math.max(-9, Math.min(9, dx * 0.011 * 60)); // the throw
    }
    kick();
  };
  const up = () => { S.drag = false; kick(); };
  const leave = () => { S.tlx = 0.4; S.tly = 0.5; kick(); };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("pointerleave", leave);
  const lost = (e: Event) => { e.preventDefault(); onState("error"); };
  canvas.addEventListener("webglcontextlost", lost);

  return {
    show(p, f) {
      wanted = p.url;
      finish = f;
      load(p).then((got) => {
        if (disposed || wanted !== p.url) return;
        pivot.clear();
        pivot.add(got.object);
        current = got;
        paint();
        S.born = performance.now();
        onState("ready");
        if (!S.visible) renderer.render(scene, camera);
        kick();
      }).catch(() => { if (!disposed) onState("error"); });
    },
    finish(f) { finish = f; paint(); if (!raf) renderer.render(scene, camera); kick(); },
    nudge(yaw, pitch) { S.yaw += yaw; S.pitch = Math.max(-0.7, Math.min(0.7, S.pitch + pitch)); S.vy = 0; if (!raf) { pivot.rotation.set(S.pitch, S.yaw, 0); renderer.render(scene, camera); } kick(); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("webglcontextlost", lost);
      material?.dispose();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}

export default function ModelStage({ name, fallback }: { name: string; fallback: ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<Stage | null>(null);
  const [piece, setPiece] = useState(0);
  const [finish, setFinish] = useState<Finish>("gold");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const P = PIECES[piece];

  useEffect(() => {
    if (!canvas.current) return;
    try {
      stage.current = createStage(canvas.current, setState);
    } catch {
      setState("error"); // no WebGL here
      return;
    }
    stage.current.show(PIECES[0], "gold");
    return () => { stage.current?.dispose(); stage.current = null; };
  }, []);

  const pick = (i: number) => {
    const f = finish === "painted" && !PIECES[i].painted ? "gold" : finish;
    setPiece(i);
    setFinish(f);
    setState("loading");
    stage.current?.show(PIECES[i], f);
  };
  const coat = (f: Finish) => { setFinish(f); stage.current?.finish(f); };

  if (state === "error") return <>{fallback}</>;
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-[radial-gradient(circle_at_50%_38%,#3a3122,#17140f_55%,#0e0c09)]">
      {/* the floor's glow, under the piece */}
      <div className="absolute bottom-[9%] left-1/2 h-[9%] w-[46%] -translate-x-1/2 rounded-[50%] bg-[#e0c27e]/25 blur-2xl" aria-hidden="true" />
      <canvas
        ref={canvas}
        tabIndex={0}
        role="img"
        aria-label={`${name}: ${P.blurb}, in ${FINISHES.find((f) => f.id === finish)!.label}. Drag, or use the arrow keys, to turn it.`}
        className={"absolute inset-0 size-full cursor-grab touch-pan-y transition-opacity duration-500 active:cursor-grabbing " + (state === "ready" ? "opacity-100" : "opacity-0")}
        onKeyDown={(e) => {
          const step = { ArrowLeft: [-0.3, 0], ArrowRight: [0.3, 0], ArrowUp: [0, -0.15], ArrowDown: [0, 0.15] }[e.key];
          if (!step) return;
          e.preventDefault();
          stage.current?.nudge(step[0], step[1]);
        }}
      />
      {state === "loading" && <div className="absolute inset-0 grid place-items-center text-[13px] text-white/70" aria-live="polite">Loading {P.label}…</div>}

      <div role="tablist" aria-label="Piece" className="absolute top-2.5 left-2.5 flex gap-1 rounded-full bg-black/35 p-1 backdrop-blur-md">
        {PIECES.map((p, i) => (
          <button key={p.url} role="tab" type="button" aria-selected={i === piece} onClick={() => pick(i)}
            className={"min-h-8 rounded-full px-3 text-[12px] font-semibold transition " + (i === piece ? "bg-[#e0c27e] text-[#0e0c09]" : "text-white/75 hover:bg-white/10 hover:text-white")}>
            {p.label}
          </button>
        ))}
      </div>
      <span className="pointer-events-none absolute top-4 right-3.5 hidden font-mono text-[11px] tracking-[0.12em] text-white/55 uppercase sm:inline">Drag to turn</span>

      <div className="absolute inset-x-0 bottom-2.5 flex items-center justify-center gap-2">
        <div role="group" aria-label="Finish" className="flex gap-1.5 rounded-full bg-black/35 p-1.5 backdrop-blur-md">
          {FINISHES.filter((f) => f.id !== "painted" || P.painted).map((f) => (
            <button key={f.id} type="button" aria-pressed={f.id === finish} aria-label={f.label} title={f.label} onClick={() => coat(f.id)}
              className={"size-8 rounded-full border-2 transition hover:scale-110 " + (f.id === finish ? "border-white" : "border-white/20")} style={{ background: f.swatch }} />
          ))}
        </div>
      </div>
    </div>
  );
}
