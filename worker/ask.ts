// POST /api/ask: Pip answers a visitor's question about Axel and the work, from the portfolio's own words only.
// Live, the model is Gemma 4 on Cloudflare Workers AI (no key to keep). On a laptop, HELMSMAN_LLM=ollama in .dev.vars
// sends the same conversation to a local Ollama model instead, so the chat can be built offline for free.
import { PIP_BRIEF, PLACE_IDS } from "../src/dua-pulau/brief";

const MODEL = "@cf/google/gemma-4-26b-a4b-it";
const MAX_TURNS = 6; // the last few lines of the conversation, enough to follow a thread
const MAX_ASK = 300; // a visitor's question
const MAX_HEARD = 1200; // one of Pip's own earlier replies, sent back for context
const RESTING = "Pip is having a nap just now. The Log will still take you to every place.";

type AskEnv = Env & { HELMSMAN_LLM?: string; OLLAMA_URL?: string; OLLAMA_MODEL?: string };
type Line = { role: "user" | "assistant"; content: string };

const json = (data: unknown, status = 200) => Response.json(data, { status });

export async function handleAsk(request: Request, env: AskEnv) {
  const ip = request.headers.get("CF-Connecting-IP") ?? "local";
  const { success } = await env.ASK_LIMIT.limit({ key: ip });
  if (!success) return json({ reply: "Easy there, one question at a time. Ask me again in a minute.", resting: true }, 429);

  const body = await request.json<{ messages?: unknown }>().catch(() => null);
  const lines = conversation(body?.messages);
  if (!lines) return json({ error: "Ask a question of up to 300 characters." }, 400);

  let text: string;
  try {
    text = env.HELMSMAN_LLM === "ollama" ? await ollama(env, lines) : await workersAi(env, lines);
  } catch (err) {
    console.error("pip", err);
    return json({ reply: RESTING, resting: true }, 503);
  }
  return json(answer(text));
}

/** the visitor's conversation, trimmed and checked; null when it is not one */
function conversation(raw: unknown): Line[] | null {
  if (!Array.isArray(raw)) return null;
  const lines: Line[] = [];
  for (const m of raw.slice(-MAX_TURNS)) {
    const role = m?.role, content = typeof m?.content === "string" ? m.content.trim() : "";
    if ((role !== "user" && role !== "assistant") || !content) return null;
    if (role === "user" && content.length > MAX_ASK) return null;
    lines.push({ role, content: content.slice(0, MAX_HEARD) });
  }
  return lines.at(-1)?.role === "user" ? lines : null;
}

/** the reply as plain words, and the one real place it offers to sail to, if any. Whatever the model does, a visitor
 * never sees code, Pip's orders recited, or a long lecture: those become one line steering back to the islands. */
function answer(raw: string) {
  let text = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const id = text.match(/^\s*SAIL:\s*([a-z]+)\s*$/im)?.[1]?.toLowerCase();
  text = text.replace(/^\s*SAIL:.*$/gim, "").trim();
  if (/```|Rules you always keep|^FACTS$|^\[(?:gate|pier|buoy)\]|\(sail id: [a-z]+;/m.test(text)) {
    return { reply: "That's not for these waters. Ask me about Axel's work, or where to sail next." };
  }
  text = text.replace(/\*\*|__|^#+\s*|^\s*[*-]\s+/gm, "").replace(/\n{2,}/g, "\n").trim();
  if (text.length > 700) text = `${text.slice(0, 700).replace(/[^.!?]*$/, "").trim() || text.slice(0, 700)}`;
  const sail = PLACE_IDS.find((p) => p === id);
  return { reply: text || RESTING, ...(sail ? { sail } : {}) };
}

async function workersAi(env: AskEnv, lines: Line[]) {
  const out = (await env.AI.run(MODEL as Parameters<Ai["run"]>[0], {
    messages: [{ role: "system", content: PIP_BRIEF }, ...lines],
    max_completion_tokens: 320,
    temperature: 0.4,
    // Gemma 4 thinks before it speaks by default, and the thinking alone used up the whole reply budget
    chat_template_kwargs: { enable_thinking: false },
  } as never)) as { response?: string; choices?: { message?: { content?: string } }[] };
  const text = out.response ?? out.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error(`no text from ${MODEL}`);
  return text;
}

async function ollama(env: AskEnv, lines: Line[]) {
  const res = await fetch(`${env.OLLAMA_URL || "http://localhost:11434"}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: env.OLLAMA_MODEL || "gemma3:1b",
      stream: false,
      messages: [{ role: "system", content: PIP_BRIEF }, ...lines],
      options: { num_predict: 320, temperature: 0.4, num_ctx: 8192 },
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const out = await res.json<{ message?: { content?: string } }>();
  if (typeof out.message?.content !== "string") throw new Error("no text from ollama");
  return out.message.content;
}
