-- ============================================================
-- Hot—Pots — Test Account Seed
-- Run in: Supabase Dashboard → SQL Editor → New Query
--
-- Creates:
--   1. test@hotpots.local        — regular member account
--   2. admin@hotpots.local       — admin account
--   3. An active studio invite code: TESTCODE
--   4. An open raffle round for the E2E tests to find
--
-- PASSWORDS: replace REPLACE_WITH_TEST_PASS and REPLACE_WITH_ADMIN_PASS
-- with the actual values from your TEST_PASS and ADMIN_TEST_PASS secrets
-- before running this script. Do NOT commit real passwords.
--
-- Safe to re-run: uses ON CONFLICT DO NOTHING / DO UPDATE.
-- ============================================================

-- ── 1. Create auth users ──────────────────────────────────────
-- Uses pgcrypto (available in all Supabase projects) to bcrypt
-- the password. The handle_new_user() trigger automatically
-- creates a matching row in public.profiles.

DO $$
DECLARE
  member_id uuid := '00000000-0000-1111-0000-000000000001';
  admin_id  uuid := '00000000-0000-1111-0000-000000000002';
BEGIN

  -- Member account
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    member_id,
    'authenticated',
    'authenticated',
    'test@hotpots.local',
    crypt('REPLACE_WITH_TEST_PASS', gen_salt('bf')),  -- ← set to TEST_PASS value
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Test Member"}',
    now(),
    now(),
    '', '', '', ''
  ) ON CONFLICT (id) DO UPDATE
      SET encrypted_password = crypt('REPLACE_WITH_TEST_PASS', gen_salt('bf')),
          email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now());

  -- Admin account
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    admin_id,
    'authenticated',
    'authenticated',
    'admin@hotpots.local',
    crypt('REPLACE_WITH_ADMIN_PASS', gen_salt('bf')),  -- ← set to ADMIN_PASS value
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Test Admin"}',
    now(),
    now(),
    '', '', '', ''
  ) ON CONFLICT (id) DO UPDATE
      SET encrypted_password = crypt('REPLACE_WITH_ADMIN_PASS', gen_salt('bf')),
          email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now());

END $$;


-- ── 2. Ensure profiles exist (trigger may have already created them) ──

INSERT INTO public.profiles (id, display_name, role)
VALUES
  ('00000000-0000-1111-0000-000000000001', 'Test Member', 'member'),
  ('00000000-0000-1111-0000-000000000002', 'Test Admin',  'admin')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role;   -- ensures admin role is set even on re-run


-- ── 3. Active invite code ─────────────────────────────────────

INSERT INTO public.studio_codes (code, active, created_by)
VALUES ('TESTCODE', true, '00000000-0000-1111-0000-000000000002')
ON CONFLICT (code) DO UPDATE
  SET active = true;


-- ── 4. Open raffle round ──────────────────────────────────────

INSERT INTO public.raffle_rounds (id, title, status, opens_at, closes_at)
VALUES (
  '00000000-0000-1111-0000-000000000010',
  'Spring Test Round',
  'open',
  now(),
  now() + interval '30 days'
)
ON CONFLICT (id) DO UPDATE
  SET status    = 'open',
      closes_at = now() + interval '30 days';


-- ── Verify ────────────────────────────────────────────────────

SELECT
  u.email,
  p.display_name,
  p.role
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.id IN (
  '00000000-0000-1111-0000-000000000001',
  '00000000-0000-1111-0000-000000000002'
);
