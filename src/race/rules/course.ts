import { segCross } from "./geometry";
import type { Course, CourseId, Line, Mark, Progress, Vec } from "./types";

/** a mark's rounding ray runs from RAY_GAP to RAY along out */
export const RAY = 60, RAY_GAP = 3;
const ROUND = 14;

const W: Vec = { x: -1, z: 0 }, E: Vec = { x: 1, z: 0 }, N: Vec = { x: 0, z: -1 }, S: Vec = { x: 0, z: 1 };
const mk = (x: number, z: number, side: Mark["side"], out: Vec): Mark => ({ x, z, side, out });

// every line 50 wide, so a fleet fits across it and a finish can be fetched without threading a needle
const sprintLine = (dir: Vec): Line => ({ a: { x: 150, z: 92 }, b: { x: 150, z: 142 }, dir });
const lapLine: Line = { a: { x: -30, z: 60 }, b: { x: -30, z: 110 }, dir: W };
const eightLine: Line = { a: { x: 0, z: 105 }, b: { x: 0, z: 155 }, dir: E };

const lapMarks = (): Mark[] => [
  mk(-125, 115, "starboard", S),
  mk(-240, 0, "starboard", W),
  mk(-125, -115, "starboard", N),
  mk(-25, 0, "starboard", E),
];

export const COURSES: Record<CourseId, Course> = {
  sprint: {
    id: "sprint", name: "Sprint", start: sprintLine(W), finish: sprintLine(E),
    // from 90 (E): out to the mark is a run, the leg home the beat, finishing through the 50-wide line
    marks: [mk(-35, 115, "port", W)], wind: { from: 90, kmh: 22 }, seed: 11,
  },
  lap: {
    id: "lap", name: "Island lap", start: lapLine, finish: lapLine,
    // from 45 (NE): leg 1 a run, leg 2 a reach, leg 3 (mark 2 to mark 3) the beat in open sea north-west of the
    // island, legs 4 and 5 reaches
    marks: lapMarks(), wind: { from: 45, kmh: 22 }, seed: 23,
  },
  eight: {
    id: "eight", name: "Two islands", start: eightLine, finish: eightLine,
    marks: [
      mk(125, 118, "port", S), mk(260, 8, "port", E), mk(125, -100, "port", N),
      mk(-125, 115, "starboard", S), mk(-260, 0, "starboard", W), mk(-125, -115, "starboard", N),
    ],
    // from 315 (NW): the start a broad reach; the beats mark 2 to 3 (north-east of the eastern island) and mark 4 to 5
    // (south-west of the western island), in open sea; the diagonal across the strait past the pier a reach
    wind: { from: 315, kmh: 22 }, seed: 37,
  },
};

export const CUP_ORDER: CourseId[] = ["sprint", "lap", "eight"];

export const newProgress = (): Progress => ({ started: false, early: false, armed: false, leg: 0, splits: [], finishedAt: null });

const dot = (u: Vec, v: Vec) => u.x * v.x + u.z * v.z;
const sub = (u: Vec, v: Vec): Vec => ({ x: u.x - v.x, z: u.z - v.z });
const dist = (u: Vec, v: Vec) => Math.hypot(u.x - v.x, u.z - v.z);
const mid = (l: Line): Vec => ({ x: (l.a.x + l.b.x) / 2, z: (l.a.z + l.b.z) / 2 });
const roundingPoint = (m: Mark): Vec => ({ x: m.x + m.out.x * ROUND, z: m.z + m.out.z * ROUND });
/** a point exactly on the line counts as the side boats cross from: segCross puts it on the non-positive side of a→b,
 *  so the ends are taken in the order that makes the far side (along dir) the positive one */
const crossesLine = (l: Line, p0: Vec, p1: Vec) => {
  if (dot(sub(p1, p0), l.dir) <= 0) return false;
  const far = (l.b.x - l.a.x) * l.dir.z - (l.b.z - l.a.z) * l.dir.x > 0;
  return far ? segCross(p0, p1, l.a, l.b) : segCross(p0, p1, l.b, l.a);
};

/** one step of a boat's track from p0 to p1 at race time t (negative before the gun); pure */
export function advance(c: Course, p: Progress, p0: Vec, p1: Vec, t: number): Progress {
  if (t < 0 || p.finishedAt !== null) return p;

  if (!p.started) {
    // judged at the gun from where she was; from then on (that first step included) back behind the line clears it
    let early = p.armed ? p.early : dot(sub(p0, c.start.a), c.start.dir) > 0;
    if (early && dot(sub(p1, c.start.a), c.start.dir) <= 0) early = false;
    const started = !early && crossesLine(c.start, p0, p1);
    return { ...p, armed: true, early, started };
  }

  if (p.leg < c.marks.length) {
    const m = c.marks[p.leg];
    const a = { x: m.x + m.out.x * RAY_GAP, z: m.z + m.out.z * RAY_GAP };
    const b = { x: m.x + m.out.x * RAY, z: m.z + m.out.z * RAY };
    if (!segCross(p0, p1, a, b)) return p;
    const v = sub(p1, p0);
    const turn = m.out.x * v.z - m.out.z * v.x;
    if (m.side === "port" ? turn < 0 : turn > 0) return { ...p, leg: p.leg + 1, splits: [...p.splits, t] };
    return p;
  }

  if (crossesLine(c.finish, p0, p1)) return { ...p, finishedAt: t };
  return p;
}

/** the point to make for next: the next mark's rounding point, or the middle of the finish line */
export function target(c: Course, p: Progress): Vec {
  return p.leg < c.marks.length ? roundingPoint(c.marks[p.leg]) : mid(c.finish);
}

/** distance still to sail along the course, for ranking and gaps */
export function remaining(c: Course, p: Progress, at: Vec): number {
  if (p.finishedAt !== null) return 0;
  const pts = c.marks.map(roundingPoint);
  const fin = mid(c.finish);
  const chain = (from: number) => {
    let d = 0;
    for (let i = from; i < pts.length - 1; i++) d += dist(pts[i], pts[i + 1]);
    return d + (pts.length > from ? dist(pts[pts.length - 1], fin) : 0);
  };
  if (!p.started) {
    const sm = mid(c.start);
    return dist(at, sm) + (pts.length ? dist(sm, pts[0]) + chain(0) : dist(sm, fin));
  }
  if (p.leg >= pts.length) return dist(at, fin);
  return dist(at, pts[p.leg]) + chain(p.leg);
}

/** where to put a boat back on course: the last rounded mark's rounding point, or 25 behind the start line's middle */
export function recoverAt(c: Course, p: Progress): Vec {
  if (p.leg > 0) return roundingPoint(c.marks[Math.min(p.leg, c.marks.length) - 1]);
  const m = mid(c.start);
  return { x: m.x - c.start.dir.x * 25, z: m.z - c.start.dir.z * 25 };
}
