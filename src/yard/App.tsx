// Pinisi Yard: the builder. Choose her parts, paint and sails while she turns on the slip; the three numbers say what
// the choices make her. Launch her, and she slides into the sea and floats, or rolls over. Her design is kept on this
// device and travels in a share link (?boat=), and a member of the Crew gets their "build your first boat" quest ticked.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CABINS, clean, decode, DEFAULT_DESIGN, encode, HULLS, MOTIFS, NAME_MAX, PAINTS, RIGS, SAILS, stats,
  type Design, type Masts,
} from "./design";
import type { Phase, Yard } from "./scene";

const KEY = "pinisi-yard-design";

function firstDesign(): Design {
  const code = new URLSearchParams(location.search).get("boat");
  const shared = code ? decode(code) : null;
  if (shared) return shared;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return clean(JSON.parse(saved));
  } catch {
    /* no saved boat, or no storage */
  }
  return DEFAULT_DESIGN;
}

type Tab = "hull" | "rig" | "paint" | "name";
const TABS: { id: Tab; label: string }[] = [
  { id: "hull", label: "Hull" },
  { id: "rig", label: "Rig" },
  { id: "paint", label: "Paint" },
  { id: "name", label: "Name" },
];

function Choice<T extends string | number>(props: { legend: string; value: T; options: { id: T; label: string; note?: string; swatch?: string }[]; onPick: (v: T) => void }) {
  return (
    <fieldset className="yd-choice">
      <legend>{props.legend}</legend>
      <div className="yd-opts">
        {props.options.map((o) => (
          <button
            key={o.id}
            type="button"
            className="yd-opt"
            aria-pressed={props.value === o.id}
            onClick={() => props.onPick(o.id)}
            title={o.note}
          >
            {o.swatch && <span className="yd-swatch" style={{ background: o.swatch }} aria-hidden="true" />}
            <span>{o.label}</span>
            {o.note && <small>{o.note}</small>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Meter({ label, value, tone }: { label: string; value: number; tone?: "warn" | "bad" }) {
  return (
    <div className={`yd-meter ${tone ?? ""}`}>
      <span>{label}</span>
      <span className="yd-bar" role="meter" aria-valuemin={0} aria-valuemax={10} aria-valuenow={value} aria-label={label}>
        <i style={{ width: `${value * 10}%` }} />
      </span>
      <b>{value.toFixed(1)}</b>
    </div>
  );
}

export function App() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const yard = useRef<Yard | null>(null);
  const [design, setDesign] = useState<Design>(firstDesign);
  const [tab, setTab] = useState<Tab>("hull");
  const [phase, setPhase] = useState<Phase>("yard");
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [crewNote, setCrewNote] = useState("");
  const s = useMemo(() => stats(design), [design]);

  useEffect(() => {
    let alive = true;
    let made: Yard | null = null;
    // the yard and its brick parts load together; if the parts cannot load, the yard builds with simple shapes
    Promise.all([import("./scene"), Promise.race([
      import("./parts").then((m) => m.loadParts()),
      new Promise((done) => setTimeout(done, 6000)), // never let slow parts hold the yard back
    ]).catch(() => undefined)])
      .then(([{ createYard }]) => {
        if (!alive || !canvas.current) return;
        made = createYard(canvas.current, { reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches });
        made.onPhase(setPhase);
        made.setDesign(design);
        yard.current = made;
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      alive = false;
      made?.dispose();
      yard.current = null;
      setReady(false);
    };
    // the yard is made once; design changes go through setDesign below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    yard.current?.setDesign(design);
    try {
      localStorage.setItem(KEY, JSON.stringify(design));
    } catch {
      /* storage blocked: the boat still works, it just is not kept */
    }
  }, [design]);

  const set = <K extends keyof Design>(k: K, v: Design[K]) => setDesign((d) => ({ ...d, [k]: v }));

  const launch = () => {
    yard.current?.launch();
    // a Crew member's first launch ticks their build quest; anyone else is simply not signed in, and that is fine
    fetch("/api/crew/quests/build", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" } })
      .then((r) => r.ok && setCrewNote("Build quest ticked in the Crew."))
      .catch(() => {});
  };

  const share = async () => {
    const url = `${location.origin}/yard/?boat=${encode(design)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      prompt("Copy this link to share your boat", url);
    }
  };

  const building = phase === "yard";
  const toneOf = (v: number) => (v < 2 ? "bad" : v < 3.5 ? "warn" : undefined);

  return (
    <div className="yd">
      <canvas ref={canvas} aria-label={`3D view of ${design.name || "your boat"}`} />
      {failed && <p className="yd-fail">The 3D yard could not start on this device. Try another browser.</p>}

      <header className="yd-top">
        <a className="yd-home" href="/">
          <span className="yd-kicker">Dua Pulau</span>
          <span className="yd-title">Pinisi Yard</span>
        </a>
        <nav className="yd-links">
          <a href="/crew/">The Crew</a>
          <a href="/bricks/race/">Regatta</a>
        </nav>
      </header>

      <aside className="yd-panel" aria-label="Build your boat">
        <div className="yd-name">
          <span className="yd-kicker">{building ? "On the slip" : phase === "launching" ? "Launching" : phase === "afloat" ? "Afloat" : "Capsized"}</span>
          <h1>{design.name || "Unnamed"}</h1>
        </div>

        <div className="yd-meters">
          <Meter label="Speed" value={s.speed} tone={s.speed < 3 ? "warn" : undefined} />
          <Meter label="Stability" value={s.stability} tone={toneOf(s.stability)} />
          <Meter label="Charm" value={s.charm} />
        </div>
        <div className="yd-warn" aria-live="polite">
          {s.warnings.map((w) => <p key={w}>{w}</p>)}
        </div>

        {building ? (
          <>
            <div className="yd-tabs" role="tablist">
              {TABS.map((t) => (
                <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="yd-body" role="tabpanel">
              {tab === "hull" && (
                <>
                  <Choice legend="Hull" value={design.hull} onPick={(v) => set("hull", v)}
                    options={Object.entries(HULLS).map(([id, h]) => ({ id: id as Design["hull"], label: h.label, note: h.note }))} />
                  <Choice legend="Cabin" value={design.cabin} onPick={(v) => set("cabin", v)}
                    options={Object.entries(CABINS).map(([id, c]) => ({ id: id as Design["cabin"], label: c.label }))} />
                </>
              )}
              {tab === "rig" && (
                <>
                  <Choice legend="Rig" value={design.rig} onPick={(v) => set("rig", v)}
                    options={Object.entries(RIGS).map(([id, r]) => ({ id: id as Design["rig"], label: r.label, note: r.note }))} />
                  <Choice<Masts> legend="Masts" value={design.masts} onPick={(v) => set("masts", v)}
                    options={[1, 2, 3].map((n) => ({ id: n as Masts, label: String(n) }))} />
                </>
              )}
              {tab === "paint" && (
                <>
                  <Choice legend="Hull paint" value={design.paint} onPick={(v) => set("paint", v)}
                    options={Object.entries(PAINTS).map(([id, p]) => ({ id: id as Design["paint"], label: p.label, swatch: p.hex }))} />
                  <Choice legend="Sheer stripe" value={design.stripe} onPick={(v) => set("stripe", v)}
                    options={Object.entries(PAINTS).map(([id, p]) => ({ id: id as Design["stripe"], label: p.label, swatch: p.hex }))} />
                  <Choice legend="Sailcloth" value={design.sail} onPick={(v) => set("sail", v)}
                    options={Object.entries(SAILS).map(([id, p]) => ({ id: id as Design["sail"], label: p.label, swatch: p.hex }))} />
                  <Choice legend="Batik on the sails" value={design.motif} onPick={(v) => set("motif", v)}
                    options={Object.entries(MOTIFS).map(([id, m]) => ({ id: id as Design["motif"], label: m.label }))} />
                </>
              )}
              {tab === "name" && (
                <label className="yd-field">
                  <span>Her name, painted on the transom</span>
                  <input value={design.name} maxLength={NAME_MAX} onChange={(e) => set("name", e.target.value.replace(/[<>]/g, ""))} placeholder="Bintang Kecil" />
                </label>
              )}
            </div>
            <div className="yd-actions">
              <button type="button" className="yd-go" onClick={launch} disabled={!ready}>
                Launch her
              </button>
              <button type="button" className="yd-ghost" onClick={share}>{copied ? "Link copied" : "Share"}</button>
            </div>
          </>
        ) : (
          <div className="yd-after">
            {phase === "capsized" && <p className="yd-big">She rolled over. Too much weight up high for that hull.</p>}
            {phase === "afloat" && <p className="yd-big">She floats! Sailing a circle at her own speed.</p>}
            {phase === "launching" && <p className="yd-big">Down the slip…</p>}
            {crewNote && <p className="yd-ok">{crewNote}</p>}
            {phase === "afloat" && (
              <>
              <a className="yd-race" href={`/bricks/race/?boat=${encode(design)}`}>
                Race her in the Regatta →
              </a>
              <a className="yd-race yd-sail" href={`/bricks/?ship=yard&boat=${encode(design)}`}>
                Sail her round Dua Pulau →
              </a>
              </>
            )}
            <div className="yd-actions">
              <button type="button" className="yd-go" onClick={() => yard.current?.reset()} disabled={phase === "launching"}>
                {phase === "capsized" ? "Back to the yard and fix her" : "Back to the yard"}
              </button>
              <button type="button" className="yd-ghost" onClick={share}>{copied ? "Link copied" : "Share"}</button>
            </div>
            <p className="yd-quiet">
              Playtesting? Tell the <a href="/crew/#/playtest">Crew</a> what felt good and what got in the way.
            </p>
          </div>
        )}
      </aside>
      <p className="yd-credit">
        Brick shapes from the <a href="https://library.ldraw.org" target="_blank" rel="noreferrer">LDraw parts library</a>,{" "}
        <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noreferrer">CC BY 2.0</a>. Not affiliated with any toy maker.
      </p>
    </div>
  );
}
