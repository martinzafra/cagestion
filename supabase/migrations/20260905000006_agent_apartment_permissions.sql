-- Agents can now be enabled/disabled per apartment. An agent with no
-- access to an apartment cannot see (or create/edit) any bookings,
-- revenue, or expenses tied to that apartment. Admins are unaffected.

CREATE TABLE IF NOT EXISTS inventory_agent_apartments (
  agent_id UUID NOT NULL REFERENCES inventory_agents(id) ON DELETE CASCADE,
  apartment_id UUID NOT NULL REFERENCES inventory_apartments(id) ON DELETE CASCADE,
  PRIMARY KEY (agent_id, apartment_id)
);

ALTER TABLE inventory_agent_apartments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agent apartments read" ON inventory_agent_apartments
  FOR SELECT USING (is_registered_user());
CREATE POLICY "Agent apartments admin insert" ON inventory_agent_apartments
  FOR INSERT WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "Agent apartments admin delete" ON inventory_agent_apartments
  FOR DELETE USING (get_my_role() = 'admin');

-- Seed: every existing agent keeps access to every existing apartment,
-- preserving current behavior. Admins can restrict from here via the
-- Inventory screen.
INSERT INTO inventory_agent_apartments (agent_id, apartment_id)
SELECT a.id, ap.id FROM inventory_agents a CROSS JOIN inventory_apartments ap
ON CONFLICT DO NOTHING;

-- Resolves whether the current user can see/manage data for a given
-- apartment: admins always can; agents only if explicitly enabled for
-- that apartment (matched via users.agent_name = inventory_agents.name).
CREATE OR REPLACE FUNCTION can_access_apartment(p_apartment_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    CASE
      WHEN get_my_role() = 'admin' THEN true
      ELSE EXISTS (
        SELECT 1
        FROM inventory_agent_apartments iaa
        JOIN inventory_agents ia ON ia.id = iaa.agent_id
        JOIN users u ON u.agent_name = ia.name
        WHERE u.id = auth.uid() AND iaa.apartment_id = p_apartment_id
      )
    END;
$$;
GRANT EXECUTE ON FUNCTION can_access_apartment(UUID) TO authenticated;

-- bookings
DROP POLICY IF EXISTS "Users can view bookings" ON bookings;
CREATE POLICY "Users can view bookings" ON bookings
  FOR SELECT USING (can_access_apartment(apartment_id));

DROP POLICY IF EXISTS "Users can insert bookings" ON bookings;
CREATE POLICY "Users can insert bookings" ON bookings
  FOR INSERT WITH CHECK (
    get_my_role() IN ('admin', 'agent') AND can_access_apartment(apartment_id)
  );

DROP POLICY IF EXISTS "Users can update bookings" ON bookings;
CREATE POLICY "Users can update bookings" ON bookings
  FOR UPDATE USING (can_access_apartment(apartment_id));

-- revenue_invoicing
DROP POLICY IF EXISTS "Users can view revenue" ON revenue_invoicing;
CREATE POLICY "Users can view revenue" ON revenue_invoicing
  FOR SELECT USING (can_access_apartment(apartment_id));

DROP POLICY IF EXISTS "Users can insert revenue" ON revenue_invoicing;
CREATE POLICY "Users can insert revenue" ON revenue_invoicing
  FOR INSERT WITH CHECK (
    get_my_role() IN ('admin', 'agent') AND can_access_apartment(apartment_id)
  );

DROP POLICY IF EXISTS "Users can update revenue" ON revenue_invoicing;
CREATE POLICY "Users can update revenue" ON revenue_invoicing
  FOR UPDATE USING (can_access_apartment(apartment_id));

-- expenses
DROP POLICY IF EXISTS "Users can view expenses" ON expenses;
CREATE POLICY "Users can view expenses" ON expenses
  FOR SELECT USING (can_access_apartment(apartment_id));

DROP POLICY IF EXISTS "Users can insert expenses" ON expenses;
CREATE POLICY "Users can insert expenses" ON expenses
  FOR INSERT WITH CHECK (
    get_my_role() IN ('admin', 'agent') AND can_access_apartment(apartment_id)
  );

DROP POLICY IF EXISTS "Users can update expenses" ON expenses;
CREATE POLICY "Users can update expenses" ON expenses
  FOR UPDATE USING (can_access_apartment(apartment_id));
