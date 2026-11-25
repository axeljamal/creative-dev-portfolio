// The welcome quests a new crew member works through. Finishing all three marks them activated:
// the activation rate on the health page is the share of members who got this far.

export type QuestKey = "hello" | "build" | "feedback";

export const QUESTS: { key: QuestKey; title: string; how: string; selfReport: boolean }[] = [
  { key: "hello", title: "Say hello on the deck", how: "Post a line about the boat you want to build.", selfReport: false },
  { key: "build", title: "Build your first boat", how: "Open the current Pinisi Yard build and launch a boat.", selfReport: true },
  { key: "feedback", title: "Give your first feedback", how: "Tell the team what felt good and what got in the way.", selfReport: false },
];

export const QUEST_KEYS = QUESTS.map((q) => q.key);

/** a member is activated once every welcome quest is done */
export function isActivated(done: Iterable<string>) {
  const have = new Set(done);
  return QUEST_KEYS.every((k) => have.has(k));
}

/** quests a member may tick off themselves; the others tick when they post or give feedback */
export function canSelfReport(key: string): key is QuestKey {
  return QUESTS.some((q) => q.key === key && q.selfReport);
}
