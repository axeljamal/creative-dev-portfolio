// Dua Pulau's two islands: the land and its shore, what stands on it, what lies in the water round it (the moorings'
// beacons, the strait's buoy, the pier and the groynes), and the life of all of it, frame by frame. It knows nothing
// of the boat, the camera's course, the page or sound; the portfolio world and the race game both build on it.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { PlaceId } from "../places";
import { buildBale, buildBuoy, buildGate, buildGroyne, buildGuestHouse, buildHuts, buildLighthouse, buildPalms, buildPavilion, buildPier, buildPip, buildPlanter, buildPlinth, buildRocks, buildSupper, buildTrees, glow, groundShade, type HutProject } from "./models";
import { NIGHT, type Stage, clamp, reduce, wrap } from "./stage";
import { ISLANDS, addClear, addPad, buildShore, buildTerrain, dockFor, heightAt, nearestIsland, scatter, smooth } from "./terrain";

/** temp in °C, wind in km/h, from: the compass bearing the wind blows from */
export type Weather = { temp: number; wind: number; from: number };
export type Site = { id: PlaceId; island: "md" | "wf" | "strait"; x: number; z: number; pad?: [number, number]; view: [number, number]; /** how far out to sea from the site the camera should look (the pier's head) */ focus?: number; dock?: { x: number; z: number } };
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
/** what stands in the water: a stroke on the sea (a to b) with a thickness */
export type Rock = { ax: number; az: number; bx: number; bz: number; r: number };
export type Isles = {
  sites: Site[];
  site(id: PlaceId): Site;
  rocks: Rock[];
  near2(k: Rock, x: number, z: number): { d: number; px: number; pz: number };
  /** every per-frame animation of the islands. moored and near: where she is tied up and what is within reach.
   *  It reports what the engine may want to answer with a sound or a fetch: loom, the guest house's shuttle has just
   *  crossed; lighthouse, how awake the lighthouse is. */
  update(t: number, dt: number, env: { bob: number; dusk: number; weather: Weather | null; found: Set<PlaceId>; camPos: THREE.Vector3; moored: PlaceId | null; near: PlaceId | null }): { loom: boolean; lighthouse: number };
  /** what the engine needs for mooring: the bale's kettles, each place's model (the camera keeps out of it), and the
   *  way out to sea from a site */
  parts: { bale: ReturnType<typeof buildBale>; placed: Map<PlaceId, THREE.Object3D>; out: (s: Site) => THREE.Vector2 };
};

/** markers: false leaves out the place beacons (the mooring floats and their beams) */
export function buildIsles(stage: Stage, opts: { huts: HutProject[]; markers?: boolean; /** the last beach hut stands to let (default); false: it carries a seventh board */ toLet?: boolean }): Isles {
  const { scene, camera } = stage;

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
  const huts = buildHuts(opts.huts, opts.toLet ?? true);
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
  if (opts.markers ?? true) SITES.forEach((s) => {
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
  type Env = Parameters<Isles["update"]>[2];
  let loom = false;
  function life(t: number, dt: number, { bob, dusk, weather, moored, near }: Env) {
    for (const s of SITES) {
      const want = moored === s.id ? 1 : near === s.id ? 0.4 : 0;
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
    dim(guest.lanternM, ...WARM, 0.2 + 0.8 * Math.max(dusk, awake.guesthouse));
    guest.door.rotation.y = -1.25 * home;
    const pick = Math.floor(t * 1.5), beat = (t * 1.5) % 1;
    guest.beater.rotation.x = home * (beat < 0.2 ? Math.sin((beat / 0.2) * Math.PI) * 0.24 : 0) * still;
    if (home > 0.5 && pick !== lastPick) {
      lastPick = pick;
      shuttleSide = -shuttleSide;
      loom = true; // the engine sounds it, when she is moored here
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

  return {
    sites: SITES,
    site,
    rocks,
    near2,
    update(t, dt, env) {
      const { bob, dusk, found, camPos } = env;
      loom = false;
      shore.material.uniforms.time.value = reduce ? 0 : t;
      shore.material.uniforms.light.value = smooth(NIGHT, 6, stage.elev());
      buoy.group.position.y = Math.sin(t * 1.1 + 2) * 0.14 * bob;
      markers.forEach((m, id) => {
        m.g.position.y = Math.sin(t * 1.3 + m.g.position.x) * 0.12 * bob;
        // the beam calls from far off and bows out as the boat comes near
        m.beam.visible = !found.has(id) && Math.hypot(camPos.x - m.g.position.x, camPos.z - m.g.position.z) > 70;
      });
      life(t, dt, env);
      pip.group.rotation.y = Math.atan2(camera.position.x - pip.group.position.x, camera.position.z - pip.group.position.z); // Pip waves at whoever is looking
      pip.update(t, reduce, dusk);
      gulls.forEach((g) => {
        const a = g.ph + t * g.sp;
        g.g.position.set(g.I.x + Math.cos(a) * g.r, g.h + Math.sin(t * 0.4 + g.ph) * 3, g.I.z + Math.sin(a) * g.r);
        g.g.rotation.y = -a - (g.sp > 0 ? Math.PI / 2 : -Math.PI / 2) + Math.PI / 2;
        g.wings.forEach((w, n) => (w.rotation.z = (n ? -1 : 1) * Math.sin(t * 5 + g.ph) * 0.45 * bob));
      });
      return { loom, lighthouse: awake.lighthouse };
    },
    parts: { bale, placed, out },
  };
}
