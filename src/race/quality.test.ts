import { test, expect } from "vitest";
import { tierFrom } from "./quality";

/** 120 frames of ms each */
const frames = (ms: number) => Array.from({ length: 120 }, () => ms);

test("tierFrom", () => {
  expect(tierFrom(frames(8))).toBe("high");
  expect(tierFrom(frames(16.7))).toBe("high"); // a 60 Hz screen at its best
  expect(tierFrom(frames(25))).toBe("medium");
  expect(tierFrom(frames(40))).toBe("low");
  expect(tierFrom([200, 200, ...frames(8)])).toBe("high");
});
test("tierFrom: the first 20 frames are dropped, and the median of the rest decides", () => {
  expect(tierFrom([...Array.from({ length: 20 }, () => 40), ...frames(8)])).toBe("high");
  expect(tierFrom([...frames(20), ...frames(20.5).slice(0, 10)])).toBe("high");
  expect(tierFrom([...Array.from({ length: 20 }, () => 8), 34, 34, 34, 60, 8])).toBe("medium");
});
