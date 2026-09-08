import { supabase } from '@/lib/supabase';

// Looks up the current session's role from the users table. Used on pages
// that agents and admins share (Bookings/Revenue/Expenses/To Do) to gate
// admin-only actions (e.g. the Excel export) without restricting the rest
// of the page - unlike Reports/Inventory, which redirect non-admins away
// entirely.
export async function fetchCurrentUserRole(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return '';

  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single();

  return userRow?.role || '';
}
