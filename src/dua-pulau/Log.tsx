// The ship's log: what Dua Pulau is, said once by Pip as you first get under way, and then the ten things
// to do in it as a list that ticks itself off as you moor. The list is also the way to sail straight to a place.
import { useEffect, useRef } from "react";
import { ISLAND_NAME, PLACES, type Island, type PlaceId } from "./places";
import type { ShipId } from "./world/engine";

/** what Pip says, a line at a time, the first time the pinisi gets under way */
export const TALK = [
  "Welcome aboard! I'm Pip, your crew. This is Axel's portfolio, and you sail it: two islands, ten places, and a piece of work waiting at each.",
  "West lies Marea Dvīpa, a studio for batik and ikat patterns. East lies Windfall, an app for sharing surplus food. The medallion floats in the strait between them.",
  "Steer her yourself, or pick a place from the log and she will take you there. Moor to read the work, and tap me any time to ask about Axel.",
];

export function Talk({ line, onNext, onSkip }: { line: number; onNext: () => void; onSkip: () => void }) {
  const next = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    next.current?.focus({ preventScroll: true });
  }, [line]);
  const last = line === TALK.length - 1;
  return (
    <div className="dp-talk" role="group" aria-label="Pip speaks">
      <p className="dp-kicker">Pip · {line + 1} of {TALK.length}</p>
      <p className="dp-talk-line" aria-live="polite">{TALK[line]}</p>
      <div className="dp-talk-btns">
        {!last && <button type="button" className="dp-talk-skip" onClick={onSkip}>Skip</button>}
        <button ref={next} type="button" className="dp-btn dp-btn-gold" onClick={onNext}>{last ? "Open the log" : "Next →"}</button>
      </div>
    </div>
  );
}

/** brick: the log of Dua Pulau in bricks, whose way out leads to the brick Regatta */
export function Log({ visited, first, onSail, onClose, brick = false }: { visited: PlaceId[]; first: boolean; onSail: (id: PlaceId) => void; onClose: () => void; brick?: boolean }) {
  const done = visited.length === PLACES.length;
  return (
    <nav id="dp-log" className="dp-menu dp-log" aria-label="The ship's log: what to do here, and a way to sail to each place">
      <div className="dp-log-head">
        <p className="dp-kicker">The log</p>
        <h2>A portfolio you sail.</h2>
        <p>{done ? "Every place is logged. Thank you for sailing all of it." : "Ten places, each holding a piece of work. Pick one and she sails there; moor to tick it off."}</p>
      </div>
      {(["md", "strait", "wf"] as Island[]).map((isle) => (
        <div key={isle}>
          <p className={`dp-kicker is-${isle}`}>{ISLAND_NAME[isle]}</p>
          {PLACES.filter((p) => p.island === isle).map((p) => {
            const got = visited.includes(p.id);
            return (
              <button type="button" key={p.id} className={got ? "is-done" : ""} onClick={() => onSail(p.id)}>
                <i aria-hidden="true">{got ? "✓" : ""}</i>
                <b>{p.quest}</b>
                <span>{p.name} · {p.holds}{got ? " · done" : ""}</span>
              </button>
            );
          })}
        </div>
      ))}
      {/* the way on from the islands: the Regatta is raced round them, on a page of its own */}
      <div>
        <p className="dp-kicker">Beyond the islands</p>
        <a className="dp-log-go" href={brick ? "/bricks/race/" : "/race/"}>
          <i aria-hidden="true">→</i>
          <b>Race the regatta</b>
          <span>{brick ? "Three courses round the islands, in the boat you built in Pinisi Yard" : "Three courses round the islands, against three rival pinisi"}</span>
        </a>
      </div>
      <div className="dp-log-foot">
        <span aria-live="polite">{visited.length} / {PLACES.length} logged</span>
        {done ? <a className="dp-btn dp-btn-gold" href="/portfolio/#contact">Write a message</a> : <button type="button" className="dp-btn dp-btn-gold" onClick={onClose}>{first ? "Set sail" : "Close"}</button>}
      </div>
    </nav>
  );
}

/** the ships she can sail: today's pinisi, the two she was before, and a boat of your own from Pinisi Yard */
export const SHIPS = [
  { id: "today", name: "Today's pinisi", line: "Cream topsides, and the studio's sun on her mainsail" },
  { id: "first", name: "The first pinisi", line: "Varnished teak with a white strake, and a low deckhouse" },
  { id: "cruising", name: "The cruising pinisi", line: "A white hull with portholes, and a two-storey deckhouse" },
] as const;

/** choose the ship to sail; the last choice is your own, built in the yard (or a way to go and build her) */
export function Ships({ ship, yardName, onPick, onClose }: { ship: ShipId; yardName: string | null; onPick: (id: ShipId) => void; onClose: () => void }) {
  return (
    <nav id="dp-ships" className="dp-menu dp-log dp-ships" aria-label="Choose the ship to sail">
      <div className="dp-log-head">
        <p className="dp-kicker">Your ship</p>
        <h2>Change the ship.</h2>
        <p>She changes where she is, under way or moored. Pip and the lamp come too.</p>
      </div>
      <div>
        {SHIPS.map((s) => (
          <button type="button" key={s.id} className={ship === s.id ? "is-done" : ""} aria-pressed={ship === s.id} onClick={() => onPick(s.id)}>
            <i aria-hidden="true">{ship === s.id ? "✓" : ""}</i>
            <b>{s.name}</b>
            <span>{s.line}</span>
          </button>
        ))}
        {yardName ? (
          <button type="button" className={ship === "yard" ? "is-done" : ""} aria-pressed={ship === "yard"} onClick={() => onPick("yard")}>
            <i aria-hidden="true">{ship === "yard" ? "✓" : ""}</i>
            <b>{yardName}</b>
            <span>Your own, built brick by brick in Pinisi Yard</span>
          </button>
        ) : null}
        <a className="dp-log-go" href="/yard/">
          <i aria-hidden="true">→</i>
          <b>{yardName ? "Rebuild her in Pinisi Yard" : "Design your own ship"}</b>
          <span>Choose her hull, rig, cabin, paint and sails in Pinisi Yard, then sail her here</span>
        </a>
      </div>
      <div className="dp-log-foot">
        <span>{ship === "yard" && yardName ? yardName : SHIPS.find((s) => s.id === ship)?.name}</span>
        <button type="button" className="dp-btn dp-btn-gold" onClick={onClose}>Done</button>
      </div>
    </nav>
  );
}
