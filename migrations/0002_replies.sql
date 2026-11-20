-- a reply drafted in /admin for each enquiry, the proposal page it links to, and when the reply went out
ALTER TABLE messages ADD COLUMN reply_draft TEXT;
ALTER TABLE messages ADD COLUMN proposal_url TEXT;
ALTER TABLE messages ADD COLUMN replied_at TEXT;
