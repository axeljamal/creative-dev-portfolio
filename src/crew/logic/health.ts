// Community health in five numbers the team can act on, worked out from plain rows so it is easy to test.
// Dates are ISO strings in UTC, as D1 stores them.

export type MemberRow = { created_at: string; last_seen_at: string | null; activated_at: string | null };
export type FeedbackRow = { member_id: string };
export type ReportRow = { status: string };

export type Health = {
  members: number;
  joinedThisWeek: number;
  activationRate: number | null;     // share of members who finished every welcome quest
  returnRate7d: number | null;       // of members who joined 7+ days ago, share seen again 7+ days after joining
  feedbackPerTester: number | null;  // feedback items per member who gave any
  openReports: number;
  reportsPer100: number | null;      // all reports per 100 members
};

const DAY = 86_400_000;
const share = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 1000 : null);

export function health(members: MemberRow[], feedback: FeedbackRow[], reports: ReportRow[], now: Date): Health {
  const t = now.getTime();
  const joinedThisWeek = members.filter((m) => t - Date.parse(m.created_at) < 7 * DAY).length;
  const activated = members.filter((m) => m.activated_at).length;

  const oldEnough = members.filter((m) => t - Date.parse(m.created_at) >= 7 * DAY);
  const returned = oldEnough.filter((m) => m.last_seen_at && Date.parse(m.last_seen_at) - Date.parse(m.created_at) >= 7 * DAY);

  const testers = new Set(feedback.map((f) => f.member_id)).size;

  return {
    members: members.length,
    joinedThisWeek,
    activationRate: share(activated, members.length),
    returnRate7d: share(returned.length, oldEnough.length),
    feedbackPerTester: testers ? Math.round((feedback.length / testers) * 10) / 10 : null,
    openReports: reports.filter((r) => r.status === "open").length,
    reportsPer100: members.length ? Math.round((reports.length / members.length) * 1000) / 10 : null,
  };
}
