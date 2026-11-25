// Dua Pulau's world: a physically lit sea and sky, two islands, and a pinisi to sail between them. It opens in the
// blue hour on an unlit oil lamp at her bow; lighting it brings up the sun. This file is its own chunk, so three.js
// arrives only with the world. The page tells it what to do (light, sailTo, moor) and hears back where the boat is.
import * as THREE from "three";
import type { PlaceId } from "../places";
import { earlierWork } from "../../content/work";
import * as audio from "./audio";
import { plasticize } from "./brick";
import { buildIsles, type Site, type Weather } from "./isles";
import { buildLamp, buildPip, type PipMood } from "./models";
import { pilot, type PilotMem } from "./pilot";
import { AZ0, DAY, DAY_S, NIGHT, NIGHT_S, clamp, createStage, reduce, wrap } from "./stage";
import { ISLANDS, heightAt, smooth } from "./terrain";
import { createVessel, stepHull } from "./vessel";

export type WorldEvents = {
  /** the boat is close enough to moor at this place, or has left it */
  onNear: (id: PlaceId | null) => void;
  /** the boat sailed itself here and has stopped */
  onArrive: (id: PlaceId) => void;
  onWaters: (w: "md" | "wf" | "strait" | "open") => void;
  onFound: (ids: PlaceId[]) => void;
  /** the weather in Brighton now, once the lighthouse has asked for it */
  onWeather?: (w: Weather) => void;
  /** the part of the day it has become */
  onTime?: (part: DayPart) => void;
  /** Pip, the crew on deck, was tapped: the page opens his questions */
  onPip?: () => void;
  /** the view changed from the keyboard (V) */
  onView?: (v: BoatView) => void;
};
/** where the camera follows her from: off the stern quarter, or broadside from either side */
export type BoatView = "astern" | "starboard" | "port";
export type DayPart = "First light" | "Morning" | "Midday" | "Afternoon" | "Golden hour" | "Dusk" | "Night";
/** what a chart of these waters needs: each island's shoreline and where each place lies (x east, z south) */
export type Chart = { isles: { id: "md" | "wf"; shore: [number, number][] }[]; places: { id: PlaceId; island: "md" | "wf" | "strait"; x: number; z: number }[] };
export type { Weather };
export type World = {
  /** light the lamp: must be called inside a tap, so sound may start */
  light: () => void;
  sailTo: (id: PlaceId) => void;
  /** moor at a place (the camera turns to it) or cast off with null */
  moor: (id: PlaceId | null) => void;
  setMuted: (m: boolean) => void;
  /** move the day on to its next part */
  skipTime: () => void;
  /** the questions panel is open: Pip on deck stays awake and turns to the visitor */
  pipTalking: (on: boolean) => void;
  /** follow her from astern, or from her starboard or port side */
  setView: (v: BoatView) => void;
  /** filming only: hold the camera at a fixed point looking at another while she sails past (null: follow again) */
  filmCam: (c: { pos: [number, number, number]; look: [number, number, number]; track?: boolean } | null) => void;
  /** moored: hide the panel's room and let the camera have the whole screen */
  look: (on: boolean) => void;
  chart: () => Chart;
  /** where she is now and which way she heads (yaw 0 = east, turning to the north) */
  boat: () => { x: number; z: number; yaw: number };
  dispose: () => void;
};

const ease = (t: number) => t * t * (3 - 2 * t);

/** seen: places found on an earlier visit (the log's ticks), so the counts and the chart pick up where they stopped */
export function createWorld(canvas: HTMLCanvasElement, ev: WorldEvents, seen: PlaceId[] = [], opts: { /** Dua Pulau in bricks (/bricks/) */ brick?: boolean } = {}): World {
  const stage = createStage(canvas, { brick: opts.brick });
  const { scene, camera } = stage;

  // The day: tod counts seconds through it (the sun's course is the stage's). The lamp is lit at first light, so
  // sailing begins a little after sunrise.
  const TOD0 = 0.0656 * DAY_S;
  const PARTS: [number, DayPart][] = [[0, "First light"], [0.05 * DAY_S, "Morning"], [0.36 * DAY_S, "Midday"], [0.64 * DAY_S, "Afternoon"], [0.84 * DAY_S, "Golden hour"], [0.955 * DAY_S, "Dusk"], [DAY_S + 4, "Night"]];
  const partAt = (tod: number) => PARTS.reduce((a, p) => (tod >= p[0] ? p[1] : a), PARTS[0][1]);

  // ---------- the islands, and what stands in the water round them ----------
  const isles = buildIsles(stage, {
    brick: opts.brick,
    huts: [{ name: "Bootcamp Connect", line: "A team app for bootcamp graduates: an AI CV and LinkedIn import, Google sign-in and a ranked feed." }, ...earlierWork.map((w) => ({ name: w.name, line: w.details }))],
  });
  const { site } = isles, SITES = isles.sites, { bale, placed, out } = isles.parts;

  // ---------- the pinisi (her model, helm and wake are the vessel's) and her lamp ----------
  const vessel = createVessel(scene), { pinisi } = vessel;
  const lamp = buildLamp();
  lamp.lamp.position.y = 0.6;
  lamp.lamp.rotation.y = -0.5;
  pinisi.lampAt.add(lamp.lamp);
  // Pip sails as crew: asleep by the lamp in the dark, waking with it, looking out at sea, cheering each place you
  // moor at, turning to you when you ask him something, and dozing off again at night while she sails on
  const crew = buildPip();
  crew.group.scale.setScalar(0.27); // by the lamp, seen close; on the stern roof he is drawn larger, to read from astern
  pinisi.pipBow.add(crew.group);
  let cheerAt = -99, talking = false;
  const toCam = new THREE.Vector3();

  const holder = canvas.parentElement!;

  // ---------- state ----------
  const st = Object.assign(vessel.st, { x: -8, z: 128, yaw: Math.PI / 2, v: 0, roll: 0 }); // the same object the vessel is placed from
  let phase: "dark" | "lighting" | "sailing" = "dark";
  let litAt = 0, lit = 0, tod = TOD0, ffTo = -1, dayPart: DayPart = "First light";
  let todHold = false; // dev only: hold the clock still, for comparing looks
  let auto: Site | null = null, moored: Site | null = null, near: PlaceId | null = null;
  let waters = "";
  const mem: PilotMem = { isle: null, side: 0 }; // the island her pilot is rounding, and on which side
  const found = new Set<PlaceId>(seen);
  const keys: Record<string, boolean> = {};
  let pointer: PointerEvent | null = null;
  // moored, the camera can be walked round the place: drag to circle it, scroll or pinch to come closer, arrows too
  const orb = { yaw: 0, pitch: 0, zoom: 1 }, orbWant = { yaw: 0, pitch: 0, zoom: 1 };
  const touches = new Map<number, { x: number; y: number }>();
  let pinch0 = 0, zoom0 = 1, looking = false;
  const solids = new Map<PlaceId, THREE.Box3[]>();
  const orbiting = () => !!moored && phase === "sailing";
  const pinchGap = () => {
    const [a, b] = [...touches.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const flash = new Array(7).fill(-9);
  let beat = 0;
  stage.setSun(NIGHT, AZ0, true);

  const steering = () => phase === "sailing" && !moored;
  const onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase(), down = e.type === "keydown";
    if (down && !steering() && !orbiting()) return;
    if ((e.target as HTMLElement | null)?.closest?.("input,textarea,select,[contenteditable]")) return;
    if (down && stage.inView() && ["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
    if (down && k === "v" && !e.repeat) {
      view = VIEWS[(VIEWS.indexOf(view) + 1) % VIEWS.length];
      ev.onView?.(view);
      return;
    }
    keys[k] = down;
    if (down && ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) auto = null;
  };
  const clearKeys = () => Object.keys(keys).forEach((k) => (keys[k] = false));
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  window.addEventListener("blur", clearKeys);
  const pDown = (e: PointerEvent) => {
    // a tap on Pip asks him something, wherever she is
    if (phase !== "dark" && ev.onPip) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.intersectObject(crew.group, true).length) return void ev.onPip();
    }
    if (orbiting()) {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture(e.pointerId);
      if (touches.size === 2) (pinch0 = pinchGap()), (zoom0 = orbWant.zoom);
      return;
    }
    if (!steering()) return;
    pointer = e;
    auto = null;
    canvas.setPointerCapture(e.pointerId);
  };
  const pMove = (e: PointerEvent) => {
    const p = touches.get(e.pointerId);
    if (p) {
      if (touches.size === 1) {
        orbWant.yaw -= (e.clientX - p.x) * 0.006;
        orbWant.pitch = clamp(orbWant.pitch + (e.clientY - p.y) * 0.004, -0.25, 1.1);
      }
      p.x = e.clientX;
      p.y = e.clientY;
      if (touches.size === 2 && pinch0 > 0) orbWant.zoom = clamp((zoom0 * pinch0) / Math.max(1, pinchGap()), 0.28, 1.8);
      return;
    }
    if (pointer) pointer = e;
  };
  const pUp = (e: PointerEvent) => {
    touches.delete(e.pointerId);
    pointer = null;
  };
  const onWheel = (e: WheelEvent) => {
    if (!orbiting()) return;
    e.preventDefault();
    orbWant.zoom = clamp(orbWant.zoom * Math.exp(e.deltaY * 0.0012), 0.28, 1.8);
  };
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("pointerdown", pDown);
  canvas.addEventListener("pointermove", pMove);
  canvas.addEventListener("pointerup", pUp);
  canvas.addEventListener("pointercancel", pUp);
  const onVis = () => audio.setAway(document.hidden);
  document.addEventListener("visibilitychange", onVis);

  const ray = new THREE.Raycaster(), seaPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(), ndc = new THREE.Vector2();
  function sail(dt: number) {
    let turn = 0, thrust = 0, swing = 0; // swing: under her own pilot she may turn smartly even with little way on
    if (auto) {
      // steer for the mooring (the pilot rounds whatever is in the way); close enough, she has arrived
      const d = auto.dock!;
      if (Math.hypot(d.x - st.x, d.z - st.z) < 13) {
        const here = auto;
        auto = null;
        st.v *= 0.5;
        ev.onArrive(here.id);
        return;
      }
      ({ turn, thrust, swing = 0 } = pilot(st, d, isles, mem));
    } else if (steering()) {
      if (keys.arrowleft || keys.a) turn += 1;
      if (keys.arrowright || keys.d) turn -= 1;
      if (keys.arrowup || keys.w) thrust = 1;
      if (keys.arrowdown || keys.s) thrust = -0.4;
      const pad = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
      if (pad) {
        if (Math.abs(pad.axes[0] ?? 0) > 0.15) turn -= pad.axes[0];
        if (pad.buttons[0]?.pressed || pad.buttons[7]?.pressed) thrust = 1;
        else if ((pad.axes[1] ?? 0) < -0.2) thrust = Math.max(thrust, -pad.axes[1]);
      }
      if (pointer) {
        const r = canvas.getBoundingClientRect();
        ndc.set(((pointer.clientX - r.left) / r.width) * 2 - 1, -((pointer.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        if (ray.ray.intersectPlane(seaPlane, hit)) {
          const d = wrap(Math.atan2(-(hit.z - st.z), hit.x - st.x) - st.yaw);
          turn = clamp(d * 2, -1, 1);
          thrust = Math.abs(d) < 1.3 ? 1 : 0.35;
        }
      }
    }
    // she strikes at speed: stepHull has already taken 18% off her way, so more than 5 m/s before it is 4.1 after
    if (stepHull(st, { turn, thrust, swing }, dt, isles) && Math.abs(st.v) > 5 * 0.82) audio.bump();
  }

  // ---------- camera ----------
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3(), lampW = new THREE.Vector3();
  let camSet = false, shift = 0;
  let filmAt: { pos: [number, number, number]; look: [number, number, number]; track?: boolean } | null = null;
  // the follow view: an angle round her from dead astern (towards starboard is positive), eased, so a change of view
  // swings the camera round behind the stern rather than straight through the hull
  const VIEWS: BoatView[] = ["astern", "starboard", "port"];
  const VIEW_ANG: Record<BoatView, number> = { astern: Math.atan(0.3), starboard: 1.38, port: -1.38 };
  let view: BoatView = "astern", camAng = VIEW_ANG.astern, camNear = 0;
  function aim(t: number, dt: number) {
    const fx = Math.cos(st.yaw), fz = -Math.sin(st.yaw);
    const tall = camera.aspect < 0.8;
    pinisi.lampAt.getWorldPosition(lampW);
    lampW.y += 0.85;
    // the close view of the lamp, circling slowly
    const a = st.yaw + 0.9 + (reduce ? 0 : Math.sin(t * 0.13) * 0.5), dLamp = tall ? 2.5 : 1.75;
    const lampPos = new THREE.Vector3(lampW.x + Math.cos(a) * dLamp, lampW.y + 0.34, lampW.z - Math.sin(a) * dLamp);
    // the words sit low and left, so the lamp is framed high and to the right of them
    // (on a phone the lamp sits a little right of centre too, so Pip, asleep beside it, is in the picture)
    const side = tall ? 0.17 : 0.42;
    const lampLook = new THREE.Vector3(lampW.x + Math.sin(a) * side, lampW.y - (tall ? 0.5 : 0.2), lampW.z + Math.cos(a) * side);
    // astern: a little off her quarter, so the sails and the sheer both show. Broadside: her whole length side on,
    // hull, deckhouse and every sail, like a photograph of her from a passing boat.
    const ease1 = reduce ? 1 : Math.min(1, dt * 1.6);
    camAng += (VIEW_ANG[view] - camAng) * ease1;
    camNear += ((view === "astern" ? 0 : 1) - camNear) * ease1;
    // (a phone is narrow: side on, she needs standing well off to fit stem to bowsprit)
    const dist = tall ? 73 + camNear * 62 : 52 * (1 - camNear * 0.08), sx = -fz, sz = fx; // (sx, sz): her starboard side
    const ca = Math.cos(camAng), sa = Math.sin(camAng);
    const followPos = new THREE.Vector3(st.x - fx * ca * dist + sx * sa * dist, (tall ? 26 : 17) - camNear * (tall ? 12 : 8), st.z - fz * ca * dist + sz * sa * dist);
    const lead = 14 - camNear * 10; // side on, look at the middle of her length, bowsprit included
    const followLook = new THREE.Vector3(st.x + fx * lead, 7 + camNear * 2, st.z + fz * lead);
    let fov = 42, k = Math.min(1, dt * 2.2);
    if (phase === "dark") {
      wantPos.copy(lampPos);
      wantLook.copy(lampLook);
      fov = 34;
      k = 1;
    } else if (phase === "lighting") {
      // hold on the flame, then draw back as the sun comes up
      const p = ease(clamp((t - litAt - 2.2) / (reduce ? 0.01 : 6), 0, 1));
      wantPos.lerpVectors(lampPos, followPos, p);
      wantPos.y += Math.sin(p * Math.PI) * 14;
      wantLook.lerpVectors(lampLook, followLook, p);
      fov = 34 + 8 * p;
      k = 1;
      if (p >= 1) phase = "sailing";
      // once the camera has drawn back behind her sails, Pip hops up onto the deckhouse roof, where it can see him
      if (p > 0.55 && crew.group.parent !== pinisi.pipStern) {
        pinisi.pipStern.add(crew.group);
        crew.group.scale.setScalar(0.9);
        cheerAt = t;
      }
    } else if (moored) {
      // moored: stand off the shore and look at the place
      const s = moored, d = s.island === "strait" ? new THREE.Vector2(0.3, 1).normalize() : out(s), [dist, h] = s.view, far = tall ? 1.45 : 1;
      const cx = s.x + d.x * (s.focus ?? 0), cz = s.z + d.y * (s.focus ?? 0), ground = Math.max(0, heightAt(cx, cz));
      // stand well off to one side of her: the boat lies on the line from the place straight out to sea, and seen from
      // astern her sails would hide what she has come to see. From the quarter she frames it instead.
      // ...and from there the visitor can walk the camera round it: arrows or A/D circle, W/S come closer
      const kTurn = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0), kZoom = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
      orbWant.yaw += kTurn * dt * 0.9;
      orbWant.zoom = clamp(orbWant.zoom * Math.exp(kZoom * dt * 0.9), 0.28, 1.8);
      const ko = reduce ? 1 : Math.min(1, dt * 6);
      orb.yaw += (orbWant.yaw - orb.yaw) * ko;
      orb.pitch += (orbWant.pitch - orb.pitch) * ko;
      orb.zoom += (orbWant.zoom - orb.zoom) * ko;
      const A = 0.72 + orb.yaw, ca = Math.cos(A), sa = Math.sin(A), ox = d.x * ca - d.y * sa, oz = d.y * ca + d.x * sa, r = dist * far * orb.zoom;
      wantPos.set(cx + ox * r, (h * far + orb.pitch * dist * far) * orb.zoom + ground * 0.6 + (1 - orb.zoom) * ground * 0.4, cz + oz * r);
      wantPos.y = Math.max(wantPos.y, heightAt(wantPos.x, wantPos.z) + 1.4 + 2.6 * Math.min(1, orb.zoom));
      // nor inside the place itself: if it stands within any part of the model, lift it clear over the top
      {
        let boxes = solids.get(moored.id);
        if (!boxes) {
          const o = placed.get(moored.id);
          o?.updateMatrixWorld(true);
          boxes = (o?.children ?? []).map((c) => new THREE.Box3().setFromObject(c).expandByScalar(0.45)).filter((b) => !b.isEmpty());
          solids.set(moored.id, boxes);
        }
        for (const b of boxes) if (b.containsPoint(wantPos)) wantPos.y = b.max.y + 0.5;
      }
      // walking round must not put the camera inside her: keep it outside an ellipse round her hull and rig
      {
        const bx = wantPos.x - st.x, bz = wantPos.z - st.z, along = bx * fx + bz * fz, across = bx * -fz + bz * fx, L = 19, B = 7;
        const e = Math.hypot(along / L, across / B);
        if (e < 1.08 && wantPos.y < 26) {
          const k2 = 1.08 / Math.max(e, 0.05);
          wantPos.x = st.x + (along * k2) * fx + (across * k2) * -fz;
          wantPos.z = st.z + (along * k2) * fz + (across * k2) * fx;
        }
      }
      // on a phone the panel rises over the lower half, so aim low and the place sits in the clear upper part
      wantLook.set(cx, ground + h * 0.42 * Math.min(1, 0.45 + orb.zoom * 0.55) - (tall && !looking ? dist * 0.42 * orb.zoom : 0), cz);
      k = Math.min(1, dt * 1.3);
    } else {
      wantPos.copy(followPos);
      wantLook.copy(followLook);
    }
    if (filmAt) {
      wantPos.set(...filmAt.pos);
      if (filmAt.track) wantLook.set(st.x + Math.cos(st.yaw) * 4, filmAt.look[1], st.z - Math.sin(st.yaw) * 4); // pan with her
      else wantLook.set(...filmAt.look);
      k = 1;
    }
    if (!camSet || reduce) k = 1;
    camSet = true;
    camPos.lerp(wantPos, k);
    camLook.lerp(wantLook, k);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov += (fov - camera.fov) * Math.min(1, dt * 3);
      camera.updateProjectionMatrix();
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    // a panel covers the right of a wide screen while moored: slide the picture left so the place stays in view
    const w = holder.clientWidth, h = holder.clientHeight, wantShift = moored && !looking && !tall && w > 720 ? Math.min(250, w * 0.17) : 0;
    shift += (wantShift - shift) * (reduce ? 1 : Math.min(1, dt * 2));
    if (shift > 0.5) camera.setViewOffset(w, h, shift, 0, w, h);
    else if (camera.view) camera.clearViewOffset();
  }

  // the lighthouse shows the weather over Brighton as it is now: the vane turns into the wind, the cups spin at its speed
  let weather: Weather | null = null, weatherAsked = false;
  function askWeather() {
    weatherAsked = true;
    fetch("https://api.open-meteo.com/v1/forecast?latitude=50.82&longitude=-0.14&current=temperature_2m,wind_speed_10m,wind_direction_10m")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { current?: { temperature_2m?: number; wind_speed_10m?: number; wind_direction_10m?: number } }) => {
        const c = j.current;
        if (!c || typeof c.wind_speed_10m !== "number" || typeof c.wind_direction_10m !== "number" || typeof c.temperature_2m !== "number") return;
        weather = { temp: c.temperature_2m, wind: c.wind_speed_10m, from: c.wind_direction_10m };
        ev.onWeather?.(weather);
      })
      .catch(() => {}); // no weather, no harm: the vane keeps its idle swing
  }

  // ---------- the loop ----------
  let raf = 0, last = performance.now(), disposed = false, toyAt = 0;
  function frame(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    if (!stage.inView() || document.hidden) return void (last = now);
    const dt = Math.min(0.05, (now - last) / 1000), t = now / 1000;
    // the brick world: finish every model in plastic, and again now and then for any that arrive later
    if (opts.brick && t > toyAt) {
      plasticize(scene);
      toyAt = t + 2;
    }
    last = now;

    if (phase !== "dark") {
      lit = Math.min(1, lit + dt / 0.9);
      if (phase === "sailing" && t - litAt > 9.3) {
        // the day goes by; asked to move on, it hurries to the next part and settles there
        if (ffTo >= 0) {
          const left = (ffTo - tod + DAY_S + NIGHT_S) % (DAY_S + NIGHT_S);
          const stepS = reduce ? left : Math.min(left, dt * Math.max(24, left * 1.6));
          tod = (tod + stepS) % (DAY_S + NIGHT_S);
          if (left - stepS < 0.01) ffTo = -1;
        } else if (!reduce && !todHold) tod = (tod + dt) % (DAY_S + NIGHT_S);
        const sp = stage.sunAt(tod);
        if (Math.abs(sp.elev - stage.elev()) > 0.02 || ffTo >= 0) stage.setSun(sp.elev, sp.az);
        const part = partAt(tod);
        if (part !== dayPart) ev.onTime?.((dayPart = part));
      } else {
        const want = NIGHT + (DAY - NIGHT) * ease(clamp((t - litAt - 1.6) / (reduce ? 0.01 : 7.5), 0, 1));
        if (want !== stage.elev()) stage.setSun(want);
      }
    }
    if (phase === "sailing") sail(dt);
    else st.v *= 0.98;

    const bob = reduce ? 0 : 1;
    vessel.place(t, dt);
    lamp.update(t, lit);

    stage.tick(t);
    const dusk = stage.dusk();
    // the islands' life: each place wakes a little as she comes near, and fully when she moors
    const life = isles.update(t, dt, { bob, dusk, weather, found, camPos, moored: moored?.id ?? null, near });
    if (life.loom && moored?.id === "guesthouse") audio.loom();
    if (life.lighthouse > 0.2 && !weatherAsked) askWeather();
    pinisi.cabinGlass.emissiveIntensity = smooth(0.35, 0.9, dusk) * 0.9; // her cabins light up as the day goes
    {
      const cheering = t - cheerAt < 2.6, night = dusk > 0.85 && !moored && !talking && !cheering;
      const mood: PipMood = phase === "dark" ? "sleep" : talking ? "wave" : cheering ? "cheer" : t - litAt < 4.5 ? "wave" : night ? "sleep" : moored ? "wave" : "look";
      // he turns to the visitor (the camera) to wave, cheer or answer; at sea he looks out over the bow, glancing back now and then
      crew.group.parent!.worldToLocal(toCam.copy(camera.position));
      const face = Math.atan2(toCam.x - crew.group.position.x, toCam.z - crew.group.position.z);
      const glance = reduce ? 0.6 : 0.45 + 0.5 * smooth(0.5, 1, Math.sin(t * 0.45));
      const want = mood === "look" ? Math.PI / 2 + Math.atan2(Math.sin(face - Math.PI / 2), Math.cos(face - Math.PI / 2)) * glance : mood === "sleep" ? Math.PI / 2 + 0.6 : face;
      const d = Math.atan2(Math.sin(want - crew.group.rotation.y), Math.cos(want - crew.group.rotation.y));
      crew.group.rotation.y += reduce ? d : d * (1 - Math.exp(-dt * 5));
      crew.group.position.y = cheering && !reduce ? Math.abs(Math.sin((t - cheerAt) * 7)) * 0.35 : 0;
      crew.update(t, reduce, dusk, mood);
    }
    bale.kettles.forEach((k, i) => {
      const a = Math.max(0, 1 - (t - flash[i]) / 0.7);
      (k.material as THREE.MeshStandardMaterial).emissive.setRGB(a * 1.6, a * 1.0, a * 0.3);
    });

    if (phase === "sailing") {
      // where is she, and what is within reach
      let best = 34, at: PlaceId | null = null;
      for (const s of SITES) {
        const d = Math.hypot(st.x - s.dock!.x, st.z - s.dock!.z);
        if (d < best) {
          best = d;
          at = s.id;
        }
      }
      if (at !== near) {
        near = at;
        ev.onNear(at);
        if (at && !found.has(at)) {
          found.add(at);
          ev.onFound([...found]);
        }
      }
      // moored, the waters are the place's own: the pier's end lies far enough out to read as the strait otherwise
      const w = moored ? moored.island : Math.abs(st.x) < 44 && Math.abs(st.z) < 150 ? "strait" : Math.hypot(st.x, st.z) > 330 ? "open" : st.x < 0 ? "md" : "wf";
      if (w !== waters) ev.onWaters((waters = w));
      beat -= dt;
      if (beat <= 0) {
        beat = 0.44;
        if (!moored) audio.phrase(smooth(-60, 60, st.x));
      }
    }
    audio.ambience(Math.min(1, Math.abs(st.v) / 13), 1 - Math.min(1, Math.abs(st.x) / 60), lit);

    aim(t, dt);
    stage.shadowFor(camPos, camLook, !!moored);
    stage.render();
  }
  raf = requestAnimationFrame(frame);

  const api: World = {
    light() {
      if (phase !== "dark") return;
      audio.startAudio();
      audio.lampLit();
      phase = "lighting";
      litAt = performance.now() / 1000;
    },
    sailTo(id) {
      if (phase !== "sailing") return;
      moored = null;
      auto = site(id);
      mem.isle = null;
    },
    moor(id) {
      moored = id ? site(id) : null;
      Object.assign(orbWant, { yaw: 0, pitch: 0, zoom: 1 });
      touches.clear();
      looking = false;
      if (!moored) return;
      auto = null;
      st.v = 0;
      audio.arrive(moored.island);
      cheerAt = performance.now() / 1000;
      if (id === "bale") [0, 1, 2, 3, 4, 5, 6, 4, 3, 0].forEach((n, i) => window.setTimeout(() => ((flash[n] = performance.now() / 1000), audio.kettle(n, 0.36)), 900 + i * 190));
      if (id === "table") window.setTimeout(audio.boop, 700);
    },
    setMuted: audio.setMuted,
    pipTalking: (on) => void (talking = on),
    setView: (v) => void (view = v),
    filmCam: (c) => void (filmAt = c),
    look: (on) => void (looking = on),
    skipTime() {
      if (phase !== "sailing") return;
      const next = PARTS.find((p) => p[0] > tod + 1) ?? PARTS[0];
      ffTo = next[0] + (next[1] === "Night" ? NIGHT_S * 0.3 : next[1] === "First light" ? 0 : 2);
    },
    chart: () => ({
      // each shoreline: walk in from the sea along 72 bearings until the ground comes up through the water
      isles: ISLANDS.map((I) => ({
        id: I.id,
        shore: Array.from({ length: 72 }, (_, i): [number, number] => {
          const a = (i / 72) * Math.PI * 2;
          let r = I.r * 1.6;
          while (r > 4 && heightAt(I.x + Math.cos(a) * r, I.z + Math.sin(a) * r) < 0) r -= 1.5;
          return [I.x + Math.cos(a) * r, I.z + Math.sin(a) * r];
        }),
      })),
      places: SITES.map((s) => ({ id: s.id, island: s.island, x: s.x, z: s.z })),
    }),
    boat: () => ({ x: st.x, z: st.z, yaw: st.yaw }),
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", clearKeys);
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", pDown);
      canvas.removeEventListener("pointermove", pMove);
      canvas.removeEventListener("pointerup", pUp);
      canvas.removeEventListener("pointercancel", pUp);
      audio.setAway(true);
      stage.dispose();
    },
  };
  if (import.meta.env.DEV) Object.assign(window, { __dp: { api, st, pip: () => { const v = crew.group.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, crew.group.scale.y * 1.1, 0)).project(camera), r = canvas.getBoundingClientRect(); return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, onScreen: Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1 }; }, skip: () => ((phase = "sailing"), (lit = 1), stage.setSun(DAY, AZ0, true)), tod: (f: number) => ((tod = f * DAY_S), (todHold = true)), r: { renderer: stage.renderer, gtao: stage.gtao, sun: stage.sun, bloom: stage.bloom, THREE } } });
  return api;
}
