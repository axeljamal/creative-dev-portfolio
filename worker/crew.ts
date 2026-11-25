// /api/crew/*: the Crew, a players' community grown from zero around Pinisi Yard.
// Members: join (Turnstile-checked), stay signed in on their device with an httpOnly cookie, work through welcome
// quests, post on the deck, leave playtest feedback and report anything unkind. They can leave and take their data.
// Team (behind requireAdmin, like the inbox): health numbers, a one-page brief per playtest wave, the report queue.
import { requireAdmin } from "./access";
import { canSelfReport, isActivated, QUESTS, type QuestKey } from "../src/crew/logic/quests";
import { checkFeedback, checkJoin, checkPost, checkReport } from "../src/crew/logic/validate";
import { keywordTheme, parseModelTag, scoreMood, TAG_PROMPT, type Mood, type Theme } from "../src/crew/logic/tagging";
import { health, type MemberRow } from "../src/crew/logic/health";
import { waveBrief, type TaggedFeedback } from "../src/crew/logic/brief";

const TAG_MODEL = "@cf/google/gemma-4-26b-a4b-it";
const COOKIE = "crew";
const json = (data: unknown, status = 200, headers?: HeadersInit) => Response.json(data, { status, headers });
const now = () => new Date().toISOString();

type Member = { id: string; display_name: string; role: string; activated_at: string | null; created_at: string; is_demo: number };
type VerifyHuman = (token: string, ip: string | null) => Promise<boolean>;

export async function handleCrew(request: Request, env: Env, pathname: string, verifyHuman: VerifyHuman) {
  const path = pathname.slice("/api/crew".length);
  const method = request.method;

  if (path.startsWith("/team/")) {
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return team(request, env, path.slice("/team".length), method);
  }

  // public reads
  if (path === "/deck" && method === "GET") return json({ posts: await deck(env) });
  if (path === "/waves" && method === "GET") return json({ waves: await openWaves(env) });
  if (path === "/join" && method === "POST") return join(request, env, verifyHuman);

  // everything else needs a member
  const me = await member(request, env);
  if (!me) return json({ error: "Join the crew first." }, 401);

  if (path === "/me" && method === "GET") {
    await env.DB.prepare("UPDATE crew_members SET last_seen_at = ? WHERE id = ?").bind(now(), me.id).run();
    return json({ member: publicMember(me), quests: await questsDone(env, me.id), myFeedback: await myFeedback(env, me.id) });
  }
  if (path.startsWith("/quests/") && method === "POST") {
    const key = path.slice("/quests/".length);
    if (!canSelfReport(key)) return json({ error: "That quest ticks itself." }, 400);
    return json({ quests: await tick(env, me.id, key) });
  }
  if (path === "/deck" && method === "POST") {
    const body = await request.json<Record<string, unknown>>().catch(() => null);
    const post = checkPost(body);
    if (!post.ok) return json({ error: post.error }, 400);
    await env.DB.prepare("INSERT INTO crew_posts (id, member_id, body) VALUES (?, ?, ?)").bind(crypto.randomUUID(), me.id, post.value).run();
    return json({ posts: await deck(env), quests: await tick(env, me.id, "hello") }, 201);
  }
  const waveId = path.match(/^\/waves\/([\w-]+)\/feedback$/)?.[1];
  if (waveId && method === "POST") return feedback(request, env, me, waveId);
  if (path === "/report" && method === "POST") return report(request, env, me);
  if (path === "/leave" && method === "POST") {
    await env.DB.prepare("DELETE FROM crew_members WHERE id = ?").bind(me.id).run(); // posts, feedback, quests, sessions cascade
    return json({ ok: true }, 200, { "Set-Cookie": cookie("", 0) });
  }
  return json({ error: "Not found" }, 404);
}

// ---------- members ----------

async function join(request: Request, env: Env, verifyHuman: VerifyHuman) {
  const body = await request.json<Record<string, unknown>>().catch(() => null);
  if (body?.company) return json({ ok: true }); // the hidden field only bots fill
  const checked = checkJoin(body);
  if (!checked.ok) return json({ error: checked.error }, 400);
  const human = await verifyHuman(typeof body?.token === "string" ? body.token : "", request.headers.get("CF-Connecting-IP"));
  if (!human) return json({ error: "The spam check failed. Please try again." }, 403);

  const j = checked.value;
  const id = crypto.randomUUID();
  const token = randomToken();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO crew_members (id, display_name, email, plays, hangouts, would_build, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(id, j.displayName, j.email, j.plays, JSON.stringify(j.hangouts), j.wouldBuild, now()),
    env.DB.prepare("INSERT INTO crew_sessions (token_hash, member_id) VALUES (?, ?)").bind(await sha256(token), id),
  ]);
  return json({ ok: true }, 201, { "Set-Cookie": cookie(token, 60 * 60 * 24 * 365) });
}

async function member(request: Request, env: Env): Promise<Member | null> {
  const token = request.headers.get("Cookie")?.match(/(?:^|;\s*)crew=([\w-]+)/)?.[1];
  if (!token) return null;
  return env.DB.prepare(
    `SELECT m.id, m.display_name, m.role, m.activated_at, m.created_at, m.is_demo FROM crew_sessions s
     JOIN crew_members m ON m.id = s.member_id WHERE s.token_hash = ? AND m.removed_at IS NULL`,
  ).bind(await sha256(token)).first<Member>();
}

const publicMember = (m: Member) => ({ id: m.id, displayName: m.display_name, role: m.role, activated: !!m.activated_at, joined: m.created_at });

async function questsDone(env: Env, memberId: string) {
  const { results } = await env.DB.prepare("SELECT quest FROM crew_quests WHERE member_id = ?").bind(memberId).all<{ quest: string }>();
  const done = new Set(results.map((r) => r.quest));
  return QUESTS.map((q) => ({ ...q, done: done.has(q.key) }));
}

/** ticks a quest, and marks the member activated once every quest is done */
async function tick(env: Env, memberId: string, key: QuestKey) {
  await env.DB.prepare("INSERT OR IGNORE INTO crew_quests (member_id, quest) VALUES (?, ?)").bind(memberId, key).run();
  const quests = await questsDone(env, memberId);
  if (isActivated(quests.filter((q) => q.done).map((q) => q.key))) {
    await env.DB.prepare("UPDATE crew_members SET activated_at = COALESCE(activated_at, ?) WHERE id = ?").bind(now(), memberId).run();
  }
  return quests;
}

async function deck(env: Env) {
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.created_at, p.body, p.is_demo, m.display_name, m.role FROM crew_posts p
     JOIN crew_members m ON m.id = p.member_id
     WHERE p.hidden_at IS NULL AND m.removed_at IS NULL ORDER BY p.created_at DESC LIMIT 60`,
  ).all();
  return results;
}

async function openWaves(env: Env) {
  const { results } = await env.DB.prepare(
    "SELECT id, title, build, ask, play_url FROM crew_waves WHERE status = 'open' AND is_demo = 0 ORDER BY created_at DESC",
  ).all();
  return results;
}

async function myFeedback(env: Env, memberId: string) {
  const { results } = await env.DB.prepare("SELECT wave_id FROM crew_feedback WHERE member_id = ?").bind(memberId).all<{ wave_id: string }>();
  return results.map((r) => r.wave_id);
}

async function feedback(request: Request, env: Env, me: Member, waveId: string) {
  const wave = await env.DB.prepare("SELECT id FROM crew_waves WHERE id = ? AND status = 'open'").bind(waveId).first();
  if (!wave) return json({ error: "That playtest has closed." }, 404);
  const body = await request.json<Record<string, unknown>>().catch(() => null);
  const checked = checkFeedback(body);
  if (!checked.ok) return json({ error: checked.error }, 400);
  const { score, liked, blocked } = checked.value;
  // tagged by keyword at once, so the brief is never empty; the team can re-tag with the model later
  const result = await env.DB.prepare(
    "INSERT OR IGNORE INTO crew_feedback (id, wave_id, member_id, score, liked, blocked, theme, mood, tagged_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'keywords')",
  ).bind(crypto.randomUUID(), waveId, me.id, score, liked, blocked, keywordTheme(liked, blocked), scoreMood(score, blocked)).run();
  if (!result.meta.changes) return json({ error: "You've already given feedback on this build. Thank you!" }, 409);
  return json({ quests: await tick(env, me.id, "feedback") }, 201);
}

async function report(request: Request, env: Env, me: Member) {
  const body = await request.json<Record<string, unknown>>().catch(() => null);
  const checked = checkReport(body);
  if (!checked.ok) return json({ error: checked.error }, 400);
  const r = checked.value;
  const table = r.targetType === "post" ? "crew_posts" : "crew_feedback";
  const target = await env.DB.prepare(`SELECT id, is_demo FROM ${table} WHERE id = ?`).bind(r.targetId).first<{ is_demo: number }>();
  if (!target) return json({ error: "That's no longer there." }, 404);
  // a report on demo content is demo too, so it never lands in the real queue or the real numbers
  await env.DB.prepare("INSERT OR IGNORE INTO crew_reports (id, reporter_id, target_type, target_id, reason, note, is_demo) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), me.id, r.targetType, r.targetId, r.reason, r.note, target.is_demo).run();
  return json({ ok: true }, 201);
}

// ---------- team ----------

async function team(request: Request, env: Env, path: string, method: string) {
  const demo = new URL(request.url).searchParams.get("demo") === "1" ? 1 : 0;

  if (path === "/health" && method === "GET") {
    const [members, fb, reports, places] = await Promise.all([
      env.DB.prepare("SELECT created_at, last_seen_at, activated_at FROM crew_members WHERE is_demo = ? AND removed_at IS NULL").bind(demo).all<MemberRow>(),
      env.DB.prepare("SELECT member_id FROM crew_feedback WHERE is_demo = ?").bind(demo).all<{ member_id: string }>(),
      env.DB.prepare("SELECT status FROM crew_reports WHERE is_demo = ?").bind(demo).all<{ status: string }>(),
      env.DB.prepare("SELECT hangouts FROM crew_members WHERE is_demo = ? AND removed_at IS NULL").bind(demo).all<{ hangouts: string }>(),
    ]);
    const hangouts: Record<string, number> = {};
    for (const h of places.results) for (const place of safeList(h.hangouts)) hangouts[place] = (hangouts[place] ?? 0) + 1;
    return json({ health: health(members.results, fb.results, reports.results, new Date()), hangouts, demo: !!demo });
  }

  if (path === "/waves" && method === "GET") {
    const { results } = await env.DB.prepare(
      `SELECT w.id, w.title, w.build, w.ask, w.play_url, w.status, w.created_at, COUNT(f.id) AS responses
       FROM crew_waves w LEFT JOIN crew_feedback f ON f.wave_id = w.id AND f.hidden_at IS NULL
       WHERE w.is_demo = ? GROUP BY w.id ORDER BY w.created_at DESC`,
    ).bind(demo).all();
    return json({ waves: results });
  }
  if (path === "/waves" && method === "POST") {
    const b = await request.json<Record<string, unknown>>().catch(() => null);
    const title = str(b?.title, 80), build = str(b?.build, 40), ask = str(b?.ask, 400), playUrl = str(b?.playUrl, 300);
    if (!title || !build || !ask || !/^\/[\w\-/?=&.]*$/.test(playUrl)) return json({ error: "Fill in the title, build, ask and a link on this site (starting with /)." }, 400);
    await env.DB.batch([
      env.DB.prepare("UPDATE crew_waves SET status = 'closed' WHERE status = 'open' AND is_demo = 0"), // one open wave at a time
      env.DB.prepare("INSERT INTO crew_waves (id, title, build, ask, play_url) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), title, build, ask, playUrl),
    ]);
    return json({ ok: true }, 201);
  }

  const waveId = path.match(/^\/waves\/([\w-]+)$/)?.[1];
  if (waveId && method === "GET") {
    const items = await taggedFeedback(env, waveId);
    const tagged = items.filter((f): f is typeof f & TaggedFeedback => !!f.theme && !!f.mood);
    return json({ brief: waveBrief(tagged), byModel: tagged.filter((f) => f.tagged_by === "model").length, items });
  }
  const retagId = path.match(/^\/waves\/([\w-]+)\/retag$/)?.[1];
  if (retagId && method === "POST") return retag(env, retagId);

  if (path === "/reports" && method === "GET") {
    const { results } = await env.DB.prepare(
      `SELECT MIN(r.id) AS id, MAX(r.created_at) AS created_at, r.target_type, r.target_id, COUNT(*) AS reports,
         GROUP_CONCAT(DISTINCT r.reason) AS reason, GROUP_CONCAT(NULLIF(r.note, ''), ' · ') AS note,
         COALESCE(p.body, TRIM(f.liked || ' / ' || f.blocked)) AS target_text,
         COALESCE(pm.display_name, fm.display_name) AS author
       FROM crew_reports r
       LEFT JOIN crew_posts p ON r.target_type = 'post' AND p.id = r.target_id
       LEFT JOIN crew_members pm ON pm.id = p.member_id
       LEFT JOIN crew_feedback f ON r.target_type = 'feedback' AND f.id = r.target_id
       LEFT JOIN crew_members fm ON fm.id = f.member_id
       WHERE r.status = 'open' AND r.is_demo = ?
       GROUP BY r.target_type, r.target_id ORDER BY COUNT(*) DESC, MIN(r.created_at)`,
    ).bind(demo).all();
    return json({ reports: results });
  }
  const reportId = path.match(/^\/reports\/([\w-]+)$/)?.[1];
  if (reportId && method === "POST") {
    const b = await request.json<{ action?: string }>().catch(() => null);
    const action = b?.action;
    if (action !== "kept" && action !== "hidden" && action !== "removed") return json({ error: "Keep, hide or remove." }, 400);
    const r = await env.DB.prepare("SELECT target_type, target_id FROM crew_reports WHERE id = ?").bind(reportId).first<{ target_type: string; target_id: string }>();
    if (!r) return json({ error: "Not found" }, 404);
    const table = r.target_type === "post" ? "crew_posts" : "crew_feedback";
    const steps = [
      env.DB.prepare("UPDATE crew_reports SET status = ?, decided_at = ? WHERE target_type = ? AND target_id = ? AND status = 'open'").bind(action, now(), r.target_type, r.target_id),
    ];
    if (action !== "kept") steps.push(env.DB.prepare(`UPDATE ${table} SET hidden_at = ? WHERE id = ?`).bind(now(), r.target_id));
    if (action === "removed") {
      // removing the author: signed out everywhere, and cannot sign back in
      steps.push(env.DB.prepare(`UPDATE crew_members SET removed_at = ? WHERE id = (SELECT member_id FROM ${table} WHERE id = ?)`).bind(now(), r.target_id));
      steps.push(env.DB.prepare(`DELETE FROM crew_sessions WHERE member_id = (SELECT member_id FROM ${table} WHERE id = ?)`).bind(r.target_id));
    }
    await env.DB.batch(steps);
    return json({ ok: true });
  }
  return json({ error: "Not found" }, 404);
}

async function taggedFeedback(env: Env, waveId: string) {
  const { results } = await env.DB.prepare(
    "SELECT id, score, liked, blocked, theme, mood, tagged_by, created_at FROM crew_feedback WHERE wave_id = ? AND hidden_at IS NULL ORDER BY created_at DESC",
  ).bind(waveId).all<{ id: string; score: number; liked: string; blocked: string; theme: Theme | null; mood: Mood | null; tagged_by: string | null; created_at: string }>();
  return results;
}

/** asks the model to tag up to 20 not-yet-model-tagged responses; keeps the keyword tag when the model can't answer */
async function retag(env: Env, waveId: string) {
  const { results } = await env.DB.prepare(
    "SELECT id, score, liked, blocked FROM crew_feedback WHERE wave_id = ? AND hidden_at IS NULL AND COALESCE(tagged_by, '') <> 'model' LIMIT 20",
  ).bind(waveId).all<{ id: string; score: number; liked: string; blocked: string }>();
  const updates = [];
  for (const f of results) {
    const tag = await modelTag(env, f).catch((err) => (console.error("crew tag", err), null));
    if (tag) updates.push(env.DB.prepare("UPDATE crew_feedback SET theme = ?, mood = ?, tagged_by = 'model' WHERE id = ?").bind(tag.theme, tag.mood, f.id));
  }
  if (updates.length) await env.DB.batch(updates);
  return json({ checked: results.length, byModel: updates.length });
}

async function modelTag(env: Env, f: { score: number; liked: string; blocked: string }) {
  const out = (await env.AI.run(TAG_MODEL as Parameters<Ai["run"]>[0], {
    messages: [
      { role: "system", content: TAG_PROMPT },
      { role: "user", content: `Score: ${f.score} out of 5\nWhat felt good: ${f.liked || "(nothing)"}\nWhat got in the way: ${f.blocked || "(nothing)"}` },
    ],
    max_completion_tokens: 40,
    temperature: 0,
    chat_template_kwargs: { enable_thinking: false },
  } as never)) as { response?: string; choices?: { message?: { content?: string } }[] };
  return parseModelTag(out.response ?? out.choices?.[0]?.message?.content ?? "");
}

// ---------- helpers ----------

function cookie(value: string, maxAge: number) {
  return `${COOKIE}=${value}; Path=/api/crew; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim().length <= max ? v.trim() : "");

function safeList(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
