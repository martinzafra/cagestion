-- The Bookings calendar should show every apartment's bookings to every
-- registered user (agents included), while everything else (list view,
-- To Do, Revenue, Expenses) keeps the existing can_access_apartment()
-- scoping. RLS on `bookings` is table-wide, so a plain SELECT can't behave
-- differently per screen -- a SECURITY DEFINER function bypasses RLS just
-- for this one calendar-only read path.

CREATE OR REPLACE FUNCTION get_calendar_bookings()
RETURNS TABLE (
  id UUID,
  apartment_id UUID,
  apartment_name TEXT,
  guest_name TEXT,
  check_in_date DATE,
  check_out_date DATE,
  status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT b.id, b.apartment_id, a.name, b.guest_name, b.check_in_date, b.check_out_date, b.status::text
  FROM bookings b
  JOIN inventory_apartments a ON a.id = b.apartment_id
  WHERE is_registered_user();
$$;

GRANT EXECUTE ON FUNCTION get_calendar_bookings() TO authenticated;
