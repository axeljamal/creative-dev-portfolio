import { describe, expect, it } from "vitest";
import { canSelfReport, isActivated } from "./quests";
import { checkFeedback, checkJoin, checkPost, checkReport } from "./validate";
import { keywordTheme, parseModelTag, scoreMood } from "./tagging";
import { health } from "./health";
import { quote, waveBrief, type TaggedFeedback } from "./brief";

describe("quests", () => {
  it("activates only when every welcome quest is done", () => {
    expect(isActivated(["hello", "build"])).toBe(false);
    expect(isActivated(["feedback", "build", "hello"])).toBe(true);
  });
  it("lets members tick only the build quest themselves", () => {
    expect(canSelfReport("build")).toBe(true);
    expect(canSelfReport("hello")).toBe(false);
    expect(canSelfReport("anything")).toBe(false);
  });
});

describe("joining", () => {
  const good = { adult: true, displayName: "  Sea  Gull ", email: "", plays: "Sea of Thieves", hangouts: ["discord", "discord", "myspace"], wouldBuild: "a fast red pinisi" };
  it("cleans a good sign-up", () => {
    const r = checkJoin(good);
    expect(r).toEqual({ ok: true, value: { displayName: "Sea Gull", email: null, plays: "Sea of Thieves", hangouts: ["discord"], wouldBuild: "a fast red pinisi" } });
  });
  it("needs the 18+ confirmation", () => {
    expect(checkJoin({ ...good, adult: "yes" }).ok).toBe(false);
  });
  it("rejects a bad name or email", () => {
    expect(checkJoin({ ...good, displayName: "x" }).ok).toBe(false);
    expect(checkJoin({ ...good, email: "not-an-email" }).ok).toBe(false);
  });
  it("keeps a valid email in lower case", () => {
    const r = checkJoin({ ...good, email: "Gull@Example.COM" });
    expect(r.ok && r.value.email).toBe("gull@example.com");
  });
});

describe("posts, feedback and reports", () => {
  it("needs words in a post, under the limit", () => {
    expect(checkPost({ body: "   " }).ok).toBe(false);
    expect(checkPost({ body: "x".repeat(501) }).ok).toBe(false);
    expect(checkPost({ body: "Ahoy!" })).toEqual({ ok: true, value: "Ahoy!" });
  });
  it("needs a whole score from 1 to 5 and at least one answer", () => {
    expect(checkFeedback({ score: 6, liked: "ok" }).ok).toBe(false);
    expect(checkFeedback({ score: 2.5, liked: "ok" }).ok).toBe(false);
    expect(checkFeedback({ score: 3 }).ok).toBe(false);
    expect(checkFeedback({ score: "4", liked: "the paint" })).toEqual({ ok: true, value: { score: 4, liked: "the paint", blocked: "" } });
  });
  it("only reports known things for known reasons", () => {
    expect(checkReport({ targetType: "member", targetId: "a", reason: "spam" }).ok).toBe(false);
    expect(checkReport({ targetType: "post", targetId: "a b", reason: "spam" }).ok).toBe(false);
    expect(checkReport({ targetType: "post", targetId: "p-1", reason: "rude" }).ok).toBe(false);
    expect(checkReport({ targetType: "post", targetId: "p-1", reason: "unkind" }).ok).toBe(true);
  });
});

describe("tagging", () => {
  it("lets what got in the way decide the theme", () => {
    expect(keywordTheme("love the batik sails", "the camera kept spinning when I tried to rotate the hull")).toBe("controls");
    expect(keywordTheme("love the batik sails", "")).toBe("building");
    expect(keywordTheme("", "it crashed when I launched")).toBe("bugs");
    expect(keywordTheme("nice", "meh")).toBe("other");
  });
  it("reads mood from the score", () => {
    expect(scoreMood(5, "")).toBe("positive");
    expect(scoreMood(4, "the mast would not snap onto the deck and I had to restart twice")).toBe("mixed");
    expect(scoreMood(3, "")).toBe("mixed");
    expect(scoreMood(1, "")).toBe("negative");
  });
  it("accepts only a theme and mood from the lists", () => {
    expect(parseModelTag('Sure! {"theme": "Sailing", "mood": "positive"}')).toEqual({ theme: "sailing", mood: "positive" });
    expect(parseModelTag('{"theme": "vibes", "mood": "positive"}')).toBeNull();
    expect(parseModelTag("no json here")).toBeNull();
  });
});

describe("health", () => {
  const now = new Date("2026-11-25T12:00:00Z");
  const members = [
    { created_at: "2026-11-01T10:00:00Z", last_seen_at: "2026-11-20T10:00:00Z", activated_at: "2026-11-02T10:00:00Z" },
    { created_at: "2026-11-10T10:00:00Z", last_seen_at: "2026-11-11T10:00:00Z", activated_at: null },
    { created_at: "2026-11-24T10:00:00Z", last_seen_at: null, activated_at: "2026-11-24T11:00:00Z" },
    { created_at: "2026-11-23T10:00:00Z", last_seen_at: null, activated_at: null },
  ];
  it("works out the five numbers", () => {
    const h = health(members, [{ member_id: "a" }, { member_id: "a" }, { member_id: "b" }], [{ status: "open" }, { status: "kept" }], now);
    expect(h).toEqual({
      members: 4,
      joinedThisWeek: 2,
      activationRate: 0.5,
      returnRate7d: 0.5, // two joined 7+ days ago, one came back a week later
      feedbackPerTester: 1.5,
      openReports: 1,
      reportsPer100: 50,
    });
  });
  it("leaves rates empty rather than dividing by zero", () => {
    expect(health([], [], [], now)).toMatchObject({ activationRate: null, returnRate7d: null, feedbackPerTester: null, reportsPer100: null });
  });
});

describe("wave brief", () => {
  const f = (id: string, score: number, liked: string, blocked: string, theme: TaggedFeedback["theme"], mood: TaggedFeedback["mood"]): TaggedFeedback => ({ id, score, liked, blocked, theme, mood });
  const items = [
    f("1", 2, "", "Couldn't rotate the mast, the camera spun", "controls", "negative"),
    f("2", 3, "pretty", "Rotating pieces is fiddly on a trackpad", "controls", "mixed"),
    f("3", 2, "", "No idea how to start", "onboarding", "negative"),
    f("4", 5, "Painting the sails with batik is lovely", "", "building", "positive"),
    f("5", 4, "Racing my own boat!", "", "sailing", "positive"),
    f("6", 3, "", "A bit slow to load", "performance", "mixed"),
  ];
  it("puts the most painful problem first, with players' words", () => {
    const b = waveBrief(items);
    expect(b.responses).toBe(6);
    expect(b.averageScore).toBe(3.2);
    expect(b.moods).toEqual({ positive: 2, mixed: 2, negative: 2 });
    expect(b.fixFirst.map((x) => x.theme)).toEqual(["controls", "onboarding", "performance"]);
    expect(b.fixFirst[0]).toMatchObject({ label: "Controls", players: 2 });
    expect(b.fixFirst[0].quotes).toHaveLength(2);
    expect(b.keep.map((x) => x.theme)).toEqual(expect.arrayContaining(["building", "sailing"]));
    // what felt good is themed by its own words, not by the problem the same player raised
    const mixed = waveBrief([f("7", 4, "The launch moment when it hits the water", "The camera spun when I rotated the mast", "controls", "mixed")]);
    expect(mixed.keep.map((x) => x.theme)).toEqual(["sailing"]);
    expect(mixed.fixFirst.map((x) => x.theme)).toEqual(["controls"]);
  });
  it("is empty, not broken, for a wave with no feedback", () => {
    expect(waveBrief([])).toMatchObject({ responses: 0, averageScore: null, fixFirst: [], keep: [] });
  });
  it("cuts long quotes at a sentence or a word", () => {
    const long = "The hull snapped fine. But then the mast floated off into the sky and I could not get it back no matter what I clicked on, which was annoying.";
    expect(quote(long, 40)).toBe("The hull snapped fine.");
    // a first sentence under half the limit is too thin a quote, so it runs on to a word break
    expect(quote(long, 60)).toBe("The hull snapped fine. But then the mast floated off into…");
    expect(quote("word ".repeat(40), 30).endsWith("…")).toBe(true);
  });
});
