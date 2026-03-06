-- ============================================================
-- Hot—Pots — Avatars Storage Bucket
-- Run after 001_admin_roles.sql
--
-- Creates a PUBLIC bucket for member profile photos.
-- Public = URLs are accessible without auth headers, which
-- lets <img src="..."> in the app work without signed URLs.
--
-- Upload path: {user_id}   (single file per user, upserted)
-- ============================================================


-- ── Create the avatars bucket ─────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,                             -- public: no signed URLs needed
  2097152,                          -- 2 MB max (compressed in-browser before upload)
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;


-- ── RLS policies on storage.objects ──────────────────────────
-- Drop first so the migration is safe to re-run.

DROP POLICY IF EXISTS "avatars_upload" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
DROP POLICY IF EXISTS "avatars_read"   ON storage.objects;

-- Users can upload their own avatar (path = their user_id, no subfolder)
CREATE POLICY "avatars_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND name = auth.uid()::text
  );

-- Users can replace (UPDATE) their own avatar.
-- Both USING (row filter) and WITH CHECK (new value) must match
-- to prevent a user from overwriting another's file.
CREATE POLICY "avatars_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND name = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND name = auth.uid()::text
  );

-- Users can delete their own avatar
CREATE POLICY "avatars_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND name = auth.uid()::text
  );

-- Anyone (including unauthenticated) can read avatars —
-- required because the bucket is public and <img> tags load
-- the URL without an Authorization header.
CREATE POLICY "avatars_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');


-- ── No schema changes needed ──────────────────────────────────
-- profiles.avatar_url already exists (defined in 000_schema.sql line 18).
-- The app writes the public URL there after each upload.
