-- One-time backfill: bookings whose To Do tasks were already all done/N/A
-- before the FINISHED-on-liquidation-sent automation existed are marked
-- FINISHED now too, matching the same COMPLETED condition the To Do screen
-- computes client-side (see computeTodoStatus/isTaskComplete in
-- app/protected/todo/page.tsx).
UPDATE bookings
SET status = 'FINISHED'
WHERE status NOT IN ('CANCELLED', 'FINISHED')
  AND police_registration IN ('DONE', 'NA')
  AND platform_invoice IN ('SENT', 'NA')
  AND final_liquidation IN ('SENT', 'NA');
