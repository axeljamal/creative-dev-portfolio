import { requireAdmin } from "./access";

const STATUSES = ["new", "read", "archived"];
const LIMITS = { name: 200, email: 320, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (data: unknown, status = 200) => Response.json(data, { status });

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const { pathname } = new URL(request.url);
    try {
      if (pathname === "/api/contact" && request.method === "POST") {
        return await handleContact(request, env, ctx);
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

// email alert through Resend; skipped until RESEND_API_KEY and NOTIFY_EMAIL are set
async function notify(env: Env, msg: { name: string; email: string; message: string }) {
  if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL) return;
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
  if (!res.ok) console.error("Alert email failed", res.status, await res.text());
}

// ---------- admin: inbox ----------

async function handleAdmin(request: Request, env: Env, pathname: string) {
  if (pathname === "/api/admin/messages" && request.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id, created_at, name, email, message, status FROM messages ORDER BY created_at DESC LIMIT 500",
    ).all();
    return json({ messages: results });
  }

  const id = pathname.match(/^\/api\/admin\/messages\/([\w-]+)$/)?.[1];
  if (!id) return json({ error: "Not found" }, 404);

  if (request.method === "PATCH") {
    const body = await request.json<{ status?: string }>().catch(() => null);
    const status = body?.status;
    if (!status || !STATUSES.includes(status)) return json({ error: "Invalid status" }, 400);
    const result = await env.DB.prepare("UPDATE messages SET status = ? WHERE id = ?")
      .bind(status, id)
      .run();
    return result.meta.changes ? json({ ok: true }) : json({ error: "Not found" }, 404);
  }

  if (request.method === "DELETE") {
    const result = await env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(id).run();
    return result.meta.changes ? json({ ok: true }) : json({ error: "Not found" }, 404);
  }

  return json({ error: "Method not allowed" }, 405);
}
