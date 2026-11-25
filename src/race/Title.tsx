// The front door: the game's name set as a regatta poster over the live sea, the Race button (focused, so Enter
// races at once), and the choices, each already set to the last one made: course (with its best for the slot),
// mode, wind (Sailing only), ghost and sound. The cup, and the credit back to the portfolio.
import { useEffect, useRef } from "react";
import { clock, copy, TITLE } from "./copy";
import { COURSES, CUP_ORDER } from "./rules/course";
import type { Prefs } from "./rules/store";
import type { CourseId, Mode, WindSet } from "./rules/types";

export type TitleProps = {
  prefs: Pick<Prefs, "course" | "mode" | "wind" | "ghost" | "muted">;
  /** each course's best time for the slot the current choice would race in, seconds, or null */
  bests: Record<CourseId, number | null>;
  /** the world is still loading: Race is pressed all the same, and the race follows when it is ready */
  loading: boolean;
  onChange(p: Partial<Prefs>): void;
  onRace(): void;
  onCup(): void;
};

const MODES: Mode[] = ["easy", "sailing"];
const WINDS: WindSet[] = ["today", "standard"];

/** "Dua Pulau Regatta" set as "Dua Pulau" and, below it in gold italic, "Regatta": the last word is the event */
function Name({ id }: { id: string }) {
  const words = TITLE.split(" "), last = words.pop();
  return (
    <h1 id={id} className="rg-name">
      {words.length > 0 && <span className="rg-name-a">{words.join(" ")}</span>}
      <span className="rg-name-b">{last}</span>
    </h1>
  );
}

/** a pair of radios drawn as one segmented control */
function Seg<T extends string>({ legend, name, value, options, label, onPick }: { legend: string; name: string; value: T; options: T[]; label: (o: T) => string; onPick(o: T): void }) {
  return (
    <fieldset className="rg-seg">
      <legend className="rg-label">{legend}</legend>
      <div className="rg-seg-row">
        {options.map((o) => (
          <label key={o} className="rg-seg-opt">
            <input type="radio" name={name} value={o} checked={value === o} onChange={() => onPick(o)} />
            <span>{label(o)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Switch({ label, on, onFlip }: { label: string; on: boolean; onFlip(on: boolean): void }) {
  return (
    <label className="rg-switch">
      <input type="checkbox" role="switch" checked={on} onChange={(e) => onFlip(e.target.checked)} />
      <span className="rg-switch-track" aria-hidden="true" />
      <span className="rg-switch-label">{label}</span>
    </label>
  );
}

const today = () => {
  try {
    return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  } catch {
    return "";
  }
};

export function Title({ prefs, bests, loading, onChange, onRace, onCup }: TitleProps) {
  const race = useRef<HTMLButtonElement>(null);
  useEffect(() => race.current?.focus({ preventScroll: true }), []);
  const sailing = prefs.mode === "sailing";
  return (
    <section className="rg-title" aria-labelledby="rg-title-h">
      <header className="rg-mast">
        <p className="rg-kicker">
          <span className="rg-kicker-rule" aria-hidden="true" />
          {today()}
        </p>
        <Name id="rg-title-h" />
        <p className="rg-tagline">{copy.kicker}</p>
      </header>

      <div className="rg-menu">
        <button ref={race} type="button" className="rg-race" onClick={onRace} aria-describedby="rg-race-what">
          <span className="rg-race-word">{copy.race}</span>
          <span id="rg-race-what" className="rg-race-what">
            {COURSES[prefs.course].name} · {copy.modes[prefs.mode]}
            {sailing ? ` · ${copy.winds[prefs.wind]}` : ""}
          </span>
          <svg className="rg-race-arrow" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12h15M13 6l6 6-6 6" />
          </svg>
        </button>
        {loading && (
          <p className="rg-loading" role="status">
            {copy.loading}
          </p>
        )}

        <fieldset className="rg-courses">
          <legend className="rg-label">{copy.course}</legend>
          {CUP_ORDER.map((id, i) => {
            const best = bests[id];
            return (
              <label key={id} className="rg-course">
                <input type="radio" name="rg-course" value={id} checked={prefs.course === id} onChange={() => onChange({ course: id })} />
                <span className="rg-course-no" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <span className="rg-course-name">{COURSES[id].name}</span>
                <span className="rg-course-line">{copy.shapes[id]}</span>
                <span className={`rg-course-best${best === null ? " none" : ""}`}>{best === null ? copy.noBest : copy.bestLabel(clock(best))}</span>
              </label>
            );
          })}
        </fieldset>

        <div className="rg-sets">
          <Seg legend={copy.mode} name="rg-mode" value={prefs.mode} options={MODES} label={(m) => copy.modes[m]} onPick={(mode) => onChange({ mode })} />
          {sailing && <Seg legend={copy.wind} name="rg-wind" value={prefs.wind} options={WINDS} label={(w) => copy.winds[w]} onPick={(wind) => onChange({ wind })} />}
        </div>
        <p className="rg-set-line">{sailing ? `${copy.modeLines.sailing}. ${copy.windLines[prefs.wind]}.` : `${copy.modeLines.easy}.`}</p>

        <div className="rg-foot">
          <button type="button" className="rg-cup" onClick={onCup}>
            <span className="rg-cup-word">{copy.cup}</span>
            <span className="rg-cup-line">{copy.cupLine}</span>
          </button>
          <div className="rg-switches">
            <Switch label={copy.ghost} on={prefs.ghost} onFlip={(ghost) => onChange({ ghost })} />
            <Switch label={copy.sound} on={!prefs.muted} onFlip={(on) => onChange({ muted: !on })} />
          </div>
        </div>
        <a className="rg-by" href="/">
          {copy.byline}
        </a>
      </div>
    </section>
  );
}
