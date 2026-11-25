// The race game's world: the Dua Pulau stage and islands in fixed daylight, the boats, the course's buoys, the follow
// camera and the player's steering. It draws and gathers input; of the race it knows only what setCourse and setNext
// tell it. This file is its own chunk, so three.js arrives only with the world.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildIsles, type Isles } from "../dua-pulau/world/isles";
import { buildBuoy, type HutProject } from "../dua-pulau/world/models";
import { DAY_S, clamp, createStage, reduce, wrap, type Quality } from "../dua-pulau/world/stage";
import { heightAt } from "../dua-pulau/world/terrain";
import { createVessel, stepHull, type Built, type Vessel } from "../dua-pulau/world/vessel";
import { buildCruisingPinisi, buildOriginalPinisi } from "./boats";
import { bearingOf, wrap180 } from "./rules/geometry";
import type { Boat } from "./rules/race";
import type { Rival } from "./rules/rivals";
import type { Course, Helm, Vec } from "./rules/types";
import { gustsAt, windAt, type WindField } from "./rules/wind";
import { fetchWeather, type Weather } from "./weather";

export type RaceWorld = {
  /** buoys and line buoys; the next mark is highlighted by setNext */ setCourse(c: Course): void;
  setNext(i: number | "finish"): void;
  /** one vessel per id, made on the first call. The first one made is the player's: the camera follows her and
   *  pointer steering is reckoned from her. design: the pinisi she is (default today's); tint: her topsides' colour;
   *  rival: drawn more cheaply (no wake, no shadow, her fixed parts merged), as three more boats cost the frame rate. */
  vessel(id: string, opts?: { tint?: number; ghost?: boolean; design?: Rival["design"]; rival?: boolean }): Vessel<Built>;
  /** what in the water is solid (the pier, the strait's buoy, the groynes), for the rivals' pilot */
  obstacles: Pick<Isles, "rocks" | "near2">;
  /** what the player is steering with now, from keys, pad and pointer */ helm(): Helm;
  /** stepHull against the isles; true if she touched land or a rock */ move(b: Boat, dt: number, speed?: number): boolean;
  /** called each rendered frame, dt ≤ 0.05; not called while hidden */ frame(cb: (dt: number, t: number) => void): void;
  /** let go of a held pointer (and its capture): the steering stops being the pointer's */ releasePointer(): void;
  /** today's Brighton wind if it has arrived (asked for once, when the world was made), else null; never waits */
  weather(): Weather | null;
  /** the wind to draw at race time t: gust patches on the water and the sails braced to it. null (Easy): neither */
  setWind(f: WindField | null, t: number): void;
  /** the compass bearing the camera looks along, degrees: the way "up the screen" points on the water */
  viewBearing(): number;
  /** behind the title: the camera circles this point slowly (and stands still under reduced motion), easing across to
   *  a new one; null hands it back to the follow camera */
  orbit(at: Vec | null): void;
  setPaused(on: boolean): void;
  /** photo: the camera leaves the stern and can be walked round her (drag to circle, scroll or pinch to come closer) */
  setPhoto(on: boolean): void;
  /** the frame as it stands, as a PNG data URL (drawn afresh, so it is whole whatever the browser kept) */
  snap(): string;
  dispose(): void;
};

const GOLD = 0xe0c27e;

export function createRaceWorld(canvas: HTMLCanvasElement, opts: { quality: Quality; huts: HutProject[] }): RaceWorld {
  const stage = createStage(canvas, { quality: opts.quality });
  const { scene, camera } = stage;
  // a fixed mid-afternoon (0.72 of the day: the sun 45° up in the west-south-west). At late morning (0.42) it stood high
  // in the south-south-east, over the camera's shoulder on the opening legs, and lit the white hull and sails flat-on, so she
  // read as a glow with no form; from the afternoon side she is shaded and modelled, and buoys and water read well.
  const sun = stage.sunAt(0.72 * DAY_S);
  stage.setSun(sun.elev, sun.az, true);
  const isles = buildIsles(stage, { huts: opts.huts, markers: false, toLet: false });
  if (import.meta.env.DEV) Object.assign(window, { __raceStage: stage }); // dev only: for comparing the look with the home page

  // ---------- the fleet ----------
  const fleet = new Map<string, Vessel<Built>>();
  let player: Vessel<Built> | null = null;
  /** the rivals: a boat of theirs that sails between the camera and her is hidden while it is in the way */
  const others = new Set<Vessel<Built>>();
  const BLOCK_R = 16;
  function clearView() {
    if (!player) return;
    const px = player.st.x, pz = player.st.z, dx = px - camPos.x, dz = pz - camPos.z, len = Math.hypot(dx, dz) || 1;
    others.forEach((v) => {
      // how far along the line from the camera to her this boat lies, and how far off it
      const along = ((v.st.x - camPos.x) * dx + (v.st.z - camPos.z) * dz) / (len * len);
      const off = Math.abs((v.st.x - camPos.x) * dz - (v.st.z - camPos.z) * dx) / len;
      // in photo she may want the fleet in the picture: nothing is hidden there
      v.setVisible(!!photo || !(along > -0.1 && along < 0.72 && off < BLOCK_R));
    });
  }

  // ---------- the course ----------
  // everything the course puts in the water lives in one group, so a new course clears the last one in one go
  let course = new THREE.Group();
  scene.add(course);
  let marks: { g: THREE.Group; at: Vec; out: Vec }[] = [];
  let finishEnds: THREE.Group[] = [];
  let finishStrip: THREE.Mesh | null = null;
  const stripM = new THREE.MeshBasicMaterial({ color: 0xf4eee3, transparent: true, opacity: 0.4, depthWrite: false });
  const stripGold = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.75, depthWrite: false });

  // the next mark's flag: a tall pole with a gold pennant, seen from far off over the sails; and a ring on the water
  // on the side she must pass
  const pennant = () => {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 12, 8), new THREE.MeshStandardMaterial({ color: 0xf4eee3, roughness: 0.5 }));
    pole.position.y = 6 + 6;
    g.add(pole);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(5.2, -1.1);
    shape.lineTo(0, -2.2);
    const flag = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: GOLD, emissive: 0x8a6420, emissiveIntensity: 0.6, roughness: 0.6, side: THREE.DoubleSide }));
    const fly = new THREE.Group();
    fly.position.y = 17.8;
    fly.add(flag);
    g.add(fly);
    g.visible = false;
    scene.add(g);
    return { g, fly };
  };
  const flags = [pennant(), pennant()];
  const ring = new THREE.Mesh(new THREE.RingGeometry(4.4, 5.6, 56).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.8, depthWrite: false }));
  ring.renderOrder = 2;
  ring.visible = false;
  scene.add(ring);

  const buoyAt = (p: Vec, scale: number) => {
    const b = buildBuoy();
    b.group.position.set(p.x, 0, p.z);
    b.group.scale.setScalar(scale);
    course.add(b.group);
    return b.group;
  };
  const strip = (a: Vec, b: Vec, m: THREE.Material) => {
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.7).rotateX(-Math.PI / 2), m);
    s.position.set((a.x + b.x) / 2, 0.12, (a.z + b.z) / 2);
    s.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
    s.renderOrder = 2;
    course.add(s);
    return s;
  };
  // let go of what this file made, and only that. buildBuoy paints with some materials models.ts keeps for the whole
  // page (its brass and gold, also on the islands): a material that turns up on more than one buoy is one of those and
  // stays. Everything else in a buoy (its geometry, its own planks, medallion and lamp) is made fresh for each one.
  const meshesOf = (g: THREE.Object3D) => {
    const ms: THREE.Mesh[] = [];
    g.traverse((o) => o instanceof THREE.Mesh && ms.push(o));
    return ms;
  };
  const matsOf = (m: THREE.Mesh) => [m.material].flat() as THREE.Material[];
  const freeMat = (m: THREE.Material) => {
    for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
    m.dispose();
  };
  function freeCourse(g: THREE.Group) {
    const seenIn = new Map<THREE.Material, number>();
    for (const part of g.children) new Set(meshesOf(part).flatMap(matsOf)).forEach((m) => seenIn.set(m, (seenIn.get(m) ?? 0) + 1));
    for (const m of meshesOf(g)) m.geometry.dispose();
    seenIn.forEach((n, m) => n === 1 && m !== stripM && m !== stripGold && freeMat(m));
  }
  /** for what world.ts built from scratch (the pennants and the ring) */
  const freeOwn = (g: THREE.Object3D) =>
    meshesOf(g).forEach((m) => {
      m.geometry.dispose();
      matsOf(m).forEach(freeMat);
    });

  function setCourse(c: Course) {
    scene.remove(course);
    freeCourse(course);
    course = new THREE.Group();
    scene.add(course);
    marks = c.marks.map((m) => ({ g: buoyAt(m, 1), at: { x: m.x, z: m.z }, out: m.out }));
    // the start and finish: a smaller buoy at each end and a pale line on the water between them (once, if they share it)
    const same = (u: Vec, v: Vec) => Math.hypot(u.x - v.x, u.z - v.z) < 0.5;
    const startA = buoyAt(c.start.a, 0.7), startB = buoyAt(c.start.b, 0.7);
    const shared = same(c.start.a, c.finish.a) && same(c.start.b, c.finish.b);
    const startStrip = strip(c.start.a, c.start.b, stripM);
    finishEnds = shared ? [startA, startB] : [buoyAt(c.finish.a, 0.7), buoyAt(c.finish.b, 0.7)];
    finishStrip = shared ? startStrip : strip(c.finish.a, c.finish.b, stripM);
    setNext(0);
  }

  function setNext(i: number | "finish") {
    flags.forEach((f) => (f.g.visible = false));
    ring.visible = false;
    if (finishStrip) finishStrip.material = stripM;
    if (i === "finish") {
      finishEnds.forEach((e, n) => {
        flags[n].g.position.copy(e.position);
        flags[n].g.visible = true;
      });
      if (finishStrip) finishStrip.material = stripGold;
      return;
    }
    const m = marks[i];
    if (!m) return;
    flags[0].g.position.copy(m.g.position);
    flags[0].g.visible = true;
    ring.position.set(m.at.x + m.out.x * 12, 0.14, m.at.z + m.out.z * 12);
    ring.visible = true;
  }

  // ---------- the player's steering: keys, gamepad and a pointer held on the sea (as Dua Pulau's sail()) ----------
  const keys: Record<string, boolean> = {};
  let pointer: PointerEvent | null = null;
  const onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase(), down = e.type === "keydown";
    if ((e.target as HTMLElement | null)?.closest?.("input,textarea,select,button,a,[contenteditable]") && down) return;
    if (down && stage.inView() && ["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
    keys[k] = down;
  };
  const clearKeys = () => {
    Object.keys(keys).forEach((k) => (keys[k] = false));
    pointer = null;
  };
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  window.addEventListener("blur", clearKeys);
  const releasePointer = () => {
    if (pointer) {
      try {
        canvas.releasePointerCapture(pointer.pointerId);
      } catch {
        // already released
      }
    }
    pointer = null;
  };
  // photo: while it is on, a pointer on the sea turns the camera instead of the boat
  let photo: { yaw: number; pitch: number; zoom: number } | null = null;
  const drags = new Map<number, { x: number; y: number }>();
  let pinch0 = 0, zoom0 = 1;
  const pinchGap = () => {
    const [a, b] = [...drags.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const pDown = (e: PointerEvent) => {
    if (e.button > 0) return; // only the main button (or a finger) steers
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // a pointer the browser no longer knows (already lifted): steer by it all the same
    }
    if (photo) {
      drags.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (drags.size === 2) (pinch0 = pinchGap()), (zoom0 = photo.zoom);
      return;
    }
    pointer = e;
  };
  const pMove = (e: PointerEvent) => {
    const d = drags.get(e.pointerId);
    if (photo && d) {
      if (drags.size === 1) {
        photo.yaw += (e.clientX - d.x) * 0.006;
        photo.pitch = clamp(photo.pitch + (e.clientY - d.y) * 0.004, 0.05, 1.25);
      }
      d.x = e.clientX;
      d.y = e.clientY;
      if (drags.size === 2 && pinch0 > 0) photo.zoom = clamp((zoom0 * pinch0) / Math.max(1, pinchGap()), 0.45, 2.4);
      return;
    }
    if (pointer && e.pointerId === pointer.pointerId) pointer = e;
  };
  const pUp = (e: PointerEvent) => {
    drags.delete(e.pointerId);
    if (pointer && e.pointerId === pointer.pointerId) pointer = null;
  };
  const onWheel = (e: WheelEvent) => {
    if (!photo) return;
    e.preventDefault();
    photo.zoom = clamp(photo.zoom * Math.exp(e.deltaY * 0.0012), 0.45, 2.4);
  };
  const noMenu = (e: Event) => e.preventDefault();
  canvas.addEventListener("contextmenu", noMenu);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("pointerdown", pDown);
  canvas.addEventListener("pointermove", pMove);
  canvas.addEventListener("pointerup", pUp);
  canvas.addEventListener("pointercancel", pUp);

  const ray = new THREE.Raycaster(), seaPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(), ndc = new THREE.Vector2();
  function helm(): Helm {
    let turn = 0, thrust = 0;
    if (keys.arrowleft || keys.a) turn += 1;
    if (keys.arrowright || keys.d) turn -= 1;
    if (keys.arrowup || keys.w) thrust = 1;
    if (keys.arrowdown || keys.s) thrust = -0.4;
    let pad: Gamepad | null | undefined = null;
    try {
      pad = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
    } catch {
      // refused (a permissions policy): no pad
    }
    if (pad) {
      if (Math.abs(pad.axes[0] ?? 0) > 0.15) turn -= pad.axes[0];
      if (pad.buttons[0]?.pressed || pad.buttons[7]?.pressed) thrust = 1;
      else if ((pad.axes[1] ?? 0) < -0.2) thrust = Math.max(thrust, -pad.axes[1]);
    }
    if (pointer && player) {
      const st = player.st, r = canvas.getBoundingClientRect();
      ndc.set(((pointer.clientX - r.left) / r.width) * 2 - 1, -((pointer.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(seaPlane, hit)) {
        const d = wrap(Math.atan2(-(hit.z - st.z), hit.x - st.x) - st.yaw);
        turn = clamp(d * 2, -1, 1);
        thrust = Math.abs(d) < 1.3 ? 1 : 0.35;
      }
    }
    return { turn, thrust };
  }

  // ---------- the follow camera, eased as Dua Pulau's aim() ----------
  // Far enough astern and high enough that the whole boat sits low in the frame with the water ahead and the next
  // mark showing over or beside her sails. A phone held upright sees a narrow slice, so there it stands further off
  // and higher still. CAM: [astern, up, look ahead, look height]; tall screens scale the first two by up to TALL.
  const CAM = [100, 40, 50, 4] as const, TALL = 1.6, CLEAR = 30;
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();
  let camSet = false;
  function aim(dt: number) {
    if (!player) return;
    const st = player.st, fx = Math.cos(st.yaw), fz = -Math.sin(st.yaw);
    const tall = clamp((1.25 - camera.aspect) / 0.75, 0, 1), far = 1 + (TALL - 1) * tall; // 1 at 5:4 and wider, TALL by 1:2
    const back = CAM[0] * far;
    wantPos.set(st.x - fx * back, CAM[1] * far, st.z - fz * back);
    // close inshore, never inside an island: wherever there is land between her and the camera, rise until the line
    // from the camera down to her clears it and the trees on it (CLEAR) at that point
    for (const k of [1, 0.85, 0.7, 0.55, 0.4, 0.25]) {
      const h = heightAt(st.x - fx * back * k, st.z - fz * back * k);
      if (h > -1) wantPos.y = Math.max(wantPos.y, (h + CLEAR) / k);
    }
    wantLook.set(st.x + fx * CAM[2], CAM[3], st.z + fz * CAM[2]);
    let k = Math.min(1, dt * 2.2);
    if (!camSet || reduce) k = 1;
    camSet = true;
    camPos.lerp(wantPos, k);
    camLook.lerp(wantLook, k);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  }

  // ---------- the photo camera: walked round her by hand ----------
  // PHOTO_R from her at zoom 1, looking at her deck; it stays over the water and clear of the land
  const PHOTO_R = 62;
  function photoCam() {
    if (!photo || !player) return false;
    const st = player.st, r = PHOTO_R * photo.zoom, flat = Math.cos(photo.pitch) * r;
    camLook.set(st.x, 6, st.z);
    camPos.set(st.x + Math.cos(photo.yaw) * flat, Math.max(2.5, 6 + Math.sin(photo.pitch) * r), st.z + Math.sin(photo.yaw) * flat);
    camPos.y = Math.max(camPos.y, heightAt(camPos.x, camPos.z) + 4);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    return true;
  }

  // ---------- the title camera: a slow circle round the chosen course's start line ----------
  // One turn in ORBIT_S, ORBIT_R out and ORBIT_UP high, looking at the water just beyond the line. Under reduced motion
  // it holds one view and moves only when the course changes, at once.
  const ORBIT_S = 150, ORBIT_R = 135, ORBIT_UP = 46;
  let orbitAt: Vec | null = null, orbitAngle = 2.2;
  const orbitC = new THREE.Vector3(), orbitWant = new THREE.Vector3(), orbitLook = new THREE.Vector3();
  const SHIFT = 0.4;
  let orbitSet = false;
  function circle(dt: number) {
    if (!orbitAt) return false;
    orbitWant.set(orbitAt.x, 2, orbitAt.z);
    const k = !orbitSet || reduce ? 1 : Math.min(1, dt * 1.6);
    orbitSet = true;
    orbitC.lerp(orbitWant, k);
    if (!reduce) orbitAngle += (dt * Math.PI * 2) / ORBIT_S;
    const tall = clamp((1.25 - camera.aspect) / 0.75, 0, 1), far = 1 + (TALL - 1) * tall;
    const r = ORBIT_R * far;
    wantPos.set(orbitC.x + Math.cos(orbitAngle) * r, ORBIT_UP * far, orbitC.z + Math.sin(orbitAngle) * r);
    // over land, rise until the line down to the centre clears it (as the follow camera does)
    for (const s of [1, 0.8, 0.6, 0.4]) {
      const h = heightAt(orbitC.x + (wantPos.x - orbitC.x) * s, orbitC.z + (wantPos.z - orbitC.z) * s);
      if (h > -1) wantPos.y = Math.max(wantPos.y, (h + CLEAR) / s);
    }
    // the camera itself eases onto the circle (from the follow camera's place, or the last course's), except on the very
    // first frame and under reduced motion
    const e = !camSet || reduce ? 1 : Math.min(1, dt * 1.6);
    camSet = true;
    // on a wide screen the poster's menu covers the left: aim to the left of the centre, so the line and the fleet stand
    // in the clear water on the right (the shift is SHIFT of the half-width the screen shows at that distance)
    const half = Math.tan((camera.fov * Math.PI) / 360) * camera.aspect * Math.hypot(wantPos.x - orbitC.x, wantPos.z - orbitC.z);
    const shift = camera.aspect > 1.2 ? SHIFT * half : 0, lx = orbitC.z - wantPos.z, lz = -(orbitC.x - wantPos.x), ll = Math.hypot(lx, lz) || 1;
    orbitLook.set(orbitC.x + (lx / ll) * shift, orbitC.y, orbitC.z + (lz / ll) * shift);
    camPos.lerp(wantPos, e);
    camLook.lerp(orbitLook, e);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    return true;
  }

  // ---------- the wind: today's weather, gust patches on the water, and the sails braced to it ----------
  let weather: Weather | null = null;
  fetchWeather().then((w) => void (weather = w));
  let field: WindField | null = null, windT = 0;
  // each gust is a dark, soft-edged disc just above the sea: the wake's radial foam texture, tinted the deep sea's green.
  // It floats 0.4 up, not a few centimetres as the wake does: a hundred metres off, the depth buffer cannot tell 0.04
  // from the sea and the disc vanishes into it.
  const gustC = document.createElement("canvas");
  gustC.width = gustC.height = 64;
  const gg = gustC.getContext("2d")!, gr = gg.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,.9)");
  gr.addColorStop(0.5, "rgba(255,255,255,.35)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  gg.fillStyle = gr;
  gg.fillRect(0, 0, 64, 64);
  const gustT = new THREE.CanvasTexture(gustC), gustG = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const gustM = new THREE.MeshBasicMaterial({ map: gustT, color: 0x06262c, transparent: true, opacity: 0.7, depthWrite: false });
  const GUST_Y = 0.4;
  const gustDiscs = Array.from({ length: 12 }, () => { // as many as gustsAt can give (gustCount: 3 to 12)
    const m = new THREE.Mesh(gustG, gustM);
    m.position.y = GUST_Y;
    m.renderOrder = 1;
    m.visible = false;
    scene.add(m);
    return m;
  });
  // the square sails are braced 45° (models.ts) to fill with the wind on the port side; with it on the starboard side
  // the yards swing to the mirror angle, over 0.8 s, when the wind crosses her bow or stern
  const BRACE_S = 0.8;
  const brace = new Map<Vessel<Built>, { side: number; at: number }>();
  function trimSails(v: Vessel<Built>, dt: number) {
    // only today's rig has its square sails on yards of their own to swing; the older designs' gaff sails are set on
    // the hull itself, so they are left as built rather than turning the whole boat
    if (v.pinisi.sails.some((s) => s.parent === v.pinisi.boat)) return;
    let b = brace.get(v);
    if (!b) brace.set(v, (b = { side: -1, at: -1 }));
    if (field) {
      const rel = wrap180(windAt(field, v.st.x, v.st.z, windT).from - bearingOf(v.st.yaw)); // + : from the starboard side
      if (rel > 3 && rel < 177) b.side = 1;
      else if (rel < -3 && rel > -177) b.side = -1;
    } else b.side = -1;
    const step = reduce ? 2 : (2 * dt) / BRACE_S;
    b.at = b.side > b.at ? Math.min(b.side, b.at + step) : Math.max(b.side, b.at - step);
    const u = (b.at + 1) / 2, e = 2 * u * u * (3 - 2 * u) - 1; // eased in and out across the swing, −1…1
    v.pinisi.sails.forEach((s) => s.parent && (s.parent.rotation.y = Math.PI / 2 + (e * Math.PI) / 4));
  }
  function drawGusts() {
    const gs = field ? gustsAt(field, windT) : [];
    gustDiscs.forEach((m, i) => {
      const g = gs[i];
      m.visible = !!g;
      if (!g) return;
      m.position.set(g.x, GUST_Y, g.z);
      m.scale.setScalar(g.r * 2);
    });
  }

  // ---------- the rivals, drawn cheaply ----------
  // A pinisi is some three hundred meshes (every baluster is one), and three more of them, each drawn again for the
  // shadows, cost a phone a third of its frame rate. A rival casts no shadow, and every part of her that never moves
  // on its own (all but the sails, their yards and the pennants) is merged into one mesh per material: the same
  // shapes and paint in a handful of draws.
  function lighten(p: Built) {
    const boat = p.boat, moving = new Set<THREE.Object3D>([...p.sails, p.flag, p.foreFlag]);
    p.sails.forEach((s) => s.parent && s.parent !== boat && moving.add(s.parent)); // today's yards turn with their sail
    const still = (o: THREE.Object3D) => {
      for (let q: THREE.Object3D | null = o; q && q !== boat; q = q.parent) if (moving.has(q)) return false;
      return true;
    };
    boat.updateMatrixWorld(true);
    const toBoat = boat.matrixWorld.clone().invert(), m = new THREE.Matrix4();
    const sets = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[] }>(), gone: THREE.Mesh[] = [];
    boat.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.castShadow = false;
      if (Array.isArray(o.material) || !still(o)) return;
      const g = (o.geometry as THREE.BufferGeometry).clone();
      g.applyMatrix4(m.multiplyMatrices(toBoat, o.matrixWorld));
      // only geometries with the same attributes merge: key by material and attribute names
      const key = `${o.material.uuid}|${Object.keys(g.attributes).sort().join(",")}|${g.index ? 1 : 0}`;
      let set = sets.get(key);
      if (!set) sets.set(key, (set = { mat: o.material, geos: [] }));
      set.geos.push(g);
      gone.push(o);
    });
    const used = new Set<THREE.BufferGeometry>();
    gone.forEach((o) => o.removeFromParent());
    boat.traverse((o) => o instanceof THREE.Mesh && used.add(o.geometry));
    new Set(gone.map((o) => o.geometry)).forEach((g) => !used.has(g) && g.dispose());
    sets.forEach(({ mat, geos }) => {
      const merged = mergeGeometries(geos);
      geos.forEach((g) => g.dispose());
      if (!merged) return;
      const mesh = new THREE.Mesh(merged, mat);
      mesh.receiveShadow = true;
      boat.add(mesh);
    });
  }

  // ---------- the loop ----------
  let cb: ((dt: number, t: number) => void) | null = null, paused = false;
  let raf = 0, last = performance.now(), disposed = false;
  const env = { bob: reduce ? 0 : 1, dusk: 0, weather: null, found: new Set<never>(), camPos, moored: null, near: null };
  function loop(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(loop);
    if (!stage.inView() || document.hidden) return void (last = now);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)), t = now / 1000;
    last = now;
    if (!paused) cb?.(dt, t);
    fleet.forEach((v) => {
      v.place(t, dt);
      trimSails(v, dt);
    });
    drawGusts();
    flags.forEach((f, i) => (f.fly.rotation.y = reduce ? 0.3 : 0.3 + Math.sin(t * 2.6 + i) * 0.35));
    if (!reduce) (ring.material as THREE.MeshBasicMaterial).opacity = 0.62 + Math.sin(t * 2.4) * 0.18;
    stage.tick(t);
    env.dusk = stage.dusk();
    isles.update(t, dt, env);
    if (!photoCam() && !circle(dt)) {
      aim(dt);
      clearView();
    } else others.forEach((v) => v.setVisible(true));
    stage.shadowFor(camPos, camLook, false);
    stage.render();
  }
  raf = requestAnimationFrame(loop);

  return {
    setCourse,
    setNext,
    vessel(id, o = {}) {
      let v = fleet.get(id);
      if (!v) {
        const { design = "current", tint, ghost, rival = false } = o, wake = !rival;
        // today's design is tinted by the vessel, which finds its cream; the older ones paint their own topsides
        v =
          design === "original" ? createVessel<Built>(scene, { ghost, wake, build: () => buildOriginalPinisi(tint) })
          : design === "cruising" ? createVessel<Built>(scene, { ghost, wake, build: () => buildCruisingPinisi(tint) })
          : (createVessel(scene, { tint, ghost, wake }) as Vessel<Built>);
        if (rival) lighten(v.pinisi), others.add(v);
        fleet.set(id, v);
        player ??= v;
      }
      return v;
    },
    obstacles: isles,
    helm,
    releasePointer,
    weather: () => weather,
    setWind(f, t) {
      field = f;
      windT = t;
    },
    viewBearing: () => bearingOf(Math.atan2(-(camLook.z - camPos.z), camLook.x - camPos.x)),
    orbit(at) {
      // from the follow camera, the circle starts where she is seen from, so the hand-over does not jump
      if (at && !orbitAt) {
        orbitSet = false;
        orbitAngle = Math.atan2(camPos.z - at.z, camPos.x - at.x);
      }
      orbitAt = at && { x: at.x, z: at.z };
    },
    move: (b, dt, speed) => stepHull(b.pose, b.helm, dt, isles, speed === undefined ? {} : { speed }),
    frame: (f) => void (cb = f),
    setPaused: (on) => void (paused = on),
    setPhoto(on) {
      drags.clear();
      pointer = null;
      // begin where the follow camera stands, so nothing jumps
      photo = on && player ? { yaw: Math.atan2(camPos.z - player.st.z, camPos.x - player.st.x), pitch: 0.42, zoom: 1 } : null;
    },
    snap() {
      stage.render();
      return canvas.toDataURL("image/png");
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", clearKeys);
      canvas.removeEventListener("contextmenu", noMenu);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", pDown);
      canvas.removeEventListener("pointermove", pMove);
      canvas.removeEventListener("pointerup", pUp);
      canvas.removeEventListener("pointercancel", pUp);
      fleet.forEach((v) => v.dispose());
      fleet.clear();
      scene.remove(course);
      freeCourse(course);
      flags.forEach((f) => freeOwn(f.g));
      freeOwn(ring);
      gustDiscs.forEach((m) => scene.remove(m));
      gustG.dispose();
      gustM.dispose();
      gustT.dispose();
      brace.clear();
      stripM.dispose();
      stripGold.dispose();
      if (import.meta.env.DEV) delete (window as { __raceStage?: unknown }).__raceStage;
      // the islands are left as Dua Pulau's engine leaves them at teardown: the stage lets go of its sea, sky and renderer
      stage.dispose();
    },
  };
}
