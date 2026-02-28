-- ============================================================
-- Hot—Pots Admin Role System
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- ROLES:
--   member  — default, regular studio participant
--   helper  — can view admin stats/matches, cannot mutate rounds or roles
--   admin   — full access to all admin actions
--
-- IMPLEMENTATION APPROACH:
--   Role stored in profiles.role column.
--   RLS policies check auth.uid() and join to profiles for role.
--   A Postgres function get_my_role() avoids repetitive subqueries.
--   A custom JWT claim approach is optional but adds complexity —
--   the profiles join is fast enough at this scale (100-1000 users).
-- ============================================================


-- ── 1. Add role column to profiles ───────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member'
  CHECK (role IN ('member', 'helper', 'admin'));

-- Set yourself as the first admin (replace with your actual user id)
-- UPDATE profiles SET role = 'admin' WHERE id = 'your-user-uuid-here';


-- ── 2. Helper function — get the calling user's role ─────────
-- Used in RLS policies to avoid repeated subqueries.

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;


-- ── 3. RLS policies ──────────────────────────────────────────

-- ── profiles ──
-- Public read (members can see each other for gallery/messaging)
-- Self-write for name/bio/avatar
-- Admin/helper can read all fields including email (via separate admin view)

DROP POLICY IF EXISTS "profiles_read"  ON profiles;
DROP POLICY IF EXISTS "profiles_write" ON profiles;

CREATE POLICY "profiles_read"
  ON profiles FOR SELECT
  USING (true);  -- all authenticated users can read basic profile info

CREATE POLICY "profiles_write"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);  -- users update only their own profile

-- Admins can update any profile (e.g. change role, suspend)
CREATE POLICY "profiles_admin_write"
  ON profiles FOR UPDATE
  USING (get_my_role() = 'admin');


-- ── raffle_rounds ──
-- Anyone can read (so members see open rounds)
-- Only admins can insert/update/delete

DROP POLICY IF EXISTS "rounds_read"  ON raffle_rounds;
DROP POLICY IF EXISTS "rounds_write" ON raffle_rounds;

CREATE POLICY "rounds_read"
  ON raffle_rounds FOR SELECT
  USING (true);

CREATE POLICY "rounds_admin_insert"
  ON raffle_rounds FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "rounds_admin_update"
  ON raffle_rounds FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "rounds_admin_delete"
  ON raffle_rounds FOR DELETE
  USING (get_my_role() = 'admin');


-- ── submissions ──
-- Members: read/write own
-- Admin/helper: read all submissions (for match oversight and gallery moderation)
-- Piece 2 gallery: all active-round participants can read piece_2 fields

DROP POLICY IF EXISTS "submissions_own"       ON submissions;
DROP POLICY IF EXISTS "submissions_gallery"   ON submissions;
DROP POLICY IF EXISTS "submissions_admin_read" ON submissions;

CREATE POLICY "submissions_own"
  ON submissions FOR ALL
  USING (auth.uid() = user_id);

-- Gallery: anyone who has submitted in the same round can see piece_2 fields
-- (Full row access is handled by the submissions_own policy above;
--  this allows reading other members' piece_2 for ranking)
CREATE POLICY "submissions_gallery_read"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM submissions s2
      WHERE s2.user_id = auth.uid()
        AND s2.round_id = submissions.round_id
    )
  );

CREATE POLICY "submissions_admin_read"
  ON submissions FOR SELECT
  USING (get_my_role() IN ('admin', 'helper'));


-- ── matches ──
-- Members: read own matches only
-- Admin/helper: read all matches

DROP POLICY IF EXISTS "matches_own"        ON matches;
DROP POLICY IF EXISTS "matches_admin_read" ON matches;
DROP POLICY IF EXISTS "matches_admin_write" ON matches;

CREATE POLICY "matches_own"
  ON matches FOR SELECT
  USING (
    auth.uid() = (SELECT user_id FROM submissions WHERE id = submission_a) OR
    auth.uid() = (SELECT user_id FROM submissions WHERE id = submission_b)
  );

CREATE POLICY "matches_admin_read"
  ON matches FOR SELECT
  USING (get_my_role() IN ('admin', 'helper'));

-- Admins can insert manual matches
CREATE POLICY "matches_admin_insert"
  ON matches FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "matches_admin_update"
  ON matches FOR UPDATE
  USING (get_my_role() = 'admin');


-- ── conversations ──
-- Participants only (participant_a or participant_b)
-- Admin can read all (for moderation) but NOT insert/update
-- Helpers cannot read conversations (privacy boundary)

DROP POLICY IF EXISTS "conversations_participants" ON conversations;
DROP POLICY IF EXISTS "conversations_admin_read"   ON conversations;

CREATE POLICY "conversations_participants"
  ON conversations FOR ALL
  USING (
    auth.uid() = participant_a OR
    auth.uid() = participant_b
  );

CREATE POLICY "conversations_admin_read"
  ON conversations FOR SELECT
  USING (get_my_role() = 'admin');


-- ── messages ──
-- Participants can read/insert (within expiry window enforced by check constraint)
-- Admin can read all (for moderation)
-- Helpers cannot read messages

DROP POLICY IF EXISTS "messages_participants" ON messages;
DROP POLICY IF EXISTS "messages_admin_read"   ON messages;

CREATE POLICY "messages_participants"
  ON messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

CREATE POLICY "messages_admin_read"
  ON messages FOR SELECT
  USING (get_my_role() = 'admin');

-- Note: expiry enforcement is handled by the messages_expiry_check trigger
-- created in 000_schema.sql — no CHECK constraint needed here.


-- ── push_subscriptions ──
-- Users manage only their own subscription
-- Admin/helper can read all (to see push notification coverage in stats)

DROP POLICY IF EXISTS "push_own"        ON push_subscriptions;
DROP POLICY IF EXISTS "push_admin_read" ON push_subscriptions;

CREATE POLICY "push_own"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "push_admin_read"
  ON push_subscriptions FOR SELECT
  USING (get_my_role() IN ('admin', 'helper'));


-- ── 4. Admin stats view ───────────────────────────────────────
-- A convenience view that aggregates the numbers shown in the
-- AdminPortal stats section. Readable by admin and helper roles.

CREATE OR REPLACE VIEW admin_stats AS
SELECT
  (SELECT count(*)                    FROM profiles)                       AS total_members,
  (SELECT count(*)                    FROM profiles WHERE role = 'admin')  AS admin_count,
  (SELECT count(*)                    FROM profiles WHERE role = 'helper') AS helper_count,
  (SELECT count(*)                    FROM raffle_rounds)                  AS total_rounds,
  (SELECT count(*)                    FROM raffle_rounds WHERE status = 'open') AS open_rounds,
  (SELECT count(*)                    FROM matches)                        AS total_matches,
  (SELECT count(*)                    FROM submissions)                    AS total_submissions,
  (SELECT count(*)                    FROM push_subscriptions)             AS push_subscribers,
  (SELECT count(*)                    FROM messages)                       AS total_messages,
  -- Match rate: matched / total submissions (each submission = 1 person)
  ROUND(
    (SELECT count(*) FROM matches)::numeric /
    NULLIF((SELECT count(*) FROM submissions), 0) * 100
  , 1) AS match_rate_pct;

-- Grant access to authenticated users (RLS on base tables still applies)
GRANT SELECT ON admin_stats TO authenticated;


-- ── 5. Supabase Edge Function environment note ────────────────
-- The push-notify Edge Function uses the SERVICE ROLE key,
-- which bypasses RLS entirely. This is correct and intentional —
-- the function needs to read push_subscriptions for all users.
-- Never expose the service role key to the client.


-- ── 6. Permission summary table ──────────────────────────────
--
-- Action                          | member | helper | admin
-- --------------------------------|--------|--------|-------
-- View own profile                |   ✅   |   ✅   |   ✅
-- Update own profile              |   ✅   |   ✅   |   ✅
-- Update any profile/role         |   ❌   |   ❌   |   ✅
-- View open rounds                |   ✅   |   ✅   |   ✅
-- Open/close/edit rounds          |   ❌   |   ❌   |   ✅
-- Submit pieces                   |   ✅   |   ✅   |   ✅
-- View piece 2 gallery            |   ✅*  |   ✅   |   ✅
-- View all submissions            |   ❌   |   ✅   |   ✅
-- View own matches                |   ✅   |   ✅   |   ✅
-- View all matches                |   ❌   |   ✅   |   ✅
-- Create manual matches           |   ❌   |   ❌   |   ✅
-- Message match partner           |   ✅   |   ✅   |   ✅
-- Read all messages (moderation)  |   ❌   |   ❌   |   ✅
-- View usage stats                |   ❌   |   ✅   |   ✅
-- View push subscription count    |   ❌   |   ✅   |   ✅
-- Generate/reset invite codes     |   ❌   |   ❌   |   ✅
-- Suspend/reinstate members       |   ❌   |   ❌   |   ✅
--
-- * Gallery access requires having submitted in the same round
