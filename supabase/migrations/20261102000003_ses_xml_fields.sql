-- Fields the SES.HOSPEDAJES "parte de viajeros" XML needs that the app
-- didn't hold yet:
--  * each apartment's establishment code, assigned by SES when the property
--    was registered there (codigoEstablecimiento, 10 chars);
--  * the INE municipality code (5 digits) of a traveller living in Spain,
--    which SES requires instead of the town name. Guests can't be expected
--    to know it, so the admin fills it in from the check-in panel.
ALTER TABLE inventory_apartments ADD COLUMN IF NOT EXISTS ses_establishment_code TEXT;
ALTER TABLE booking_guests ADD COLUMN IF NOT EXISTS municipality_code TEXT;
