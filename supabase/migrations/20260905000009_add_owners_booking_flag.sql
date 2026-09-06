-- Owner-occupied stays (the apartment owner staying in their own property) are
-- not real guest rentals: there is no rent to charge, only a cleaning
-- turnover cost. This flag lets a booking be marked as such so the rate
-- fields can be treated as not applicable, instead of forcing 0.00 into
-- daily_price/guest_total_amount to represent "no rent."
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS owners_booking BOOLEAN DEFAULT FALSE;
