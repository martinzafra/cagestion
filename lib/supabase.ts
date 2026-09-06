import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

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
          platform_invoice: 'TO BE DONE' | 'SENT' | 'NA';
          platform_invoice_date: string | null;
          final_liquidation: 'TO BE DONE' | 'SENT' | 'NA';
          final_liquidation_date: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};
