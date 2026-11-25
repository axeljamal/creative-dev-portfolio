-- The Crew: a players' community grown from zero around Pinisi Yard, a boat-building game still in development.
-- Members join with a display name (email optional), finish welcome quests, playtest builds and leave feedback;
-- the team reads feedback by theme and mood, watches community health and works a moderation queue.
-- Every table carries is_demo so seeded sample rows are never counted, or shown, as real ones.

CREATE TABLE crew_members (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen_at TEXT,
  display_name TEXT NOT NULL,
  email TEXT,
  plays TEXT NOT NULL DEFAULT '',          -- what they play, in their words
  hangouts TEXT NOT NULL DEFAULT '[]',     -- JSON list: discord, reddit, tiktok, youtube, twitch, other
  would_build TEXT NOT NULL DEFAULT '',    -- the boat they would build first
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'creator')),
  activated_at TEXT,                       -- set when every welcome quest is done
  removed_at TEXT,                         -- set by a moderator; a removed member cannot sign in
  is_demo INTEGER NOT NULL DEFAULT 0
);

-- a device stays signed in with a random token; only its SHA-256 is stored
CREATE TABLE crew_sessions (
  token_hash TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES crew_members (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE crew_quests (
  member_id TEXT NOT NULL REFERENCES crew_members (id) ON DELETE CASCADE,
  quest TEXT NOT NULL,
  done_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (member_id, quest)
);

-- the deck: short posts members leave for each other
CREATE TABLE crew_posts (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  member_id TEXT NOT NULL REFERENCES crew_members (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  hidden_at TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX crew_posts_created ON crew_posts (created_at DESC);

-- a playtest wave: one build of the game, open for feedback for a while
CREATE TABLE crew_waves (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  title TEXT NOT NULL,
  build TEXT NOT NULL,                     -- e.g. "Yard 0.1"
  ask TEXT NOT NULL,                       -- what the team wants testers to try
  play_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  is_demo INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE crew_feedback (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  wave_id TEXT NOT NULL REFERENCES crew_waves (id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES crew_members (id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  liked TEXT NOT NULL DEFAULT '',
  blocked TEXT NOT NULL DEFAULT '',        -- what got in the way
  theme TEXT,                              -- set by tagging, see worker/crew/tagging.ts
  mood TEXT CHECK (mood IN ('positive', 'mixed', 'negative')),
  tagged_by TEXT,                          -- 'model' or 'keywords'
  hidden_at TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  UNIQUE (wave_id, member_id)
);
CREATE INDEX crew_feedback_wave ON crew_feedback (wave_id);

CREATE TABLE crew_reports (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  reporter_id TEXT NOT NULL REFERENCES crew_members (id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'feedback')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('unkind', 'spam', 'unsafe', 'other')),
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'kept', 'hidden', 'removed')),
  decided_at TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  UNIQUE (reporter_id, target_type, target_id)
);
CREATE INDEX crew_reports_status ON crew_reports (status, created_at);
