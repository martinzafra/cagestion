-- The guest form now collects everything the SES XML needs: guests living
-- in Spain pick their town from the INE list (municipality_code) and the
-- postcode is mandatory. Store the code and re-check what SES would reject.
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
  v_country TEXT;
  v_municipality TEXT;
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
    v_country := upper(v_guest->>'country');
    v_municipality := NULLIF(trim(v_guest->>'municipality_code'), '');

    IF NULLIF(trim(v_guest->>'first_name'), '') IS NULL
       OR NULLIF(trim(v_guest->>'last_name_1'), '') IS NULL
       OR v_birth IS NULL
       OR NULLIF(v_guest->>'nationality', '') IS NULL
       OR NULLIF(trim(v_guest->>'address'), '') IS NULL
       OR NULLIF(trim(v_guest->>'city'), '') IS NULL
       OR NULLIF(trim(v_guest->>'postal_code'), '') IS NULL
       OR NULLIF(v_country, '') IS NULL THEN
      RAISE EXCEPTION 'Guest %: missing required fields', v_position;
    END IF;
    -- Identity document is mandatory from age 14.
    IF v_birth <= (CURRENT_DATE - INTERVAL '14 years')
       AND (v_doc_type IS NULL OR NULLIF(trim(v_guest->>'document_number'), '') IS NULL) THEN
      RAISE EXCEPTION 'Guest %: identity document required', v_position;
    END IF;
    IF v_country = 'ES' AND (v_municipality IS NULL OR v_municipality !~ '^\d{5}$') THEN
      RAISE EXCEPTION 'Guest %: municipality required', v_position;
    END IF;

    INSERT INTO booking_guests (
      booking_id, position, first_name, last_name_1, last_name_2, sex,
      birth_date, nationality, document_type, document_number,
      document_support_number, document_issue_date, address, city,
      postal_code, country, municipality_code, phone, email, relationship
    ) VALUES (
      v_booking.id,
      v_position,
      left(trim(v_guest->>'first_name'), 50),
      left(trim(v_guest->>'last_name_1'), 50),
      left(NULLIF(trim(v_guest->>'last_name_2'), ''), 50),
      v_guest->>'sex',
      v_birth,
      upper(v_guest->>'nationality'),
      v_doc_type,
      NULLIF(upper(regexp_replace(v_guest->>'document_number', '[\s-]', '', 'g')), ''),
      NULLIF(upper(trim(v_guest->>'document_support_number')), ''),
      NULLIF(v_guest->>'document_issue_date', '')::DATE,
      left(trim(v_guest->>'address'), 100),
      left(trim(v_guest->>'city'), 100),
      left(trim(v_guest->>'postal_code'), 20),
      v_country,
      CASE WHEN v_country = 'ES' THEN v_municipality END,
      NULLIF(trim(v_guest->>'phone'), ''),
      NULLIF(lower(trim(v_guest->>'email')), ''),
      NULLIF(v_guest->>'relationship', '')
    );
  END LOOP;

  UPDATE bookings SET checkin_submitted_at = NOW() WHERE id = v_booking.id;
END;
$$;
