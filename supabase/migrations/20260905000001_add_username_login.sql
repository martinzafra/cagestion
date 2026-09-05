-- Add username column for login by username or email
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Security definer function to resolve a username to its email,
-- so the login form can accept either email or username.
-- Runs as owner (bypassing RLS) but only ever returns an email address,
-- never any other user data, and only for the given exact username match.
CREATE OR REPLACE FUNCTION get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT email FROM users WHERE username = p_username LIMIT 1;
$$;

-- Allow anonymous/unauthenticated calls (needed pre-login)
GRANT EXECUTE ON FUNCTION get_email_by_username(TEXT) TO anon, authenticated;
