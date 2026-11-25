// The cup's table: the points each boat took in each race so far, and the totals, leader first, with "You" marked.
// The colour beside each rival goes with her name, never instead of it.
import { copy } from "./copy";

export type CupRow = { id: string; name: string; tint: number | null; you: boolean; points: (number | null)[]; total: number };

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

/** races: the courses' names, in cup order; rows: leader first; caption: what the table is (after race n, or final) */
export function CupTable({ races, rows, caption }: { races: string[]; rows: CupRow[]; caption: string }) {
  return (
    <table className="rg-cup-table">
      <caption className="rg-label">{caption}</caption>
      <thead>
        <tr>
          <th scope="col" className="rg-sr">
            {copy.placed}
          </th>
          <th scope="col" className="rg-sr">
            {copy.standings}
          </th>
          {races.map((r) => (
            <th key={r} scope="col" className="rg-cup-race">
              {r}
            </th>
          ))}
          <th scope="col" className="rg-cup-total">
            {copy.total}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.id} className={r.you ? "you" : undefined}>
            <td className="rg-cup-pos">{i + 1}</td>
            <th scope="row" className="rg-cup-name">
              <span className="rg-swatch" style={r.tint === null ? undefined : { background: hex(r.tint) }} aria-hidden="true" />
              {r.name}
            </th>
            {races.map((race, k) => (
              <td key={race} className="rg-cup-pts">
                {r.points[k] ?? "–"}
              </td>
            ))}
            <td className="rg-cup-total">{r.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
