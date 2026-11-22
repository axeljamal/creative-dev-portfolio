// A small chart of the two islands, in the round like the Dua Pulau medallion: the shorelines as they really lie,
// the pinisi and her heading, and every place, filled once found. Tap a place and she sails there. It is a shortcut
// for the eye and the pointer; the Log is the same thing in words, so the chart itself is hidden from readers.
import { useEffect, useRef, useState } from "react";
import type { PlaceId } from "./places";
import { place } from "./places";
import type { Chart as ChartData, World } from "./world/engine";

const SIZE = 136, REACH = 250; // the chart shows this many metres either side of the strait
const INK = { md: "#e0c27e", wf: "#f0a070", strait: "#7fc4c8" } as const;

export function Chart({ world, found, bound, onSail }: { world: World; found: PlaceId[]; bound: PlaceId | null; onSail: (id: PlaceId) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ found, bound });
  const places = useRef<ChartData["places"]>([]); // kept from the one survey of the coast, for taps
  live.current = { found, bound };
  // under a thumb the places lie too close to tell apart, so a first touch opens the chart out and the second picks
  const [big, setBig] = useState(false);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const data = world.chart();
    places.current = data.places;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = cv.height = SIZE * dpr;
    const g = cv.getContext("2d")!, c = SIZE / 2, k = (c - 13) / REACH;
    const X = (x: number) => c + x * k, Y = (z: number) => c + z * k; // north (−z) is up
    const draw = () => {
      if (document.hidden) return;
      const { found, bound } = live.current, b = world.boat(), now = performance.now() / 1000;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, SIZE, SIZE);
      g.save();
      g.beginPath();
      g.arc(c, c, c - 4, 0, Math.PI * 2);
      g.clip();
      // each island as its shoreline
      data.isles.forEach((isle) => {
        g.beginPath();
        isle.shore.forEach(([x, z], i) => (i ? g.lineTo(X(x), Y(z)) : g.moveTo(X(x), Y(z))));
        g.closePath();
        g.fillStyle = isle.id === "md" ? "rgba(224,194,126,.2)" : "rgba(240,160,112,.2)";
        g.fill();
        g.strokeStyle = INK[isle.id];
        g.globalAlpha = 0.75;
        g.lineWidth = 1;
        g.stroke();
        g.globalAlpha = 1;
      });
      // the places: a ring until found, then filled; the one she is bound for beats
      data.places.forEach((p) => {
        const x = X(p.x), y = Y(p.z), got = found.includes(p.id);
        if (p.id === bound) {
          g.beginPath();
          g.arc(x, y, 5.5 + 2 * Math.abs(Math.sin(now * 3)), 0, Math.PI * 2);
          g.strokeStyle = "#f4eee3";
          g.lineWidth = 1;
          g.stroke();
        }
        g.beginPath();
        g.arc(x, y, 3.1, 0, Math.PI * 2);
        g.fillStyle = got ? INK[p.island] : "rgba(14,12,9,.85)";
        g.fill();
        g.strokeStyle = INK[p.island];
        g.lineWidth = 1.2;
        g.stroke();
      });
      // the pinisi: an arrowhead on her heading, kept on the chart's edge if she sails off it
      const bx = b.x * k, bz = b.z * k, far = Math.hypot(bx, bz), lim = c - 12, s = far > lim ? lim / far : 1;
      g.translate(c + bx * s, c + bz * s);
      g.rotate(Math.atan2(-Math.sin(b.yaw), Math.cos(b.yaw)));
      g.beginPath();
      g.moveTo(6, 0);
      g.lineTo(-4, 3.6);
      g.lineTo(-2, 0);
      g.lineTo(-4, -3.6);
      g.closePath();
      g.fillStyle = "#f4eee3";
      g.fill();
      g.restore();
      // north, and how many are found
      g.fillStyle = "rgba(244,238,227,.7)";
      g.font = "500 8px 'IBM Plex Mono', monospace";
      g.textAlign = "center";
      g.fillText("N", c, 13);
      g.fillStyle = "#e0c27e";
      g.fillText(`${found.length} / ${data.places.length}`, c, SIZE - 8);
    };
    draw();
    const id = window.setInterval(draw, 90);
    return () => window.clearInterval(id);
  }, [world]);

  // a tap on, or just beside, a place sends her there
  const pick = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const touch = e.pointerType !== "mouse";
    if (touch && !big) return setBig(true);
    const r = e.currentTarget.getBoundingClientRect(), c = SIZE / 2, k = (c - 13) / REACH;
    const px = ((e.clientX - r.left) / r.width) * SIZE, py = ((e.clientY - r.top) / r.height) * SIZE;
    let best: PlaceId | null = null, d = 16;
    places.current.forEach((p) => {
      const dd = Math.hypot(c + p.x * k - px, c + p.z * k - py);
      if (dd < d) {
        d = dd;
        best = p.id;
      }
    });
    setBig(false);
    if (best) onSail(best);
  };
  const boundName = bound ? place(bound).name : "";
  return <canvas ref={ref} className={`dp-chart${big ? " is-big" : ""}`} style={{ width: SIZE, height: SIZE }} onPointerDown={pick} aria-hidden="true" title={boundName ? `Sailing to ${boundName.replace(/^The /, "the ")}` : "Chart: tap a place to sail there"} />;
}
