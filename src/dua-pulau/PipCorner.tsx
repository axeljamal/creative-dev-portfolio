// Ask Pip: Pip himself, standing by at the bottom right of the world (as in Windfall's app). Tap him and he hops, then
// his questions open. He steps aside while a panel covers his corner, and stays mounted so his canvas is made once.
import { useEffect, useRef } from "react";
import type { CornerPip } from "./world/pipCorner";

const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function PipCorner({ away, onAsk }: { away: boolean; onAsk: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pip = useRef<CornerPip | null>(null);

  useEffect(() => {
    let gone = false;
    import("./world/pipCorner")
      .then(({ mountPip }) => {
        if (!gone && canvas.current) pip.current = mountPip(canvas.current, reduce);
      })
      .catch(() => {}); // no 3D Pip: the button still reads "Ask Pip"
    return () => {
      gone = true;
      pip.current?.dispose();
      pip.current = null;
    };
  }, []);

  const tap = () => {
    pip.current?.hop();
    setTimeout(onAsk, reduce ? 0 : 280); // let the hop show before his questions cover him
  };

  return (
    <button type="button" className={`dp-pip${away ? " is-away" : ""}`} onClick={tap} aria-label="Ask Pip a question" tabIndex={away ? -1 : 0} aria-hidden={away}>
      <span className="dp-pip-shadow" aria-hidden="true" />
      <canvas ref={canvas} aria-hidden="true" />
      <span className="dp-pip-tag">Ask Pip</span>
    </button>
  );
}
