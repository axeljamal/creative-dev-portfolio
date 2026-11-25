// Checks on what members send, shared by the Worker and the tests. Each returns clean values or an error to show.

export const HANGOUTS = ["discord", "reddit", "tiktok", "youtube", "twitch", "other"] as const;
export type Hangout = (typeof HANGOUTS)[number];

export const LIMITS = { name: 40, email: 320, plays: 200, build: 200, post: 500, feedback: 1000, note: 300 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const text = (v: unknown) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");
const longText = (v: unknown) => (typeof v === "string" ? v.trim().replace(/\n{3,}/g, "\n\n") : "");

export type Join = { displayName: string; email: string | null; plays: string; hangouts: Hangout[]; wouldBuild: string };

export function checkJoin(body: Record<string, unknown> | null): Result<Join> {
  if (!body) return { ok: false, error: "Something went wrong. Please try again." };
  if (body.adult !== true) return { ok: false, error: "The crew is for people aged 18 and over for now." };
  const displayName = text(body.displayName);
  if (displayName.length < 2 || displayName.length > LIMITS.name) {
    return { ok: false, error: `Pick a crew name of 2 to ${LIMITS.name} characters.` };
  }
  const rawEmail = text(body.email);
  if (rawEmail && (!EMAIL_RE.test(rawEmail) || rawEmail.length > LIMITS.email)) {
    return { ok: false, error: "That email address doesn't look right. You can leave it empty." };
  }
  const plays = text(body.plays).slice(0, LIMITS.plays);
  const wouldBuild = text(body.wouldBuild).slice(0, LIMITS.build);
  const hangouts = Array.isArray(body.hangouts)
    ? [...new Set(body.hangouts.filter((h): h is Hangout => HANGOUTS.includes(h as Hangout)))]
    : [];
  return { ok: true, value: { displayName, email: rawEmail ? rawEmail.toLowerCase() : null, plays, hangouts, wouldBuild } };
}

export function checkPost(body: Record<string, unknown> | null): Result<string> {
  const post = longText(body?.body);
  if (!post) return { ok: false, error: "Write something first." };
  if (post.length > LIMITS.post) return { ok: false, error: `Keep it under ${LIMITS.post} characters.` };
  return { ok: true, value: post };
}

export type Feedback = { score: number; liked: string; blocked: string };

export function checkFeedback(body: Record<string, unknown> | null): Result<Feedback> {
  const score = Number(body?.score);
  if (!Number.isInteger(score) || score < 1 || score > 5) return { ok: false, error: "Pick a score from 1 to 5." };
  const liked = longText(body?.liked), blocked = longText(body?.blocked);
  if (!liked && !blocked) return { ok: false, error: "Tell us at least one thing: what felt good, or what got in the way." };
  if (liked.length > LIMITS.feedback || blocked.length > LIMITS.feedback) {
    return { ok: false, error: `Keep each answer under ${LIMITS.feedback} characters.` };
  }
  return { ok: true, value: { score, liked, blocked } };
}

export const REASONS = ["unkind", "spam", "unsafe", "other"] as const;
export type Reason = (typeof REASONS)[number];

export function checkReport(body: Record<string, unknown> | null): Result<{ targetType: "post" | "feedback"; targetId: string; reason: Reason; note: string }> {
  const targetType = body?.targetType;
  const targetId = text(body?.targetId);
  const reason = body?.reason;
  if ((targetType !== "post" && targetType !== "feedback") || !/^[\w-]{1,64}$/.test(targetId)) {
    return { ok: false, error: "That can't be reported." };
  }
  if (!REASONS.includes(reason as Reason)) return { ok: false, error: "Pick a reason." };
  return { ok: true, value: { targetType, targetId, reason: reason as Reason, note: text(body?.note).slice(0, LIMITS.note) } };
}
