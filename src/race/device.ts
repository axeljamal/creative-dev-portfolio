// Which controls to show: the device the player last used, or failing that the one she has. A key press means the
// keyboard, a touch means touch, a gamepad connecting means the gamepad. Before any of those: the gamepad if one is
// connected, touch if the main pointer is coarse, else the keyboard.
export type Device = "touch" | "keys" | "pad";

let last: Device | null = null;
let watching = false;

/** start watching what she uses; called early, so the first card already knows */
export function watchDevice() {
  if (watching || typeof window === "undefined") return;
  watching = true;
  window.addEventListener("keydown", () => void (last = "keys"), { capture: true, passive: true });
  window.addEventListener("pointerdown", (e) => void (e.pointerType === "touch" && (last = "touch")), { capture: true, passive: true });
  window.addEventListener("gamepadconnected", () => void (last = "pad"));
}

const padNow = () => {
  try {
    return navigator.getGamepads ? [...navigator.getGamepads()].some(Boolean) : false;
  } catch {
    return false; // refused (a permissions policy): no pad
  }
};

/** the device to show controls for, now */
export function device(): Device {
  watchDevice();
  if (last) return last;
  if (padNow()) return "pad";
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches ? "touch" : "keys";
}
