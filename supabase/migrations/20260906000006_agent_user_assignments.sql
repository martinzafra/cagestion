-- Replaces users.agent_name <-> inventory_agents.name text matching with a
-- proper many-to-many assignment table. The text-matching approach was
-- fragile by design: renaming an agent (as just happened - BM/KW became
-- Basia/Karo) silently disconnects every user matched to the old name,
-- which is exactly what broke can_access_apartment() for both agents. A
-- junction table also lets one agent (e.g. "Both") be assigned to more
-- than one user at once.

CREATE TABLE IF NOT EXISTS inventory_agent_users (
  agent_id UUID NOT NULL REFERENCES inventory_agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (agent_id, user_id)
);

ALTER TABLE inventory_agent_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agent users read" ON inventory_agent_users;
CREATE POLICY "Agent users read" ON inventory_agent_users
  FOR SELECT USING (public.is_registered_user());

DROP POLICY IF EXISTS "Agent users admin insert" ON inventory_agent_users;
CREATE POLICY "Agent users admin insert" ON inventory_agent_users
  FOR INSERT WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Agent users admin delete" ON inventory_agent_users;
CREATE POLICY "Agent users admin delete" ON inventory_agent_users
  FOR DELETE USING (public.get_my_role() = 'admin');

-- Backfill the current real-world mapping: Barbara -> Basia agent (her
-- renamed identity) plus the shared "Both" agent; Karo -> Karo agent plus
-- "Both". Admins can adjust this going forward via Inventory > Agents.
INSERT INTO inventory_agent_users (agent_id, user_id)
SELECT ia.id, u.id
FROM inventory_agents ia, users u
WHERE (ia.name = 'Basia' AND u.email = 'barbara@example.com')
   OR (ia.name = 'Karo' AND u.email = 'karo@example.com')
   OR (ia.name = 'Both' AND u.email IN ('barbara@example.com', 'karo@example.com'))
ON CONFLICT DO NOTHING;

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
        JOIN inventory_agent_users iau ON iau.agent_id = iaa.agent_id
        WHERE iau.user_id = auth.uid() AND iaa.apartment_id = p_apartment_id
      )
    END;
$$;
GRANT EXECUTE ON FUNCTION can_access_apartment(UUID) TO authenticated;
