-- Guest self check-in: each booking gets an unguessable token that a share
-- link is built from (/public/checkin/<token>). Guests open it and enter the
-- traveller details the police registration (RD 933/2021, SES.HOSPEDAJES)
-- requires. Same approach as the public apartment calendar: the anon key
-- never touches bookings or booking_guests directly, only the SECURITY
-- DEFINER functions below, which expose just the booking's dates and accept
-- guest data for that one booking.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS checkin_token UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS checkin_submitted_at TIMESTAMP WITH TIME ZONE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_checkin_token ON bookings(checkin_token);

-- One row per traveller. Codes follow SES.HOSPEDAJES where it has them
-- (document_type NIF/NIE/PAS/OTRO); countries are ISO 3166-1 alpha-2.
CREATE TABLE IF NOT EXISTS booking_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,

  first_name TEXT NOT NULL,
  last_name_1 TEXT NOT NULL,
  last_name_2 TEXT,
  sex TEXT NOT NULL CHECK (sex IN ('M', 'F', 'X')),
  birth_date DATE NOT NULL,
  nationality TEXT NOT NULL,

  document_type TEXT CHECK (document_type IN ('NIF', 'NIE', 'PAS', 'OTRO')),
  document_number TEXT,
  document_support_number TEXT,
  document_issue_date DATE,

  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT,
  country TEXT NOT NULL,

  phone TEXT,
  email TEXT,
  -- Relationship to an adult traveller, required for minors.
  relationship TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_guests_booking ON booking_guests(booking_id);

ALTER TABLE booking_guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Registered users can view booking guests" ON booking_guests;
CREATE POLICY "Registered users can view booking guests" ON booking_guests
  FOR SELECT USING (is_registered_user());

DROP POLICY IF EXISTS "Registered users can insert booking guests" ON booking_guests;
CREATE POLICY "Registered users can insert booking guests" ON booking_guests
  FOR INSERT WITH CHECK (is_registered_user());

DROP POLICY IF EXISTS "Registered users can update booking guests" ON booking_guests;
CREATE POLICY "Registered users can update booking guests" ON booking_guests
  FOR UPDATE USING (is_registered_user());

DROP POLICY IF EXISTS "Registered users can delete booking guests" ON booking_guests;
CREATE POLICY "Registered users can delete booking guests" ON booking_guests
  FOR DELETE USING (is_registered_user());

-- What the guest's form needs to render: apartment and dates only, never
-- the booking's guest name or any traveller already submitted. can_submit
-- is false once the stay is over, the booking is cancelled or the police
-- registration has already been filed.
CREATE OR REPLACE FUNCTION get_public_checkin(p_token UUID)
RETURNS TABLE (
  apartment_name TEXT,
  check_in_date DATE,
  check_out_date DATE,
  number_of_guests INTEGER,
  submitted BOOLEAN,
  can_submit BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    a.name,
    b.check_in_date,
    b.check_out_date,
    b.number_of_guests,
    b.checkin_submitted_at IS NOT NULL,
    b.status != 'CANCELLED'
      AND b.police_registration != 'DONE'
      AND CURRENT_DATE <= b.check_out_date
  FROM bookings b
  JOIN inventory_apartments a ON a.id = b.apartment_id
  WHERE b.checkin_token = p_token;
$$;
GRANT EXECUTE ON FUNCTION get_public_checkin(UUID) TO anon, authenticated;

-- Replaces the booking's travellers with the submitted list, so a guest who
-- made a mistake can simply send the form again (until the registration is
-- filed). The page validates in detail; this re-checks what must never be
-- stored wrong.
CREATE OR REPLACE FUNCTION submit_guest_checkin(p_token UUID, p_guests JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_guest JSONB;
  v_position INTEGER := 0;
  v_birth DATE;
  v_doc_type TEXT;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE checkin_token = p_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid check-in link';
  END IF;
  IF v_booking.status = 'CANCELLED'
     OR v_booking.police_registration = 'DONE'
     OR CURRENT_DATE > v_booking.check_out_date THEN
    RAISE EXCEPTION 'This check-in is closed';
  END IF;
  IF jsonb_typeof(p_guests) != 'array'
     OR jsonb_array_length(p_guests) = 0
     OR jsonb_array_length(p_guests) > 20 THEN
    RAISE EXCEPTION 'Invalid number of guests';
  END IF;

  DELETE FROM booking_guests WHERE booking_id = v_booking.id;

  FOR v_guest IN SELECT * FROM jsonb_array_elements(p_guests) LOOP
    v_position := v_position + 1;
    v_birth := NULLIF(v_guest->>'birth_date', '')::DATE;
    v_doc_type := NULLIF(v_guest->>'document_type', '');

    IF NULLIF(trim(v_guest->>'first_name'), '') IS NULL
       OR NULLIF(trim(v_guest->>'last_name_1'), '') IS NULL
       OR v_birth IS NULL
       OR NULLIF(v_guest->>'nationality', '') IS NULL
       OR NULLIF(trim(v_guest->>'address'), '') IS NULL
       OR NULLIF(trim(v_guest->>'city'), '') IS NULL
       OR NULLIF(v_guest->>'country', '') IS NULL THEN
      RAISE EXCEPTION 'Guest %: missing required fields', v_position;
    END IF;
    -- Identity document is mandatory from age 14.
    IF v_birth <= (CURRENT_DATE - INTERVAL '14 years')
       AND (v_doc_type IS NULL OR NULLIF(trim(v_guest->>'document_number'), '') IS NULL) THEN
      RAISE EXCEPTION 'Guest %: identity document required', v_position;
    END IF;

    INSERT INTO booking_guests (
      booking_id, position, first_name, last_name_1, last_name_2, sex,
      birth_date, nationality, document_type, document_number,
      document_support_number, document_issue_date, address, city,
      postal_code, country, phone, email, relationship
    ) VALUES (
      v_booking.id,
      v_position,
      trim(v_guest->>'first_name'),
      trim(v_guest->>'last_name_1'),
      NULLIF(trim(v_guest->>'last_name_2'), ''),
      v_guest->>'sex',
      v_birth,
      upper(v_guest->>'nationality'),
      v_doc_type,
      NULLIF(upper(regexp_replace(v_guest->>'document_number', '[\s-]', '', 'g')), ''),
      NULLIF(upper(trim(v_guest->>'document_support_number')), ''),
      NULLIF(v_guest->>'document_issue_date', '')::DATE,
      trim(v_guest->>'address'),
      trim(v_guest->>'city'),
      NULLIF(trim(v_guest->>'postal_code'), ''),
      upper(v_guest->>'country'),
      NULLIF(trim(v_guest->>'phone'), ''),
      NULLIF(lower(trim(v_guest->>'email')), ''),
      NULLIF(v_guest->>'relationship', '')
    );
  END LOOP;

  UPDATE bookings SET checkin_submitted_at = NOW() WHERE id = v_booking.id;
END;
$$;
GRANT EXECUTE ON FUNCTION submit_guest_checkin(UUID, JSONB) TO anon, authenticated;
