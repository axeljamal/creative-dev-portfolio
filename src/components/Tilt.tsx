import { useRef, type ReactNode, type PointerEvent as RPointerEvent } from "react";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Props = {
  children: ReactNode;
  className?: string;
  /** how far it leans toward the pointer, in degrees; 0 keeps it flat and only moves the light */
  lean?: number;
};

/**
 * A surface that answers the pointer: it leans toward it in 3D and a soft light follows across it, like glass turned in
 * the hand. Mouse only (a finger scrolls), and still with "reduce motion". Give it the same rounding as what it holds.
 */
export function Tilt({ children, className = "", lean = 6 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const move = (e: RPointerEvent<HTMLDivElement>) => {
    if (reduceMotion || e.pointerType !== "mouse" || frame.current) return;
    const { clientX, clientY } = e;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (clientX - r.left) / r.width, y = (clientY - r.top) / r.height;
      el.style.setProperty("--tilt-x", `${((0.5 - y) * lean).toFixed(2)}deg`);
      el.style.setProperty("--tilt-y", `${((x - 0.5) * lean).toFixed(2)}deg`);
      el.style.setProperty("--light-x", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--light-y", `${(y * 100).toFixed(1)}%`);
      el.dataset.lit = "";
    });
  };
  const leave = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
    delete el.dataset.lit;
  };

  return (
    <div ref={ref} className={`tilt ${lean ? "tilt-lean" : ""} ${className}`} onPointerMove={move} onPointerLeave={leave}>
      {children}
      <span className="tilt-light" aria-hidden="true" />
    </div>
  );
}
