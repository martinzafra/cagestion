-- Fix infinite recursion in RLS policies.
--
-- The original policies checked the caller's role/registration by running
-- "EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() ...)" directly
-- inside policies on `users` itself (and on bookings/revenue_invoicing/
-- expenses/inventory_*). Evaluating that subquery re-triggers RLS on
-- `users`, including the self-referencing "Admins can view all users"
-- policy, causing Postgres to detect infinite recursion and return a 500
-- from PostgREST on every request that touched these tables.
--
-- SECURITY DEFINER functions run with the owner's privileges (bypassing
-- RLS) so they can read `users` safely without re-entering policy checks.

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_registered_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.is_registered_user() TO authenticated;

-- users
DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (get_my_role() = 'admin');

-- bookings
DROP POLICY IF EXISTS "Users can view bookings" ON bookings;
CREATE POLICY "Users can view bookings" ON bookings
  FOR SELECT USING (is_registered_user());

DROP POLICY IF EXISTS "Users can insert bookings" ON bookings;
CREATE POLICY "Users can insert bookings" ON bookings
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'agent'));

DROP POLICY IF EXISTS "Users can update bookings" ON bookings;
CREATE POLICY "Users can update bookings" ON bookings
  FOR UPDATE USING (is_registered_user());

-- revenue_invoicing
DROP POLICY IF EXISTS "Users can view revenue" ON revenue_invoicing;
CREATE POLICY "Users can view revenue" ON revenue_invoicing
  FOR SELECT USING (is_registered_user());

DROP POLICY IF EXISTS "Users can insert revenue" ON revenue_invoicing;
CREATE POLICY "Users can insert revenue" ON revenue_invoicing
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'agent'));

DROP POLICY IF EXISTS "Users can update revenue" ON revenue_invoicing;
CREATE POLICY "Users can update revenue" ON revenue_invoicing
  FOR UPDATE USING (is_registered_user());

-- expenses
DROP POLICY IF EXISTS "Users can view expenses" ON expenses;
CREATE POLICY "Users can view expenses" ON expenses
  FOR SELECT USING (is_registered_user());

DROP POLICY IF EXISTS "Users can insert expenses" ON expenses;
CREATE POLICY "Users can insert expenses" ON expenses
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'agent'));

DROP POLICY IF EXISTS "Users can update expenses" ON expenses;
CREATE POLICY "Users can update expenses" ON expenses
  FOR UPDATE USING (is_registered_user());

-- inventory tables: admin-only writes
DROP POLICY IF EXISTS "Inventory agents admin insert" ON inventory_agents;
CREATE POLICY "Inventory agents admin insert" ON inventory_agents
  FOR INSERT WITH CHECK (get_my_role() = 'admin');
DROP POLICY IF EXISTS "Inventory agents admin update" ON inventory_agents;
CREATE POLICY "Inventory agents admin update" ON inventory_agents
  FOR UPDATE USING (get_my_role() = 'admin');

DROP POLICY IF EXISTS "Inventory apartments admin insert" ON inventory_apartments;
CREATE POLICY "Inventory apartments admin insert" ON inventory_apartments
  FOR INSERT WITH CHECK (get_my_role() = 'admin');
DROP POLICY IF EXISTS "Inventory apartments admin update" ON inventory_apartments;
CREATE POLICY "Inventory apartments admin update" ON inventory_apartments
  FOR UPDATE USING (get_my_role() = 'admin');

DROP POLICY IF EXISTS "Inventory platforms admin insert" ON inventory_platforms;
CREATE POLICY "Inventory platforms admin insert" ON inventory_platforms
  FOR INSERT WITH CHECK (get_my_role() = 'admin');
DROP POLICY IF EXISTS "Inventory platforms admin update" ON inventory_platforms;
CREATE POLICY "Inventory platforms admin update" ON inventory_platforms
  FOR UPDATE USING (get_my_role() = 'admin');

DROP POLICY IF EXISTS "Inventory expense types admin insert" ON inventory_expense_types;
CREATE POLICY "Inventory expense types admin insert" ON inventory_expense_types
  FOR INSERT WITH CHECK (get_my_role() = 'admin');
DROP POLICY IF EXISTS "Inventory expense types admin update" ON inventory_expense_types;
CREATE POLICY "Inventory expense types admin update" ON inventory_expense_types
  FOR UPDATE USING (get_my_role() = 'admin');

DROP POLICY IF EXISTS "Inventory invoice items admin insert" ON inventory_invoice_items;
CREATE POLICY "Inventory invoice items admin insert" ON inventory_invoice_items
  FOR INSERT WITH CHECK (get_my_role() = 'admin');
DROP POLICY IF EXISTS "Inventory invoice items admin update" ON inventory_invoice_items;
CREATE POLICY "Inventory invoice items admin update" ON inventory_invoice_items
  FOR UPDATE USING (get_my_role() = 'admin');

DROP POLICY IF EXISTS "Inventory payment types admin insert" ON inventory_payment_types;
CREATE POLICY "Inventory payment types admin insert" ON inventory_payment_types
  FOR INSERT WITH CHECK (get_my_role() = 'admin');
DROP POLICY IF EXISTS "Inventory payment types admin update" ON inventory_payment_types;
CREATE POLICY "Inventory payment types admin update" ON inventory_payment_types
  FOR UPDATE USING (get_my_role() = 'admin');
