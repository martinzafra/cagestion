-- Public, unauthenticated read-only calendar per apartment: a stable token
-- on each apartment that a share link is built from. Only busy date ranges
-- are exposed (no guest name or other booking details) via SECURITY
-- DEFINER functions, so the anon key can never read the bookings table
-- directly.
ALTER TABLE inventory_apartments
  ADD COLUMN IF NOT EXISTS public_calendar_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_apartments_public_calendar_token
  ON inventory_apartments(public_calendar_token);

CREATE OR REPLACE FUNCTION get_public_apartment(p_token UUID)
RETURNS TABLE (id UUID, name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id, name FROM inventory_apartments WHERE public_calendar_token = p_token;
$$;
GRANT EXECUTE ON FUNCTION get_public_apartment(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION get_public_calendar_bookings(p_token UUID)
RETURNS TABLE (check_in_date DATE, check_out_date DATE, status TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT b.check_in_date, b.check_out_date, b.status::text
  FROM bookings b
  JOIN inventory_apartments a ON a.id = b.apartment_id
  WHERE a.public_calendar_token = p_token
    AND b.status != 'CANCELLED';
$$;
GRANT EXECUTE ON FUNCTION get_public_calendar_bookings(UUID) TO anon, authenticated;
