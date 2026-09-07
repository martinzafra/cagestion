-- FINISHED means the booking is fully closed out AND the guest has already
-- left. If Final Liquidation gets marked SENT while the guest is still on
-- the property (today <= check_out_date), the admin paperwork is done but
-- the stay isn't over yet - use DONE for that in-between state instead.
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'DONE';
