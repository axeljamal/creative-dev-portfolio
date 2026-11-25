// The pause screen: the ways on (resume, restart, back on course, photo, change course), the sound switch, and every
// control for keyboard, touch and gamepad. And photo: the screen cleared but for a small bar, the camera hers to walk
// round the boat, and Save picture.
import { useEffect, useRef } from "react";
import { HOME } from "./brick";
import { copy } from "./copy";
import type { Mode } from "./rules/types";

type Props = {
  mode: Mode; muted: boolean; canRecover: boolean; photo: boolean;
  onResume(): void; onRestart(): void; onRecover(): void; onPhoto(on: boolean): void; onSave(): void; onChange(): void; onMute(m: boolean): void;
};

export function Pause({ mode, muted, canRecover, photo, onResume, onRestart, onRecover, onPhoto, onSave, onChange, onMute }: Props) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus({ preventScroll: true }), [photo]);
  if (photo)
    return (
      <div className="rg-photo" role="group" aria-label={copy.photo}>
        <p className="rg-photo-hint">{copy.photoHint}</p>
        <button ref={first} type="button" className="rg-btn" onClick={onSave}>
          {copy.save}
        </button>
        <button type="button" className="rg-btn rg-btn-quiet" onClick={() => onPhoto(false)}>
          {copy.done}
        </button>
      </div>
    );
  const sets = copy.controlSets(mode);
  return (
    <div className="rg-pause-veil">
      <section className="rg-pause" role="dialog" aria-modal="true" aria-labelledby="rg-pause-h">
        <h2 id="rg-pause-h" className="rg-pause-h">
          {copy.paused}
        </h2>
        <div className="rg-pause-acts">
          <button ref={first} type="button" className="rg-btn" onClick={onResume}>
            {copy.resume}
          </button>
          <button type="button" className="rg-btn rg-btn-quiet" onClick={onRestart}>
            {copy.restart}
          </button>
          <button type="button" className="rg-btn rg-btn-quiet" onClick={onRecover} disabled={!canRecover}>
            {copy.recover}
          </button>
          <button type="button" className="rg-btn rg-btn-quiet" onClick={() => onPhoto(true)}>
            {copy.photo}
          </button>
          <button type="button" className="rg-btn rg-btn-quiet" onClick={onChange}>
            {copy.change}
          </button>
          <a className="rg-btn rg-btn-quiet" href={HOME}>
            {copy.home}
          </a>
        </div>
        <label className="rg-switch">
          <input type="checkbox" role="switch" checked={!muted} onChange={(e) => onMute(!e.target.checked)} />
          <span className="rg-switch-track" aria-hidden="true" />
          <span className="rg-switch-label">{copy.sound}</span>
        </label>
        <div className="rg-keys">
          <p className="rg-label">{copy.controls}</p>
          <dl>
            {sets.map((s) => (
              <div key={s.device}>
                <dt>{s.device}</dt>
                <dd>{s.lines.join(" · ")}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
