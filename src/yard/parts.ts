// Pinisi Yard: real brick shapes from the LDraw parts library (CC BY 2.0, packed by scripts/pack_ldraw.py into
// public/ldraw). Each part is loaded once with three.js's LDrawLoader and merged into a single geometry in "pitch"
// units: 1 = one stud's spacing (20 LDU), y up, the part's top face at y = 0 and its studs above it. Bricks scales
// them by its pitch and instances them. Until they load (or if they cannot), Bricks draws its simple shapes instead.
import * as THREE from "three";
import { LDrawLoader } from "three/examples/jsm/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/examples/jsm/materials/LDrawConditionalLineMaterial.js";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const PART_IDS = [
  "brick-1x1", "brick-1x2", "brick-1x3", "brick-1x4",
  "plate-1x1", "plate-1x2", "plate-1x3", "plate-1x4",
  "tile-1x1", "tile-1x2", "tile-1x3", "tile-1x4",
  "round-1x1",
] as const;
export type PartId = (typeof PART_IDS)[number];

const parts = new Map<PartId, THREE.BufferGeometry>();
let loading: Promise<void> | null = null;

/** the merged shape of a part, or undefined while it is not loaded */
export const partGeometry = (id: PartId) => parts.get(id);
/** true once every part is in: Bricks uses real parts only then, never a mix */
export const partsReady = () => parts.size === PART_IDS.length;

async function loadOne(loader: LDrawLoader, id: PartId) {
  const group = await loader.loadAsync(`/ldraw/${id}.mpd`);
  group.updateMatrixWorld(true);
  const pieces: THREE.BufferGeometry[] = [];
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return; // edge and conditional lines are left out
    const g = m.geometry.clone().applyMatrix4(m.matrixWorld);
    for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
    pieces.push(g.index ? g.toNonIndexed() : g);
  });
  const merged = mergeGeometries(pieces, false);
  pieces.forEach((g) => g.dispose());
  if (!merged) throw new Error(`no geometry in ${id}`);
  // LDraw: 20 LDU to a stud, y down, origin at the top of the body. Here: 1 to a stud, y up. Flipping y mirrors the
  // shape, so x flips too, keeping the triangles' winding (and so their faces) the right way out.
  merged.applyMatrix4(new THREE.Matrix4().makeScale(-1 / 20, -1 / 20, 1 / 20));
  // weld only vertices that share position and normal, so hard edges stay hard; the loader's normals are kept
  const welded = mergeVertices(merged, 1e-4);
  welded.computeBoundingBox();
  welded.computeBoundingSphere();
  parts.set(id, welded);
  merged.dispose();
}

/** load every part once; resolves when all are in, rejects if any fails (Bricks then keeps its simple shapes) */
export function loadParts(): Promise<void> {
  loading ??= (async () => {
    const loader = new LDrawLoader();
    loader.smoothNormals = true;
    loader.setConditionalLineMaterial(LDrawConditionalLineMaterial); // required by the loader, though lines are dropped
    await Promise.all(PART_IDS.map((id) => loadOne(loader, id)));
  })();
  return loading;
}
