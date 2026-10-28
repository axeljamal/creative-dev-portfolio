import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { MotionConfig, motion } from "motion/react";
import {
  LuArchive,
  LuArchiveRestore,
  LuArrowUpRight,
  LuChevronLeft,
  LuInbox,
  LuLock,
  LuLogOut,
  LuMail,
  LuMailOpen,
  LuRefreshCw,
  LuReply,
  LuTrash2,
} from "react-icons/lu";
import { GlassFilter } from "../components/GlassFilter";
import { buttonClass } from "../components/Button";
import {
  NotSignedIn,
  deleteMessage,
  listMessages,
  setStatus,
  type Message,
  type MessageStatus,
} from "./api";

type LoadState = "loading" | "ready" | "signed-out" | "error";

const tabs: { status: MessageStatus; label: string }[] = [
  { status: "new", label: "New" },
  { status: "read", label: "Read" },
  { status: "archived", label: "Archived" },
];

const fullDate = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

const spring = { type: "spring", stiffness: 420, damping: 34 } as const;

export function Inbox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<MessageStatus>("new");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setMessages(await listMessages());
      setState("ready");
    } catch (err) {
      if (err instanceof NotSignedIn) return setState("signed-out");
      setError(err instanceof Error ? err.message : "Could not load messages");
      setState("error");
    }
  }, []);

  // refresh every minute and whenever you come back to the tab
  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    window.addEventListener("focus", load);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<MessageStatus, number> = { new: 0, read: 0, archived: 0 };
    for (const m of messages) c[m.status]++;
    return c;
  }, [messages]);

  const visible = messages.filter((m) => m.status === filter);
  const selected = messages.find((m) => m.id === selectedId) ?? null;

  // update the list straight away, then reload if the server disagrees
  async function changeStatus(id: string, status: MessageStatus) {
    setMessages((all) => all.map((m) => (m.id === id ? { ...m, status } : m)));
    try {
      await setStatus(id, status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the message");
      load();
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this message? This can't be undone.")) return;
    setMessages((all) => all.filter((m) => m.id !== id));
    setSelectedId(null);
    try {
      await deleteMessage(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the message");
      load();
    }
  }

  function open(message: Message) {
    setSelectedId(message.id);
    if (message.status === "new") changeStatus(message.id, "read");
  }

  return (
    <MotionConfig reducedMotion="user">
      <GlassFilter />
      <div className="aurora" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="mx-auto flex min-h-svh max-w-6xl flex-col px-4 pt-4 pb-8 sm:px-6">
        <header className="glass glass-lens sticky top-4 z-40 flex items-center gap-2 rounded-full py-1.5 pr-1.5 pl-5">
          <h1 className="relative z-2 mr-auto flex items-center gap-2 text-lg font-bold tracking-tight">
            <LuInbox aria-hidden="true" className="text-accent-solid" />
            Inbox
            {counts.new > 0 && (
              <span className="rounded-full bg-accent-solid px-2 py-0.5 text-xs font-semibold text-on-accent">
                {counts.new} new
              </span>
            )}
          </h1>
          <button
            type="button"
            onClick={load}
            aria-label="Refresh"
            className={`${buttonClass()} relative z-2 px-3`}
          >
            <LuRefreshCw aria-hidden="true" className="relative z-2" />
          </button>
          <a
            href={import.meta.env.BASE_URL}
            aria-label="View site"
            className={`${buttonClass()} relative z-2 px-3`}
          >
            <LuArrowUpRight aria-hidden="true" className="relative z-2" />
          </a>
          <a
            href="/cdn-cgi/access/logout"
            aria-label="Sign out"
            className={`${buttonClass()} relative z-2 px-3`}
          >
            <LuLogOut aria-hidden="true" className="relative z-2" />
          </a>
        </header>

        {state === "signed-out" ? (
          <SignedOut />
        ) : (
          <>
            {error && (
              <p
                role="alert"
                className="glass-strong mt-6 flex items-center justify-between gap-4 rounded-2xl px-5 py-3 text-[15px]"
              >
                <span className="relative z-2">{error}</span>
                <button
                  type="button"
                  onClick={() => setError("")}
                  className="relative z-2 font-semibold underline"
                >
                  Dismiss
                </button>
              </p>
            )}

            <nav
              aria-label="Folders"
              className="glass mt-6 flex self-start rounded-full p-1"
            >
              {tabs.map(({ status, label }) => (
                <button
                  key={status}
                  type="button"
                  aria-pressed={filter === status}
                  onClick={() => {
                    setFilter(status);
                    setSelectedId(null);
                  }}
                  className="relative z-2 flex min-h-10 items-center gap-1.5 rounded-full px-4 text-[15px] font-medium text-ink-2 aria-pressed:text-ink"
                >
                  {filter === status && (
                    <motion.span
                      layoutId="folder-lens"
                      transition={spring}
                      className="lens-bubble absolute inset-0 -z-1 rounded-full"
                    />
                  )}
                  {label}
                  <span className="text-sm text-ink-2 tabular-nums">{counts[status]}</span>
                </button>
              ))}
            </nav>

            <div className="mt-4 grid flex-1 gap-4 lg:grid-cols-12">
              <section
                aria-label={`${filter} messages`}
                className={`glass-strong self-start rounded-[2rem] p-2 lg:col-span-5 ${selected ? "hidden lg:block" : ""}`}
              >
                <MessageList
                  state={state}
                  messages={visible}
                  selectedId={selectedId}
                  onOpen={open}
                />
              </section>

              <section
                aria-label="Message"
                className={`lg:col-span-7 ${selected ? "" : "hidden lg:block"}`}
              >
                {selected ? (
                  <MessageDetail
                    message={selected}
                    onBack={() => setSelectedId(null)}
                    onStatus={(status) => changeStatus(selected.id, status)}
                    onDelete={() => remove(selected.id)}
                  />
                ) : (
                  <div className="grid h-full min-h-64 place-items-center rounded-[2rem] border border-dashed border-[var(--glass-rim)] text-ink-2">
                    Select a message to read it
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </MotionConfig>
  );
}

function MessageList(props: {
  state: LoadState;
  messages: Message[];
  selectedId: string | null;
  onOpen: (message: Message) => void;
}) {
  if (props.state === "loading") {
    return <p className="relative z-2 p-6 text-center text-ink-2">Loading…</p>;
  }
  if (props.messages.length === 0) {
    return <p className="relative z-2 p-6 text-center text-ink-2">Nothing here.</p>;
  }
  return (
    <ul className="relative z-2 flex flex-col gap-1">
      {props.messages.map((m) => (
        <li key={m.id}>
          <button
            type="button"
            onClick={() => props.onOpen(m)}
            aria-current={props.selectedId === m.id ? "true" : undefined}
            className="w-full rounded-[1.5rem] px-4 py-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--glass-rim)_25%,transparent)] aria-[current]:bg-[color-mix(in_srgb,var(--glass-rim)_45%,transparent)]"
          >
            <span className="flex items-baseline gap-2">
              {m.status === "new" && (
                <span aria-label="Unread" className="size-2 shrink-0 rounded-full bg-accent-solid" />
              )}
              <span className={`truncate ${m.status === "new" ? "font-bold" : "font-semibold"}`}>
                {m.name}
              </span>
              <time
                dateTime={m.created_at}
                className="ml-auto shrink-0 text-sm text-ink-2 tabular-nums"
              >
                {shortDate.format(new Date(m.created_at))}
              </time>
            </span>
            <span className="mt-0.5 line-clamp-2 text-[15px] text-ink-2">{m.message}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function MessageDetail(props: {
  message: Message;
  onBack: () => void;
  onStatus: (status: MessageStatus) => void;
  onDelete: () => void;
}) {
  const m = props.message;
  const reply = `mailto:${m.email}?subject=${encodeURIComponent("Re: your message")}`;

  return (
    <article className="glass-strong rounded-[2rem] p-6 sm:p-8">
      <div className="relative z-2">
        <button
          type="button"
          onClick={props.onBack}
          className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-1 rounded-full px-2 font-semibold text-accent-solid lg:hidden"
        >
          <LuChevronLeft aria-hidden="true" />
          Messages
        </button>
        <h2 className="text-2xl font-bold tracking-tight">{m.name}</h2>
        <a href={`mailto:${m.email}`} className="mt-1 block text-accent-solid underline-offset-2 hover:underline">
          {m.email}
        </a>
        <time dateTime={m.created_at} className="mt-1 block text-sm text-ink-2">
          {fullDate.format(new Date(m.created_at))}
        </time>

        <p className="mt-6 text-[17px] leading-relaxed break-words whitespace-pre-wrap">{m.message}</p>

        <div className="mt-8 flex flex-wrap gap-2">
          <a href={reply} className={buttonClass("primary")}>
            <LuReply aria-hidden="true" />
            Reply
          </a>
          {m.status === "archived" ? (
            <ActionButton icon={<LuArchiveRestore />} onClick={() => props.onStatus("read")}>
              Move to read
            </ActionButton>
          ) : (
            <ActionButton icon={<LuArchive />} onClick={() => props.onStatus("archived")}>
              Archive
            </ActionButton>
          )}
          {m.status === "read" && (
            <ActionButton icon={<LuMail />} onClick={() => props.onStatus("new")}>
              Mark unread
            </ActionButton>
          )}
          {m.status === "new" && (
            <ActionButton icon={<LuMailOpen />} onClick={() => props.onStatus("read")}>
              Mark read
            </ActionButton>
          )}
          <ActionButton icon={<LuTrash2 />} onClick={props.onDelete}>
            Delete
          </ActionButton>
        </div>
      </div>
    </article>
  );
}

function ActionButton(props: { icon: ReactNode; onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={props.onClick} className={buttonClass()}>
      <span aria-hidden="true" className="relative z-2">
        {props.icon}
      </span>
      <span className="relative z-2">{props.children}</span>
    </button>
  );
}

function SignedOut() {
  return (
    <div className="grid flex-1 place-items-center">
      <div className="glass-strong max-w-sm rounded-[2rem] p-8 text-center">
        <div className="relative z-2">
          <LuLock aria-hidden="true" className="mx-auto size-8 text-accent-solid" />
          <h2 className="mt-4 text-2xl font-bold tracking-tight">Sign in required</h2>
          <p className="mt-2 text-ink-2">The inbox is protected by Cloudflare Access.</p>
          <a href="" className={`${buttonClass("primary")} mt-6`}>
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
