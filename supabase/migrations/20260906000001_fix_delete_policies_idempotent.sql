-- 20260905000008_add_delete_policies.sql failed to (re)apply because
-- "Users can delete bookings" already existed (SQLSTATE 42710), which
-- aborted that whole migration transaction and blocked every migration
-- queued behind it. Re-create all three DELETE policies idempotently so
-- the migration chain can proceed regardless of partial prior state.

DROP POLICY IF EXISTS "Users can delete bookings" ON bookings;
CREATE POLICY "Users can delete bookings" ON bookings
  FOR DELETE USING (can_access_apartment(apartment_id));

DROP POLICY IF EXISTS "Users can delete revenue" ON revenue_invoicing;
CREATE POLICY "Users can delete revenue" ON revenue_invoicing
  FOR DELETE USING (can_access_apartment(apartment_id));

DROP POLICY IF EXISTS "Users can delete expenses" ON expenses;
CREATE POLICY "Users can delete expenses" ON expenses
  FOR DELETE USING (can_access_apartment(apartment_id));
