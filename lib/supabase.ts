import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// A traveller entered through the guest self check-in link. Field set and
// codes follow what SES.HOSPEDAJES asks for; countries are ISO alpha-2.
export type BookingGuest = {
  id: string;
  booking_id: string;
  position: number;
  first_name: string;
  last_name_1: string;
  last_name_2: string | null;
  sex: 'M' | 'F' | 'X';
  birth_date: string;
  nationality: string;
  document_type: 'NIF' | 'NIE' | 'PAS' | 'OTRO' | null;
  document_number: string | null;
  document_support_number: string | null;
  document_issue_date: string | null;
  address: string;
  city: string;
  postal_code: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  relationship: string | null;
  // INE code of the home town, entered by the admin for SES (Spain only).
  municipality_code: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: 'admin' | 'agent';
          agent_name: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          booking_id_number: number;
          booking_date: string;
          booking_ref: string;
          agent_id: string;
          apartment_id: string;
          platform_id: string;
          status: 'CONFIRMED' | 'PENDING CONFIRMATION' | 'CANCELLED' | 'FINISHED';
          guest_name: string;
          guest_phone: string | null;
          guest_email: string | null;
          check_in_date: string;
          check_in_time: string | null;
          check_out_date: string;
          check_out_time: string | null;
          nights: number;
          number_of_guests: number | null;
          deposit: 'Y' | 'N' | 'NA';
          deposit_amount: number | null;
          payment_type_id: string | null;
          comments: string | null;
          guest_comments: string | null;
          price_basis: 'DAY' | 'WEEK' | 'MONTH';
          daily_price: number;
          total_rent: number | null;
          cleaning_charge: number;
          other_charge: number;
          guest_total_amount: number | null;
          police_registration: 'TO BE DONE' | 'DONE' | 'NA';
          police_registration_file: string | null;
          attachments: string[];
          platform_invoice: 'TO BE DONE' | 'SENT' | 'NA';
          platform_invoice_date: string | null;
          final_liquidation: 'TO BE DONE' | 'SENT' | 'NA';
          final_liquidation_date: string | null;
          inv_exp_done: boolean;
          checkin_token: string;
          checkin_submitted_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      booking_guests: {
        Row: BookingGuest;
      };
    };
  };
};
