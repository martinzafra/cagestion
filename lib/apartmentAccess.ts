import { supabase } from '@/lib/supabase';

// Agents only see apartments enabled for whichever agent(s) they're assigned
// to (one user can be assigned to more than one agent, e.g. a shared "Both"
// agent); admins see all. Used everywhere an apartment list/filter is shown
// outside the Inventory admin screen, so agents never see properties they
// don't manage.
export async function fetchAllowedApartments(): Promise<any[]> {
  const { data: apartments } = await supabase
    .from('inventory_apartments')
    .select('*')
    .order('name');

  let allowed = apartments || [];

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    const { data: userRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userRow?.role === 'agent') {
      const { data: agentIdRows } = await supabase
        .from('inventory_agent_users')
        .select('agent_id')
        .eq('user_id', session.user.id);

      const agentIds = (agentIdRows || []).map((r) => r.agent_id);

      if (agentIds.length > 0) {
        const { data: allowedRows } = await supabase
          .from('inventory_agent_apartments')
          .select('apartment_id')
          .in('agent_id', agentIds);

        const allowedIds = new Set((allowedRows || []).map((r) => r.apartment_id));
        allowed = allowed.filter((a: any) => allowedIds.has(a.id));
      } else {
        allowed = [];
      }
    }
  }

  return allowed;
}
