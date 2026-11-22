// Ask the helmsman: a visitor's questions about the work, answered from the portfolio's own words by /api/ask.
// When one place holds the answer he offers to sail there, through the same autopilot as the Log.
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { place, type PlaceId } from "./places";

export type AskLine = { role: "user" | "assistant"; content: string; sail?: PlaceId };

const STARTERS = ["What is Windfall?", "Who made all this?", "Where can I hear the gamelan?"];
const RESTING = "The helmsman is resting just now. The Log will still take you to every place.";
/** hosts his replies may link to; any other address stays plain text */
const LINK_HOSTS = ["marea-dvipa.uk", "github.com", "linkedin.com", "windfall.expo.app"];

export function Ask({ thread, setThread, onSail, onClose }: { thread: AskLine[]; setThread: (t: AskLine[]) => void; onSail: (id: PlaceId) => void; onClose: () => void }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [thread, busy]);

  const ask = async (question: string) => {
    const q = question.trim().slice(0, 300);
    if (!q || busy) return;
    const next: AskLine[] = [...thread, { role: "user", content: q }];
    setThread(next);
    setDraft("");
    setBusy(true);
    let line: AskLine = { role: "assistant", content: RESTING };
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-6).map(({ role, content }) => ({ role, content })) }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string; sail?: PlaceId };
      line = { role: "assistant", content: data.reply || data.error || RESTING, sail: data.sail };
    } catch {
      // offline or the Worker is down: he rests, and the Log still works
    }
    setThread([...next, line]);
    setBusy(false);
    input.current?.focus({ preventScroll: true });
  };

  const send = (e: FormEvent) => {
    e.preventDefault();
    void ask(draft);
  };

  return (
    <section id="dp-ask" className="dp-menu dp-ask" aria-label="Ask the helmsman about the work" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="dp-log-head">
        <p className="dp-kicker">The helmsman</p>
        <h2>Ask me about the work.</h2>
        <p>Answers come from Axel's portfolio, written by an AI model, so check anything important at the place itself.</p>
      </div>
      <div className="dp-ask-thread" aria-live="polite">
        {thread.length === 0 && (
          <div className="dp-ask-starters">
            {STARTERS.map((s) => (
              <button type="button" key={s} onClick={() => void ask(s)}>{s}</button>
            ))}
          </div>
        )}
        {thread.map((m, i) =>
          m.role === "user" ? (
            <p key={i} className="dp-ask-you">{m.content}</p>
          ) : (
            <div key={i} className="dp-ask-him">
              <p>{linked(m.content)}</p>
              {m.sail && (
                <button type="button" className="dp-btn dp-btn-gold" onClick={() => onSail(m.sail!)}>
                  Sail to {place(m.sail).name.replace(/^The /, "the ")} →
                </button>
              )}
            </div>
          ),
        )}
        {busy && <p className="dp-ask-him dp-ask-busy" aria-label="The helmsman is answering">…</p>}
        <div ref={end} />
      </div>
      <form className="dp-ask-form" onSubmit={send}>
        <label className="dp-sr" htmlFor="dp-ask-q">Your question</label>
        <input id="dp-ask-q" ref={input} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={300} placeholder="Ask the helmsman…" autoComplete="off" enterKeyHint="send" />
        <button type="submit" className="dp-btn dp-btn-gold" disabled={busy || !draft.trim()}>Ask</button>
      </form>
    </section>
  );
}

/** his words, with the portfolio's own addresses (and the contact email) made into links */
function linked(text: string): ReactNode[] {
  return text.split(/(https?:\/\/[^\s<>"]+|hello@marea-dvipa\.uk)/g).map((part, i) => {
    if (part === "hello@marea-dvipa.uk") return <a key={i} href={`mailto:${part}`}>{part}</a>;
    if (!/^https?:\/\//.test(part)) return part;
    const href = part.replace(/[.,;:!?)]+$/, "");
    try {
      const host = new URL(href).hostname;
      if (!LINK_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return part;
    } catch {
      return part;
    }
    return <span key={i}><a href={href} target="_blank" rel="noopener noreferrer">{href}</a>{part.slice(href.length)}</span>;
  });
}
