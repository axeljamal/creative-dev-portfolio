-- Seed for the Crew. The first real playtest wave (Pinisi Yard 0.1), plus a clearly marked demo community
-- (is_demo = 1) so the team pages can be shown before real players arrive. Demo rows never appear in real
-- numbers, the public deck labels them, and they can all go with: DELETE FROM crew_members WHERE is_demo = 1;
-- (posts, feedback, quests and sessions follow by cascade) plus the demo wave and reports below.

INSERT INTO crew_waves (id, title, build, ask, play_url, status, is_demo) VALUES
  ('wave-yard-01', 'First launch', 'Pinisi Yard 0.1',
   'Build a boat from the parts in the yard, paint it, and launch it. Tell us what was fun and what got in the way.',
   '/yard/', 'open', 0),
  ('demo-wave-01', 'First launch (demo)', 'Pinisi Yard 0.1', 'Sample wave with made-up feedback, to show the brief.', '/yard/', 'closed', 1);

INSERT INTO crew_members (id, created_at, last_seen_at, display_name, plays, hangouts, would_build, activated_at, is_demo) VALUES
  ('demo-m01', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-24 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 days'),  'Tidewright',    'Sea of Thieves, Minecraft',  '["discord","reddit"]',  'A twin-masted trader in indigo', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-23 days'), 1),
  ('demo-m02', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-22 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days'),  'Kelp Runner',   'Stardew Valley',             '["tiktok"]',            'Something small and fast',       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-21 days'), 1),
  ('demo-m03', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-20 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-19 days'), 'Brightbow',     'Fortnite, Rocket League',    '["discord","twitch"]',  'A racing hull',                  NULL, 1),
  ('demo-m04', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-18 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'),  'Salt & Sawdust','Townscaper, Dorfromantik',   '["reddit","youtube"]',  'A boat with a little house on it', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-17 days'), 1),
  ('demo-m05', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-16 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-15 days'), 'Paku',          'Roblox',                     '["tiktok","youtube"]',  'The biggest boat possible',      NULL, 1),
  ('demo-m06', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-14 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days'),  'Quiet Keel',    'Animal Crossing',            '["discord"]',           'A fishing boat for my island',   strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-13 days'), 1),
  ('demo-m07', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 days'), 'Gale Force 9',  'Forza, Trackmania',          '["twitch","reddit"]',   'Pure speed',                     NULL, 1),
  ('demo-m08', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 days'),  'Moss Lantern',  'Unpacking, A Short Hike',    '["tiktok"]',            'A cosy houseboat with lanterns', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-9 days'), 1),
  ('demo-m09', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-8 days'),  strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-8 days'),  'Rigger Rae',    'Valheim',                    '["discord","youtube"]', 'A longship',                     NULL, 1),
  ('demo-m10', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-6 days'),  strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 days'),  'Batik Bay',     'Cozy Grove',                 '["reddit"]',            'Sails covered in patterns',      strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days'), 1),
  ('demo-m11', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days'),  strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days'),  'Nimbus',        'Minecraft',                  '["youtube"]',           'Not sure yet',                   NULL, 1),
  ('demo-m12', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'),  strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 days'),  'Coral Compass', 'Sea of Thieves',             '["discord","tiktok"]',  'A pirate ship, obviously',       NULL, 1),
  ('demo-m13', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 days'),  NULL,                                              'Spinnaker',     'Rocket League',              '["twitch"]',            'Fast and loud',                  NULL, 1),
  ('demo-m14', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 days'),  NULL,                                              'Little Tern',   'Stardew Valley, Spiritfarer','["tiktok","reddit"]',   'A ferry for my friends',         NULL, 1);

UPDATE crew_members SET role = 'creator' WHERE id IN ('demo-m04', 'demo-m08');

INSERT INTO crew_quests (member_id, quest) VALUES
  ('demo-m01','hello'),('demo-m01','build'),('demo-m01','feedback'),
  ('demo-m02','hello'),('demo-m02','build'),('demo-m02','feedback'),
  ('demo-m03','hello'),('demo-m03','build'),
  ('demo-m04','hello'),('demo-m04','build'),('demo-m04','feedback'),
  ('demo-m05','build'),
  ('demo-m06','hello'),('demo-m06','build'),('demo-m06','feedback'),
  ('demo-m07','hello'),('demo-m07','build'),
  ('demo-m08','hello'),('demo-m08','build'),('demo-m08','feedback'),
  ('demo-m09','build'),
  ('demo-m10','hello'),('demo-m10','build'),('demo-m10','feedback'),
  ('demo-m11','hello'),
  ('demo-m12','hello'),('demo-m12','build');

INSERT INTO crew_posts (id, created_at, member_id, body, is_demo) VALUES
  ('demo-p01', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-23 days'), 'demo-m01', 'Ahoy! First one on deck. Building an indigo trader the moment the yard opens.', 1),
  ('demo-p02', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-17 days'), 'demo-m04', 'Put a tiny house on my deck and it actually floats. Screenshots in the gallery when there is one!', 1),
  ('demo-p03', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 days'), 'demo-m07', 'Anyone found the fastest hull yet? Mine flips if I add a second mast.', 1),
  ('demo-p04', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-9 days'),  'demo-m08', 'Lanterns on the rigging at dusk. That is the whole post.', 1),
  ('demo-p05', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days'),  'demo-m10', 'Idea for a challenge: best batik sail, voted by the crew?', 1),
  ('demo-p06', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'),  'demo-m12', 'Free boats here, click this totally real link!!!', 1);

INSERT INTO crew_feedback (id, created_at, wave_id, member_id, score, liked, blocked, theme, mood, tagged_by, is_demo) VALUES
  ('demo-f01', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-20 days'), 'demo-wave-01', 'demo-m01', 4, 'Painting the sails with batik motifs is lovely.', 'Rotating the mast with the mouse kept spinning the camera instead.', 'controls', 'mixed', 'keywords', 1),
  ('demo-f02', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-19 days'), 'demo-wave-01', 'demo-m02', 3, 'The launch moment when it hits the water.', 'On my phone I could not drag pieces at all, they just jumped.', 'controls', 'mixed', 'keywords', 1),
  ('demo-f03', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-16 days'), 'demo-wave-01', 'demo-m04', 5, 'Building a little house on deck and it still floats!', '', 'building', 'positive', 'keywords', 1),
  ('demo-f04', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-13 days'), 'demo-wave-01', 'demo-m06', 2, '', 'I had no idea how to start. Which piece goes first?', 'onboarding', 'negative', 'keywords', 1),
  ('demo-f05', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-9 days'),  'demo-wave-01', 'demo-m08', 5, 'The colours at dusk, and how calm it feels.', '', 'looks', 'positive', 'keywords', 1),
  ('demo-f06', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days'),  'demo-wave-01', 'demo-m10', 4, 'So many ways to paint the hull.', 'Second mast makes the boat flip when I launch, not sure if that is a bug.', 'bugs', 'mixed', 'keywords', 1),
  ('demo-f07', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days'),  'demo-wave-01', 'demo-m03', 2, '', 'Snapping the deck onto the hull is fiddly, pieces float off.', 'controls', 'negative', 'keywords', 1),
  ('demo-f08', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days'),  'demo-wave-01', 'demo-m07', 3, 'Racing my own boat after building it.', 'Took a long time to load on my laptop.', 'performance', 'mixed', 'keywords', 1),
  ('demo-f09', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'),  'demo-wave-01', 'demo-m12', 3, 'Pirate flag option please.', 'Did not know what the wind arrow meant.', 'onboarding', 'mixed', 'keywords', 1);

INSERT INTO crew_reports (id, created_at, reporter_id, target_type, target_id, reason, note, is_demo) VALUES
  ('demo-r01', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 days'), 'demo-m01', 'post', 'demo-p06', 'spam', 'Looks like a scam link.', 1),
  ('demo-r02', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 days'), 'demo-m08', 'post', 'demo-p06', 'spam', '', 1);
