// Pip standing by in the corner of the world, as he stands by in Windfall's app: the live 3D Pip on a small canvas of
// his own, waving at whoever is looking, with a hop when tapped. Its own chunk, loaded after the world.
import * as THREE from "three";
import { buildPip, type PipMood } from "./models";

export type CornerPip = { hop(): void; setMood(m: PipMood): void; dispose(): void };

export function mountPip(canvas: HTMLCanvasElement, reduce: boolean): CornerPip {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8c8b0, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(2, 4, 5);
  scene.add(key);

  const pip = buildPip();
  scene.add(pip.group);
  // frame him: Pip faces +z at no turn, so the camera stands in front, a little above his middle
  const box = new THREE.Box3().setFromObject(pip.group), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
  const dist = (size.y * 1.55) / (2 * Math.tan(THREE.MathUtils.degToRad(14)));
  camera.position.set(mid.x, mid.y + size.y * 0.12, mid.z + dist);
  camera.lookAt(mid.x, mid.y + size.y * 0.1, mid.z); // room above for his ears and the wave
  const baseY = pip.group.position.y;

  let mood: PipMood = "wave", hopAt = -9, raf = 0, gone = false;
  const fit = () => {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(canvas);

  const loop = (now: number) => {
    if (gone) return;
    raf = requestAnimationFrame(loop);
    if (document.hidden || !canvas.offsetParent) return; // hidden: no frames
    const t = now / 1000, since = t - hopAt;
    pip.update(t, reduce, 0, mood);
    // a hop: up and down in a third of a second
    pip.group.position.y = baseY + (since < 0.36 ? Math.sin((since / 0.36) * Math.PI) * size.y * 0.22 : 0);
    pip.group.rotation.y = reduce ? 0 : Math.sin(t * 0.6) * 0.25;
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(loop);

  return {
    hop() {
      hopAt = performance.now() / 1000;
    },
    setMood(m) {
      mood = m;
    },
    dispose() {
      gone = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      pip.group.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      renderer.dispose();
    },
  };
}
