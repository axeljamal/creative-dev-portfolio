// Pip, Dua Pulau's crew and Windfall's mascot, standing beside Axelle on her About card: his 3D render from Windfall's
// film, and the same /api/ask that answers in Dua Pulau. Tap him and he hops, then his questions open over the card.
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { LuX } from "react-icons/lu";
import pip from "../assets/pip-wave.webp";

type Line = { role: "user" | "assistant"; content: string };

const STARTERS = ["Who is Axel?", "What are Axel's skills?", "How does Windfall work?", "How was this site built?"];
const RESTING = "Pip is having a nap just now. Axel's email is hello@marea-dvipa.uk.";
const LINK_HOSTS = ["marea-dvipa.uk", "github.com", "linkedin.com", "windfall.expo.app"];
const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Pip himself, as he is in Windfall's film: the 3D render, see-through, bobbing gently, with a hop when tapped */
export function PipBeside({ active, onAsk }: { active: boolean; onAsk: () => void }) {
  const [hop, setHop] = useState(false);
  const tap = () => {
    setHop(true);
    setTimeout(() => {
      setHop(false);
      onAsk();
    }, reduce ? 0 : 320);
  };
  return (
    <button type="button" className={`about-pip${hop ? " is-hop" : ""}`} onClick={tap} aria-label="Ask Pip about Axel" tabIndex={active ? 0 : -1}>
      <span className="about-pip-shadow" aria-hidden="true" />
      <img src={pip} alt="" width={320} height={320} draggable={false} />
      <span className="brick-say brick-say-pip">
        <b>Pip</b>
        <span>AI Design Partner</span>
        <i>Ask me</i>
      </span>
    </button>
  );
}

/** his questions and answers, over the card */
export function PipChat({ onClose }: { onClose: () => void }) {
  const [thread, setThread] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [thread, busy]);

  const ask = async (question: string) => {
    const q = question.trim().slice(0, 300);
    if (!q || busy) return;
    const next: Line[] = [...thread, { role: "user", content: q }];
    setThread(next);
    setDraft("");
    setBusy(true);
    let reply = RESTING;
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-6) }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string; resting?: boolean };
      // a rest from the Worker speaks of Dua Pulau's Log, which this page has not got: he says this page's own line
      reply = res.status === 503 ? RESTING : data.reply || data.error || RESTING;
    } catch {
      // offline or the Worker is down: he rests
    }
    setThread([...next, { role: "assistant", content: reply }]);
    setBusy(false);
    input.current?.focus({ preventScroll: true });
  };

  const send = (e: FormEvent) => {
    e.preventDefault();
    void ask(draft);
  };

  return (
    // keys and presses stay in here: arrows move the caret, not the cards, and selecting text is not a slide
    <section
      className="about-chat"
      aria-label="Ask Pip about Axel"
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") onClose();
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button type="button" className="about-chat-close" onClick={onClose} aria-label="Close Ask Pip">
        <LuX aria-hidden="true" />
      </button>
      <p className="about-card-eyebrow">Pip, from Dua Pulau</p>
      <h3 className="about-chat-title">Ask me about Axel.</h3>
      <p className="about-chat-note">Answers come from Axel's portfolio, written by an AI model, so check anything important.</p>
      <div className="about-chat-thread" aria-live="polite">
        {thread.length === 0 && (
          <div className="about-chat-starters">
            {STARTERS.map((s) => (
              <button type="button" key={s} onClick={() => void ask(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {thread.map((m, i) => (
          <p key={i} className={m.role === "user" ? "about-chat-you" : "about-chat-him"}>
            {m.role === "user" ? m.content : linked(m.content)}
          </p>
        ))}
        {busy && (
          <p className="about-chat-him about-chat-busy" aria-label="Pip is answering">
            …
          </p>
        )}
        <div ref={end} />
      </div>
      <form className="about-chat-form" onSubmit={send}>
        <label className="sr-only" htmlFor="about-chat-q">
          Your question
        </label>
        <input
          id="about-chat-q"
          ref={input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={300}
          placeholder="Ask Pip…"
          autoComplete="off"
          enterKeyHint="send"
        />
        <button type="submit" disabled={busy || !draft.trim()}>
          Ask
        </button>
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
    return (
      <span key={i}>
        <a href={href} target="_blank" rel="noopener noreferrer">
          {href}
        </a>
        {part.slice(href.length)}
      </span>
    );
  });
}
