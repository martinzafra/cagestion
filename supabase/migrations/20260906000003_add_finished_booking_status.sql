-- Adds a FINISHED booking status, set automatically once the To Do tab's
-- Final Liquidation is marked SENT (see app/protected/todo/page.tsx), so a
-- booking's lifecycle can be tracked all the way to financial close-out.
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'FINISHED';
