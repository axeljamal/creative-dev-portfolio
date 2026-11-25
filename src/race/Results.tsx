// The finish: her place in the fleet, her time, the best and the gap to it, whether she beat her rival, and the ways
// on: race again or change course; in a cup, the table so far and the next race, and after the third the final table
// with the best cup kept.
import { useEffect, useRef } from "react";
import { HOME } from "./brick";
import { clock, copy, gapText } from "./copy";
import { CupTable, type CupRow } from "./CupTable";
import type { Mode, WindSet } from "./rules/types";

/** wind: the setting the run was really sailed in (Sailing only). place: where she finished in a fleet of fleet. beat:
 *  the name of her rival when she beat her, else null. */
export type ResultView = { time: number; best: number; gap: number | null; isNew: boolean; wind: WindSet | null; place: number; fleet: number; beat: string | null };
/** the cup so far: which race this was (1-based) of how many, the table, and after the last her place in the cup and
 *  the best cup kept (newBest: this one) */
export type CupView = { race: number; of: number; races: string[]; rows: CupRow[]; final: { place: number; best: number; newBest: boolean } | null };

type Props = {
  course: string; mode: Mode; r: ResultView; cup: CupView | null;
  onAgain(): void; onChange(): void; onNext(): void; onCupAgain(): void;
};

export function Results({ course, mode, r, cup, onAgain, onChange, onNext, onCupAgain }: Props) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus({ preventScroll: true }), []);
  const fin = cup?.final ?? null;
  return (
    <section className={`rg-results${cup ? " is-cup" : ""}`} aria-labelledby="rg-results-h">
      <p className="rg-label">
        {cup ? `${copy.cupRace(cup.race, cup.of)} · ` : ""}
        {course} · {copy.modes[mode]}
        {r.wind ? ` · ${copy.winds[r.wind]}` : ""}
      </p>
      <h2 id="rg-results-h" className="rg-results-h">
        {fin ? copy.cupPlace(fin.place) : r.fleet > 1 ? copy.place(r.place) : copy.finished}
        {!fin && r.fleet > 1 && <span className="rg-of"> {copy.of(r.fleet)}</span>}
      </h2>
      <p id="rg-results-time" className="rg-results-time" aria-label={copy.finishedSay(clock(r.time))}>
        {clock(r.time)}
      </p>
      {(r.isNew || r.beat) && (
        <p className="rg-news">
          {r.isNew && <span className="rg-new">{copy.newBest}</span>}
          {r.beat && <span className="rg-beat">{copy.beat(r.beat)}</span>}
        </p>
      )}
      <dl className="rg-stats">
        {fin && r.fleet > 1 && (
          <div>
            <dt className="rg-label">{copy.placed}</dt>
            <dd aria-label={copy.placeSay(r.place, r.fleet)}>
              {copy.place(r.place)} <span className="rg-of">{copy.of(r.fleet)}</span>
            </dd>
          </div>
        )}
        <div>
          <dt className="rg-label">{copy.best}</dt>
          <dd>{clock(r.best)}</dd>
        </div>
        {r.gap !== null && (
          <div>
            <dt className="rg-label">{copy.gap}</dt>
            <dd className={gapText(r.gap).startsWith("−") ? "ahead" : "behind"}>{gapText(r.gap)}</dd>
          </div>
        )}
      </dl>
      {cup && <CupTable races={cup.races} rows={cup.rows} caption={fin ? copy.cupDone : copy.afterRace(cup.race, cup.of)} />}
      {fin && (
        <p className="rg-cup-best">
          {fin.newBest && <span className="rg-new">{copy.newBestCup}</span>}
          <span>{copy.bestCup(fin.best)}</span>
        </p>
      )}
      <div className="rg-actions">
        {cup && !fin ? (
          <button ref={first} type="button" className="rg-btn" aria-describedby="rg-results-h rg-results-time" onClick={onNext}>
            {copy.next}
          </button>
        ) : cup ? (
          <button ref={first} type="button" className="rg-btn" aria-describedby="rg-results-h rg-results-time" onClick={onCupAgain}>
            {copy.cupAgain}
          </button>
        ) : (
          <button ref={first} type="button" className="rg-btn" aria-describedby="rg-results-h rg-results-time" onClick={onAgain}>
            {copy.again}
          </button>
        )}
        <button type="button" className="rg-btn rg-btn-quiet" onClick={onChange}>
          {copy.change}
        </button>
        <a className="rg-btn rg-btn-quiet" href={HOME}>
          {copy.home}
        </a>
      </div>
    </section>
  );
}
