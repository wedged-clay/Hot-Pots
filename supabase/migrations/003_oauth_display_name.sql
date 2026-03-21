-- ============================================================
-- Hot-Pots — OAuth display name support
-- Updates handle_new_user() to also read full_name / name
-- from OAuth provider metadata (Google, Apple).
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',  -- email/password signup
      NEW.raw_user_meta_data->>'full_name',     -- Google OAuth
      NEW.raw_user_meta_data->>'name',          -- Apple OAuth
      split_part(NEW.email, '@', 1)             -- final fallback
    )
  );
  RETURN NEW;
END;
$$;
