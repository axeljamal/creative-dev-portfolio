export type MessageStatus = "new" | "read" | "archived";

export type Message = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  message: string;
  status: MessageStatus;
};

export class NotSignedIn extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}api/admin/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json" },
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

export const deleteMessage = (id: string) => request(`messages/${id}`, { method: "DELETE" });
