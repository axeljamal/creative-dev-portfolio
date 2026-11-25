import { test, expect } from "vitest";
import { POINTS, cupTable, placesOf } from "./cup";

test("cup points and order", () => {
  const t = cupTable([[0, 1, 2, 3], [1, 0, 2, 3], [0, 1, 3, 2]]);
  expect(t.totals).toEqual([11, 10, 5, 4]);
  expect(t.order).toEqual([0, 1, 2, 3]);
});
test("a cup tie goes to the better place in the last race", () => {
  const t = cupTable([[0, 1, 2, 3], [1, 0, 2, 3]]);
  expect(t.totals[0]).toBe(t.totals[1]);
  expect(t.order[0]).toBe(1);
});
test("POINTS: 4, 3, 2, 1 for 1st to 4th; no races, no points", () => {
  expect(POINTS).toEqual([4, 3, 2, 1]);
  expect(cupTable([])).toEqual({ totals: [], order: [] });
});
test("placesOf: a race's order (boat indices, leader first) as each boat's place", () => {
  expect(placesOf([2, 0, 3, 1])).toEqual([1, 3, 0, 2]);
});
