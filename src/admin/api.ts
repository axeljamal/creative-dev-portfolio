export type MessageStatus = "new" | "read" | "archived";

export type Message = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  message: string;
  status: MessageStatus;
  reply_draft: string | null;
  proposal_url: string | null;
  replied_at: string | null;
};

export type MessageUpdate = Partial<{
  status: MessageStatus;
  reply_draft: string | null;
  proposal_url: string | null;
  replied: boolean;
}>;

export class NotSignedIn extends Error {}

// the admin token, kept for this tab only; Cloudflare Access, when set up, needs no token
const TOKEN_KEY = "admin-token";
export const getToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) ?? ""; } catch { return ""; } };
export const setToken = (token: string) => { try { if (token) sessionStorage.setItem(TOKEN_KEY, token); else sessionStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ } };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${import.meta.env.BASE_URL}api/admin/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
  });
  if (res.status === 401) throw new NotSignedIn();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const listMessages = () =>
  request<{ messages: Message[] }>("messages").then((d) => d.messages);

export const setStatus = (id: string, status: MessageStatus) =>
  request(`messages/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });

export const updateMessage = (id: string, update: MessageUpdate) =>
  request(`messages/${id}`, { method: "PATCH", body: JSON.stringify(update) });

export const deleteMessage = (id: string) => request(`messages/${id}`, { method: "DELETE" });
