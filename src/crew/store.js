// Who is signed in, shared by every brick: each one subscribes when it connects and redraws when this changes.
import { api, ApiError } from "./api.js";

let state = { loaded: false, member: null, quests: [], myFeedback: [] };
const listeners = new Set();

export const getState = () => state;

export function subscribe(fn) {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

export function set(partial) {
  state = { ...state, ...partial };
  for (const fn of listeners) fn(state);
}

export async function load() {
  try {
    const { member, quests, myFeedback } = await api.me();
    set({ loaded: true, member, quests, myFeedback });
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 401)) console.error(err);
    set({ loaded: true, member: null, quests: [], myFeedback: [] });
  }
}
