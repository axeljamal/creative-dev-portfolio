import { test, expect } from "vitest";
import { poseAt, recorder, type Run } from "./ghost";

test("a recorded run plays back where it was sailed", () => {
  const r = recorder();
  for (let i = 0; i <= 100; i++) r.add(i / 10, { x: i, z: 2 * i, yaw: 0.5, v: 10 });
  const run = r.done(10, []);
  expect(poseAt(run, 5.05)!.x).toBeCloseTo(50.5, 0);
  expect(poseAt(run, -1)).toBeNull();
  expect(poseAt(run, 11)).toBeNull();
});

test("yaw interpolates the short way across ±π", () => {
  const run: Run = { time: 0.1, splits: [], track: [0, 0, 3.1, 0, 0, -3.1] };
  const yaw = poseAt(run, 0.05)!.yaw;
  expect(Math.abs(Math.abs(yaw) - Math.PI)).toBeLessThan(0.05);
});

test("recording samples every 0.1 s of race time whatever the frame rate", () => {
  const r = recorder();
  for (let t = 0; t <= 2.0001; t += 1 / 37) r.add(t, { x: t * 10, z: 0, yaw: 0, v: 1 });
  const run = r.done(2, []);
  expect(run.track.length / 3).toBeGreaterThanOrEqual(20);
  expect(run.track.length / 3).toBeLessThanOrEqual(21);
  expect(poseAt(run, 1)!.x).toBeCloseTo(10, 0);
});

test("nothing before the gun is recorded", () => {
  const r = recorder();
  r.add(-3, { x: 99, z: 99, yaw: 0, v: 0 });
  r.add(0, { x: 1, z: 1, yaw: 0, v: 0 });
  r.add(0.1, { x: 2, z: 1, yaw: 0, v: 0 });
  expect(r.done(0.1, []).track.slice(0, 3)).toEqual([1, 1, 0]);
});

test("poseAt: the first sample at t = 0 and the last at the end", () => {
  const run: Run = { time: 0.2, splits: [], track: [1, 2, 0.1, 3, 4, 0.2, 5, 6, 0.3] };
  expect(poseAt(run, 0)).toEqual({ x: 1, z: 2, yaw: 0.1 });
  const end = poseAt(run, 0.2)!;
  expect(end.x).toBeCloseTo(5); expect(end.z).toBeCloseTo(6); expect(end.yaw).toBeCloseTo(0.3);
  expect(poseAt(run, 0.21)).toBeNull();
});
test("poseAt: a one-sample track is that pose at t = 0 and nothing after", () => {
  const run: Run = { time: 0.05, splits: [], track: [7, 8, 0.5] };
  expect(poseAt(run, 0)).toEqual({ x: 7, z: 8, yaw: 0.5 });
  expect(poseAt(run, 0.05)).toBeNull();
});
test("done keeps the time and the splits, as copies", () => {
  const r = recorder(), splits = [12.5, 30.25];
  r.add(0, { x: 0, z: 0, yaw: 0, v: 0 });
  const run = r.done(41.75, splits);
  splits.push(99);
  expect(run.time).toBe(41.75); expect(run.splits).toEqual([12.5, 30.25]);
});
test("samples round x and z to 0.1 and yaw to 0.01", () => {
  const r = recorder();
  r.add(0, { x: 1.2345, z: -6.789, yaw: 0.12345, v: 0 });
  expect(r.done(0, []).track).toEqual([1.2, -6.8, 0.12]);
});
