export type Vec = { x: number; z: number };
export type Pose = Vec & { yaw: number; v: number };
export type Side = "port" | "starboard";
/** out: unit vector from the buoy away from the inside of the turn */
export type Mark = Vec & { side: Side; out: Vec };
/** dir: unit vector, the way boats must cross */
export type Line = { a: Vec; b: Vec; dir: Vec };
export type CourseId = "sprint" | "lap" | "eight";
export type Course = {
  id: CourseId;
  name: string;
  start: Line;
  finish: Line;
  marks: Mark[];
  wind: { from: number; kmh: number };
  seed: number;
};
export type Mode = "easy" | "sailing";
export type WindSet = "standard" | "today";
export type Progress = {
  started: boolean;
  /** true while the boat is over the line (course side) and has not yet come back */
  early: boolean;
  /** true once the first step at or after the gun has been judged */
  armed: boolean;
  leg: number;
  splits: number[];
  finishedAt: number | null;
};
/** turn: -1..1 (positive turns to port, towards north-ward yaw); thrust: 0..1 */
export type Helm = { turn: number; thrust: number };
