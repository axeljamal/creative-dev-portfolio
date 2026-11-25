// A small chart of the course in the corner: both islands, the line, the marks numbered with the next one in gold, the
// fleet as dots in their colours (yours with her heading), and the ghost hollow. North is up. It is a picture for the
// eye; the standings and the pointer say the same in words, so the chart is hidden from screen readers.
import { useEffect, useRef } from "react";
import type { Course, Vec } from "./rules/types";

/** what moves on the chart, read afresh each time it is drawn */
export type ChartLive = { next: number | "finish"; boats: { x: number; z: number; yaw: number; tint: number | null; you: boolean }[]; ghost: Vec | null };

const PEARL = "#f4eee3", GOLD = "#e0c27e";
const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

export function CourseChart({ course, live }: { course: Course; live: () => ChartLive }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const read = useRef(live);
  read.current = live;
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    // the shorelines need the terrain (and so three.js), which the world has already brought by the time a race is on:
    // asked for here, not imported at the top, so the title can paint before any of that arrives
    let land: Vec[][] = [];
    void import("./shore").then((m) => void (land = m.shores()));
    // fit the course (its marks and lines) with sea room round it; the islands show wherever they fall inside
    const all = [...course.marks, course.start.a, course.start.b, course.finish.a, course.finish.b], ROOM = 55;
    const x0 = Math.min(...all.map((p) => p.x)) - ROOM, x1 = Math.max(...all.map((p) => p.x)) + ROOM;
    const z0 = Math.min(...all.map((p) => p.z)) - ROOM, z1 = Math.max(...all.map((p) => p.z)) + ROOM;
    let raf = 0, lastDraw = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - lastDraw < 66 || document.hidden) return; // fifteen times a second is plenty for a chart
      lastDraw = now;
      const w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (!w || !h) return;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) (cv.width = Math.round(w * dpr)), (cv.height = Math.round(h * dpr));
      const g = cv.getContext("2d");
      if (!g) return;
      const PAD = 8, k = Math.min((w - 2 * PAD) / (x1 - x0), (h - 2 * PAD) / (z1 - z0)), ox = (w - (x1 - x0) * k) / 2, oz = (h - (z1 - z0) * k) / 2;
      const X = (x: number) => ox + (x - x0) * k, Y = (z: number) => oz + (z - z0) * k; // north (−z) is up
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      // the islands
      g.fillStyle = "rgba(244, 238, 227, 0.2)";
      g.strokeStyle = "rgba(244, 238, 227, 0.55)";
      g.lineWidth = 1;
      for (const isle of land) {
        g.beginPath();
        isle.forEach((p, i) => (i ? g.lineTo(X(p.x), Y(p.z)) : g.moveTo(X(p.x), Y(p.z))));
        g.closePath();
        g.fill();
        g.stroke();
      }
      const v = read.current();
      // the line (start and finish are the same water on every course)
      g.strokeStyle = v.next === "finish" ? GOLD : PEARL;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(X(course.finish.a.x), Y(course.finish.a.z));
      g.lineTo(X(course.finish.b.x), Y(course.finish.b.z));
      g.stroke();
      // the marks, numbered; the next one in gold
      g.font = "600 9px ui-monospace, monospace";
      g.textAlign = "center";
      g.textBaseline = "middle";
      course.marks.forEach((m, i) => {
        const next = v.next === i;
        g.beginPath();
        g.arc(X(m.x), Y(m.z), next ? 6.5 : 5.5, 0, Math.PI * 2);
        g.fillStyle = next ? GOLD : "rgba(14, 12, 9, 0.85)";
        g.fill();
        g.strokeStyle = next ? GOLD : "rgba(244, 238, 227, 0.7)";
        g.lineWidth = 1;
        g.stroke();
        g.fillStyle = next ? "#0e0c09" : PEARL;
        g.fillText(String(i + 1), X(m.x), Y(m.z) + 0.5);
      });
      // the ghost, hollow
      if (v.ghost) {
        g.beginPath();
        g.arc(X(v.ghost.x), Y(v.ghost.z), 3, 0, Math.PI * 2);
        g.strokeStyle = PEARL;
        g.lineWidth = 1;
        g.stroke();
      }
      // the fleet: rivals as dots, then her on top as an arrowhead along her heading
      for (const b of v.boats) {
        if (b.you) continue;
        g.beginPath();
        g.arc(X(b.x), Y(b.z), 3.2, 0, Math.PI * 2);
        g.fillStyle = b.tint === null ? PEARL : hex(b.tint);
        g.fill();
        g.strokeStyle = "rgba(14, 12, 9, 0.8)";
        g.lineWidth = 1;
        g.stroke();
      }
      const me = v.boats.find((b) => b.you);
      if (me) {
        g.save();
        g.translate(X(me.x), Y(me.z));
        g.rotate(-me.yaw); // yaw 0 is east, turning to the north: on a north-up chart that is anticlockwise
        g.beginPath();
        g.moveTo(7, 0);
        g.lineTo(-4.5, 4.2);
        g.lineTo(-2, 0);
        g.lineTo(-4.5, -4.2);
        g.closePath();
        g.fillStyle = PEARL;
        g.fill();
        g.strokeStyle = GOLD;
        g.lineWidth = 1.2;
        g.stroke();
        g.restore();
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [course]);
  return <canvas ref={ref} className="rg-chart" aria-hidden="true" />;
}
