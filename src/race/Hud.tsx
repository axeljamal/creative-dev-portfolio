// What is on screen while she races: the clock, the countdown, a pointer to the next mark with the side to leave it,
// the fleet's standings with her place and the gap to the boat ahead (or behind), and in Sailing the wind arrow and the
// warning when she is over the line early. What it shows is worked out in hudView.ts.
import { useEffect, useState } from "react";
import { clock, copy } from "./copy";
import { CourseChart, type ChartLive } from "./CourseChart";
import type { HudView } from "./hudView";
import type { Course } from "./rules/types";

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

const touch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

/** whether the standings list is open: kept from race to race, and closed to begin with where there is little room */
let listOpen = typeof window === "undefined" || window.innerWidth >= 600;

type Props = { v: HudView; /** the pause screen is up: nothing here takes a key or a tap */ paused: boolean; course: Course; chart: () => ChartLive; onPause(): void; onRecover(): void };

export function Hud({ v, paused, course, chart, onPause, onRecover }: Props) {
  const counting = v.phase === "countdown";
  const go = v.phase === "racing" && v.time < 1;
  const [open, setOpen] = useState(listOpen);
  const flip = () => setOpen((o) => (listOpen = !o));
  // T opens and closes the standings, so a hand never has to leave the helm
  useEffect(() => {
    if (paused) return;
    const key = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.key.toLowerCase() !== "t") return;
      setOpen((o) => (listOpen = !o));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [paused]);
  return (
    <div className="rg-hud" inert={paused}>
      <div className="rg-clock" role="timer" aria-label={copy.time}>
        <span className="rg-label">{copy.time}</span>
        <span className="rg-time">{clock(v.time)}</span>
      </div>

      <div className="rg-next" aria-live="polite">
        <svg className="rg-arrow" viewBox="-20 -20 40 40" aria-hidden="true" style={{ transform: `rotate(${-v.turn}rad)` }}>
          <circle r="18" />
          <path d="M0 -13 L8 6 L0 2 L-8 6 Z" />
        </svg>
        <div className="rg-next-words">
          <span className="rg-label">{v.next === "finish" ? copy.finish : copy.mark(v.next + 1, v.marks)}</span>
          <span className="rg-side">{v.side ? copy.leave(v.side) : copy.cross}</span>
        </div>
      </div>

      {v.wind && (
        <div className="rg-wind" role="img" aria-label={copy.windSay(v.wind.kn)}>
          <svg className="rg-arrow rg-wind-arrow" viewBox="-20 -20 40 40" aria-hidden="true" style={{ transform: `rotate(${v.wind.to}deg)` }}>
            <circle r="18" />
            <path d="M0 13 L0 -6 M-6 -2 L0 -12 L6 -2" />
          </svg>
          <div className="rg-next-words">
            <span className="rg-label">{copy.winds[v.wind.set]}</span>
            <span className="rg-side">{copy.knots(v.wind.kn)}</span>
          </div>
        </div>
      )}

      <div className="rg-early-box" role="alert">
        {v.early && <span className="rg-early">{copy.overEarly}</span>}
      </div>

      <div className="rg-gap-box" role="status">
        {v.gap && (
          <span className="rg-gap">
            <span className="rg-label">{copy.gap}</span>
            <span className={`rg-gap-n ${v.gap.startsWith("−") ? "ahead" : "behind"}`}>{v.gap}</span>
          </span>
        )}
      </div>

      <section className="rg-stand" aria-label={copy.standings}>
        {v.fleet > 1 ? (
          // her place is also the handle that opens and closes the list; it gives the focus back so the keys still steer
          <button
            type="button"
            className="rg-place"
            aria-expanded={open}
            aria-controls={open ? "rg-fleet" : undefined}
            aria-label={`${copy.placeSay(v.place, v.fleet)}. ${open ? copy.hideStandings : copy.showStandings}`}
            onClick={(e) => {
              flip();
              e.currentTarget.blur();
            }}
          >
            <span className="rg-place-n">{copy.place(v.place)}</span>
            <span className="rg-label">{copy.of(v.fleet)}</span>
            <svg className={`rg-place-fold${open ? " open" : ""}`} viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2 4.5 6 8.5 10 4.5" />
            </svg>
          </button>
        ) : (
          <p className="rg-place" aria-label={copy.placeSay(v.place, v.fleet)}>
            <span className="rg-place-n">{copy.place(v.place)}</span>
            <span className="rg-label">{copy.of(v.fleet)}</span>
          </p>
        )}
        {v.fleet > 1 && open && (
          <ol id="rg-fleet" className="rg-fleet">
            {v.standings.map((s) => (
              <li key={s.id} className={s.you ? "you" : undefined} aria-label={s.rival ? copy.rivalSay(s.name) : s.name}>
                <span className="rg-swatch" style={s.tint === null ? undefined : { background: hex(s.tint) }} aria-hidden="true" />
                <span className="rg-boat">{s.name}</span>
                {s.rival && <span className="rg-tag" aria-hidden="true">{copy.rival}</span>}
              </li>
            ))}
          </ol>
        )}
        {v.lead && (
          <p className="rg-lead" aria-label={v.lead.ahead ? copy.leadingSay(v.lead.s.slice(1)) : copy.behindSay(v.lead.s.slice(1), v.lead.name)}>
            <span className={`rg-lead-n ${v.lead.ahead ? "ahead" : "behind"}`}>{v.lead.s}</span>
            <span className="rg-label">{v.lead.ahead ? copy.aheadOf(v.lead.name) : copy.behindOf(v.lead.name)}</span>
          </p>
        )}
      </section>

      <button
        type="button"
        className="rg-pause-btn"
        aria-label={copy.pause}
        onClick={(e) => {
          e.currentTarget.blur();
          onPause();
        }}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M5 3v10M11 3v10" />
        </svg>
      </button>

      <CourseChart course={course} live={chart} />

      <div className="rg-stuck-box" role="status">
        {v.stuck && (
          <button
            type="button"
            className="rg-stuck"
            aria-label={copy.stuckSay}
            onClick={(e) => {
              e.currentTarget.blur();
              onRecover();
            }}
          >
            {copy.recoverKey}
          </button>
        )}
      </div>

      <div className="rg-count" aria-live="assertive">
        {(counting || go) && <span className="rg-count-n">{counting ? Math.ceil(-v.time - 1e-9) : copy.go}</span>}
        {counting && <span className="rg-hint">{touch ? copy.steer.touch : v.mode === "sailing" ? copy.steer.sailKeys : copy.steer.keys}</span>}
        {counting && v.mode === "sailing" && <span className="rg-hint">{copy.timedStart}</span>}
      </div>
    </div>
  );
}
