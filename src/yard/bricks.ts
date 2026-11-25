// Pinisi Yard: everything is built from toy bricks. A Bricks is a grid of cells, each a 1x1 brick, round brick, plate
// or tile in one colour; build() turns it into a few instanced meshes: runs of the same colour along x merge into
// longer bricks (staggered layer by layer, as real bricks are laid), and every uncovered top gets its stud.
// Proportions follow the classic system: a brick is 1.2 pitches tall, a plate a third of that, a stud 0.6 pitch across.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type Kind = "brick" | "tile" | "plate" | "round";
type Cell = { x: number; y: number; z: number; color: string; kind: Kind };

/** glossy ABS-like plastic; colour comes per brick */
export function plastic(opts: THREE.MeshPhysicalMaterialParameters = {}) {
  return new THREE.MeshPhysicalMaterial({ roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25, ...opts });
}

const BOX = new RoundedBoxGeometry(1, 1, 1, 2, 0.045);
const ROUND = new THREE.CylinderGeometry(0.47, 0.47, 1, 20);
const STUD = new THREE.CylinderGeometry(0.3, 0.3, 1, 16);

export class Bricks {
  private cells = new Map<string, Cell>();
  /** pitch: a stud's spacing in world units; a brick is 1.2 pitches tall */
  constructor(readonly pitch = 0.5) {}
  get height() {
    return this.pitch * 1.2;
  }
  private key(x: number, y: number, z: number) {
    return `${x},${y},${z}`;
  }
  set(x: number, y: number, z: number, color: string, kind: Kind = "brick") {
    this.cells.set(this.key(x, y, z), { x, y, z, color, kind });
  }
  has(x: number, y: number, z: number) {
    return this.cells.has(this.key(x, y, z));
  }
  get size() {
    return this.cells.size;
  }
  /** the lowest x of any cell, for placing things at her stern */
  minX() {
    let m = Infinity;
    for (const c of this.cells.values()) m = Math.min(m, c.x);
    return m;
  }
  /** a solid box of cells, inclusive */
  box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: string, kind: Kind = "brick") {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.set(x, y, z, color, kind);
  }

  build(mat: THREE.Material = plastic()): THREE.Group {
    const p = this.pitch, h = this.height, gap = 0.018;
    const boxes: { pos: THREE.Vector3; scale: THREE.Vector3; color: string }[] = [];
    const rounds: { pos: THREE.Vector3; scale: THREE.Vector3; color: string }[] = [];
    const studs: { pos: THREE.Vector3; color: string }[] = [];
    const tall = (k: Kind) => (k === "plate" ? h / 3 : h);

    // rows along x of one colour and kind merge into bricks up to 4 long; odd layers start with a short one
    const rows = new Map<string, Cell[]>();
    for (const c of this.cells.values()) {
      if (c.kind === "round") {
        rounds.push({ pos: new THREE.Vector3(c.x * p, c.y * h + h / 2, c.z * p), scale: new THREE.Vector3(p, h - gap, p), color: c.color });
      } else {
        const k = `${c.y},${c.z}`;
        (rows.get(k) ?? rows.set(k, []).get(k)!).push(c);
      }
      if (c.kind !== "tile" && !this.has(c.x, c.y + 1, c.z)) {
        studs.push({ pos: new THREE.Vector3(c.x * p, c.y * h + tall(c.kind) + 0.09 * h, c.z * p), color: c.color });
      }
    }
    for (const row of rows.values()) {
      row.sort((a, b) => a.x - b.x);
      let i = 0;
      while (i < row.length) {
        const first = row[i];
        let n = 1;
        const limit = (first.y & 1) && i === 0 ? 2 : 4;
        while (i + n < row.length && n < limit) {
          const c = row[i + n];
          if (c.x !== first.x + n || c.color !== first.color || c.kind !== first.kind) break;
          n++;
        }
        const t = tall(first.kind);
        boxes.push({
          pos: new THREE.Vector3((first.x + (n - 1) / 2) * p, first.y * h + t / 2, first.z * p),
          scale: new THREE.Vector3(n * p - gap, t - gap, p - gap),
          color: first.color,
        });
        i += n;
      }
    }

    const group = new THREE.Group();
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
    const make = (geo: THREE.BufferGeometry, list: { pos: THREE.Vector3; scale?: THREE.Vector3; color: string }[], fixed?: THREE.Vector3) => {
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((b, i) => {
        mesh.setMatrixAt(i, m4.compose(b.pos, q, b.scale ?? fixed!));
        mesh.setColorAt(i, col.set(b.color));
      });
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      group.add(mesh);
    };
    make(BOX, boxes);
    make(ROUND, rounds);
    make(STUD, studs, new THREE.Vector3(p, 0.18 * h, p));
    return group;
  }
}

/** a baseplate's top: a field of studs in one colour, drawn once per colour and tiled across a plane */
const plates = new Map<string, THREE.CanvasTexture>();
export function baseplate(color: string) {
  const hit = plates.get(color);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = color;
  g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 2; y++)
    for (let x = 0; x < 2; x++) {
      const cx = 32 + x * 64, cy = 32 + y * 64;
      g.fillStyle = "rgba(0,0,0,.22)";
      g.beginPath();
      g.arc(cx + 3, cy + 4, 19, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = color;
      g.beginPath();
      g.arc(cx, cy, 19, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "rgba(255,255,255,.45)";
      g.lineWidth = 3;
      g.beginPath();
      g.arc(cx, cy, 15, Math.PI * 0.95, Math.PI * 1.6);
      g.stroke();
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  plates.set(color, t);
  return t;
}
