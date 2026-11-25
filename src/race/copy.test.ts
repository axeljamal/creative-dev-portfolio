import { test, expect } from "vitest";
import { compass, compassName, copy, gapText } from "./copy";

test("gap text: a plus sign, a real minus sign, two decimals", () => {
  expect(gapText(1.237)).toBe("+1.24");
  expect(gapText(-0.871)).toBe("−0.87");
  expect(gapText(0)).toBe("+0.00");
  expect(gapText(-0.004)).toBe("+0.00"); // rounds to nothing: not shown as ahead
  expect(gapText(12)).toBe("+12.00");
});

test("places read 1st to 4th, and the gap words name the other boat", () => {
  expect([1, 2, 3, 4, 11, 12, 21].map(copy.place)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "21st"]);
  expect(copy.behindSay("2.4 s", "Ombak")).toBe("2.4 s behind Ombak");
  expect(copy.leadingSay("1.2 s")).toBe("Leading by 1.2 s");
});

test("compass points: eight, rounded to the nearest", () => {
  expect([0, 22, 23, 45, 90, 135, 180, 225, 270, 315, 337, 338, 360, -45].map(compass)).toEqual(["N", "N", "NE", "NE", "E", "SE", "S", "SW", "W", "NW", "NW", "N", "N", "NW"]);
  expect(compassName(45)).toBe("north-east");
});
