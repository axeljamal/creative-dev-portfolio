// The pre-race card, no tutorial: the course, the mode, the wind (Sailing), your rival and the controls for the device
// in use. Any key or tap, or CARD_S seconds, and the countdown begins.
import { useEffect, useRef } from "react";
import { compass, compassName, copy } from "./copy";
import { device } from "./device";
import { COURSES } from "./rules/course";
import type { CardView } from "./session";

/** how long the card stays up by itself, seconds */
export const CARD_S = 4;

export function Card({ v, cup, onBegin }: { v: CardView; cup: { race: number; of: number } | null; onBegin(): void }) {
  const done = useRef(false);
  const go = useRef(onBegin);
  go.current = onBegin;
  const dev = useRef(device()).current;
  useEffect(() => {
    const begin = () => {
      if (done.current) return;
      done.current = true;
      go.current();
    };
    const key = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      begin();
    };
    const timer = window.setTimeout(begin, CARD_S * 1000);
    window.addEventListener("keydown", key);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", key);
    };
  }, []);
  const lines = dev === "touch" ? copy.touchFor : dev === "pad" ? copy.padFor[v.mode] : copy.keysFor[v.mode];
  const tap = () => {
    if (done.current) return;
    done.current = true;
    go.current();
  };
  return (
    <div className="rg-card-veil" onPointerDown={tap}>
      <section className="rg-card" aria-labelledby="rg-card-h" aria-describedby="rg-card-go">
        <p className="rg-label">{cup ? copy.cupRace(cup.race, cup.of) : copy.shapes[v.course]}</p>
        <h2 id="rg-card-h" className="rg-card-h">{COURSES[v.course].name}</h2>
        <dl className="rg-facts">
          <div>
            <dt className="rg-label">{copy.mode}</dt>
            <dd>{copy.modes[v.mode]}</dd>
          </div>
          {v.wind && (
            <div>
              <dt className="rg-label">{copy.winds[v.wind.set]}</dt>
              <dd aria-label={`${copy.windFrom(compassName(v.wind.from))}, ${copy.knots(v.wind.kn)}`}>{copy.windCard(compass(v.wind.from), v.wind.kn)}</dd>
            </div>
          )}
          {v.rival && (
            <div className="rg-facts-rival">
              <dt className="rg-sr">{copy.rival}</dt>
              <dd>{copy.yourRival(v.rival)}</dd>
            </div>
          )}
        </dl>
        <div className="rg-controls">
          <p className="rg-label">{copy.controls}</p>
          <ul>
            {lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
        <p id="rg-card-go" className="rg-card-go">
          <span>{dev === "touch" ? copy.begin.touch : dev === "pad" ? copy.begin.pad : copy.begin.keys}</span>
          <span className="rg-card-fuse" aria-hidden="true" style={{ animationDuration: `${CARD_S}s` }} />
        </p>
      </section>
    </div>
  );
}
