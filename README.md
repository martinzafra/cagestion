# Casa Amiga - Property Management System

A modern web application for managing tourism accommodations, bookings, revenue, and expenses.

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Hosting**: Vercel (recommended) or any Node.js host

## Features

✅ **Multi-user authentication** with role-based access (Admin, Agent)
✅ **Bookings management** with calendar view and overlap detection
✅ **Revenue & Invoicing** tracking linked to bookings
✅ **Expenses management** for properties and bookings
✅ **Inventory management** (Admin only) - Master data catalogs
✅ **Reports & Analytics** with financial insights
✅ **Responsive design** - Works on desktop and mobile
✅ **Automatic calculations** - Nights, totals, commissions
✅ **File attachments** support (via Supabase Storage)

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm
- Supabase account (free at https://supabase.com)

### 2. Database Setup

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor and run the contents of `supabase_schema.sql`
3. Seed initial data (inventory items):

```sql
INSERT INTO inventory_agents (name) VALUES ('BM'), ('KW');
INSERT INTO inventory_apartments (name) VALUES ('Barbarita'), ('TMB'), ('Catamaran'), ('Cas Artur'), ('Alexandrite');
INSERT INTO inventory_platforms (name) VALUES ('Bookings'), ('Airbnb'), ('Idealista'), ('Organic');
INSERT INTO inventory_expense_types (name) VALUES ('Cleaning'), ('Laundry'), ('Supplies'), ('Tax'), ('Other');
INSERT INTO inventory_invoice_items (name) VALUES ('Commission'), ('Cleaning&Laundry'), ('Other');
INSERT INTO inventory_payment_types (name) VALUES ('Cash'), ('Transfer'), ('Platform'), ('NA');
```

4. Create admin user in Supabase Auth and set role:

```sql
-- After creating user through Supabase Auth UI:
INSERT INTO public.users (id, email, full_name, role, agent_name)
VALUES ('<user-id>', 'admin@example.com', 'Admin', 'admin', NULL);

-- Create agent users:
INSERT INTO public.users (id, email, full_name, role, agent_name)
VALUES ('<user-id-2>', 'bm@example.com', 'Agent BM', 'agent', 'BM');
```

### 3. Environment Setup

1. Copy `.env.local.example` to `.env.local`
2. Fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

### 4. Install & Run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` and login with your credentials.

## Project Structure

```
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home (redirects to bookings)
│   ├── login/                  # Login page
│   └── protected/              # Auth-protected pages
│       ├── bookings/           # Bookings list & calendar
│       ├── revenue/            # Revenue & invoicing
│       ├── expenses/           # Expenses tracking
│       ├── inventory/          # Master data (admin only)
│       └── reports/            # Analytics (admin only)
├── components/
│   ├── Navigation.tsx          # Top navbar with mobile menu
│   ├── BookingForm.tsx         # Booking creation/edit form
│   ├── BookingsList.tsx        # Bookings table view
│   └── BookingCalendar.tsx     # Calendar view
├── lib/
│   ├── supabase.ts             # Supabase client config
│   └── calculations.ts         # Helper functions
└── supabase_schema.sql         # Database schema
```

## Usage

### For Agents (BM, KW)

1. **Bookings**: Create/view reservations with automatic night & price calculations
2. **Revenue**: Link income to bookings (commissions, services)
3. **Expenses**: Record costs (cleaning, supplies, etc.)
4. **Limited Reports**: View summary statistics

### For Admin

- All agent features +
- **Inventory**: Manage apartments, platforms, payment types, expense categories
- **Full Reports**: Detailed analytics and financial statements

## Key Features Explained

### Booking Workflow

1. Create booking with check-in/out dates (system checks for overlaps)
2. System auto-calculates: nights, total amount based on price basis
3. Track status: Confirmed, Pending, Cancelled
4. Monitor tasks: Police registration, platform invoice, final liquidation

### Revenue & Invoicing

- Always linked to a booking
- Calculate commission: `total_services × (commission% / 100)`
- Track issued status
- Optional file attachments

### Expenses

- Can be linked to a booking or general (property maintenance)
- Include VAT calculation: `total = amount + VAT`
- Categories: Cleaning, Laundry, Supplies, Tax, Other

### Calculations

- **Nights**: Automatically calculated from check-out - check-in dates
- **Daily Price**: Can be set per day, week, or month basis
- **Guest Total**: (daily_price × nights) + cleaning + other charges
- **Commission**: total_services × (% / 100)

## Date Handling

- Check-out of one booking can be check-in of another (adjacent bookings allowed)
- Overlapping date ranges are prevented for the same apartment
- Dates are stored as YYYY-MM-DD format

## Security

- Row-level security (RLS) policies on all tables
- Admin-only access to inventory and reports
- User authentication via Supabase Auth
- No API keys exposed in frontend (using anon key only)

## Future Enhancements

- [ ] Detailed financial reports with charts
- [ ] Email notifications for pending tasks
- [ ] Occupancy rate calculations
- [ ] Multi-currency support
- [ ] Commission templates
- [ ] Guest communication tools
- [ ] Calendar sync (Google Calendar, iCal)

## Troubleshooting

**"Access Denied" on Inventory/Reports**
- Only admins can access. Check user role in `users` table.

**Bookings show overlap error**
- Two bookings can't have overlapping dates on the same apartment.
- Check-out of one can equal check-in of the next.

**Supabase connection issues**
- Verify `.env.local` has correct URL and anon key
- Check Supabase project is active
- Ensure RLS policies are enabled

## Support

For setup help or bug reports, check the app logs in browser console (F12).

## License

All rights reserved - Casa Amiga Property Management
