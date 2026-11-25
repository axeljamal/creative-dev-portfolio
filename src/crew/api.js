// Calls to /api/crew. Members are known by an httpOnly cookie the Worker sets; the team pages send the
// admin token the /admin inbox already keeps for this tab.

const TOKEN_KEY = "admin-token";
export const teamToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) ?? ""; } catch { return ""; } };
export const setTeamToken = (t) => { try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ } };

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function call(path, { method = "GET", body, team = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = team && teamToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api/crew${path}`, { method, headers, credentials: "same-origin", body: body && JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Something went wrong (${res.status}).`, res.status);
  return data;
}

export const api = {
  me: () => call("/me"),
  join: (body) => call("/join", { method: "POST", body }),
  leave: () => call("/leave", { method: "POST" }),
  tickQuest: (key) => call(`/quests/${key}`, { method: "POST" }),
  deck: () => call("/deck"),
  post: (body) => call("/deck", { method: "POST", body: { body } }),
  report: (targetType, targetId, reason) => call("/report", { method: "POST", body: { targetType, targetId, reason } }),
  waves: () => call("/waves"),
  feedback: (waveId, body) => call(`/waves/${waveId}/feedback`, { method: "POST", body }),
  team: {
    health: (demo) => call(`/team/health${demo ? "?demo=1" : ""}`, { team: true }),
    waves: (demo) => call(`/team/waves${demo ? "?demo=1" : ""}`, { team: true }),
    wave: (id) => call(`/team/waves/${id}`, { team: true }),
    retag: (id) => call(`/team/waves/${id}/retag`, { method: "POST", team: true }),
    reports: (demo) => call(`/team/reports${demo ? "?demo=1" : ""}`, { team: true }),
    decide: (id, action) => call(`/team/reports/${id}`, { method: "POST", body: { action }, team: true }),
  },
};

/** "3 days ago", "just now": short and kind to read */
export function ago(iso) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 90) return "just now";
  const m = s / 60, h = m / 60, d = h / 24;
  if (m < 60) return `${Math.round(m)} min ago`;
  if (h < 24) return `${Math.round(h)} h ago`;
  if (d < 30) return `${Math.round(d)} day${Math.round(d) === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export const pct = (v) => (v === null || v === undefined ? "–" : `${Math.round(v * 100)}%`);
