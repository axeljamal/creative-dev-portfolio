// The cup: the three courses raced in CUP_ORDER, points for each place, and the table. Pure.

/** points for 1st, 2nd, 3rd and 4th */
export const POINTS = [4, 3, 2, 1];

/** a race's order (boat indices, leader first, as race.order() gives it) as each boat's place, 0-based */
export function placesOf(order: number[]): number[] {
  const places: number[] = [];
  order.forEach((boat, place) => (places[boat] = place));
  return places;
}

/** places[r][i]: finishing place (0-based) of boat i in race r. Returns totals and the order, ties broken by the better
 *  place in the last race (and, level on that too, by the boat's index). */
export function cupTable(places: number[][]): { totals: number[]; order: number[] } {
  const n = places[0]?.length ?? 0, last = places[places.length - 1] ?? [];
  const totals = Array.from({ length: n }, (_, i) => places.reduce((s, race) => s + (POINTS[race[i]] ?? 0), 0));
  const order = totals.map((_, i) => i).sort((i, j) => totals[j] - totals[i] || last[i] - last[j] || i - j);
  return { totals, order };
}
