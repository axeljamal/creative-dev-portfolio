import { motion, useAnimate } from "motion/react";
import { useRef, useState } from "react";
import { strike, unlock, type Strike } from "../welcome/sound";
import { GA, gseq } from "../welcome/timeline";
import medallion from "../assets/dua-pulau-medallion.png";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const TURN = (GA * 180) / Math.PI; // the golden angle, 137.5°

// The Dua Pulau medallion in the nav. Tap it: it turns a full circle and on by the golden angle, blooms, sends out
// a ring of gold, and rings a gong with a run of kakula kettles, a different run each time.
export function Medallion() {
  const [scope, animate] = useAnimate<HTMLButtonElement>();
  const [rings, setRings] = useState<number[]>([]);
  const taps = useRef(0);
  const angle = useRef(0);

  function ring() {
    unlock(); // a tap is a gesture, so the sound can start
    const n = taps.current++;
    strike([
      { k: "gong", n: (n % 2) as 0 | 1, v: 0.42 },
      ...[0, 2, 4, 6].map((d, i): Strike => ({ k: "kettle", n: gseq(n * 4 + d), v: 0.34 - i * 0.04, oct: i === 3, at: 0.08 + i * 0.09 })),
    ]);
    if (reduceMotion) return;
    angle.current += 360 + TURN;
    animate("img", { rotate: angle.current }, { type: "spring", stiffness: 60, damping: 14 });
    animate("img", { scale: [1, 1.45, 1] }, { duration: 0.7, ease: [0.22, 1, 0.36, 1] });
    setRings((r) => [...r.slice(-2), n]);
  }

  return (
    <button
      ref={scope}
      type="button"
      onClick={ring}
      aria-label="Ring the Dua Pulau medallion"
      title="Dua Pulau"
      className="relative z-2 grid size-10 shrink-0 cursor-pointer place-items-center rounded-full transition active:scale-95"
    >
      {rings.map((id) => (
        <motion.span
          key={id}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-accent"
          initial={{ scale: 0.6, opacity: 0.9 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          onAnimationComplete={() => setRings((r) => r.filter((x) => x !== id))}
        />
      ))}
      <img src={medallion} alt="" draggable={false} className="size-9" />
    </button>
  );
}
