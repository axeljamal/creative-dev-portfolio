import { EmailMessage } from "cloudflare:email";
import { createMimeMessage, Mailbox } from "mimetext";
import { requireAdmin } from "./access";
import { handleAsk } from "./ask";
import { handleCrew } from "./crew";

// the alert binding is optional until Email Routing is on for the domain (see wrangler.jsonc)
type EnvWithMail = Env & { ALERTS?: { send(message: EmailMessage): Promise<unknown> }; ADMIN_TOKEN?: string };

const STATUSES = ["new", "read", "archived"];
const LIMITS = { name: 200, email: 320, message: 5000, draft: 10000, url: 500 };
// proposal links may only point at the studio's own pages
const PROPOSAL_HOSTS = ["marea-dvipa.uk", "axelle.marea-dvipa.uk"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (data: unknown, status = 200) => Response.json(data, { status });

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const { pathname } = new URL(request.url);
    try {
      if (pathname === "/api/contact" && request.method === "POST") {
        return await handleContact(request, env, ctx);
      }
      if (pathname === "/api/ask" && request.method === "POST") {
        return await handleAsk(request, env);
      }
      if (pathname.startsWith("/api/crew/")) {
        return await handleCrew(request, env, pathname, (token, ip) => verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, ip));
      }
      if (pathname.startsWith("/api/admin/")) {
        const denied = await requireAdmin(request, env);
        if (denied) return denied;
        return await handleAdmin(request, env, pathname);
      }
      return json({ error: "Not found" }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: "Server error" }, 500);
    }
  },
} satisfies ExportedHandler<Env>;

// ---------- public: contact form ----------

async function handleContact(request: Request, env: Env, ctx: ExecutionContext) {
  const body = await request.json<Record<string, unknown>>().catch(() => null);
  if (!body) return json({ error: "Invalid request" }, 400);

  // bots fill the hidden "company" field; pretend it worked
  if (body.company) return json({ ok: true });

  const name = field(body.name, LIMITS.name);
  const email = field(body.email, LIMITS.email);
  const message = field(body.message, LIMITS.message);
  if (!name || !message || !EMAIL_RE.test(email)) {
    return json({ error: "Please fill in every field with a valid email address." }, 400);
  }

  const token = typeof body.token === "string" ? body.token : "";
  const human = await verifyTurnstile(
    token,
    env.TURNSTILE_SECRET_KEY,
    request.headers.get("CF-Connecting-IP"),
  );
  if (!human) return json({ error: "The spam check failed. Please try again." }, 403);

  await env.DB.prepare("INSERT INTO messages (id, name, email, message) VALUES (?, ?, ?, ?)")
    .bind(crypto.randomUUID(), name, email, message)
    .run();

  ctx.waitUntil(notify(env, { name, email, message }));
  return json({ ok: true }, 201);
}

function isProposalUrl(value: unknown) {
  if (typeof value !== "string" || value.length > LIMITS.url) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && PROPOSAL_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

// trimmed string, or "" when missing or too long
function field(value: unknown, max: number) {
  const s = typeof value === "string" ? value.trim() : "";
  return s.length <= max ? s : "";
}

async function verifyTurnstile(token: string, secret: string, ip: string | null) {
  if (!token || !secret) return false;
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const outcome = await res.json<{ success: boolean }>();
  return outcome.success;
}

// an email alert for every message: through Cloudflare Email Routing when the ALERTS binding is set, else through Resend
// when RESEND_API_KEY is set; nothing is sent until one of them is, but the message is already safe in the database
// returns what happened, so /api/admin/test-alert can report it
async function notify(env: EnvWithMail, msg: { name: string; email: string; message: string }): Promise<string> {
  if (!env.NOTIFY_EMAIL) return "alerts off: NOTIFY_EMAIL is empty";
  let routingError = "";
  if (env.ALERTS) {
    try {
      const mime = createMimeMessage();
      mime.setSender({ name: "Portfolio", addr: "portfolio@marea-dvipa.uk" });
      mime.setRecipient(env.NOTIFY_EMAIL);
      mime.setHeader("Reply-To", new Mailbox(msg.email));
      mime.setSubject(`New message from ${msg.name}`);
      mime.addMessage({ contentType: "text/plain", data: `${msg.message}\n\n${msg.name} <${msg.email}>\n\nReply to this email to answer, or open the inbox at https://axelle.marea-dvipa.uk/admin` });
      await env.ALERTS.send(new EmailMessage("portfolio@marea-dvipa.uk", env.NOTIFY_EMAIL, mime.asRaw()));
      return "sent through Email Routing";
    } catch (err) {
      console.error("Alert email through Email Routing failed", err);
      routingError = `Email Routing failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
  if (!env.RESEND_API_KEY) return routingError || "alerts off: no ALERTS binding or RESEND_API_KEY";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Portfolio <onboarding@resend.dev>",
      to: [env.NOTIFY_EMAIL],
      reply_to: msg.email,
      subject: `New message from ${msg.name}`,
      text: `${msg.message}\n\n${msg.name} <${msg.email}>`,
    }),
  });
  if (res.ok) return "sent through Resend";
  const detail = `Resend failed: ${res.status} ${await res.text()}`;
  console.error("Alert email failed", detail);
  return [routingError, detail].filter(Boolean).join("; ");
}

// ---------- admin: inbox ----------

async function handleAdmin(request: Request, env: Env, pathname: string) {
  // sends a sample alert and reports what happened, to check alerts without the public form
  if (pathname === "/api/admin/test-alert" && request.method === "POST") {
    const result = await notify(env, { name: "Test alert", email: "hello@marea-dvipa.uk", message: "This is a test alert from /api/admin/test-alert." });
    return json({ result });
  }

  if (pathname === "/api/admin/messages" && request.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id, created_at, name, email, message, status, reply_draft, proposal_url, replied_at FROM messages ORDER BY created_at DESC LIMIT 500",
    ).all();
    return json({ messages: results });
  }

  const id = pathname.match(/^\/api\/admin\/messages\/([\w-]+)$/)?.[1];
  if (!id) return json({ error: "Not found" }, 404);

  if (request.method === "PATCH") {
    const body = await request.json<Record<string, unknown>>().catch(() => null);
    if (!body) return json({ error: "Invalid request" }, 400);
    const sets: string[] = [];
    const values: (string | null)[] = [];

    if ("status" in body) {
      if (typeof body.status !== "string" || !STATUSES.includes(body.status)) return json({ error: "Invalid status" }, 400);
      sets.push("status = ?");
      values.push(body.status);
    }
    if ("reply_draft" in body) {
      if (body.reply_draft !== null && (typeof body.reply_draft !== "string" || body.reply_draft.length > LIMITS.draft)) {
        return json({ error: "The draft is too long" }, 400);
      }
      sets.push("reply_draft = ?");
      values.push((body.reply_draft as string | null) || null);
    }
    if ("proposal_url" in body) {
      const url = body.proposal_url;
      if (url !== null && url !== "" && !isProposalUrl(url)) {
        return json({ error: "Proposal links must be https pages on marea-dvipa.uk" }, 400);
      }
      sets.push("proposal_url = ?");
      values.push((url as string | null) || null);
    }
    if ("replied" in body) {
      if (typeof body.replied !== "boolean") return json({ error: "Invalid replied flag" }, 400);
      sets.push("replied_at = ?");
      values.push(body.replied ? new Date().toISOString() : null);
    }
    if (sets.length === 0) return json({ error: "Nothing to update" }, 400);

    const result = await env.DB.prepare(`UPDATE messages SET ${sets.join(", ")} WHERE id = ?`)
      .bind(...values, id)
      .run();
    return result.meta.changes ? json({ ok: true }) : json({ error: "Not found" }, 404);
  }

  if (request.method === "DELETE") {
    const result = await env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(id).run();
    return result.meta.changes ? json({ ok: true }) : json({ error: "Not found" }, 404);
  }

  return json({ error: "Method not allowed" }, 405);
}
