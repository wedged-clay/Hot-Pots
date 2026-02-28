-- ============================================================
-- Hot—Pots — Base Schema
-- Run before 001_admin_roles.sql
--
-- Creates all tables, indexes, constraints, the auto-profile
-- trigger, and Supabase Storage bucket for pottery photos.
-- RLS is enabled here; policies are added in 001_admin_roles.sql.
-- ============================================================


-- ── profiles ─────────────────────────────────────────────────
-- Linked 1:1 to auth.users. Created automatically on signup
-- via the handle_new_user() trigger below.

CREATE TABLE profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text        NOT NULL,
  avatar_url   text,
  bio          text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;


-- ── studio_codes ─────────────────────────────────────────────
-- Invite codes that gate signup. Checked before a new account
-- is created. Admin can generate / revoke codes.

CREATE TABLE studio_codes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text        NOT NULL UNIQUE,
  active     bool        NOT NULL DEFAULT true,
  max_uses   int,                            -- null = unlimited
  used_count int         NOT NULL DEFAULT 0,
  created_by uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE studio_codes ENABLE ROW LEVEL SECURITY;

-- Unauthenticated users need to check codes at signup
CREATE POLICY "studio_codes_read_active"
  ON studio_codes FOR SELECT
  TO anon, authenticated
  USING (active = true);


-- ── raffle_rounds ─────────────────────────────────────────────
-- Each swap round has a lifecycle: open → matching → complete.

CREATE TABLE raffle_rounds (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text        NOT NULL,
  status     text        NOT NULL DEFAULT 'open'
             CHECK (status IN ('open', 'matching', 'complete')),
  opens_at   timestamptz NOT NULL DEFAULT now(),
  closes_at  timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE raffle_rounds ENABLE ROW LEVEL SECURITY;


-- ── submissions ───────────────────────────────────────────────
-- One row per member per round. Holds both pieces.
-- piece_2_rankings is a jsonb array: [{id: uuid, rank: int}, ...]
-- where id refers to another submission the member has ranked.

CREATE TABLE submissions (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES raffle_rounds(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES profiles(id)      ON DELETE CASCADE,

  -- Piece 1 — random raffle match
  piece_1_name        text,
  piece_1_photo_url   text,
  piece_1_description text,
  piece_1_glaze       text,
  piece_1_clay_body   text,
  piece_1_method      text CHECK (piece_1_method IN ('hand-built', 'wheel-thrown')),

  -- Piece 2 — ranked-choice match
  piece_2_name        text,
  piece_2_photo_url   text,
  piece_2_description text,
  piece_2_glaze       text,
  piece_2_clay_body   text,
  piece_2_method      text CHECK (piece_2_method IN ('hand-built', 'wheel-thrown')),
  piece_2_rankings    jsonb NOT NULL DEFAULT '[]',

  status     text        NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending', 'matched', 'complete')),
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (round_id, user_id)  -- one submission per member per round
);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX ON submissions (round_id);
CREATE INDEX ON submissions (user_id);


-- ── matches ───────────────────────────────────────────────────
-- Created by the run-matching Edge Function after the round closes.
-- rank_a / rank_b are populated for choice matches only.

CREATE TABLE matches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id     uuid NOT NULL REFERENCES raffle_rounds(id),
  submission_a uuid NOT NULL REFERENCES submissions(id),
  submission_b uuid NOT NULL REFERENCES submissions(id),
  match_type   text NOT NULL CHECK (match_type IN ('random', 'choice')),
  rank_a       int,   -- rank submission_a assigned to submission_b's piece
  rank_b       int,   -- rank submission_b assigned to submission_a's piece
  matched_at   timestamptz NOT NULL DEFAULT now(),
  confirmed_a  bool        NOT NULL DEFAULT false,
  confirmed_b  bool        NOT NULL DEFAULT false
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE INDEX ON matches (round_id);


-- ── conversations ─────────────────────────────────────────────
-- One conversation per match. Expires 30 days after the round closes.
-- expires_at is set by the run-matching function when it creates the row.

CREATE TABLE conversations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      uuid NOT NULL UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
  round_id      uuid NOT NULL REFERENCES raffle_rounds(id),
  participant_a uuid NOT NULL REFERENCES profiles(id),
  participant_b uuid NOT NULL REFERENCES profiles(id),
  expires_at    timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE INDEX ON conversations (participant_a);
CREATE INDEX ON conversations (participant_b);


-- ── messages ──────────────────────────────────────────────────
-- Messages within a conversation. Blocked after expires_at by
-- the check constraint below.

CREATE TABLE messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES profiles(id),
  body            text        NOT NULL,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  read_at         timestamptz          -- null = unread
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX ON messages (conversation_id);
CREATE INDEX ON messages (sender_id);

-- Block inserts after the conversation window closes
ALTER TABLE messages ADD CONSTRAINT messages_not_expired
  CHECK (
    sent_at <= (SELECT expires_at FROM conversations WHERE id = conversation_id)
  );


-- ── push_subscriptions ────────────────────────────────────────
-- One Web Push subscription object per user, stored as jsonb.
-- Upserted by usePWA.enablePush() via the push-notify Edge Function.

CREATE TABLE push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid  NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;


-- ── Auto-create profile on signup ────────────────────────────
-- Fires after Supabase Auth creates a row in auth.users.
-- display_name is taken from signup metadata (set in auth-screens.jsx
-- onboarding) and falls back to the email prefix.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ── Supabase Realtime ─────────────────────────────────────────
-- Enable realtime on messages so both participants see new messages
-- instantly. Subscribe per conversation_id in the client.

ALTER PUBLICATION supabase_realtime ADD TABLE messages;


-- ── Supabase Storage — pottery photos bucket ──────────────────
-- Photos are stored at the path: {user_id}/{filename}
-- The user_id prefix is enforced by the upload policy below.

INSERT INTO storage.buckets (id, name, public)
VALUES ('pottery-photos', 'pottery-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Authenticated members can upload to their own folder
CREATE POLICY "pottery_photos_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pottery-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Any authenticated user can read pottery photos (needed for gallery)
CREATE POLICY "pottery_photos_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pottery-photos');

-- Members can delete only their own photos
CREATE POLICY "pottery_photos_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'pottery-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ── First admin ───────────────────────────────────────────────
-- After running this migration and 001_admin_roles.sql, promote
-- yourself to admin. Find your user UUID in:
--   Supabase Dashboard → Authentication → Users
-- Then run:
--
--   UPDATE profiles SET role = 'admin' WHERE id = 'your-uuid-here';
--
-- You can also add your first studio invite code:
--
--   INSERT INTO studio_codes (code, created_by)
--   VALUES ('STUDIO2026', 'your-uuid-here');
