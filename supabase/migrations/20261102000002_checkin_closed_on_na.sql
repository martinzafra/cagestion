-- Police Registration marked NA (not applicable) also closes the guest
-- check-in link, same as DONE.
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
    b.status != 'CANCELLED' AND b.police_registration NOT IN ('DONE', 'NA')
  FROM bookings b
  JOIN inventory_apartments a ON a.id = b.apartment_id
  WHERE b.checkin_token = p_token;
$$;

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
  IF v_booking.status = 'CANCELLED' OR v_booking.police_registration IN ('DONE', 'NA') THEN
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
