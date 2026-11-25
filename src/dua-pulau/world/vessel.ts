// The pinisi as a thing in the scene: her model, the helm that turns her to her heading, and the wake she leaves.
// Her state (st) is what stepHull moves; place() sets the model from it every frame. The portfolio world sails one;
// the race game sails several, tinted, and a translucent ghost of a past run.
import * as THREE from "three";
import type { Hull } from "./hull";
import { buildPinisi } from "./models";
import { reduce } from "./stage";

export { beamAt, stepHull, type Hull, type Steer } from "./hull";

/** what a builder must give the vessel: the model (bow along +x, today's length and waterline), the sails that fill,
 *  and the pennants that stream (foreFlag may be a stand-in); anything more (lamp, crew, cabin glass) is the caller's */
export type Built = { boat: THREE.Group; sails: THREE.Mesh[]; flag: THREE.Object3D; foreFlag: THREE.Object3D; cabinGlass?: THREE.MeshStandardMaterial };

export type Vessel<P extends Built = ReturnType<typeof buildPinisi>> = {
  st: Hull; helm: THREE.Group; pinisi: P;
  /** place the model from st: bob, heel, sails, flags, wake */ place(t: number, dt: number): void;
  setVisible(on: boolean): void; dispose(): void;
};

/** the cream of her topsides, as buildPinisi paints it into the hull's vertex colours */
const CREAM = [0.93, 0.89, 0.8];

/** tint: a colour for her topsides in place of the cream (today's design only). ghost: every material translucent, no
 *  shadow, no wake. wake: false leaves the wake out (default true). build: another design (default buildPinisi). */
export function createVessel<P extends Built = ReturnType<typeof buildPinisi>>(scene: THREE.Scene, opts: { tint?: number; ghost?: boolean; wake?: boolean; build?: () => P } = {}): Vessel<P> {
  const st: Hull = { x: 0, z: 0, yaw: 0, v: 0, roll: 0 };
  const pinisi = (opts.build ?? (buildPinisi as unknown as () => P))();
  const helm = new THREE.Group(); // turns to the heading; the boat inside it heels and pitches
  helm.add(pinisi.boat);
  scene.add(helm);

  if (opts.tint !== undefined) {
    // the hull is the one mesh painted with vertex colours: repaint the cream of its topsides, and nothing else
    const c = new THREE.Color(opts.tint);
    pinisi.boat.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || !(o.material as THREE.Material).vertexColors) return;
      const col = (o.geometry as THREE.BufferGeometry).getAttribute("color") as THREE.BufferAttribute;
      for (let i = 0; i < col.count; i++)
        if (Math.abs(col.getX(i) - CREAM[0]) < 1e-3 && Math.abs(col.getY(i) - CREAM[1]) < 1e-3 && Math.abs(col.getZ(i) - CREAM[2]) < 1e-3) col.setXYZ(i, c.r, c.g, c.b);
      col.needsUpdate = true;
    });
  }
  // a ghost has materials of its own (many of the boat's are shared with the islands), each see-through
  const own = new Map<THREE.Material, THREE.Material>();
  if (opts.ghost) {
    const ghostly = (m: THREE.Material) => {
      let g = own.get(m);
      if (!g) {
        g = m.clone();
        g.transparent = true;
        g.depthWrite = false;
        g.opacity = m.opacity * 0.35;
        own.set(m, g);
      }
      return g;
    };
    pinisi.boat.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.material = Array.isArray(o.material) ? o.material.map(ghostly) : ghostly(o.material);
      o.castShadow = false;
    });
    if (pinisi.cabinGlass) pinisi.cabinGlass = ghostly(pinisi.cabinGlass) as typeof pinisi.cabinGlass;
  }

  // her wake: soft patches of foam laid on the water astern, spreading and fading
  let foamT: THREE.CanvasTexture | null = null, foamG: THREE.PlaneGeometry | null = null;
  const wake: { m: THREE.Mesh; born: number }[] = [];
  if ((opts.wake ?? true) && !opts.ghost) {
    const foamC = document.createElement("canvas");
    foamC.width = foamC.height = 64;
    const fg = foamC.getContext("2d")!, fr = fg.createRadialGradient(32, 32, 0, 32, 32, 32);
    fr.addColorStop(0, "rgba(255,255,255,.9)");
    fr.addColorStop(0.5, "rgba(255,255,255,.35)");
    fr.addColorStop(1, "rgba(255,255,255,0)");
    fg.fillStyle = fr;
    fg.fillRect(0, 0, 64, 64);
    (foamT = new THREE.CanvasTexture(foamC)), (foamG = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
    for (let i = 0; i < 48; i++) {
      const m = new THREE.Mesh(foamG, new THREE.MeshBasicMaterial({ map: foamT, transparent: true, opacity: 0, depthWrite: false }));
      m.position.y = 0.06;
      m.renderOrder = 2;
      scene.add(m);
      wake.push({ m, born: -99 });
    }
  }
  let wakeN = 0, wakeT = 0, shown = true;

  return {
    st,
    helm,
    pinisi,
    place(t, dt) {
      const bob = reduce ? 0 : 1;
      helm.position.set(st.x, Math.sin(t * 0.9) * 0.16 * bob - 0.1, st.z);
      helm.rotation.y = st.yaw;
      pinisi.boat.rotation.set(Math.sin(t * 0.7) * 0.022 * bob + st.roll, 0, Math.sin(t * 0.53 + 1) * 0.012 * bob + st.v * 0.0016);
      pinisi.sails.forEach((s, i) => (s.scale.z = 1 + Math.sin(t * 0.8 + i) * 0.1 * bob));
      pinisi.flag.rotation.y = Math.PI + Math.sin(t * 3) * 0.3 * bob;
      pinisi.foreFlag.rotation.y = Math.PI + Math.sin(t * 3 + 1.3) * 0.3 * bob;

      if (!wake.length) return;
      wakeT -= dt * Math.abs(st.v);
      if (wakeT <= 0 && Math.abs(st.v) > 1.5) {
        wakeT = 1.6;
        const w = wake[wakeN++ % wake.length], side = wakeN % 2 ? 1 : -1, fx = Math.cos(st.yaw), fz = -Math.sin(st.yaw);
        w.born = t;
        w.m.position.set(st.x - fx * 12 - fz * side * 1.4, 0.06, st.z - fz * 12 + fx * side * 1.4);
      }
      wake.forEach((w) => {
        const age = (t - w.born) / 5;
        w.m.visible = shown && age < 1;
        if (!w.m.visible) return;
        w.m.scale.setScalar(3 + age * 11);
        (w.m.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - age) * Math.min(1, age * 8);
      });
    },
    setVisible(on) {
      shown = helm.visible = on;
      if (!on) wake.forEach((w) => (w.m.visible = false));
    },
    dispose() {
      scene.remove(helm);
      // her geometry is her own; her materials may be shared with the islands, so only a ghost's are let go
      pinisi.boat.traverse((o) => o instanceof THREE.Mesh && o.geometry.dispose());
      own.forEach((m) => m.dispose());
      wake.forEach((w) => {
        scene.remove(w.m);
        (w.m.material as THREE.Material).dispose();
      });
      foamG?.dispose();
      foamT?.dispose();
    },
  };
}
